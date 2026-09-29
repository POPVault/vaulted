import { z } from "zod";
import { PHASES, STATUS_ACTIONS } from "@/db/schema";

export const adminLoginSchema = z.object({
  code: z.string().min(1).max(200),
});

export const phaseSchema = z.object({
  phase: z.enum(PHASES, { error: "Choose preview, open or closed." }),
});

/** A real calendar date as YYYY-MM-DD, or empty to clear. */
export const closeDateSchema = z.object({
  closeDate: z
    .string()
    .trim()
    .max(10)
    .refine(
      (value) => {
        if (value === "") return true;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
        const date = new Date(`${value}T00:00:00Z`);
        return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
      },
      { error: "Enter a date like 2026-12-31, or leave it empty." },
    ),
});

export const createInvestorSchema = z.object({
  name: z
    .string({ error: "Enter a name." })
    .trim()
    .min(1, { error: "Enter a name." })
    .max(120, { error: "Keep the name to 120 characters." }),
  email: z
    .string({ error: "Enter an email address." })
    .trim()
    .max(254, { error: "Keep the email to 254 characters." })
    .pipe(z.email({ error: "Enter a valid email address." })),
  relationshipNote: z
    .string({ error: "Say how we know this person." })
    .trim()
    .min(1, { error: "Say how we know this person." })
    .max(500, { error: "Keep the note to 500 characters." }),
});

const id = z.coerce.number().int().positive();

/** One row control: a status action on a subscription, or revoking an investor. */
export const rowActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.enum(STATUS_ACTIONS), subscriptionId: id }),
  z.object({ action: z.literal("revoke"), investorId: id }),
]);
