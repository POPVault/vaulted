"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { redirect } from "next/navigation";
import { AlreadySubmittedError } from "@/data/errors";
import { findCurrentOffering } from "@/data/offerings";
import { createQuestionnaire } from "@/data/questionnaires";
import { consume } from "@/data/rateLimit";
import { DOCUMENTS_HREF, RATE_LIMIT, hasCurrentAcknowledgment, investorRateKey, type FormState } from "@/lib/invest-gates";
import { clientIp } from "@/lib/ip";
import { getInvestorOrNull } from "@/lib/session";
import { QUESTIONNAIRE_FIELDS, questionnaireSchema, type QuestionnaireField } from "@/lib/validation/questionnaire";

export type QuestionnaireState = FormState<Record<QuestionnaireField, string>>;

/**
 * Saves the investor questionnaire (open phase only, once per offering), then
 * sends the investor to subscribe, or to the documents when their
 * acknowledgment does not cover the current documents.
 */
export async function submitQuestionnaire(
  _previous: QuestionnaireState,
  formData: FormData,
): Promise<QuestionnaireState> {
  const submissionId = Date.now();
  const values: Partial<Record<QuestionnaireField, string>> = {};
  for (const field of QUESTIONNAIRE_FIELDS) {
    const value = formData.get(field);
    if (typeof value === "string") values[field] = value;
  }
  const error = (message: string): QuestionnaireState => ({ status: "error", message, values, submissionId });

  const offering = await findCurrentOffering();
  if (!offering) return error("Your session has ended. Open your invite link again to continue.");
  const investor = await getInvestorOrNull(offering.id);
  if (!investor) return error("Your session has ended. Open your invite link again to continue.");

  const limit = await consume(investorRateKey(investor.id), RATE_LIMIT.limit, RATE_LIMIT.windowMinutes);
  if (!limit.allowed) return error("Too many attempts. Wait a few minutes and try again.");

  if (offering.phase !== "open") return error("The questionnaire is only available while the offering is open.");

  const parsed = questionnaireSchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Some answers need attention. Check the fields marked below.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      values,
      submissionId,
    };
  }

  try {
    await createQuestionnaire({
      ...parsed.data,
      investorId: investor.id,
      offeringId: offering.id,
      ip: clientIp(await headers()),
    });
  } catch (e) {
    // A second submit: the page shows the saved answers instead.
    if (!(e instanceof AlreadySubmittedError)) throw e;
    redirect("/invest/questionnaire");
  }

  redirect((await hasCurrentAcknowledgment(investor.id, offering.id)) ? "/invest/subscribe" : DOCUMENTS_HREF);
}
