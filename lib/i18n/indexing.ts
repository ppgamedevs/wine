import type { AppLocale } from "@/i18n/locale";

export function isEnglishIndexingEnabled(): boolean {
  return process.env.ENGLISH_INDEXING_ENABLED === "true";
}

export function localeMayBeIndexed(locale: AppLocale): boolean {
  return locale === "ro" || isEnglishIndexingEnabled();
}

export function localizedRobots(locale: AppLocale): {
  index: boolean;
  follow: boolean;
} {
  return {
    index: localeMayBeIndexed(locale),
    follow: true,
  };
}

