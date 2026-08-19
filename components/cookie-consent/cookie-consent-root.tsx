import {
  CookieConsentClient,
  type CookieConsentCopy,
} from "@/components/cookie-consent/cookie-consent-client";
import { getDiscoveryI18n } from "@/lib/i18n/discovery";

export async function CookieConsentRoot() {
  const { locale, t } = await getDiscoveryI18n();
  const copy: CookieConsentCopy = {
    ariaLabel: t("Cookies.ariaLabel"),
    heading: t("Cookies.heading"),
    descriptionBefore: t("Cookies.descriptionBefore"),
    cookiePolicy: t("Cookies.cookiePolicy"),
    and: t("Cookies.and"),
    privacyPolicy: t("Cookies.privacyPolicy"),
    accept: t("Cookies.accept"),
  };

  return <CookieConsentClient copy={copy} locale={locale} />;
}
