import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { documents, type Document } from "@/db/schema";
import { write, type Executor } from "./executor";

/**
 * Root folder for gated documents. Files are only ever resolved under it.
 * DOCUMENTS_DIR overrides it (tests use ./data/test-documents); the default
 * is ./private/documents. Relative values resolve from the working directory.
 */
export function documentsRoot(): string {
  const configured = process.env.DOCUMENTS_DIR?.trim();
  return path.resolve(process.cwd(), configured || path.join("private", "documents"));
}

/**
 * Text that `pnpm seed --placeholder-docs` writes into every placeholder PDF.
 * A file containing it is never a real offering document.
 */
export const PLACEHOLDER_MARKER = "PLACEHOLDER, NOT AN OFFERING DOCUMENT";

/**
 * Resolves a stored filePath to an absolute path under the documents root.
 * Returns null for anything that would escape the root.
 */
export function resolveDocumentPath(filePath: string): string | null {
  const root = documentsRoot();
  if (!filePath || filePath.includes("\0")) return null;
  const resolved = path.resolve(root, filePath);
  if (!resolved.startsWith(root + path.sep)) return null;
  return resolved;
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Reads a document file and returns its sha256 and size, or null if absent. */
export async function hashDocumentFile(
  filePath: string,
): Promise<{ contentHash: string; sizeBytes: number } | null> {
  const resolved = resolveDocumentPath(filePath);
  if (!resolved) return null;
  try {
    const bytes = await readFile(resolved);
    return { contentHash: sha256Hex(bytes), sizeBytes: bytes.byteLength };
  } catch {
    return null;
  }
}

export async function listDocuments(
  offeringId: number,
  executor: Executor = db,
): Promise<Document[]> {
  return executor
    .select()
    .from(documents)
    .where(eq(documents.offeringId, offeringId))
    .orderBy(asc(documents.id));
}

/** A document scoped to its offering. Never resolve a document by id alone. */
export async function getDocument(
  id: number,
  offeringId: number,
): Promise<Document | null> {
  const [row] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.offeringId, offeringId)))
    .limit(1);
  return row ?? null;
}

type ManifestSource = Pick<
  Document,
  "filePath" | "version" | "date" | "contentHash"
>;

/**
 * Canonical manifest JSON: [{ filePath, version, date, contentHash }] sorted by
 * filePath with a fixed key order. This exact string is what gets hashed and
 * what is stored on an acknowledgment.
 */
export function documentsManifestJson(docs: ManifestSource[]): string {
  const entries = docs
    .map((d) => ({
      filePath: d.filePath,
      version: d.version,
      date: d.date,
      contentHash: d.contentHash ?? null,
    }))
    .sort((a, b) =>
      a.filePath < b.filePath ? -1 : a.filePath > b.filePath ? 1 : 0,
    );
  return JSON.stringify(entries);
}

/** sha256 hex of the canonical manifest JSON. */
export function computeDocumentsHash(docs: ManifestSource[]): string {
  return sha256Hex(Buffer.from(documentsManifestJson(docs), "utf8"));
}

export type DocumentFileCheck = {
  documentId: number;
  filePath: string;
  ok: boolean;
  reason: "missing_hash" | "missing_file" | "hash_mismatch" | null;
  /** True when the verified file is a generated placeholder (see PLACEHOLDER_MARKER). */
  placeholder: boolean;
};

/**
 * Checks every document of the offering on disk: the file must exist under
 * the documents root and its sha256 must equal the stored contentHash.
 */
export async function verifyDocumentFiles(
  offeringId: number,
  executor: Executor = db,
): Promise<DocumentFileCheck[]> {
  const docs = await listDocuments(offeringId, executor);
  return Promise.all(docs.map(checkDocumentFile));
}

async function checkDocumentFile(doc: Document): Promise<DocumentFileCheck> {
  const base = { documentId: doc.id, filePath: doc.filePath, placeholder: false };
  if (!doc.contentHash) return { ...base, ok: false, reason: "missing_hash" };
  const resolved = resolveDocumentPath(doc.filePath);
  let bytes: Buffer;
  try {
    if (!resolved) throw new Error("invalid path");
    bytes = await readFile(resolved);
  } catch {
    return { ...base, ok: false, reason: "missing_file" };
  }
  if (sha256Hex(bytes) !== doc.contentHash) {
    return { ...base, ok: false, reason: "hash_mismatch" };
  }
  const placeholder = bytes.includes(PLACEHOLDER_MARKER, 0, "latin1");
  return { ...base, ok: true, reason: null, placeholder };
}

export type DocumentSyncResult = {
  documentId: number;
  filePath: string;
  contentHash: string | null;
  sizeBytes: number | null;
};

/**
 * Recomputes contentHash and sizeBytes from the files on disk. Missing files
 * set both to null. Version and date are content managed and left alone.
 */
export async function syncDocumentHashes(
  offeringId: number,
): Promise<DocumentSyncResult[]> {
  const docs = await listDocuments(offeringId);
  const results: DocumentSyncResult[] = [];
  for (const doc of docs) {
    const found = await hashDocumentFile(doc.filePath);
    const contentHash = found?.contentHash ?? null;
    const sizeBytes = found?.sizeBytes ?? null;
    await write(() =>
      db
        .update(documents)
        .set({ contentHash, sizeBytes })
        .where(eq(documents.id, doc.id)),
    );
    results.push({
      documentId: doc.id,
      filePath: doc.filePath,
      contentHash,
      sizeBytes,
    });
  }
  return results;
}
