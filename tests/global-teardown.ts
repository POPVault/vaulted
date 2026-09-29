import { rmSync } from "node:fs";
import { removeTestDatabase, testDocumentsDir } from "./global-setup";

export default async function globalTeardown(): Promise<void> {
  removeTestDatabase();
  rmSync(testDocumentsDir(), { recursive: true, force: true });
}
