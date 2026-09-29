"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { redirect } from "next/navigation";
import { findCurrentOffering } from "@/data/offerings";
import { consume } from "@/data/rateLimit";
import { createSubscription, unitsRemaining, type CreateSubscriptionError } from "@/data/subscriptions";
import { formatUnits } from "@/lib/format";
import { RATE_LIMIT, investorRateKey, type FormState } from "@/lib/invest-gates";
import { clientIp } from "@/lib/ip";
import { getInvestorOrNull } from "@/lib/session";
import { subscribeSchema } from "@/lib/validation/subscribe";

export type SubscribeState = FormState<{ units: string }> & {
  /** True when the fix is on the offering page, next to the documents. */
  documentsLink?: boolean;
};

const MESSAGES: Record<Exclude<CreateSubscriptionError, "sold_out">, string> = {
  not_found: "Something went wrong. Reload the page and try again.",
  phase_closed: "The offering is not open for subscriptions right now.",
  already_submitted: "You have already sent a subscription request for this offering.",
  questionnaire_required: "Complete the investor questionnaire before you subscribe.",
  acknowledgment_required: "Review and acknowledge the offering documents before you subscribe.",
  documents_updated:
    "The offering documents were updated since you acknowledged them. Review and acknowledge the new versions, then come back.",
  documents_missing: "The offering documents are not available right now. Try again later or email us.",
};

function soldOutMessage(remaining: number): string {
  if (remaining === 0) return "All units have now been requested, so we cannot take this request.";
  return `Only ${formatUnits(remaining)} ${remaining === 1 ? "unit remains" : "units remain"}. Enter ${formatUnits(remaining)} or fewer and try again.`;
}

/** Requests units. Every business check runs inside createSubscription. */
export async function subscribe(_previous: SubscribeState, formData: FormData): Promise<SubscribeState> {
  const submissionId = Date.now();
  const raw = formData.get("units");
  const values = { units: typeof raw === "string" ? raw : "" };
  const error = (message: string): SubscribeState => ({ status: "error", message, values, submissionId });

  const offering = await findCurrentOffering();
  if (!offering) return error("Your session has ended. Open your invite link again to continue.");
  const investor = await getInvestorOrNull(offering.id);
  if (!investor) return error("Your session has ended. Open your invite link again to continue.");

  const limit = await consume(investorRateKey(investor.id), RATE_LIMIT.limit, RATE_LIMIT.windowMinutes);
  if (!limit.allowed) return error("Too many attempts. Wait a few minutes and try again.");

  if (offering.phase !== "open") return error(MESSAGES.phase_closed);

  const parsed = subscribeSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", fieldErrors: z.flattenError(parsed.error).fieldErrors, values, submissionId };
  }

  const result = await createSubscription({
    investorId: investor.id,
    offeringId: offering.id,
    units: parsed.data.units,
    ip: clientIp(await headers()),
  });

  if (!result.ok) {
    if (result.code === "sold_out") {
      const remaining = await unitsRemaining(offering);
      return { status: "error", fieldErrors: { units: [soldOutMessage(remaining)] }, values, submissionId };
    }
    const documentsLink = result.code === "acknowledgment_required" || result.code === "documents_updated";
    return { ...error(MESSAGES[result.code]), documentsLink };
  }

  redirect("/invest/subscribe");
}
