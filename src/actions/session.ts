"use server";

import { redirect } from "next/navigation";
import { INVITE_LINK_ERROR, enterInviteSchema, extractInviteToken } from "@/lib/validation/invite";

export type EnterInviteState = { error: string | null };


/**
 * Extracts the token from a pasted invite link or bare token and hands off to
 * /invest/i/<token>, which validates, rate limits and sets the session.
 */
export async function enterInviteLink(
  _previous: EnterInviteState,
  formData: FormData,
): Promise<EnterInviteState> {
  const parsed = enterInviteSchema.safeParse({ link: formData.get("link") });
  const token = parsed.success ? extractInviteToken(parsed.data.link) : null;
  if (!token) return { error: INVITE_LINK_ERROR };
  redirect(`/invest/i/${token}`);
}
