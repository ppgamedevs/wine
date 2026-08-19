import { createTranslator } from "next-intl";
import { getLocale } from "next-intl/server";
import { DEFAULT_LOCALE, isAppLocale, type AppLocale } from "@/i18n/locale";
import enMessages from "@/messages/en/content.json";
import roMessages from "@/messages/ro/content.json";

const CONTENT_MESSAGES = {
  ro: roMessages,
  en: enMessages,
} as const;

export async function getContentLocale(): Promise<AppLocale> {
  const locale = await getLocale();
  return isAppLocale(locale) ? locale : DEFAULT_LOCALE;
}

export function getContentTranslator(locale: AppLocale) {
  return createTranslator({
    locale,
    messages: CONTENT_MESSAGES[locale],
  });
}

export function localizedDate(
  isoDate: string,
  locale: AppLocale,
): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;

  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
