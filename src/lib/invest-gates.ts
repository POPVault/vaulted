import { latestAcknowledgment } from "@/data/acknowledgments";
import { computeDocumentsHash, listDocuments } from "@/data/documents";

/**
 * True when the investor's latest acknowledgment covers the current document
 * manifest. The subscribe transaction re-checks this (plus the files on disk);
 * this is for routing pages, not for authorizing writes.
 */
export async function hasCurrentAcknowledgment(investorId: number, offeringId: number): Promise<boolean> {
  const [ack, docs] = await Promise.all([latestAcknowledgment(investorId, offeringId), listDocuments(offeringId)]);
  if (!ack || docs.length === 0) return false;
  return ack.documentsHash === computeDocumentsHash(docs);
}

/** Where the offering page shows the documents and the acknowledgment form. */
export const DOCUMENTS_HREF = "/invest?notice=documents#documents";

export const RATE_LIMIT = { limit: 30, windowMinutes: 15 } as const;

export function investorRateKey(investorId: number): string {
  return `investor:${investorId}`;
}

/** Shared shape for investor form actions used with useActionState. */
export type FormState<Values extends Record<string, string> = Record<string, string>> = {
  status: "idle" | "error" | "success";
  /** A message for the whole form (session, phase, rate limit). */
  message?: string;
  fieldErrors?: Partial<Record<keyof Values & string, string[]>>;
  /** What was submitted, so the form can be refilled after an error. */
  values?: Partial<Values>;
  /** Changes on every response so the form can remount with fresh defaults. */
  submissionId?: number;
};
