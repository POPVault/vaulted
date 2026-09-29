import { expect, test } from "@playwright/test";
import { verifyDocumentFiles } from "@/data/documents";
import { getOfferingById, setPhase } from "@/data/offerings";
import { applyStatusAction } from "@/data/subscriptions";
import {
  addQuestionnaire,
  addUnverifiedDocument,
  ensureOffering,
  insertSubscription,
  offeringA,
  newInvestor,
  resetState,
} from "./helpers/db";

// Business rules enforced in the data layer (PLAN.md section 5).

test("9. an offering with an empty or unverifiable document manifest cannot open", async () => {
  await resetState();
  const empty = await ensureOffering("E2EC");
  expect(await setPhase(empty.id, "open")).toEqual({ ok: false, code: "documents_missing" });
  expect((await getOfferingById(empty.id))?.phase).toBe("preview");

  // A document row whose file was never added (no contentHash) does not count either.
  const unverified = await ensureOffering("E2ED");
  await addUnverifiedDocument(unverified.id, "e2e-missing.pdf");
  expect(await setPhase(unverified.id, "open")).toEqual({ ok: false, code: "documents_missing" });
  expect((await getOfferingById(unverified.id))?.phase).toBe("preview");
});

test("11. status transitions follow the allowed order", async () => {
  const offering = await resetState({ phase: "open", unitsOffered: 1000 });
  const investor = await newInvestor("Transitions");
  await addQuestionnaire(investor.id, offering.id);
  const sub = await insertSubscription({ investorId: investor.id, offeringId: offering.id, units: 2 });
  const act = (action: Parameters<typeof applyStatusAction>[2]) => applyStatusAction(sub.id, offering.id, action, "");

  expect(await act("set_signed")).toEqual({ ok: false, code: "invalid_transition" });
  expect(await act("set_funded")).toEqual({ ok: false, code: "invalid_transition" });
  expect(await act("clear_accepted")).toEqual({ ok: false, code: "invalid_transition" });
  expect(await act("uncancel")).toEqual({ ok: false, code: "invalid_transition" });

  expect((await act("set_accepted")).ok).toBe(true);
  expect(await act("set_accepted")).toEqual({ ok: false, code: "invalid_transition" });
  const signed = await act("set_signed");
  expect(signed.ok && signed.subscription.status).toBe("signed");
  expect(await act("clear_accepted")).toEqual({ ok: false, code: "invalid_transition" });

  const cancelled = await act("cancel");
  expect(cancelled.ok && cancelled.subscription.cancelledAt).toBeTruthy();
  expect(await act("set_funded")).toEqual({ ok: false, code: "invalid_transition" });
  expect(await act("cancel")).toEqual({ ok: false, code: "invalid_transition" });

  const restored = await act("uncancel");
  expect(restored.ok).toBe(true);
  if (restored.ok && signed.ok) {
    expect(restored.subscription.status).toBe("signed");
    expect(restored.subscription.cancelledAt).toBeNull();
    expect(restored.subscription.acceptedAt).toBe(signed.subscription.acceptedAt);
    expect(restored.subscription.signedAt).toBe(signed.subscription.signedAt);
  }

  // A subscription from another offering is not reachable through this one.
  const other = await ensureOffering("E2EC");
  expect(await applyStatusAction(sub.id, other.id, "clear_signed", "")).toEqual({ ok: false, code: "not_found" });
});

test("12. at most 35 accepted sophisticated investors (set_accepted and uncancel)", async () => {
  test.setTimeout(120_000);
  const offering = await resetState({ phase: "open", unitsOffered: 10_000 });

  for (let i = 0; i < 35; i++) {
    const investor = await newInvestor(`Sophisticated ${i + 1}`);
    await addQuestionnaire(investor.id, offering.id, "sophisticated");
    await insertSubscription({ investorId: investor.id, offeringId: offering.id, units: 1, accepted: true });
  }

  const pending = await newInvestor("Sophisticated 36");
  await addQuestionnaire(pending.id, offering.id, "sophisticated");
  const pendingSub = await insertSubscription({ investorId: pending.id, offeringId: offering.id, units: 1 });
  expect(await applyStatusAction(pendingSub.id, offering.id, "set_accepted", "")).toEqual({
    ok: false,
    code: "sophisticated_cap",
  });

  const cancelledInvestor = await newInvestor("Sophisticated cancelled");
  await addQuestionnaire(cancelledInvestor.id, offering.id, "sophisticated");
  const cancelledSub = await insertSubscription({
    investorId: cancelledInvestor.id,
    offeringId: offering.id,
    units: 1,
    accepted: true,
    cancelled: true,
  });
  expect(await applyStatusAction(cancelledSub.id, offering.id, "uncancel", "")).toEqual({
    ok: false,
    code: "sophisticated_cap",
  });

  // Accredited investors are not counted.
  const accredited = await newInvestor("Accredited");
  await addQuestionnaire(accredited.id, offering.id, "accredited");
  const accreditedSub = await insertSubscription({ investorId: accredited.id, offeringId: offering.id, units: 1 });
  expect((await applyStatusAction(accreditedSub.id, offering.id, "set_accepted", "")).ok).toBe(true);
});

test("17. seeded placeholder PDFs are flagged and cannot open an offering in production", async () => {
  await resetState();
  const offering = await offeringA();
  const checks = await verifyDocumentFiles(offering.id);
  expect(checks.length).toBeGreaterThan(0);
  for (const check of checks) expect(check).toMatchObject({ ok: true, placeholder: true });

  const env = process.env as Record<string, string | undefined>;
  const previous = env.NODE_ENV;
  env.NODE_ENV = "production";
  try {
    expect(await setPhase(offering.id, "open")).toEqual({ ok: false, code: "documents_placeholder" });
  } finally {
    env.NODE_ENV = previous;
  }
  expect((await getOfferingById(offering.id))?.phase).toBe("preview");

  // Outside production the placeholders still open the offering for local work.
  expect((await setPhase(offering.id, "open")).ok).toBe(true);
  await resetState();
});
