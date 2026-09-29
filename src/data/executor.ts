import { db, serializeWrite } from "@/db/client";

/** A drizzle transaction handle. */
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Either the root database or an open transaction. */
export type Executor = typeof db | Tx;

/** A write transaction, queued behind other writes in this process. */
export function writeTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return serializeWrite(() => db.transaction(fn));
}

/** A single write statement (or a few), queued behind other writes. */
export function write<T>(fn: () => Promise<T>): Promise<T> {
  return serializeWrite(fn);
}
