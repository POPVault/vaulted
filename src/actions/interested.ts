"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { upsertInterest } from "@/data/interests";
import { findCurrentOffering } from "@/data/offerings";
import { consume } from "@/data/rateLimit";
import { RATE_LIMIT, investorRateKey, type FormState } from "@/lib/invest-gates";
import { clientIp } from "@/lib/ip";
import { getInvestorOrNull } from "@/lib/session";
import { interestedSchema } from "@/lib/validation/interested";

type InterestedValues = { units: string; note: string };

export type InterestedState = FormState<InterestedValues> & {
  saved?: { units: number; amountCents: number };
};

function text(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

/** Records or updates the investor's non-binding interest. Preview phase only. */
export async function registerInterest(_previous: InterestedState, formData: FormData): Promise<InterestedState> {
  const submissionId = Date.now();
  const values: InterestedValues = { units: text(formData.get("units")), note: text(formData.get("note")) };
  const error = (message: string): InterestedState => ({ status: "error", message, values, submissionId });

  const offering = await findCurrentOffering();
  if (!offering) return error("Your session has ended. Open your invite link again to continue.");
  const investor = await getInvestorOrNull(offering.id);
  if (!investor) return error("Your session has ended. Open your invite link again to continue.");

  const limit = await consume(investorRateKey(investor.id), RATE_LIMIT.limit, RATE_LIMIT.windowMinutes);
  if (!limit.allowed) return error("Too many attempts. Wait a few minutes and try again.");

  if (offering.phase !== "preview") {
    return error("Registering interest is closed because the offering is no longer in preview.");
  }

  const parsed = interestedSchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      values,
      submissionId,
    };
  }

  const interest = await upsertInterest({
    investorId: investor.id,
    offeringId: offering.id,
    units: parsed.data.units,
    note: parsed.data.note,
    ip: clientIp(await headers()),
  });

  return {
    status: "success",
    values: { units: String(interest.units), note: interest.note },
    saved: { units: interest.units, amountCents: interest.units * offering.pricePerUnitCents },
    submissionId,
  };
}
