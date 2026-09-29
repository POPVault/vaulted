import { mkdirSync } from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

export function databasePath(): string {
  return path.resolve(process.env.DATABASE_PATH || "./data/vaulted.db");
}

function openClient(): Client {
  const file = databasePath();
  mkdirSync(path.dirname(file), { recursive: true });
  // `timeout` is SQLite's busy timeout, so concurrent write transactions wait
  // for the lock instead of failing with SQLITE_BUSY.
  return createClient({ url: `file:${file}`, timeout: 5000 });
}

type Db = LibSQLDatabase<typeof schema> & { $client: Client };

// Reuse one client across Next dev hot reloads.
const globalForDb = globalThis as unknown as {
  vaultedClient?: Client;
  vaultedPragmas?: Promise<void>;
  vaultedWriteQueue?: Promise<unknown>;
};

export const client: Client = globalForDb.vaultedClient ?? openClient();
globalForDb.vaultedClient = client;

// journal_mode is stored in the database file, so setting it once is enough.
// foreign_keys is per connection; libsql connections enable it by default and
// we set it here as well so the intent is explicit.
export const dbReady: Promise<void> =
  globalForDb.vaultedPragmas ??
  (async () => {
    await client.execute("PRAGMA journal_mode = WAL");
    await client.execute("PRAGMA foreign_keys = ON");
  })();
globalForDb.vaultedPragmas = dbReady;

export const db: Db = drizzle(client, { schema });

/**
 * Runs `fn` after every previously queued write has finished.
 *
 * SQLite allows one writer, and the libsql driver is synchronous: if a second
 * connection in this process waits on the write lock, its busy handler blocks
 * the event loop, so the transaction holding the lock can never finish. All
 * writes in this process therefore go through this queue. Reads are not
 * queued (WAL lets them run beside a writer). A Postgres driver would drop it.
 */
export function serializeWrite<T>(fn: () => Promise<T>): Promise<T> {
  const previous = globalForDb.vaultedWriteQueue ?? Promise.resolve();
  const run = previous.then(fn, fn);
  globalForDb.vaultedWriteQueue = run.catch(() => undefined);
  return run;
}
