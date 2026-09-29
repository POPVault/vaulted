import "./env";
import type { BrowserContext } from "@playwright/test";
import { ADMIN_COOKIE, ADMIN_MAX_AGE, INVESTOR_COOKIE, INVESTOR_MAX_AGE, signToken } from "@/lib/session-token";
import { BASE_URL } from "./env";

/** A valid `vinv` value for the investor, signed with the test SESSION_SECRET. */
export function investorCookieValue(investorId: number): Promise<string> {
  return signToken(String(investorId), "investor", INVESTOR_MAX_AGE);
}

export function adminCookieValue(): Promise<string> {
  return signToken("admin", "admin", ADMIN_MAX_AGE);
}

/** Logs the context in as the investor without spending an invite-link attempt. */
export async function loginAsInvestor(context: BrowserContext, investorId: number): Promise<void> {
  await context.addCookies([{ name: INVESTOR_COOKIE, value: await investorCookieValue(investorId), url: BASE_URL }]);
}

export async function setCookie(context: BrowserContext, name: string, value: string): Promise<void> {
  await context.addCookies([{ name, value, url: BASE_URL }]);
}

export { ADMIN_COOKIE, INVESTOR_COOKIE };
