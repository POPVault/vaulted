// pnpm docs:sync: recompute contentHash and sizeBytes for the current
// offering's documents from ./private/documents.
import { loadEnvLocal } from "./lib/env";

loadEnvLocal();

async function main() {
  const { client } = await import("@/db/client");
  try {
    const { runMigrations } = await import("@/db/migrate");
    const { getCurrentOffering } = await import("@/data/offerings");
    const { documentsRoot } = await import("@/data/documents");
    const { syncAndReport } = await import("./lib/docs");

    await runMigrations();
    const offering = await getCurrentOffering();
    console.log(`Documents for ${offering.code} (${documentsRoot()}):`);
    const rows = await syncAndReport(offering.id);
    const missing = rows.filter((r) => !r.ok).length;
    if (missing > 0) {
      console.log(
        `${missing} missing. Drop PDFs named exactly as filePath into private/documents and run pnpm docs:sync.`,
      );
    }
  } finally {
    client.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
