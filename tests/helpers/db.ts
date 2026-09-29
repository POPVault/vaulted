// Test fixtures through the data layer (and drizzle for state the app never
// writes directly, such as resetting records between tests).
import "./env";
import { rmSync, writeFileSync } from "node:fs";
import { and, eq, like } from "drizzle-orm";
import { db } from "@/db/client";
import {
  acknowledgments,
  documents,
  interests,
  offerings,
  questionnaires,
  rateLimits,
  statusLog,
  subscriptions,
  type InvestorStatus,
  type Offering,
  type Phase,
} from "@/db/schema";
import { recordAcknowledgment } from "@/data/acknowledgments";
import {
  computeDocumentsHash,
  documentsManifestJson,
  listDocuments,
  resolveDocumentPath,
  syncDocumentHashes,
} from "@/data/documents";
import { write, writeTransaction } from "@/data/executor";
import { createInvestor } from "@/data/investors";
import { getCurrentOffering, getOfferingByCode, setPhase } from "@/data/offerings";
import { createQuestionnaire } from "@/data/questionnaires";

/** Every file name the tests write under ./private/documents starts with this. */
export const TEST_FILE_PREFIX = "e2e-";

let counter = 0;
/** A label unique within the run, for names and emails. */
export function unique(label: string): string {
  counter += 1;
  return `${label} ${Date.now().toString(36)}${counter}`;
}

/** The seeded offering the investor area shows. */
export function offeringA(): Promise<Offering> {
  return getCurrentOffering();
}

/**
 * Clears every investor record (not investors), rate limits and test-only
 * documents, then sets offering A's phase and investorUnitsOffered.
 */
export async function resetState(
  options: { phase?: Phase; unitsOffered?: number | null } = {},
): Promise<Offering> {
  const offering = await offeringA();
  await writeTransaction(async (tx) => {
    await tx.delete(statusLog);
    await tx.delete(subscriptions);
    await tx.delete(acknowledgments);
    await tx.delete(questionnaires);
    await tx.delete(interests);
    await tx.delete(rateLimits);
    await tx
      .delete(documents)
      .where(and(eq(documents.offeringId, offering.id), like(documents.filePath, `${TEST_FILE_PREFIX}%`)));
  });
  await setUnitsOffered(offering.id, options.unitsOffered ?? null);
  return setPhaseOrThrow(offering.id, options.phase ?? "preview");
}

/** Sets the phase through the data layer (opening still requires verified documents). */
export async function setPhaseOrThrow(offeringId: number, phase: Phase): Promise<Offering> {
  const result = await setPhase(offeringId, phase);
  if (!result.ok) throw new Error(`setPhase(${offeringId}, ${phase}) refused: ${result.code}`);
  return result.offering;
}

export async function setUnitsOffered(offeringId: number, units: number | null): Promise<void> {
  await write(() => db.update(offerings).set({ investorUnitsOffered: units }).where(eq(offerings.id, offeringId)));
}

/** A new investor with access to the offering (offering A by default). */
export async function newInvestor(label: string, offeringId?: number) {
  const name = unique(label);
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return createInvestor(
    { name, email: `${slug}@example.com`, relationshipNote: "Playwright fixture" },
    offeringId ?? (await offeringA()).id,
  );
}

export async function addQuestionnaire(
  investorId: number,
  offeringId: number,
  investorStatus: InvestorStatus = "accredited",
) {
  return createQuestionnaire({
    investorId,
    offeringId,
    name: "Test Investor",
    email: "test@example.com",
    phone: "555 010 0000",
    address1: "1 Test Street",
    city: "Testville",
    state: "NY",
    postalCode: "10001",
    investorStatus,
    statusBasis: investorStatus === "accredited" ? "net_worth" : "professional",
    relationshipConfirmed: true,
    badActorConfirmed: true,
    signatureName: "Test Investor",
    signatureDate: new Date().toISOString().slice(0, 10),
    ip: "",
  });
}

/** Acknowledges the offering's current document manifest. */
export async function acknowledgeCurrent(investorId: number, offeringId: number) {
  const docs = await listDocuments(offeringId);
  const { acknowledgment } = await recordAcknowledgment({
    investorId,
    offeringId,
    documentsHash: computeDocumentsHash(docs),
    documentsJson: documentsManifestJson(docs),
    ip: "",
  });
  return acknowledgment;
}

/**
 * Inserts a subscription row directly, in any state, with a stub
 * acknowledgment for its foreign key. For fixtures that the UI would take
 * many steps to reach (other investors' holdings, the 35 cap).
 */
export async function insertSubscription(input: {
  investorId: number;
  offeringId: number;
  units: number;
  accepted?: boolean;
  cancelled?: boolean;
}) {
  const offering = await getOfferingOrThrow(input.offeringId);
  const now = new Date().toISOString();
  return writeTransaction(async (tx) => {
    const [ack] = await tx
      .insert(acknowledgments)
      .values({
        investorId: input.investorId,
        offeringId: input.offeringId,
        documentsHash: "fixture",
        documentsJson: "[]",
      })
      .returning();
    const [sub] = await tx
      .insert(subscriptions)
      .values({
        investorId: input.investorId,
        offeringId: input.offeringId,
        units: input.units,
        amountCents: input.units * offering.pricePerUnitCents,
        acknowledgmentId: ack.id,
        wireReference: `${offering.code}-FIXTURE${ack.id}`,
        status: input.accepted ? "accepted" : "requested",
        acceptedAt: input.accepted ? now : null,
        cancelledAt: input.cancelled ? now : null,
      })
      .returning();
    return sub;
  });
}

export async function getSubscriptionRow(investorId: number, offeringId: number) {
  const [row] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.investorId, investorId), eq(subscriptions.offeringId, offeringId)));
  return row ?? null;
}

export async function countRows(
  table: typeof subscriptions | typeof acknowledgments | typeof interests | typeof questionnaires,
  investorId: number,
): Promise<number> {
  return (await db.select().from(table).where(eq(table.investorId, investorId))).length;
}

async function getOfferingOrThrow(id: number): Promise<Offering> {
  const [row] = await db.select().from(offerings).where(eq(offerings.id, id));
  if (!row) throw new Error(`No offering ${id}`);
  return row;
}

/**
 * An extra offering by code, created once. With `documentFile` it gets one
 * document backed by a verified test file; without, it has no documents.
 */
export async function ensureOffering(code: string, documentFile?: string): Promise<Offering> {
  const existing = await getOfferingByCode(code);
  const offering =
    existing ??
    (
      await write(() =>
        db
          .insert(offerings)
          .values({ code, name: `Second Offering ${code}`, pricePerUnitCents: 10_000, phase: "preview" })
          .returning(),
      )
    )[0];
  if (documentFile && !existing) {
    writeTestFile(documentFile, `second offering ${code}`);
    await write(() =>
      db.insert(documents).values({
        offeringId: offering.id,
        title: `Document for ${code}`,
        filePath: documentFile,
        version: "1",
        date: "2026-01-01",
      }),
    );
    await syncDocumentHashes(offering.id);
  }
  return offering;
}

/** Writes a file under ./private/documents. The name must start with TEST_FILE_PREFIX. */
export function writeTestFile(fileName: string, content: string): void {
  const file = testFilePath(fileName);
  writeFileSync(file, `%PDF-1.4\n% ${content}\n%%EOF\n`);
}

export function removeTestFile(fileName: string): void {
  rmSync(testFilePath(fileName), { force: true });
}

function testFilePath(fileName: string): string {
  if (!fileName.startsWith(TEST_FILE_PREFIX)) throw new Error(`Test files must start with ${TEST_FILE_PREFIX}`);
  const file = resolveDocumentPath(fileName);
  if (!file) throw new Error(`Invalid test file name: ${fileName}`);
  return file;
}

/** Adds a test document to an offering and records its hash. */
export async function addTestDocument(offeringId: number, fileName: string, content: string) {
  writeTestFile(fileName, content);
  const [row] = await write(() =>
    db
      .insert(documents)
      .values({ offeringId, title: "Test disclosure", filePath: fileName, version: "1", date: "2026-01-01" })
      .returning(),
  );
  await syncDocumentHashes(offeringId);
  return row;
}

/** A document row with no file behind it (contentHash stays null). */
export async function addUnverifiedDocument(offeringId: number, fileName: string): Promise<void> {
  await write(() =>
    db
      .insert(documents)
      .values({ offeringId, title: "Missing file", filePath: fileName, version: "1", date: "2026-01-01" })
      .onConflictDoNothing(),
  );
}

export { syncDocumentHashes };
