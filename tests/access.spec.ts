import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { rateLimits } from "@/db/schema";
import { listDocuments } from "@/data/documents";
import { revokeInvestor } from "@/data/investors";
import { consume } from "@/data/rateLimit";
import { ensureOffering, insertSubscription, newInvestor, offeringA, resetState } from "./helpers/db";
import { ADMIN_COOKIE, INVESTOR_COOKIE, investorCookieValue, loginAsInvestor, setCookie } from "./helpers/session";

test.beforeEach(async () => {
  await resetState();
});

test("1. unauthenticated visitors see no offering content", async ({ page, request }) => {
  const offering = await offeringA();

  await page.goto("/invest");
  await expect(page).toHaveURL(/\/invest\/enter$/);
  await expect(page.getByRole("heading", { name: "Enter your invite link" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText(offering.name);

  const doc = await request.get("/invest/documents/1", { maxRedirects: 0 });
  expect([401, 302, 303, 307]).toContain(doc.status());

  await page.goto("/admin");
  await expect(page.getByLabel("Admin code")).toBeVisible();
  await expect(page.locator("body")).not.toContainText(offering.name);
});

test("13. the enter page renders without a cookie and has no offering text", async ({ page, context }) => {
  const offering = await offeringA();
  expect(await context.cookies()).toHaveLength(0);
  const response = await page.goto("/invest/enter");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Enter your invite link" })).toBeVisible();
  const body = page.locator("body");
  await expect(body).not.toContainText(offering.name);
  await expect(body).not.toContainText(offering.code);
});

test("2. invite link logs in; a revoked link shows nothing", async ({ page, context, browser }) => {
  const offering = await offeringA();
  const investor = await newInvestor("Invitee");

  await page.goto(`/invest/i/${investor.inviteToken}`);
  await expect(page).toHaveURL(/\/invest$/);
  await expect(page.getByRole("heading", { level: 1, name: offering.name })).toBeVisible();
  expect((await context.cookies()).some((c) => c.name === INVESTOR_COOKIE)).toBe(true);

  const revoked = await newInvestor("Revoked invitee");
  await revokeInvestor(revoked.id);
  const fresh = await browser.newContext();
  const other = await fresh.newPage();
  await other.goto(`/invest/i/${revoked.inviteToken}`);
  await expect(other).toHaveURL(/\/invest\/enter\?e=1$/);
  await expect(other.locator("body")).not.toContainText(offering.name);
  expect((await fresh.cookies()).some((c) => c.name === INVESTOR_COOKIE)).toBe(false);
  await fresh.close();
});

test("6. an investor cookie copied into the admin cookie opens nothing", async ({ page, context }) => {
  const offering = await offeringA();
  const investor = await newInvestor("Cookie swapper");
  await setCookie(context, ADMIN_COOKIE, await investorCookieValue(investor.id));

  for (const path of ["/admin/export/investors", "/admin/export/acknowledgments"]) {
    const response = await context.request.get(path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(401);
  }

  await page.goto("/admin");
  await expect(page.getByLabel("Admin code")).toBeVisible();
  await expect(page.getByRole("heading", { name: offering.name })).toHaveCount(0);
  await expect(page.getByText("Download investors CSV")).toHaveCount(0);
});

test("8. investors only see their own records and offerings they were invited to", async ({ page, context, browser }) => {
  const offering = await offeringA();
  const investorA = await newInvestor("Holder A");
  const investorB = await newInvestor("Holder B");
  const subA = await insertSubscription({ investorId: investorA.id, offeringId: offering.id, units: 12 });

  await loginAsInvestor(context, investorB.id);
  await page.goto("/invest/holdings");
  await expect(page.getByRole("heading", { name: "My holdings" })).toBeVisible();
  await expect(page.getByText("No activity", { exact: true })).toBeVisible();
  await expect(page.getByText("Nothing recorded yet")).toBeVisible();
  const body = page.locator("body");
  await expect(body).not.toContainText(subA.wireReference);
  await expect(body).not.toContainText(investorA.name);

  // Offering B's document is not readable by an offering A investor...
  const offeringB = await ensureOffering("E2EB", "e2e-offering-b.pdf");
  const [docB] = await listDocuments(offeringB.id);
  expect(docB).toBeTruthy();
  const cross = await context.request.get(`/invest/documents/${docB.id}`, { maxRedirects: 0 });
  expect(cross.status()).not.toBe(200);
  expect(cross.headers()["content-type"] ?? "").not.toContain("application/pdf");

  // ...and an investor invited only to offering B sees neither B's document nor offering A.
  const onlyB = await newInvestor("Only B", offeringB.id);
  const other = await browser.newContext();
  await loginAsInvestor(other, onlyB.id);
  const doc = await other.request.get(`/invest/documents/${docB.id}`, { maxRedirects: 0 });
  expect(doc.status()).not.toBe(200);
  const otherPage = await other.newPage();
  await otherPage.goto("/invest");
  await expect(otherPage).toHaveURL(/\/invest\/enter$/);
  await expect(otherPage.locator("body")).not.toContainText(offering.name);
  await other.close();
});

test("15. a rate-limited IP does not lock others out or grow the global counter", async ({ browser }) => {
  const offering = await offeringA();
  const investor = await newInvestor("Second IP");
  const ipA = "203.0.113.10";
  const ipB = "203.0.113.20";

  // Exhaust IP A's per-IP budget through the data layer (limit 10 per window).
  for (let i = 0; i < 10; i++) await consume(`token:${ipA}`, 10, 15);
  const globalBefore = await rateLimitCount("token:global");

  // With no proxy in front of the test server, a single x-forwarded-for
  // entry is the rightmost one, which is what the app trusts.
  const contextA = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": ipA } });
  for (let i = 0; i < 5; i++) {
    const blocked = await contextA.request.get(`/invest/i/${investor.inviteToken}`, { maxRedirects: 0 });
    expect(blocked.status()).toBe(303);
    expect(blocked.headers()["location"]).toBe("/invest/enter?e=1");
  }
  expect((await contextA.cookies()).some((c) => c.name === INVESTOR_COOKIE)).toBe(false);
  await contextA.close();
  expect(await rateLimitCount("token:global")).toBe(globalBefore);

  const contextB = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": ipB } });
  const page = await contextB.newPage();
  await page.goto(`/invest/i/${investor.inviteToken}`);
  await expect(page).toHaveURL(/\/invest$/);
  await expect(page.getByRole("heading", { level: 1, name: offering.name })).toBeVisible();
  expect((await contextB.cookies()).some((c) => c.name === INVESTOR_COOKIE)).toBe(true);
  await contextB.close();
  expect(await rateLimitCount("token:global")).toBe(globalBefore + 1);
});

async function rateLimitCount(key: string): Promise<number> {
  const [row] = await db.select().from(rateLimits).where(eq(rateLimits.key, key));
  return row?.count ?? 0;
}
