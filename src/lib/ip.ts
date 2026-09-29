/**
 * Client IP under the trust rule in PLAN.md section 4: exactly one trusted
 * reverse proxy appends the connecting address to x-forwarded-for, so only the
 * rightmost entry is trusted. Entries to its left are client-controlled.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const entries = forwarded.split(",").map((e) => e.trim()).filter(Boolean);
    const last = entries.at(-1);
    if (last) return last.slice(0, 64);
  }
  return (headers.get("x-real-ip") ?? "").trim().slice(0, 64);
}
