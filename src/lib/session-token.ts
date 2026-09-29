/**
 * Signed session tokens. WebCrypto and web globals only, no Node APIs and no
 * database, so this module runs in proxy.ts as well as on the server.
 *
 * Token: base64url(json { sub, purpose, iat, exp }) + "." + base64url(sig)
 * sig:   HMAC-SHA256(purposeKey, payloadPart)
 * purposeKey = HMAC-SHA256(key = SESSION_SECRET, message = purpose)
 */

export type SessionPurpose = "investor" | "admin";

export type TokenPayload = {
  sub: string;
  purpose: SessionPurpose;
  /** Issued at, seconds since epoch. */
  iat: number;
  /** Expires at, seconds since epoch. */
  exp: number;
};

export const INVESTOR_COOKIE = "vinv";
export const ADMIN_COOKIE = "vadm";

export const INVESTOR_MAX_AGE = 7 * 24 * 60 * 60;
export const ADMIN_MAX_AGE = 12 * 60 * 60;

const MIN_SECRET_LENGTH = 32;
/** Allowed clock skew for `iat`, in seconds. */
const CLOCK_SKEW = 60;

const encoder = new TextEncoder();

function toBytes(text: string): Uint8Array<ArrayBuffer> {
  return encoder.encode(text) as Uint8Array<ArrayBuffer>;
}

function base64urlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(text: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]+$/.test(text)) return null;
  const padded = text.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((text.length + 3) % 4);
  try {
    const binary = atob(padded);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

/** Compares two byte arrays in time that depends only on their lengths. */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  let diff = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

const keyCache = new Map<SessionPurpose, { secret: string; key: Promise<CryptoKey> }>();

async function derivePurposeKey(secret: string, purpose: SessionPurpose): Promise<CryptoKey> {
  const master = await crypto.subtle.importKey(
    "raw",
    toBytes(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const derived = await crypto.subtle.sign("HMAC", master, toBytes(purpose));
  return crypto.subtle.importKey("raw", derived, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

/** The signing key for a purpose, or null when SESSION_SECRET is missing or too short. */
function purposeKey(purpose: SessionPurpose): Promise<CryptoKey> | null {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) return null;
  const cached = keyCache.get(purpose);
  if (cached && cached.secret === secret) return cached.key;
  const key = derivePurposeKey(secret, purpose);
  keyCache.set(purpose, { secret, key });
  return key;
}

async function signPart(key: CryptoKey, payloadPart: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, toBytes(payloadPart)));
}

export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/** Signs a new token. Throws when SESSION_SECRET is not configured. */
export async function signToken(
  sub: string,
  purpose: SessionPurpose,
  maxAgeSeconds: number,
): Promise<string> {
  const key = purposeKey(purpose);
  if (!key) throw new Error(`SESSION_SECRET must be set (at least ${MIN_SECRET_LENGTH} characters)`);
  const iat = nowSeconds();
  const payload: TokenPayload = { sub, purpose, iat, exp: iat + maxAgeSeconds };
  const payloadPart = base64urlEncode(toBytes(JSON.stringify(payload)));
  const signature = await signPart(await key, payloadPart);
  return `${payloadPart}.${base64urlEncode(signature)}`;
}

/**
 * Verifies signature (with the key for `purpose`), the payload `purpose` field
 * and expiry. Returns the payload, or null for anything invalid. Never throws.
 */
export async function verifyToken(
  value: string | undefined | null,
  purpose: SessionPurpose,
): Promise<TokenPayload | null> {
  if (!value || value.length > 1024) return null;
  const parts = value.split(".");
  if (parts.length !== 2) return null;
  const [payloadPart, signaturePart] = parts;

  const key = purposeKey(purpose);
  if (!key) return null;
  const given = base64urlDecode(signaturePart);
  if (!given) return null;
  const expected = await signPart(await key, payloadPart);
  if (!timingSafeEqual(given, expected)) return null;

  const payloadBytes = base64urlDecode(payloadPart);
  if (!payloadBytes) return null;
  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder().decode(payloadBytes));
  } catch {
    return null;
  }
  if (typeof payload !== "object" || payload === null) return null;
  const { sub, purpose: claimed, iat, exp } = payload as Record<string, unknown>;
  if (claimed !== purpose) return null;
  if (typeof sub !== "string" || sub.length === 0) return null;
  if (!Number.isInteger(iat) || !Number.isInteger(exp)) return null;
  const now = nowSeconds();
  if ((exp as number) <= now || (iat as number) > now + CLOCK_SKEW) return null;
  return { sub, purpose, iat: iat as number, exp: exp as number };
}

export type CookieDescriptor = {
  name: string;
  value: string;
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  maxAge: number;
};

/** Cookie attributes shared by both session cookies. */
export function sessionCookie(name: string, value: string, maxAge: number): CookieDescriptor {
  return {
    name,
    value,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  };
}
