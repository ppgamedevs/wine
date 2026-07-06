"use client";

import { GoogleAnalytics } from "@next/third-parties/google";
import { useEffect, useState } from "react";
import {
  COOKIE_CONSENT_VALUE,
  readCookieConsentFromDocument,
  type CookieConsentStatus,
} from "@/lib/cookie-consent";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();

export function ConsentAwareGoogleAnalytics({
  consent,
}: {
  consent: CookieConsentStatus;
}) {
  const [enabled, setEnabled] = useState(
    consent === COOKIE_CONSENT_VALUE,
  );

  useEffect(() => {
    setEnabled(readCookieConsentFromDocument() === COOKIE_CONSENT_VALUE);
  }, [consent]);

  useEffect(() => {
    const syncConsent = () => {
      setEnabled(readCookieConsentFromDocument() === COOKIE_CONSENT_VALUE);
    };

    window.addEventListener("vinintel:cookie-consent", syncConsent);
    return () => window.removeEventListener("vinintel:cookie-consent", syncConsent);
  }, []);

  if (!GA_MEASUREMENT_ID || !enabled) return null;

  return <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />;
}
