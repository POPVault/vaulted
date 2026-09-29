import { z } from "zod";

/**
 * A whole number of units typed into a form field (FormData gives strings).
 * Messages are written for the investor.
 */
export function unitsField(max: number, maxMessage: string) {
  return z
    .string({ error: "Enter a number of units." })
    .trim()
    .min(1, "Enter a number of units.")
    .regex(/^\d+$/, "Enter a whole number of units, like 10.")
    .transform((value) => Number(value))
    .pipe(
      z
        .number()
        .int("Enter a whole number of units, like 10.")
        .min(1, "Enter at least 1 unit.")
        .max(max, maxMessage),
    );
}
