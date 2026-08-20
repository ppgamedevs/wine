import "server-only";
import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const ADMIN_COOKIE = "vinintel_admin";
const ADMIN_SESSION_VERSION = "v1";
const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const ADMIN_SESSION_CLOCK_SKEW_SECONDS = 60;
const ADMIN_COOKIE_PATH = "/admin";

function constantTimeStringEqual(left: string, right: string): boolean {
  const leftDigest = createHash("sha256").update(left, "utf8").digest();
  const rightDigest = createHash("sha256").update(right, "utf8").digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

function signSessionPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload, "utf8").digest("base64url");
}

function adminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: ADMIN_COOKIE_PATH,
    priority: "high" as const,
  };
}

export function getAdminSecret(): string | undefined {
  return process.env.ADMIN_SECRET?.trim() || undefined;
}

export function createAdminSessionToken(
  secret: string,
  issuedAtMs: number = Date.now(),
  nonce: string = randomBytes(24).toString("base64url"),
): string {
  const issuedAt = Math.floor(issuedAtMs / 1000);
  const expiresAt = issuedAt + ADMIN_SESSION_MAX_AGE_SECONDS;
  const payload = [
    ADMIN_SESSION_VERSION,
    issuedAt,
    expiresAt,
    nonce,
  ].join(".");
  return `${payload}.${signSessionPayload(payload, secret)}`;
}

export function validateAdminSessionToken(
  token: string,
  secret: string,
  nowMs: number = Date.now(),
): boolean {
  const parts = token.split(".");
  if (parts.length !== 5) return false;

  const [version, issuedAtText, expiresAtText, nonce, signature] = parts;
  if (
    version !== ADMIN_SESSION_VERSION ||
    !/^\d+$/.test(issuedAtText) ||
    !/^\d+$/.test(expiresAtText) ||
    !/^[A-Za-z0-9_-]{16,128}$/.test(nonce) ||
    !/^[A-Za-z0-9_-]{43}$/.test(signature)
  ) {
    return false;
  }

  const issuedAt = Number(issuedAtText);
  const expiresAt = Number(expiresAtText);
  const now = Math.floor(nowMs / 1000);
  if (
    !Number.isSafeInteger(issuedAt) ||
    !Number.isSafeInteger(expiresAt) ||
    expiresAt - issuedAt !== ADMIN_SESSION_MAX_AGE_SECONDS ||
    issuedAt > now + ADMIN_SESSION_CLOCK_SKEW_SECONDS ||
    expiresAt <= now
  ) {
    return false;
  }

  const payload = parts.slice(0, 4).join(".");
  const expectedSignature = signSessionPayload(payload, secret);
  return constantTimeStringEqual(signature, expectedSignature);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const secret = getAdminSecret();
  if (!secret) return false;
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  return token ? validateAdminSessionToken(token, secret) : false;
}

export async function requireAdmin(): Promise<void> {
  const secret = getAdminSecret();
  if (!secret) {
    redirect("/admin/login?error=config");
  }
  const ok = await isAdminAuthenticated();
  if (!ok) {
    redirect("/admin/login");
  }
}

export async function setAdminSession(): Promise<void> {
  const secret = getAdminSecret();
  if (!secret) {
    throw new Error("ADMIN_SECRET is not configured.");
  }

  const issuedAtMs = Date.now();
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, createAdminSessionToken(secret, issuedAtMs), {
    ...adminCookieOptions(),
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    expires: new Date(
      issuedAtMs + ADMIN_SESSION_MAX_AGE_SECONDS * 1000,
    ),
  });
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, "", {
    ...adminCookieOptions(),
    maxAge: 0,
    expires: new Date(0),
  });
}

export function verifyAdminSecret(candidate: string): boolean {
  const secret = getAdminSecret();
  if (!secret) return false;
  return constantTimeStringEqual(candidate.trim(), secret);
}
