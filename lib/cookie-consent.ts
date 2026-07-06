export const COOKIE_CONSENT_STORAGE_KEY = "vinintel_cookie_consent";
export const COOKIE_CONSENT_COOKIE_NAME = "vinintel_cookie_consent";
export const COOKIE_CONSENT_VALUE = "accepted";
export const COOKIE_CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export type CookieConsentStatus = "unknown" | "accepted";

export function readCookieConsentFromDocument(): CookieConsentStatus {
  if (typeof document === "undefined") return "unknown";

  try {
    const stored = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (stored === COOKIE_CONSENT_VALUE) return "accepted";
  } catch {
    // localStorage unavailable
  }

  const match = document.cookie.match(
    new RegExp(`(?:^|; )${COOKIE_CONSENT_COOKIE_NAME}=([^;]*)`),
  );
  if (match?.[1] === COOKIE_CONSENT_VALUE) return "accepted";

  return "unknown";
}

export function persistCookieConsent(): void {
  if (typeof document === "undefined") return;

  try {
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, COOKIE_CONSENT_VALUE);
  } catch {
    // localStorage unavailable
  }

  document.cookie = [
    `${COOKIE_CONSENT_COOKIE_NAME}=${COOKIE_CONSENT_VALUE}`,
    "path=/",
    `max-age=${COOKIE_CONSENT_MAX_AGE_SECONDS}`,
    "SameSite=Lax",
  ].join("; ");
}
