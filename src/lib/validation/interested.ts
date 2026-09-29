import { z } from "zod";
import { unitsField } from "./units";

export const INTEREST_MAX_UNITS = 100_000;
export const INTEREST_NOTE_MAX = 1000;

export const interestedSchema = z.object({
  units: unitsField(INTEREST_MAX_UNITS, "Enter 100,000 units or fewer."),
  note: z
    .string()
    .trim()
    .max(INTEREST_NOTE_MAX, "Keep your note to 1,000 characters or fewer.")
    .optional()
    .default(""),
});

export type InterestedInput = z.infer<typeof interestedSchema>;
