export const SUPPORTED_LOCALES = ["ro", "en"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "ro";

export function isAppLocale(value: string | undefined): value is AppLocale {
  return SUPPORTED_LOCALES.some((locale) => locale === value);
}
