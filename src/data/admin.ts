import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  acknowledgments,
  interests,
  investors,
  questionnaires,
  statusLog,
  subscriptions,
} from "@/db/schema";
import { DataError } from "./errors";
import { listInvestorsWithFunnel } from "./investors";
import { getOfferingById } from "./offerings";
import { SOPHISTICATED_CAP, statusFromTimestamps } from "./subscriptions";

export type OfferingTotals = {
  unitsSold: number;
  unitsRemaining: number | null;
  /** Units that stay with the partner if the offering closed now. */
  unitsToPartner: number | null;
  dollarsCommittedCents: number;
  dollarsReceivedCents: number;
  interestCount: number;
  interestUnits: number;
  sophisticatedAccepted: number;
  sophisticatedCap: number;
  investorsByState: { state: string; count: number }[];
};

/** Admin totals. Unit counts are null while investorUnitsOffered is a placeholder. */
export async function totals(offeringId: number): Promise<OfferingTotals> {
  const offering = await getOfferingById(offeringId);
  if (!offering) throw new DataError("not_found", "Offering not found");

  const live = and(
    eq(subscriptions.offeringId, offeringId),
    isNull(subscriptions.cancelledAt),
  );

  const [[subs], [funded], [interest], [sophisticated], byState] =
    await Promise.all([
      db
        .select({
          units: sql<number>`coalesce(sum(${subscriptions.units}), 0)`,
          cents: sql<number>`coalesce(sum(${subscriptions.amountCents}), 0)`,
        })
        .from(subscriptions)
        .where(live),
      db
        .select({
          cents: sql<number>`coalesce(sum(${subscriptions.amountCents}), 0)`,
        })
        .from(subscriptions)
        .where(and(live, sql`${subscriptions.fundedAt} is not null`)),
      db
        .select({
          count: sql<number>`count(*)`,
          units: sql<number>`coalesce(sum(${interests.units}), 0)`,
        })
        .from(interests)
        .where(eq(interests.offeringId, offeringId)),
      db
        .select({ count: sql<number>`count(*)` })
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
            live,
            sql`${subscriptions.acceptedAt} is not null`,
            eq(questionnaires.investorStatus, "sophisticated"),
          ),
        ),
      // States of investors holding a live subscription (for state notices).
      db
        .select({
          state: questionnaires.state,
          count: sql<number>`count(*)`,
        })
        .from(subscriptions)
        .innerJoin(
          questionnaires,
          and(
            eq(questionnaires.investorId, subscriptions.investorId),
            eq(questionnaires.offeringId, subscriptions.offeringId),
          ),
        )
        .where(live)
        .groupBy(questionnaires.state)
        .orderBy(asc(questionnaires.state)),
    ]);

  const unitsSold = Number(subs?.units ?? 0);
  const remaining =
    offering.investorUnitsOffered === null
      ? null
      : Math.max(0, offering.investorUnitsOffered - unitsSold);

  return {
    unitsSold,
    unitsRemaining: remaining,
    unitsToPartner: remaining,
    dollarsCommittedCents: Number(subs?.cents ?? 0),
    dollarsReceivedCents: Number(funded?.cents ?? 0),
    interestCount: Number(interest?.count ?? 0),
    interestUnits: Number(interest?.units ?? 0),
    sophisticatedAccepted: Number(sophisticated?.count ?? 0),
    sophisticatedCap: SOPHISTICATED_CAP,
    investorsByState: byState.map((r) => ({
      state: r.state,
      count: Number(r.count),
    })),
  };
}

export type FormDClock = { firstAcceptedAt: string; dueAt: string } | null;

/**
 * Form D is due 15 days after the first sale. The clock starts at the earliest
 * set_accepted in the append-only log, so later clears or cancels cannot move it.
 */
export async function formDClock(offeringId: number): Promise<FormDClock> {
  const [row] = await db
    .select({ first: sql<string | null>`min(${statusLog.at})` })
    .from(statusLog)
    .innerJoin(subscriptions, eq(subscriptions.id, statusLog.subscriptionId))
    .where(
      and(
        eq(subscriptions.offeringId, offeringId),
        eq(statusLog.action, "set_accepted"),
      ),
    );
  if (!row?.first) return null;
  const due = new Date(row.first);
  due.setUTCDate(due.getUTCDate() + 15);
  return { firstAcceptedAt: row.first, dueAt: due.toISOString() };
}

export type InvestorExportRow = Record<string, string | number | null>;

/** One flat row per investor with access to the offering. */
export async function exportInvestorsRows(
  offeringId: number,
): Promise<InvestorExportRow[]> {
  const rows = await listInvestorsWithFunnel(offeringId);
  return rows.map((r) => {
    const q = r.questionnaire;
    const s = r.subscription;
    return {
      investor_id: r.investor.id,
      name: r.investor.name,
      email: r.investor.email,
      relationship_note: r.investor.relationshipNote,
      code: r.investor.code,
      invited_at: r.investor.createdAt,
      revoked_at: r.investor.revokedAt,
      last_viewed_at: r.investor.lastViewedAt,
      acknowledged_at: r.latestAcknowledgment?.createdAt ?? null,
      acknowledged_hash: r.latestAcknowledgment?.documentsHash ?? null,
      acknowledgment_current: r.latestAcknowledgment
        ? r.acknowledgmentCurrent
          ? "yes"
          : "no"
        : null,
      interest_units: r.interest?.units ?? null,
      interest_note: r.interest?.note ?? null,
      q_name: q?.name ?? null,
      q_email: q?.email ?? null,
      q_phone: q?.phone ?? null,
      q_address1: q?.address1 ?? null,
      q_address2: q?.address2 ?? null,
      q_city: q?.city ?? null,
      q_state: q?.state ?? null,
      q_postal_code: q?.postalCode ?? null,
      q_investor_status: q?.investorStatus ?? null,
      q_status_basis: q?.statusBasis ?? null,
      q_relationship_confirmed: q ? (q.relationshipConfirmed ? "yes" : "no") : null,
      q_bad_actor_confirmed: q ? (q.badActorConfirmed ? "yes" : "no") : null,
      q_signature_name: q?.signatureName ?? null,
      q_signature_date: q?.signatureDate ?? null,
      q_submitted_at: q?.createdAt ?? null,
      q_ip: q?.ip ?? null,
      sub_units: s?.units ?? null,
      sub_amount_cents: s?.amountCents ?? null,
      sub_wire_reference: s?.wireReference ?? null,
      sub_status: s ? (s.cancelledAt ? "cancelled" : statusFromTimestamps(s)) : null,
      sub_created_at: s?.createdAt ?? null,
      sub_accepted_at: s?.acceptedAt ?? null,
      sub_signed_at: s?.signedAt ?? null,
      sub_funded_at: s?.fundedAt ?? null,
      sub_cancelled_at: s?.cancelledAt ?? null,
      sub_ip: s?.ip ?? null,
    };
  });
}

export type AcknowledgmentExportRow = {
  acknowledgment_id: number;
  investor_id: number;
  name: string;
  email: string;
  acknowledged_at: string;
  ip: string;
  documents_hash: string;
  documents_json: string;
};

/** Every acknowledgment for the offering, newest first. */
export async function exportAcknowledgmentRows(
  offeringId: number,
): Promise<AcknowledgmentExportRow[]> {
  const rows = await db
    .select({
      acknowledgment_id: acknowledgments.id,
      investor_id: investors.id,
      name: investors.name,
      email: investors.email,
      acknowledged_at: acknowledgments.createdAt,
      ip: acknowledgments.ip,
      documents_hash: acknowledgments.documentsHash,
      documents_json: acknowledgments.documentsJson,
    })
    .from(acknowledgments)
    .innerJoin(investors, eq(investors.id, acknowledgments.investorId))
    .where(eq(acknowledgments.offeringId, offeringId))
    .orderBy(desc(acknowledgments.id));
  return rows;
}
