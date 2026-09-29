import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_COOKIE,
  ADMIN_MAX_AGE,
  sessionCookie,
  signToken,
  timingSafeEqual,
  verifyToken,
  type CookieDescriptor,
} from "./session-token";

export type AdminSession = { sub: "admin" };

/** Verifies a `vadm` value: admin key, purpose admin, sub admin, not expired. */
export async function readAdminSession(value: string | undefined): Promise<AdminSession | null> {
  const payload = await verifyToken(value, "admin");
  if (!payload || payload.sub !== "admin") return null;
  return { sub: "admin" };
}

/** The admin session, or null. For actions and route handlers. */
export const getAdminOrNull = cache(async (): Promise<AdminSession | null> => {
  const store = await cookies();
  return readAdminSession(store.get(ADMIN_COOKIE)?.value);
});

/** For admin pages other than /admin itself: the session, or a redirect to the login. */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminOrNull();
  if (!session) redirect("/admin");
  return session;
}

/** The Set-Cookie descriptor for a new admin session. */
export async function createAdminSessionCookie(): Promise<CookieDescriptor> {
  return sessionCookie(ADMIN_COOKIE, await signToken("admin", "admin", ADMIN_MAX_AGE), ADMIN_MAX_AGE);
}

export function clearAdminSessionCookie(): CookieDescriptor {
  return sessionCookie(ADMIN_COOKIE, "", 0);
}

/**
 * Compares the submitted code with ADMIN_CODE in constant time. Both sides
 * are hashed first so the comparison does not leak the code's length.
 * Always false when ADMIN_CODE is not set.
 */
export async function checkAdminCode(submitted: string): Promise<boolean> {
  const expected = process.env.ADMIN_CODE;
  if (!expected) return false;
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(submitted)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  return timingSafeEqual(new Uint8Array(a), new Uint8Array(b));
}

/** The `admin:<ip>` limit shared by admin writes and CSV exports. */
export const ADMIN_LIMIT = 120;
export const ADMIN_WINDOW_MINUTES = 15;
