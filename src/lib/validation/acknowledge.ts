import { z } from "zod";

/** The manifest hash rendered in the page: sha256 hex. */
export const acknowledgeSchema = z.object({
  documentsHash: z.string().regex(/^[0-9a-f]{64}$/),
});

export type AcknowledgeInput = z.infer<typeof acknowledgeSchema>;
