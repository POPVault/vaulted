import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { interests, type Interest } from "@/db/schema";
import { write } from "./executor";

export async function getInterest(
  investorId: number,
  offeringId: number,
): Promise<Interest | null> {
  const [row] = await db
    .select()
    .from(interests)
    .where(
      and(
        eq(interests.investorId, investorId),
        eq(interests.offeringId, offeringId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export type UpsertInterestInput = {
  investorId: number;
  offeringId: number;
  units: number;
  note: string;
  ip: string;
};

/** One interest per investor per offering; a resubmission updates it. */
export async function upsertInterest(
  input: UpsertInterestInput,
): Promise<Interest> {
  const now = new Date().toISOString();
  const [row] = await write(() =>
    db
      .insert(interests)
      .values({ ...input, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: [interests.investorId, interests.offeringId],
        set: {
          units: input.units,
          note: input.note,
          ip: input.ip,
          updatedAt: now,
        },
      })
      .returning(),
  );
  return row;
}
