"use client";

import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { alternateLocaleHref } from "@/i18n/paths";
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  isAppLocale,
  type AppLocale,
} from "@/i18n/locale";
import {
  mapEnglishTopListSlugToRomanian,
  mapRomanianTopListSlugToEnglish,
} from "@/lib/i18n/top-list-routes";

function localizedTopListSlug(
  slug: string,
  sourceLocale: AppLocale,
  targetLocale: AppLocale,
): string {
  if (sourceLocale === targetLocale) return slug;
  const mapped =
    sourceLocale === "ro"
      ? mapRomanianTopListSlugToEnglish(slug)
      : mapEnglishTopListSlugToRomanian(slug);
  return mapped ?? slug;
}

const LOCALE_LABELS: Record<AppLocale, "RO" | "EN"> = {
  ro: "RO",
  en: "EN",
};

export function LanguageSwitcher() {
  const pathname = usePathname();
  const requestedLocale = useLocale();
  const currentLocale = isAppLocale(requestedLocale)
    ? requestedLocale
    : DEFAULT_LOCALE;
  const t = useTranslations("Navigation");
  const alternatives = SUPPORTED_LOCALES.map((locale) => ({
    locale,
    href: alternateLocaleHref(pathname, locale, {
      topWineSlug: localizedTopListSlug,
    }),
  }));

  if (alternatives.some(({ href }) => href === null)) return null;

  return (
    <nav
      aria-label={t("languageSwitcher")}
      className="flex items-center rounded-md border border-wine/25 bg-card p-0.5 shadow-sm"
    >
      {alternatives.map(({ locale, href }) => {
        const isCurrent = locale === currentLocale;

        return (
          <a
            key={locale}
            href={href!}
            hrefLang={locale}
            lang={locale}
            aria-current={isCurrent ? "page" : undefined}
            aria-label={locale === "ro" ? t("romanian") : t("english")}
            className={`min-w-8 rounded border border-transparent px-2 py-1 text-center text-[11px] font-semibold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              isCurrent
                ? "bg-wine text-white shadow-sm"
                : "bg-background text-foreground hover:bg-wine/10 hover:text-wine"
            }`}
          >
            {LOCALE_LABELS[locale]}
          </a>
        );
      })}
    </nav>
  );
}
