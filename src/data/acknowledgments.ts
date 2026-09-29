import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { acknowledgments, type Acknowledgment } from "@/db/schema";
import { writeTransaction, type Executor } from "./executor";

export async function latestAcknowledgment(
  investorId: number,
  offeringId: number,
  executor: Executor = db,
): Promise<Acknowledgment | null> {
  const [row] = await executor
    .select()
    .from(acknowledgments)
    .where(
      and(
        eq(acknowledgments.investorId, investorId),
        eq(acknowledgments.offeringId, offeringId),
      ),
    )
    .orderBy(desc(acknowledgments.id))
    .limit(1);
  return row ?? null;
}

export type RecordAcknowledgmentInput = {
  investorId: number;
  offeringId: number;
  documentsHash: string;
  documentsJson: string;
  ip: string;
};

/**
 * Appends an acknowledgment. Idempotent: when the latest acknowledgment
 * already has this hash, that row is returned and nothing is written.
 * Callers verify the files and compare the submitted hash first
 * (see verifyDocumentFiles and computeDocumentsHash).
 */
export async function recordAcknowledgment(
  input: RecordAcknowledgmentInput,
): Promise<{ acknowledgment: Acknowledgment; created: boolean }> {
  return writeTransaction(async (tx) => {
    const latest = await latestAcknowledgment(
      input.investorId,
      input.offeringId,
      tx,
    );
    if (latest && latest.documentsHash === input.documentsHash) {
      return { acknowledgment: latest, created: false };
    }
    const [row] = await tx.insert(acknowledgments).values(input).returning();
    return { acknowledgment: row, created: true };
  });
}

/** True when an older acknowledgment exists with a different hash. */
export function acknowledgmentIsOutdated(
  latest: Acknowledgment | null,
  currentHash: string,
): boolean {
  return latest !== null && latest.documentsHash !== currentHash;
}
