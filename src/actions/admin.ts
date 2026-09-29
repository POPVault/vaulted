"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { consume } from "@/data/rateLimit";
import { checkAdminCode, createAdminSessionCookie } from "@/lib/admin-session";
import { clientIp } from "@/lib/ip";
import { adminLoginSchema } from "@/lib/validation/admin";

export type AdminLoginState = { error: string | null };

const GENERIC_ERROR = "That code did not work.";
const WINDOW_MINUTES = 15;

export async function adminLogin(
  _previous: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  const ip = clientIp(await headers());
  // Both limits are consumed on every attempt; either being over rejects.
  const perIp = await consume(`admin-login:${ip}`, 10, WINDOW_MINUTES);
  const global = await consume("admin-login:global", 100, WINDOW_MINUTES);
  if (!perIp.allowed || !global.allowed) return { error: GENERIC_ERROR };

  const parsed = adminLoginSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success || !(await checkAdminCode(parsed.data.code))) {
    return { error: GENERIC_ERROR };
  }

  const { name, value, ...options } = await createAdminSessionCookie();
  (await cookies()).set(name, value, options);
  redirect("/admin");
}
