import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { updates, type Update } from "@/db/schema";

export async function listUpdates(offeringId: number): Promise<Update[]> {
  return db
    .select()
    .from(updates)
    .where(eq(updates.offeringId, offeringId))
    .orderBy(desc(updates.date), desc(updates.id));
}
