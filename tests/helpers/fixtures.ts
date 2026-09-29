// Run by globalSetup with tsx (Playwright's global setup does not resolve
// the @/ alias): creates the second offerings used by the access and
// empty-manifest tests. Usage: pnpm exec tsx tests/helpers/fixtures.ts
import "./env";
import { client } from "@/db/client";
import { ensureOffering, offeringA } from "./db";

async function main() {
  try {
    const offering = await offeringA();
    if (!offering.name) throw new Error("Seeded offering has no name");
    await ensureOffering("E2EB", "e2e-offering-b.pdf");
    await ensureOffering("E2EC");
  } finally {
    client.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
