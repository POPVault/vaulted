import { expect, test, type Page } from "@playwright/test";
import { acknowledgments, subscriptions } from "@/db/schema";
import { createSubscription } from "@/data/subscriptions";
import {
  acknowledgeCurrent,
  addQuestionnaire,
  addTestDocument,
  countRows,
  getSubscriptionRow,
  insertSubscription,
  newInvestor,
  resetState,
  setPhaseOrThrow,
  syncDocumentHashes,
  writeTestFile,
} from "./helpers/db";
import { loginAsInvestor } from "./helpers/session";

/** The primary action area at the bottom of the offering page. */
const investArea = (page: Page) => page.locator("#invest");

test("3. open phase: Invest is locked until the documents are acknowledged", async ({ page, context }) => {
  const offering = await resetState({ phase: "open", unitsOffered: 1000 });
  const investor = await newInvestor("Acknowledger");
  await loginAsInvestor(context, investor.id);

  await page.goto("/invest");
  await expect(investArea(page).getByRole("button", { name: "Invest" })).toBeDisabled();
  await expect(investArea(page).getByRole("link", { name: "Invest" })).toHaveCount(0);

  await page.getByRole("checkbox", { name: "I have received and read the offering documents" }).click();
  await expect(page.getByText(/^Recorded on /)).toBeVisible();
  await expect(investArea(page).getByRole("link", { name: "Invest" })).toBeVisible();
  await expect(investArea(page).getByRole("button", { name: "Invest" })).toHaveCount(0);
  expect(await countRows(acknowledgments, investor.id)).toBe(1);
  expect(offering.phase).toBe("open");
});

test("4. subscribe: max is remaining, remaining + 1 is refused, success shows the wire reference", async ({
  page,
  context,
}) => {
  const offering = await resetState({ phase: "open", unitsOffered: 10 });
  const other = await newInvestor("Earlier subscriber");
  await insertSubscription({ investorId: other.id, offeringId: offering.id, units: 3 });
  const investor = await newInvestor("Subscriber");
  await addQuestionnaire(investor.id, offering.id);
  await acknowledgeCurrent(investor.id, offering.id);
  await loginAsInvestor(context, investor.id);

  await page.goto("/invest/subscribe");
  const units = page.getByLabel("Number of units");
  await expect(units).toHaveAttribute("max", "7");

  await units.fill("8");
  await page.getByRole("button", { name: "Request units" }).click();
  await expect(page.getByText("Only 7 units remain")).toBeVisible();
  expect(await getSubscriptionRow(investor.id, offering.id)).toBeNull();

  await page.getByLabel("Number of units").fill("7");
  await page.getByRole("button", { name: "Request units" }).click();
  await expect(page.getByRole("heading", { name: "Request received" })).toBeVisible();
  const wireReference = `${offering.code}-${investor.code}`;
  await expect(page.getByText(wireReference).first()).toBeVisible();
  const row = await getSubscriptionRow(investor.id, offering.id);
  expect(row?.units).toBe(7);
  expect(row?.wireReference).toBe(wireReference);
});

test("10. changed PDF bytes invalidate the acknowledgment", async ({ page, context }) => {
  const offering = await resetState({ unitsOffered: 1000 });
  const fileName = "e2e-changing.pdf";
  await addTestDocument(offering.id, fileName, "version one");
  await setPhaseOrThrow(offering.id, "open");

  const investor = await newInvestor("Re-reader");
  await addQuestionnaire(investor.id, offering.id);
  await acknowledgeCurrent(investor.id, offering.id);
  await loginAsInvestor(context, investor.id);

  await page.goto("/invest");
  await expect(investArea(page).getByRole("link", { name: "Invest" })).toBeVisible();
  await expect(page.getByText("Updated", { exact: true })).toHaveCount(0);

  // Same file name, new bytes, then docs:sync.
  writeTestFile(fileName, "version two");
  await syncDocumentHashes(offering.id);

  await page.reload();
  await expect(page.getByText("Updated", { exact: true })).toBeVisible();
  await expect(page.getByText("The documents have been updated since you last confirmed")).toBeVisible();
  await expect(investArea(page).getByRole("button", { name: "Invest" })).toBeDisabled();
  await expect(page.getByRole("checkbox", { name: "I have received and read the offering documents" })).not.toBeChecked();

  const result = await createSubscription({ investorId: investor.id, offeringId: offering.id, units: 1, ip: "" });
  expect(result).toEqual({ ok: false, code: "documents_updated" });
});

test("14. two parallel requests for the last units: only one goes through", async ({ browser }) => {
  const offering = await resetState({ phase: "open", unitsOffered: 5 });
  const racers = await Promise.all([newInvestor("Racer one"), newInvestor("Racer two")]);
  const pages: Page[] = [];
  for (const investor of racers) {
    await addQuestionnaire(investor.id, offering.id);
    await acknowledgeCurrent(investor.id, offering.id);
    const context = await browser.newContext();
    await loginAsInvestor(context, investor.id);
    const page = await context.newPage();
    await page.goto("/invest/subscribe");
    await page.getByLabel("Number of units").fill("5");
    pages.push(page);
  }

  await Promise.all(pages.map((page) => page.getByRole("button", { name: "Request units" }).click()));

  const outcome = async (page: Page) => {
    const received = page.getByRole("heading", { name: "Request received" });
    const refused = page.getByText("All units have now been requested");
    await expect(received.or(refused)).toBeVisible();
    return (await received.isVisible()) ? "received" : "refused";
  };
  const outcomes = await Promise.all(pages.map(outcome));
  expect(outcomes.sort()).toEqual(["received", "refused"]);

  const rows = await Promise.all(racers.map((r) => countRows(subscriptions, r.id)));
  expect(rows.reduce((a, b) => a + b, 0)).toBe(1);
  for (const page of pages) await page.context().close();
});

