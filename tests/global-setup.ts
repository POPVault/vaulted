import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { BASE_URL, TEST_ENV } from "./helpers/env";

/** The documents root the tests use (never ./private/documents). */
export function testDocumentsDir(): string {
  return path.resolve(TEST_ENV.DOCUMENTS_DIR);
}

/** The test database and its WAL side files. */
export function removeTestDatabase(): void {
  const file = path.resolve(TEST_ENV.DATABASE_PATH);
  for (const suffix of ["", "-wal", "-shm", "-journal"]) rmSync(file + suffix, { force: true });
}

function check(label: string, result: SpawnSyncReturns<string>): void {
  if (result.status !== 0) throw new Error(`${label} failed:\n${result.stdout}\n${result.stderr}`);
}

export default async function globalSetup(): Promise<void> {
  // Fresh database and documents folder: migrations and the offering come from
  // the real seed script, which writes placeholder PDFs into DOCUMENTS_DIR.
  removeTestDatabase();
  rmSync(testDocumentsDir(), { recursive: true, force: true });
  mkdirSync(testDocumentsDir(), { recursive: true });
  const seed = spawnSync("pnpm", ["seed", "--placeholder-docs"], {
    env: { ...process.env, ...TEST_ENV },
    encoding: "utf8",
  });
  check("pnpm seed", seed);

  // Fixtures through the data layer: offering B (one verified document) and
  // offering C (no documents). Investors are created by each test.
  const fixtures = spawnSync("pnpm", ["exec", "tsx", "tests/helpers/fixtures.ts"], {
    env: { ...process.env, ...TEST_ENV },
    encoding: "utf8",
  });
  check("fixtures", fixtures);

  // Compile the main routes once so the first tests do not pay for it.
  for (const route of ["/invest/enter", "/admin", "/invest"]) {
    await fetch(`${BASE_URL}${route}`, { redirect: "manual" }).catch(() => undefined);
  }
}
