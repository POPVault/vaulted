import { and, desc, eq, isNull, lt, or } from "drizzle-orm";
import { db } from "@/db/client";
import {
  acknowledgments,
  interests,
  investorOfferings,
  investors,
  questionnaires,
  subscriptions,
  type Acknowledgment,
  type Interest,
  type Investor,
  type Questionnaire,
  type Subscription,
} from "@/db/schema";
import { computeDocumentsHash, listDocuments } from "./documents";
import { DataError } from "./errors";
import { write, writeTransaction } from "./executor";
import { grantOfferingAccess } from "./investorOfferings";

export { hasOfferingAccess } from "./investorOfferings";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const INVITE_TOKEN_LENGTH = 26;
export const INVESTOR_CODE_LENGTH = 6;

/** Uniform random string over ALPHABET (32 symbols, so `byte & 31` is unbiased). */
function randomString(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (const b of bytes) out += ALPHABET[b & 31];
  return out;
}

export type CreateInvestorInput = {
  name: string;
  email: string;
  relationshipNote: string;
};

/** Creates the investor and grants access to the offering in one transaction. */
export async function createInvestor(
  input: CreateInvestorInput,
  offeringId: number,
): Promise<Investor> {
  return writeTransaction(async (tx) => {
    let code: string | null = null;
    for (let attempt = 0; attempt < 20 && !code; attempt++) {
      const candidate = randomString(INVESTOR_CODE_LENGTH);
      const [taken] = await tx
        .select({ id: investors.id })
        .from(investors)
        .where(eq(investors.code, candidate))
        .limit(1);
      if (!taken) code = candidate;
    }
    if (!code) throw new DataError("invalid_input", "Could not allocate a code");

    const [investor] = await tx
      .insert(investors)
      .values({
        name: input.name,
        email: input.email,
        relationshipNote: input.relationshipNote,
        inviteToken: randomString(INVITE_TOKEN_LENGTH),
        code,
      })
      .returning();
    await grantOfferingAccess(investor.id, offeringId, tx);
    return investor;
  });
}

/** The investor for an invite token, or null if unknown or revoked. */
export async function getInvestorByToken(
  token: string,
): Promise<Investor | null> {
  if (token.length !== INVITE_TOKEN_LENGTH) return null;
  const [row] = await db
    .select()
    .from(investors)
    .where(and(eq(investors.inviteToken, token), isNull(investors.revokedAt)))
    .limit(1);
  return row ?? null;
}

/** By id, including revoked investors; callers check revokedAt. */
export async function getInvestorById(id: number): Promise<Investor | null> {
  const [row] = await db
    .select()
    .from(investors)
    .where(eq(investors.id, id))
    .limit(1);
  return row ?? null;
}

export async function revokeInvestor(id: number): Promise<void> {
  await write(() =>
    db
      .update(investors)
      .set({ revokedAt: new Date().toISOString() })
      .where(and(eq(investors.id, id), isNull(investors.revokedAt))),
  );
}

/** Records a view, writing at most once an hour per investor. */
export async function touchLastViewed(id: number): Promise<void> {
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  await write(() =>
    db
      .update(investors)
      .set({ lastViewedAt: now.toISOString() })
      .where(
        and(
          eq(investors.id, id),
          or(
            isNull(investors.lastViewedAt),
            lt(investors.lastViewedAt, hourAgo),
          ),
        ),
      ),
  );
}

export type InvestorFunnelRow = {
  investor: Investor;
  viewed: boolean;
  interest: Interest | null;
  questionnaire: Questionnaire | null;
  subscription: Subscription | null;
  latestAcknowledgment: Acknowledgment | null;
  /** True when the latest acknowledgment matches the current documents. */
  acknowledgmentCurrent: boolean;
};

/** Every investor with access to the offering, with their funnel records. */
export async function listInvestorsWithFunnel(
  offeringId: number,
): Promise<InvestorFunnelRow[]> {
  const [rows, interestRows, questionnaireRows, subscriptionRows, ackRows, docs] =
    await Promise.all([
      db
        .select({ investor: investors })
        .from(investors)
        .innerJoin(
          investorOfferings,
          eq(investorOfferings.investorId, investors.id),
        )
        .where(eq(investorOfferings.offeringId, offeringId))
        .orderBy(desc(investors.createdAt), desc(investors.id)),
      db.select().from(interests).where(eq(interests.offeringId, offeringId)),
      db
        .select()
        .from(questionnaires)
        .where(eq(questionnaires.offeringId, offeringId)),
      db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.offeringId, offeringId)),
      db
        .select()
        .from(acknowledgments)
        .where(eq(acknowledgments.offeringId, offeringId))
        .orderBy(desc(acknowledgments.id)),
      listDocuments(offeringId),
    ]);

  const currentHash = computeDocumentsHash(docs);
  const byInvestor = <T extends { investorId: number }>(list: T[]) => {
    const map = new Map<number, T>();
    // First wins, so ordered lists keep their first (latest) row.
    for (const r of list) if (!map.has(r.investorId)) map.set(r.investorId, r);
    return map;
  };
  const interestMap = byInvestor(interestRows);
  const questionnaireMap = byInvestor(questionnaireRows);
  const subscriptionMap = byInvestor(subscriptionRows);
  const ackMap = byInvestor(ackRows);

  return rows.map(({ investor }) => {
    const latest = ackMap.get(investor.id) ?? null;
    return {
      investor,
      viewed: investor.lastViewedAt !== null,
      interest: interestMap.get(investor.id) ?? null,
      questionnaire: questionnaireMap.get(investor.id) ?? null,
      subscription: subscriptionMap.get(investor.id) ?? null,
      latestAcknowledgment: latest,
      acknowledgmentCurrent: latest?.documentsHash === currentHash,
    };
  });
}
