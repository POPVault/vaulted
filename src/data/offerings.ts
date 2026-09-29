import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  comps,
  items,
  offerings,
  type Comp,
  type Document,
  type Item,
  type Offering,
  type Phase,
  type Update,
} from "@/db/schema";
import { listDocuments, verifyDocumentFiles } from "./documents";
import { listUpdates } from "./updates";
import { DataError, type Result } from "./errors";
import { write } from "./executor";

/**
 * The offering the investor area is showing. Today there is exactly one; this
 * is the single place to change when there are several.
 */
export async function getCurrentOffering(): Promise<Offering> {
  const row = await findCurrentOffering();
  if (!row) throw new DataError("not_found", "No offering has been seeded");
  return row;
}

/** Same as getCurrentOffering, but null instead of throwing when none exists. */
export async function findCurrentOffering(): Promise<Offering | null> {
  const [row] = await db
    .select()
    .from(offerings)
    .orderBy(asc(offerings.id))
    .limit(1);
  return row ?? null;
}

export async function getOfferingById(id: number): Promise<Offering | null> {
  const [row] = await db
    .select()
    .from(offerings)
    .where(eq(offerings.id, id))
    .limit(1);
  return row ?? null;
}

export async function getOfferingByCode(code: string): Promise<Offering | null> {
  const [row] = await db
    .select()
    .from(offerings)
    .where(eq(offerings.code, code))
    .limit(1);
  return row ?? null;
}

export type OfferingContent = {
  offering: Offering;
  items: Item[];
  comps: Comp[];
  documents: Document[];
  updates: Update[];
};

export async function getOfferingContent(
  offeringId: number,
): Promise<OfferingContent> {
  const offering = await getOfferingById(offeringId);
  if (!offering) throw new DataError("not_found", "Offering not found");
  const [itemRows, compRows, documentRows, updateRows] = await Promise.all([
    db
      .select()
      .from(items)
      .where(eq(items.offeringId, offeringId))
      .orderBy(asc(items.number), asc(items.id)),
    db
      .select()
      .from(comps)
      .where(eq(comps.offeringId, offeringId))
      .orderBy(asc(comps.id)),
    listDocuments(offeringId),
    listUpdates(offeringId),
  ]);
  return {
    offering,
    items: itemRows,
    comps: compRows,
    documents: documentRows,
    updates: updateRows,
  };
}

/**
 * Changes the phase. Opening requires at least one document whose file exists
 * under the documents root and matches its stored contentHash. In production
 * at least one of those must also be a real document, not a generated
 * placeholder.
 */
export async function setPhase(
  offeringId: number,
  phase: Phase,
): Promise<
  Result<{ offering: Offering }, "not_found" | "documents_missing" | "documents_placeholder">
> {
  if (phase === "open") {
    const verified = (await verifyDocumentFiles(offeringId)).filter((c) => c.ok);
    if (verified.length === 0) {
      return { ok: false, code: "documents_missing" };
    }
    if (process.env.NODE_ENV === "production" && verified.every((c) => c.placeholder)) {
      return { ok: false, code: "documents_placeholder" };
    }
  }
  const [row] = await write(() =>
    db
      .update(offerings)
      .set({ phase })
      .where(eq(offerings.id, offeringId))
      .returning(),
  );
  if (!row) return { ok: false, code: "not_found" };
  return { ok: true, offering: row };
}

/** closeDate is an ISO date (YYYY-MM-DD) or null to clear it. */
export async function setCloseDate(
  offeringId: number,
  closeDate: string | null,
): Promise<Offering> {
  const [row] = await write(() =>
    db
      .update(offerings)
      .set({ closeDate })
      .where(eq(offerings.id, offeringId))
      .returning(),
  );
  if (!row) throw new DataError("not_found", "Offering not found");
  return row;
}
