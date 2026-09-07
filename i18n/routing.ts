import { defineRouting } from "next-intl/routing";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/i18n/locale";

export const pathnames = {
  "/": "/",
  "/vinuri": {
    ro: "/vinuri",
    en: "/wines",
  },
  "/wines/[slug]": "/wines/[slug]",
  "/crame": {
    ro: "/crame",
    en: "/wineries",
  },
  "/wineries/[slug]": "/wineries/[slug]",
  "/topuri": {
    ro: "/topuri",
    en: "/top-wines",
  },
  "/topuri/[slug]": {
    ro: "/topuri/[slug]",
    en: "/top-wines/[slug]",
  },
  "/journal": "/journal",
  "/journal/[slug]": "/journal/[slug]",
  "/regiuni/[slug]": {
    ro: "/regiuni/[slug]",
    en: "/regions/[slug]",
  },
  "/soiuri": {
    ro: "/soiuri",
    en: "/grape-varieties",
  },
  "/soiuri/[slug]": {
    ro: "/soiuri/[slug]",
    en: "/grape-varieties/[slug]",
  },
  "/vin-pentru/[dish]": {
    ro: "/vin-pentru/[dish]",
    en: "/wine-for/[dish]",
  },
  "/studii/[slug]": {
    ro: "/studii/[slug]",
    en: "/studies/[slug]",
  },
  "/cauta": {
    ro: "/cauta",
    en: "/search",
  },
  "/ai-sommelier": "/ai-sommelier",
  "/cum-functioneaza-scorurile": {
    ro: "/cum-functioneaza-scorurile",
    en: "/how-scores-work",
  },
  "/adauga-vin": {
    ro: "/adauga-vin",
    en: "/add-wine",
  },
  "/claim-your-winery": "/claim-your-winery",
  "/politica-confidentialitate": {
    ro: "/politica-confidentialitate",
    en: "/privacy-policy",
  },
  "/politica-cookies": {
    ro: "/politica-cookies",
    en: "/cookie-policy",
  },
  // Romanian-only permanent aliases. Their pages reject non-default locales.
  "/vinuri/[slug]": {
    ro: "/vinuri/[slug]",
  },
  "/crame/[slug]": {
    ro: "/crame/[slug]",
  },
  "/perechi/[dish]": {
    ro: "/perechi/[dish]",
  },
  "/jurnal-vin": {
    ro: "/jurnal-vin",
  },
} as const;

export const routing = defineRouting({
  locales: SUPPORTED_LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "as-needed",
  localeDetection: false,
  localeCookie: false,
  pathnames,
});
