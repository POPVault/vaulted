import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { rateLimits } from "@/db/schema";
import { write } from "./executor";

export type RateLimitResult = { allowed: boolean; remaining: number };

/**
 * Fixed-window counter in one atomic upsert: a fresh or expired window resets
 * to 1, otherwise the count increments. No read-then-write.
 */
export async function consume(
  key: string,
  limit: number,
  windowMinutes: number,
): Promise<RateLimitResult> {
  const now = new Date();
  const nowIso = now.toISOString();
  const expiredBefore = new Date(
    now.getTime() - windowMinutes * 60 * 1000,
  ).toISOString();
  const expired = sql`${rateLimits.windowStart} <= ${expiredBefore}`;

  const [row] = await write(() =>
    db
      .insert(rateLimits)
      .values({ key, count: 1, windowStart: nowIso })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: {
          count: sql`CASE WHEN ${expired} THEN 1 ELSE ${rateLimits.count} + 1 END`,
          windowStart: sql`CASE WHEN ${expired} THEN ${nowIso} ELSE ${rateLimits.windowStart} END`,
        },
      })
      .returning({ count: rateLimits.count }),
  );

  const count = row?.count ?? limit + 1;
  return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
}
