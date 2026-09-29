import { z } from "zod";

export const adminLoginSchema = z.object({
  code: z.string().min(1).max(200),
});
