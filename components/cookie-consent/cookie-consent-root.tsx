"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Cookie } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ConsentAwareGoogleAnalytics } from "@/components/cookie-consent/consent-aware-google-analytics";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  COOKIE_CONSENT_VALUE,
  persistCookieConsent,
  readCookieConsentFromDocument,
  type CookieConsentStatus,
} from "@/lib/cookie-consent";
import { EASE_OUT } from "@/lib/motion";

export function CookieConsentRoot() {
  const [consent, setConsent] = useState<CookieConsentStatus>("unknown");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setConsent(readCookieConsentFromDocument());
  }, []);

  const acceptCookies = useCallback(() => {
    persistCookieConsent();
    setConsent(COOKIE_CONSENT_VALUE);
    window.dispatchEvent(new CustomEvent("vinintel:cookie-consent"));
  }, []);

  const showBanner = mounted && consent !== COOKIE_CONSENT_VALUE;

  return (
    <>
      <ConsentAwareGoogleAnalytics consent={consent} />

      <AnimatePresence>
        {showBanner ? (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.35, ease: EASE_OUT }}
            className="fixed inset-x-0 bottom-0 z-[100] px-4 pb-4 sm:px-6 sm:pb-6"
            role="dialog"
            aria-live="polite"
            aria-label="Informare cookie-uri"
          >
            <Card className="mx-auto max-w-4xl border-wine/15 bg-card/95 py-0 shadow-xl shadow-wine/10 backdrop-blur-md">
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-wine/10 text-wine">
                    <Cookie className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="space-y-2 text-sm leading-relaxed text-foreground/90">
                    <p className="font-medium text-foreground">
                      Cookie-uri si confidentialitate
                    </p>
                    <p className="text-muted-foreground">
                      Folosim cookie-uri esentiale si, cu acordul tau, cookie-uri
                      analitice pentru a masura traficul si a imbunatati VinIntel.ro.
                      Continuand, accepti{" "}
                      <Link
                        href="/politica-cookies"
                        className="font-medium text-wine underline-offset-4 hover:underline"
                      >
                        Politica de cookies
                      </Link>{" "}
                      si{" "}
                      <Link
                        href="/politica-confidentialitate"
                        className="font-medium text-wine underline-offset-4 hover:underline"
                      >
                        Politica de confidentialitate
                      </Link>
                      .
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={acceptCookies}
                  className="w-full shrink-0 bg-wine text-wine-foreground hover:bg-wine/90 sm:w-auto sm:min-w-[140px]"
                >
                  Accept
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
