"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { StatusAction } from "@/db/schema";
import { createInvestor, getInvestorById, hasOfferingAccess, revokeInvestor } from "@/data/investors";
import { findCurrentOffering, setCloseDate, setPhase } from "@/data/offerings";
import { consume } from "@/data/rateLimit";
import { applyStatusAction, type StatusActionError } from "@/data/subscriptions";
import {
  ADMIN_LIMIT,
  ADMIN_WINDOW_MINUTES,
  checkAdminCode,
  createAdminSessionCookie,
  getAdminOrNull,
} from "@/lib/admin-session";
import { clientIp } from "@/lib/ip";
import {
  adminLoginSchema,
  closeDateSchema,
  createInvestorSchema,
  phaseSchema,
  rowActionSchema,
} from "@/lib/validation/admin";

export type AdminLoginState = { error: string | null };

const GENERIC_ERROR = "That code did not work.";
const WINDOW_MINUTES = 15;

export async function adminLogin(
  _previous: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  const ip = clientIp(await headers());
  // Per-IP first. A blocked IP never touches the global counter, so one
  // noisy address cannot lock everyone else out.
  const perIp = await consume(`admin-login:${ip}`, 10, WINDOW_MINUTES);
  if (!perIp.allowed) return { error: GENERIC_ERROR };
  const global = await consume("admin-login:global", 100, WINDOW_MINUTES);
  if (!global.allowed) return { error: GENERIC_ERROR };

  const parsed = adminLoginSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success || !(await checkAdminCode(parsed.data.code))) {
    return { error: GENERIC_ERROR };
  }

  const { name, value, ...options } = await createAdminSessionCookie();
  (await cookies()).set(name, value, options);
  redirect("/admin");
}

/** Result of every admin write. `message` is plain language for the notice. */
export type AdminActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
  fieldErrors?: Record<string, string[] | undefined>;
  /** Submitted text echoed back after an error, since React resets the form. */
  values?: Record<string, string>;
};

const SESSION_ERROR = "Your admin session has ended. Reload the page and log in again.";
const RATE_ERROR = "Too many changes in a short time. Wait a few minutes and try again.";
const NO_OFFERING = "There is no offering yet. Run pnpm seed first.";

type Guard = { ok: true; ip: string } | { ok: false; state: AdminActionState };

/** Session first (no side effects without it), then the admin write limit. */
async function guard(): Promise<Guard> {
  if (!(await getAdminOrNull())) return { ok: false, state: error(SESSION_ERROR) };
  const ip = clientIp(await headers());
  const limit = await consume(`admin:${ip}`, ADMIN_LIMIT, ADMIN_WINDOW_MINUTES);
  if (!limit.allowed) return { ok: false, state: error(RATE_ERROR) };
  return { ok: true, ip };
}

function error(message: string, fieldErrors?: AdminActionState["fieldErrors"]): AdminActionState {
  return { status: "error", message, fieldErrors };
}

function success(message: string): AdminActionState {
  revalidatePath("/admin");
  return { status: "success", message };
}

export async function updatePhase(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const check = await guard();
  if (!check.ok) return check.state;

  const parsed = phaseSchema.safeParse({ phase: formData.get("phase") });
  if (!parsed.success) return error("Choose preview, open or closed.");

  const offering = await findCurrentOffering();
  if (!offering) return error(NO_OFFERING);

  const result = await setPhase(offering.id, parsed.data.phase);
  if (!result.ok) {
    if (result.code === "documents_missing") {
      return error(
        "The offering cannot open until every document is on the server and verified. Add the PDFs to the documents folder and run pnpm docs:sync.",
      );
    }
    if (result.code === "documents_placeholder") {
      return error(
        "The offering cannot open while any document is a placeholder. Replace every placeholder with the real PDF and run pnpm docs:sync.",
      );
    }
    return error(NO_OFFERING);
  }
  return success(`Phase saved as ${parsed.data.phase}.`);
}

export async function updateCloseDate(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const check = await guard();
  if (!check.ok) return check.state;

  const parsed = closeDateSchema.safeParse({ closeDate: formData.get("closeDate") ?? "" });
  if (!parsed.success) {
    const typed = formData.get("closeDate");
    return {
      ...error("Check the close date.", z.flattenError(parsed.error).fieldErrors),
      values: { closeDate: typeof typed === "string" ? typed.slice(0, 20) : "" },
    };
  }

  const offering = await findCurrentOffering();
  if (!offering) return error(NO_OFFERING);

  const closeDate = parsed.data.closeDate || null;
  await setCloseDate(offering.id, closeDate);
  return success(closeDate ? "Close date saved." : "Close date cleared.");
}

export async function addInvestor(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const check = await guard();
  if (!check.ok) return check.state;

  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    relationshipNote: formData.get("relationshipNote"),
  };
  const parsed = createInvestorSchema.safeParse(raw);
  if (!parsed.success) {
    const values = Object.fromEntries(
      Object.entries(raw).map(([key, value]) => [key, typeof value === "string" ? value.slice(0, 600) : ""]),
    );
    return { ...error("Check the highlighted fields.", z.flattenError(parsed.error).fieldErrors), values };
  }

  const offering = await findCurrentOffering();
  if (!offering) return error(NO_OFFERING);

  const investor = await createInvestor(parsed.data, offering.id);
  return success(`${investor.name} added. Their personal link is in the table below.`);
}

const STATUS_DONE: Record<StatusAction, string> = {
  set_accepted: "Subscription accepted.",
  clear_accepted: "Acceptance undone.",
  set_signed: "Marked as signed.",
  clear_signed: "Signed undone.",
  set_funded: "Marked as funded.",
  clear_funded: "Funded undone.",
  cancel: "Subscription cancelled.",
  uncancel: "Subscription restored.",
};

const STATUS_REFUSED: Record<StatusActionError, string> = {
  not_found: "That subscription no longer exists. Reload the page.",
  invalid_transition:
    "That change is not allowed from the subscription's current status. Reload the page to see the latest status.",
  sophisticated_cap:
    "Not allowed: 35 non-accredited investors are already accepted, the most this offering can take.",
  capacity: "Not restored: there are not enough units left to cover this subscription.",
};

/** Status actions and revocation from an investor row. */
export async function investorRowAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const check = await guard();
  if (!check.ok) return check.state;

  const parsed = rowActionSchema.safeParse({
    action: formData.get("action"),
    subscriptionId: formData.get("subscriptionId") ?? undefined,
    investorId: formData.get("investorId") ?? undefined,
  });
  if (!parsed.success) return error("That request was not understood. Reload the page.");

  const offering = await findCurrentOffering();
  if (!offering) return error(NO_OFFERING);

  if (parsed.data.action === "revoke") {
    const { investorId } = parsed.data;
    const investor = await getInvestorById(investorId);
    if (!investor || !(await hasOfferingAccess(investorId, offering.id))) {
      return error("That investor no longer exists. Reload the page.");
    }
    await revokeInvestor(investorId);
    return success(`${investor.name}'s link is revoked. It no longer opens the offering.`);
  }

  const { action, subscriptionId } = parsed.data;
  const result = await applyStatusAction(subscriptionId, offering.id, action, check.ip);
  if (!result.ok) return error(STATUS_REFUSED[result.code]);
  return success(STATUS_DONE[action]);
}
