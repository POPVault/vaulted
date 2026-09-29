import { readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { removeTestDatabase } from "./global-setup";

const TEST_FILE_PREFIX = "e2e-";

export default async function globalTeardown(): Promise<void> {
  removeTestDatabase();
  const dir = path.resolve("private", "documents");
  for (const name of readdirSync(dir)) {
    if (name.startsWith(TEST_FILE_PREFIX)) rmSync(path.join(dir, name), { force: true });
  }
}
