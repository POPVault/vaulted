"use server";

import { headers } from "next/headers";
import { recordAcknowledgment } from "@/data/acknowledgments";
import {
  computeDocumentsHash,
  documentsManifestJson,
  documentsReadyForInvestors,
  listDocuments,
} from "@/data/documents";
import { findCurrentOffering } from "@/data/offerings";
import { consume } from "@/data/rateLimit";
import { RATE_LIMIT, investorRateKey } from "@/lib/invest-gates";
import { clientIp } from "@/lib/ip";
import { getInvestorOrNull } from "@/lib/session";
import { acknowledgeSchema } from "@/lib/validation/acknowledge";

export type AcknowledgeErrorCode =
  | "unauthorized"
  | "rate_limited"
  | "invalid_input"
  | "documents_missing"
  | "documents_placeholder"
  | "documents_updated";

export type AcknowledgeResult =
  | { ok: true; createdAt: string }
  | { ok: false; code: AcknowledgeErrorCode; message: string };

const MESSAGES: Record<AcknowledgeErrorCode, string> = {
  unauthorized: "Your session has ended. Open your invite link again to continue.",
  rate_limited: "Too many attempts. Wait a few minutes and try again.",
  invalid_input: "Something went wrong. Reload the page and try again.",
  documents_missing: "The documents are not available right now. Please try again later or email us.",
  documents_placeholder:
    "The final offering documents are not ready yet, so they cannot be confirmed. We will let you know when they are. Questions? Email us.",
  documents_updated: "The documents were updated. Reload to review them.",
};

function fail(code: AcknowledgeErrorCode): AcknowledgeResult {
  return { ok: false, code, message: MESSAGES[code] };
}

/**
 * Records that the investor has received and read the current offering
 * documents. The submitted hash must match the current manifest, and the
 * documents must pass documentsReadyForInvestors (every file verified; in
 * production none a placeholder).
 */
export async function acknowledgeDocuments(input: { documentsHash: string }): Promise<AcknowledgeResult> {
  const offering = await findCurrentOffering();
  if (!offering) return fail("unauthorized");
  const investor = await getInvestorOrNull(offering.id);
  if (!investor) return fail("unauthorized");

  const limit = await consume(investorRateKey(investor.id), RATE_LIMIT.limit, RATE_LIMIT.windowMinutes);
  if (!limit.allowed) return fail("rate_limited");

  const parsed = acknowledgeSchema.safeParse(input);
  if (!parsed.success) return fail("invalid_input");

  const ready = await documentsReadyForInvestors(offering.id);
  if (!ready.ok) return fail(ready.code);

  const docs = await listDocuments(offering.id);
  const documentsHash = computeDocumentsHash(docs);
  if (documentsHash !== parsed.data.documentsHash) return fail("documents_updated");

  const { acknowledgment } = await recordAcknowledgment({
    investorId: investor.id,
    offeringId: offering.id,
    documentsHash,
    documentsJson: documentsManifestJson(docs),
    ip: clientIp(await headers()),
  });
  return { ok: true, createdAt: acknowledgment.createdAt };
}
