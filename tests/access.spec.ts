import { expect, test } from "@playwright/test";
import { listDocuments } from "@/data/documents";
import { revokeInvestor } from "@/data/investors";
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
