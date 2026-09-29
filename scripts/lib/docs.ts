import { syncDocumentHashes } from "@/data/documents";

export type DocSyncRow = { filePath: string; ok: boolean; sizeBytes: number | null };

/** Recomputes hashes for the offering's documents and prints ok/missing. */
export async function syncAndReport(offeringId: number): Promise<DocSyncRow[]> {
  const results = await syncDocumentHashes(offeringId);
  const rows = results.map((r) => ({
    filePath: r.filePath,
    ok: r.contentHash !== null,
    sizeBytes: r.sizeBytes,
  }));
  if (rows.length === 0) {
    console.log("  (no documents for this offering)");
    return rows;
  }
  const width = Math.max(...rows.map((r) => r.filePath.length));
  for (const r of rows) {
    const status = r.ok ? `ok (${r.sizeBytes} bytes)` : "missing";
    console.log(`  ${r.filePath.padEnd(width)}  ${status}`);
  }
  return rows;
}
