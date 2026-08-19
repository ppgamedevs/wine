import type { AppLocale } from "@/i18n/locale";
import { localizedHref } from "@/i18n/paths";

export const SITE = {
  name: "VinIntel",
  url: "https://www.vinintel.ro",
  locale: "ro_RO",
  language: "ro-RO",
  description:
    "Ghidul inteligent al vinurilor romanesti. Recomandari clare, oneste si rapide, cu un somelier AI care intelege mancarea, bugetul si ocazia ta.",
  twitter: "@vinintel",
} as const;

export function absoluteUrl(path = ""): string {
  if (!path) return SITE.url;
  return `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Default Open Graph image descriptor used as a fallback across pages. */
export function defaultOgImage(title: string) {
  return {
    url: absoluteUrl("/opengraph-image"),
    width: 1200,
    height: 630,
    alt: title,
  };
}

const ENGLISH_SITE_DESCRIPTION =
  "An independent guide to Romanian wines with clear recommendations, prices in RON, transparent scores and an AI Sommelier.";

export function buildOrganizationJsonLd(locale: AppLocale) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url: absoluteUrl(localizedHref(locale, "home")),
    logo: absoluteUrl("/icon.svg"),
    description:
      locale === "en" ? ENGLISH_SITE_DESCRIPTION : SITE.description,
    sameAs: [
      "https://www.facebook.com/vinintel",
      "https://www.instagram.com/vinintel",
    ],
    areaServed: {
      "@type": "Country",
      name: "Romania",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "somelier@vinintel.ro",
      areaServed: "RO",
      availableLanguage: [locale === "en" ? "English" : "Romanian"],
    },
  };
}

export function buildWebsiteJsonLd(locale: AppLocale) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: absoluteUrl(localizedHref(locale, "home")),
    inLanguage: locale === "en" ? "en" : SITE.language,
    description:
      locale === "en" ? ENGLISH_SITE_DESCRIPTION : SITE.description,
    publisher: {
      "@type": "Organization",
      name: SITE.name,
      url: SITE.url,
      logo: absoluteUrl("/icon.svg"),
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${absoluteUrl(localizedHref(locale, "search"))}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export const organizationJsonLd = buildOrganizationJsonLd("ro");
export const websiteJsonLd = buildWebsiteJsonLd("ro");

export interface BreadcrumbStep {
  name: string;
  path: string;
}

export function buildBreadcrumbJsonLd(steps: BreadcrumbStep[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: steps.map((step, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: step.name,
      item: absoluteUrl(step.path),
    })),
  };
}

export interface FaqEntry {
  question: string;
  answer: string;
}

export function buildFaqJsonLd(items: FaqEntry[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}
