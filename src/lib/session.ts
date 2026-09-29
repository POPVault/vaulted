import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Investor } from "@/db/schema";
import { getInvestorById, hasOfferingAccess, touchLastViewed as touchInvestorLastViewed } from "@/data/investors";
import {
  INVESTOR_COOKIE,
  INVESTOR_MAX_AGE,
  sessionCookie,
  signToken,
  verifyToken,
  type CookieDescriptor,
} from "./session-token";

export { verifyToken, type SessionPurpose, type TokenPayload } from "./session-token";

/**
 * The investor session contract. The HMAC cookie below is today's
 * implementation; a hosted auth provider can replace it behind this interface.
 */
export interface SessionProvider {
  /** Returns the cookie value to set for a new investor session. */
  createInvestorSession(investorId: number): Promise<string>;
  /** Returns the investor id when the cookie verifies as an investor session, else null. */
  readInvestorSession(cookieValue: string | undefined): Promise<{ investorId: number } | null>;
  /** The cookie to set in order to clear the investor session. */
  clear(): CookieDescriptor;
}

export const hmacSessionProvider: SessionProvider = {
  createInvestorSession(investorId) {
    return signToken(String(investorId), "investor", INVESTOR_MAX_AGE);
  },
  async readInvestorSession(cookieValue) {
    const payload = await verifyToken(cookieValue, "investor");
    if (!payload || !/^[1-9][0-9]{0,15}$/.test(payload.sub)) return null;
    return { investorId: Number(payload.sub) };
  },
  clear() {
    return sessionCookie(INVESTOR_COOKIE, "", 0);
  },
};

export const sessionProvider: SessionProvider = hmacSessionProvider;

/** The Set-Cookie descriptor for a freshly signed investor session value. */
export function investorSessionCookie(value: string): CookieDescriptor {
  return sessionCookie(INVESTOR_COOKIE, value, INVESTOR_MAX_AGE);
}

/**
 * The authorized investor for the offering, or null. Verifies the cookie,
 * loads the investor, rejects revoked investors and checks offering access.
 * For server actions and route handlers, which return an error on null.
 */
export const getInvestorOrNull = cache(async (offeringId: number): Promise<Investor | null> => {
  const store = await cookies();
  const session = await sessionProvider.readInvestorSession(store.get(INVESTOR_COOKIE)?.value);
  if (!session) return null;
  const investor = await getInvestorById(session.investorId);
  if (!investor || investor.revokedAt !== null) return null;
  if (!(await hasOfferingAccess(investor.id, offeringId))) return null;
  return investor;
});

/** For pages and layouts: the authorized investor, or a redirect to /invest/enter. */
export async function requireInvestor(offeringId: number): Promise<Investor> {
  const investor = await getInvestorOrNull(offeringId);
  if (!investor) redirect("/invest/enter");
  return investor;
}

/** Records that the investor viewed the offering (at most one write an hour). */
export function touchLastViewed(investorId: number): Promise<void> {
  return touchInvestorLastViewed(investorId);
}
