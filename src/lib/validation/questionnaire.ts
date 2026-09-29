import { z } from "zod";
import { US_STATE_CODES } from "@/components/invest/us-states";

export const INVESTOR_STATUS_OPTIONS = [
  {
    value: "accredited",
    label: "Accredited investor",
    help: "You meet one of the SEC tests for income, net worth, a license or an entity. Choose the one that fits.",
    bases: [
      {
        value: "income",
        label:
          "Income over $200,000, or $300,000 with a spouse, in each of the last two years, and you expect the same this year",
      },
      { value: "net_worth", label: "Net worth over $1,000,000, not counting your primary residence" },
      { value: "license", label: "You hold a Series 7, 65 or 82 license in good standing" },
      { value: "entity", label: "You are investing through an entity with over $5,000,000 in assets" },
      { value: "other_accredited", label: "Another accredited investor category" },
    ],
  },
  {
    value: "sophisticated",
    label: "Sophisticated investor (not accredited)",
    help: "You have enough knowledge and experience in money and business to judge the risks of this investment.",
    bases: [
      { value: "private_placements", label: "Experience investing in private placements" },
      { value: "professional", label: "Professional financial or business experience" },
      { value: "purchaser_rep", label: "You are advised by a purchaser representative" },
    ],
  },
] as const;

export type InvestorStatusValue = (typeof INVESTOR_STATUS_OPTIONS)[number]["value"];

export function statusLabelFor(status: string): string {
  return INVESTOR_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

export function basisLabelFor(status: string, basis: string): string {
  const option = INVESTOR_STATUS_OPTIONS.find((o) => o.value === status);
  return option?.bases.find((b) => b.value === basis)?.label ?? basis;
}

const required = (label: string, max: number) =>
  z
    .string({ error: `Enter your ${label}.` })
    .trim()
    .min(1, `Enter your ${label}.`)
    .max(max, `Keep your ${label} to ${max} characters or fewer.`);

/** A checkbox posts "on" when ticked and nothing when not. */
const confirmation = (message: string) =>
  z
    .string({ error: message })
    .refine((v) => v === "on", message)
    .transform(() => true as const);

function isRealDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Latest acceptable signature date: today (UTC) plus one day for time zones. */
function latestSignatureDate(): string {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export const questionnaireSchema = z
  .object({
    name: required("full name", 120),
    email: z
      .string({ error: "Enter your email address." })
      .trim()
      .min(1, "Enter your email address.")
      .max(254, "Keep your email to 254 characters or fewer.")
      .pipe(z.email("Enter a valid email address, like name@example.com.")),
    phone: required("phone number", 40).regex(
      /^[0-9+().\-\s]{7,40}$/,
      "Enter a phone number using digits, spaces, +, - or brackets.",
    ),
    address1: required("street address", 120),
    address2: z
      .string()
      .trim()
      .max(120, "Keep this line to 120 characters or fewer.")
      .optional()
      .default(""),
    city: required("city", 80),
    state: z.enum(US_STATE_CODES, { error: "Choose your state." }),
    postalCode: required("ZIP code", 12).regex(/^[0-9]{5}(-?[0-9]{4})?$/, "Enter a 5 digit ZIP code, like 10001."),
    investorStatus: z.enum(["accredited", "sophisticated"], {
      error: "Choose whether you are an accredited or a sophisticated investor.",
    }),
    statusBasis: z.string({ error: "Choose the option that describes you." }).trim().min(1, "Choose the option that describes you.").max(40),
    relationshipConfirmed: confirmation("Confirm your relationship with Vaulted or its founders."),
    badActorConfirmed: confirmation("Confirm that no disqualifying event applies to you."),
    signatureName: required("full name to sign", 120),
    signatureDate: z
      .string({ error: "Enter today's date." })
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a date.")
      .refine(isRealDate, "Enter a real date.")
      .refine((v) => v <= latestSignatureDate(), "The date cannot be in the future.")
      .refine((v) => v >= "2020-01-01", "Enter today's date."),
  })
  .superRefine((data, ctx) => {
    const option = INVESTOR_STATUS_OPTIONS.find((o) => o.value === data.investorStatus);
    if (!option?.bases.some((b) => b.value === data.statusBasis)) {
      ctx.addIssue({
        code: "custom",
        path: ["statusBasis"],
        message: "Choose the option that describes you.",
      });
    }
  });

export type QuestionnaireInput = z.infer<typeof questionnaireSchema>;

export const QUESTIONNAIRE_FIELDS = [
  "name",
  "email",
  "phone",
  "address1",
  "address2",
  "city",
  "state",
  "postalCode",
  "investorStatus",
  "statusBasis",
  "relationshipConfirmed",
  "badActorConfirmed",
  "signatureName",
  "signatureDate",
] as const;

export type QuestionnaireField = (typeof QUESTIONNAIRE_FIELDS)[number];
