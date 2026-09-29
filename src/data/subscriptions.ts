import { and, eq, isNotNull, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  investors,
  offerings,
  questionnaires,
  statusLog,
  subscriptions,
  type Interest,
  type Offering,
  type StatusAction,
  type Subscription,
  type SubscriptionStatus,
} from "@/db/schema";
import { latestAcknowledgment } from "./acknowledgments";
import { computeDocumentsHash, listDocuments, verifyDocumentFiles } from "./documents";
import { DataError, type Result } from "./errors";
import { writeTransaction, type Executor, type Tx } from "./executor";
import { getQuestionnaire } from "./questionnaires";

/** Maximum accepted, non-cancelled sophisticated (non-accredited) investors. */
export const SOPHISTICATED_CAP = 35;

export async function getSubscription(
  investorId: number,
  offeringId: number,
  executor: Executor = db,
): Promise<Subscription | null> {
  const [row] = await executor
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.investorId, investorId),
        eq(subscriptions.offeringId, offeringId),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Sum of units on non-cancelled subscriptions. */
export async function unitsTaken(
  offeringId: number,
  executor: Executor = db,
): Promise<number> {
  const [row] = await executor
    .select({
      total: sql<number>`coalesce(sum(${subscriptions.units}), 0)`,
    })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.offeringId, offeringId),
        isNull(subscriptions.cancelledAt),
      ),
    );
  return Number(row?.total ?? 0);
}

/**
 * Units still available to investors. While investorUnitsOffered is not set
 * (a placeholder) nothing is available.
 */
export async function unitsRemaining(
  offering: Pick<Offering, "id" | "investorUnitsOffered">,
  executor: Executor = db,
): Promise<number> {
  if (offering.investorUnitsOffered === null) return 0;
  const taken = await unitsTaken(offering.id, executor);
  return Math.max(0, offering.investorUnitsOffered - taken);
}

export type CreateSubscriptionInput = {
  investorId: number;
  offeringId: number;
  units: number;
  ip: string;
};

export type CreateSubscriptionError =
  | "not_found"
  | "phase_closed"
  | "already_submitted"
  | "questionnaire_required"
  | "acknowledgment_required"
  | "documents_updated"
  | "documents_missing"
  | "sold_out";

/**
 * Creates a subscription. Every check in PLAN.md section 5 is re-read inside
 * one write transaction, so two concurrent submits cannot oversell.
 */
export async function createSubscription(
  input: CreateSubscriptionInput,
): Promise<Result<{ subscription: Subscription }, CreateSubscriptionError>> {
  if (!Number.isInteger(input.units) || input.units < 1) {
    throw new DataError("invalid_input", "Units must be a positive integer");
  }
  return writeTransaction(async (tx) => {
    const fail = (code: CreateSubscriptionError) =>
      ({ ok: false, code }) as const;

    const [offering] = await tx
      .select()
      .from(offerings)
      .where(eq(offerings.id, input.offeringId))
      .limit(1);
    if (!offering) return fail("not_found");
    if (offering.phase !== "open") return fail("phase_closed");

    const [investor] = await tx
      .select()
      .from(investors)
      .where(eq(investors.id, input.investorId))
      .limit(1);
    if (!investor) return fail("not_found");

    // One subscription per investor per offering, cancelled or not.
    if (await getSubscription(input.investorId, input.offeringId, tx)) {
      return fail("already_submitted");
    }
    if (!(await getQuestionnaire(input.investorId, input.offeringId, tx))) {
      return fail("questionnaire_required");
    }
    const ack = await latestAcknowledgment(
      input.investorId,
      input.offeringId,
      tx,
    );
    if (!ack) return fail("acknowledgment_required");

    const checks = await verifyDocumentFiles(input.offeringId, tx);
    if (checks.length === 0 || checks.some((c) => !c.ok)) {
      return fail("documents_missing");
    }
    const docs = await listDocuments(input.offeringId, tx);
    if (computeDocumentsHash(docs) !== ack.documentsHash) {
      return fail("documents_updated");
    }

    const remaining = await unitsRemaining(offering, tx);
    if (input.units > remaining) return fail("sold_out");

    const [subscription] = await tx
      .insert(subscriptions)
      .values({
        investorId: input.investorId,
        offeringId: input.offeringId,
        units: input.units,
        amountCents: input.units * offering.pricePerUnitCents,
        acknowledgmentId: ack.id,
        wireReference: `${offering.code}-${investor.code}`,
        status: "requested",
        ip: input.ip,
      })
      .returning();
    return { ok: true, subscription } as const;
  });
}

/** Status implied by the step timestamps (cancellation is separate). */
export function statusFromTimestamps(
  sub: Pick<Subscription, "acceptedAt" | "signedAt" | "fundedAt">,
): SubscriptionStatus {
  if (sub.fundedAt) return "funded";
  if (sub.signedAt) return "signed";
  if (sub.acceptedAt) return "accepted";
  return "requested";
}

export type StatusActionError =
  | "not_found"
  | "invalid_transition"
  | "sophisticated_cap"
  | "capacity";

type StepPatch = Partial<
  Pick<Subscription, "acceptedAt" | "signedAt" | "fundedAt" | "cancelledAt">
>;

/** The patch for an action, or null when the transition is not allowed. */
function transition(
  sub: Subscription,
  action: StatusAction,
  now: string,
): StepPatch | null {
  const cancelled = sub.cancelledAt !== null;
  if (action === "cancel") return cancelled ? null : { cancelledAt: now };
  if (action === "uncancel") return cancelled ? { cancelledAt: null } : null;
  if (cancelled) return null;

  const status = statusFromTimestamps(sub);
  switch (action) {
    case "set_accepted":
      return status === "requested" ? { acceptedAt: now } : null;
    case "set_signed":
      return status === "accepted" ? { signedAt: now } : null;
    case "set_funded":
      return status === "signed" ? { fundedAt: now } : null;
    case "clear_funded":
      return status === "funded" ? { fundedAt: null } : null;
    case "clear_signed":
      return status === "signed" ? { signedAt: null } : null;
    case "clear_accepted":
      return status === "accepted" ? { acceptedAt: null } : null;
  }
}

/** Accepted, non-cancelled sophisticated subscriptions, excluding one id. */
async function sophisticatedAcceptedCount(
  tx: Tx,
  offeringId: number,
  excludeSubscriptionId: number,
): Promise<number> {
  const [row] = await tx
    .select({ n: sql<number>`count(*)` })
    .from(subscriptions)
    .innerJoin(
      questionnaires,
      and(
        eq(questionnaires.investorId, subscriptions.investorId),
        eq(questionnaires.offeringId, subscriptions.offeringId),
      ),
    )
    .where(
      and(
        eq(subscriptions.offeringId, offeringId),
        isNotNull(subscriptions.acceptedAt),
        isNull(subscriptions.cancelledAt),
        eq(questionnaires.investorStatus, "sophisticated"),
        ne(subscriptions.id, excludeSubscriptionId),
      ),
    );
  return Number(row?.n ?? 0);
}

/**
 * Applies one admin status action to a subscription in `offeringId` (a
 * subscription from any other offering is not_found): read, validate, cap and capacity checks,
 * update, and statusLog append, all in one transaction. Refused actions are
 * not logged.
 */
export async function applyStatusAction(
  subscriptionId: number,
  offeringId: number,
  action: StatusAction,
  ip: string,
): Promise<Result<{ subscription: Subscription }, StatusActionError>> {
  return writeTransaction(async (tx) => {
    const fail = (code: StatusActionError) => ({ ok: false, code }) as const;

    const [sub] = await tx
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.id, subscriptionId),
          eq(subscriptions.offeringId, offeringId),
        ),
      )
      .limit(1);
    if (!sub) return fail("not_found");

    const now = new Date().toISOString();
    const patch = transition(sub, action, now);
    if (!patch) return fail("invalid_transition");

    // Restoring units after a cancel: someone may have taken them since.
    if (action === "uncancel") {
      const [offering] = await tx
        .select()
        .from(offerings)
        .where(eq(offerings.id, sub.offeringId))
        .limit(1);
      if (!offering) return fail("not_found");
      const remaining = await unitsRemaining(offering, tx);
      if (sub.units > remaining) return fail("capacity");
    }

    const entersCountedState =
      action === "set_accepted" ||
      (action === "uncancel" && sub.acceptedAt !== null);
    if (entersCountedState) {
      const questionnaire = await getQuestionnaire(
        sub.investorId,
        sub.offeringId,
        tx,
      );
      if (questionnaire?.investorStatus === "sophisticated") {
        const count = await sophisticatedAcceptedCount(
          tx,
          sub.offeringId,
          sub.id,
        );
        if (count >= SOPHISTICATED_CAP) return fail("sophisticated_cap");
      }
    }

    const next = { ...sub, ...patch };
    const [updated] = await tx
      .update(subscriptions)
      .set({ ...patch, status: statusFromTimestamps(next) })
      .where(eq(subscriptions.id, sub.id))
      .returning();
    await tx
      .insert(statusLog)
      .values({ subscriptionId: sub.id, action, at: now, ip });
    return { ok: true, subscription: updated } as const;
  });
}

export type HoldingsStatus =
  | "funded"
  | "signed"
  | "accepted"
  | "requested"
  | "interested"
  | "none";

/**
 * funded > signed > accepted > requested > interested > none. A cancelled
 * subscription does not count; the investor falls back to interest or none.
 */
export function holdingsStatus(
  sub: Subscription | null,
  interest: Interest | null,
): HoldingsStatus {
  if (sub && sub.cancelledAt === null) return statusFromTimestamps(sub);
  if (interest) return "interested";
  return "none";
}
