import { z } from "zod";

/** Invite tokens: 26 characters from the unambiguous alphabet in src/data/investors.ts. */
export const INVITE_TOKEN_PATTERN = /^[A-HJ-NP-Z2-9]{26}$/;

export function isInviteToken(value: string): boolean {
  return INVITE_TOKEN_PATTERN.test(value);
}

/**
 * Pulls the token out of a pasted invite link ("https://.../invest/i/<token>")
 * or a bare token. Returns null when there is no valid token.
 */
export function extractInviteToken(input: string): string | null {
  const text = input.trim();
  if (isInviteToken(text)) return text;
  const match = /\/invest\/i\/([^/?#\s]+)\/?(?:[?#].*)?$/.exec(text);
  if (match && isInviteToken(match[1])) return match[1];
  return null;
}

export const enterInviteSchema = z.object({
  link: z.string().trim().min(1).max(500),
});

/** The one message for every failed invite link, so nothing is revealed about why. */
export const INVITE_LINK_ERROR =
  "That link did not work. Check it and try again, or ask the person who invited you for a new one.";
