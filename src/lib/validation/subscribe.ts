import { z } from "zod";
import { unitsField } from "./units";

/**
 * Shape check only. Whether the units are still available is decided inside
 * the createSubscription transaction, which returns sold_out when they are not.
 */
export const subscribeSchema = z.object({
  units: unitsField(1_000_000, "Enter 1,000,000 units or fewer."),
});

export type SubscribeInput = z.infer<typeof subscribeSchema>;
