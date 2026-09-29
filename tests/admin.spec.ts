import { expect, test } from "@playwright/test";
import { acknowledgments, interests } from "@/db/schema";
import { revokeInvestor } from "@/data/investors";
import { countRows, getSubscriptionRow, insertSubscription, newInvestor, resetState } from "./helpers/db";
import { TEST_ENV } from "./helpers/env";
import { loginAsInvestor } from "./helpers/session";

test("5. admin logs in, accepts a subscription, and My holdings shows Accepted", async ({ page, browser }) => {
  const offering = await resetState({ phase: "open", unitsOffered: 1000 });
  const investor = await newInvestor("Accept me");
  await insertSubscription({ investorId: investor.id, offeringId: offering.id, units: 4 });

  await page.goto("/admin");
  await page.getByLabel("Admin code").fill(TEST_ENV.ADMIN_CODE);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { level: 1, name: offering.name })).toBeVisible();

  await page.getByRole("button", { name: `Accept: ${investor.name}` }).click();
  await expect.poll(async () => (await getSubscriptionRow(investor.id, offering.id))?.status).toBe("accepted");

  const investorContext = await browser.newContext();
  await loginAsInvestor(investorContext, investor.id);
  const holdings = await investorContext.newPage();
  await holdings.goto("/invest/holdings");
  await expect(holdings.getByText("Accepted", { exact: true }).first()).toBeVisible();
  await expect(holdings.getByText("Accepted by Vaulted")).toBeVisible();
  await investorContext.close();
});

test("7. a revoked investor's server actions are rejected and write nothing", async ({ page, context }) => {
  // Interested (preview phase).
  await resetState({ phase: "preview" });
  const investor = await newInvestor("Revoked mid-session");
  await loginAsInvestor(context, investor.id);

  await page.goto("/invest/interested");
  await page.getByLabel("How many units might you want?").fill("5");
  await revokeInvestor(investor.id);
  await page.getByRole("button", { name: "Save my interest" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Your session has ended" })).toBeVisible();
  expect(await countRows(interests, investor.id)).toBe(0);

  // Acknowledge (open phase).
  await resetState({ phase: "open", unitsOffered: 1000 });
  const second = await newInvestor("Revoked before acknowledging");
  await loginAsInvestor(context, second.id);
  await page.goto("/invest");
  await revokeInvestor(second.id);
  await page.getByRole("checkbox", { name: "I have received and read the offering documents" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Your session has ended" })).toBeVisible();
  expect(await countRows(acknowledgments, second.id)).toBe(0);
});
