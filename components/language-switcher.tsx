"use client";

import Link from "next/link";
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
      className="flex items-center rounded-md border border-border/70 bg-background/70 p-0.5"
    >
      {alternatives.map(({ locale, href }) => {
        const isCurrent = locale === currentLocale;

        return (
          <Link
            key={locale}
            href={href!}
            hrefLang={locale}
            lang={locale}
            aria-current={isCurrent ? "page" : undefined}
            aria-label={locale === "ro" ? t("romanian") : t("english")}
            className={`rounded px-2 py-1 text-[11px] font-semibold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              isCurrent
                ? "bg-wine text-wine-foreground"
                : "text-muted-foreground hover:text-wine"
            }`}
          >
            {LOCALE_LABELS[locale]}
          </Link>
        );
      })}
    </nav>
  );
}
