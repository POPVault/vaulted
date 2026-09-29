import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { investorOfferings } from "@/db/schema";
import { writeTransaction, type Tx } from "./executor";

/** True when the investor has been granted access to the offering. */
export async function hasOfferingAccess(
  investorId: number,
  offeringId: number,
): Promise<boolean> {
  const [row] = await db
    .select({ investorId: investorOfferings.investorId })
    .from(investorOfferings)
    .where(
      and(
        eq(investorOfferings.investorId, investorId),
        eq(investorOfferings.offeringId, offeringId),
      ),
    )
    .limit(1);
  return Boolean(row);
}

/**
 * Grants access; a no-op when the row already exists. Pass `tx` when calling
 * from inside an open write transaction.
 */
export async function grantOfferingAccess(
  investorId: number,
  offeringId: number,
  tx?: Tx,
): Promise<void> {
  const insert = (executor: Tx) =>
    executor
      .insert(investorOfferings)
      .values({ investorId, offeringId })
      .onConflictDoNothing();
  if (tx) await insert(tx);
  else await writeTransaction(insert);
}
