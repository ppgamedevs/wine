import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { GrapeHub } from "@/components/oenology/grape-hub";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import type { AppLocale } from "@/i18n/locale";
import { localizedHref } from "@/i18n/paths";
import { filterWinesByGrapeVariety } from "@/lib/grape-variety-index";
import {
  catalogEntryFromGuide,
  GRAPE_GUIDES,
  indigenousGrapeGuides,
  internationalGrapeGuides,
} from "@/lib/oenology";
import {
  buildLocalizedAlternates,
  getPseoMessages,
  openGraphLocale,
} from "@/lib/i18n/pseo";
import { localizedRobots } from "@/lib/i18n/indexing";
import { getWinesForSommelier } from "@/lib/queries";
import { absoluteUrl, buildBreadcrumbJsonLd, SITE } from "@/lib/seo";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as AppLocale;
  const copy = getPseoMessages(locale).grape;
  const path = localizedHref(locale, "grapeVarieties");
  const url = absoluteUrl(path);

  return {
    title: copy.hubTitle,
    description: copy.hubDescription,
    robots: localizedRobots(locale),
    alternates: buildLocalizedAlternates(
      locale,
      localizedHref("ro", "grapeVarieties"),
      localizedHref("en", "grapeVarieties"),
    ),
    openGraph: {
      type: "website",
      locale: openGraphLocale(locale),
      url,
      siteName: SITE.name,
      title: `${copy.hubTitle} | VinIntel`,
      description: copy.hubDescription,
    },
    twitter: {
      card: "summary_large_image",
      title: `${copy.hubTitle} | VinIntel`,
      description: copy.hubDescription,
    },
  };
}

export default async function SoiuriIndexPage() {
  const locale = (await getLocale()) as AppLocale;
  const messages = getPseoMessages(locale);
  const allWines = await getWinesForSommelier();
  const wineCounts = Object.fromEntries(
    GRAPE_GUIDES.map((guide) => [
      guide.slug,
      filterWinesByGrapeVariety(allWines, catalogEntryFromGuide(guide)).length,
    ]),
  ) as Record<string, number>;

  const path = localizedHref(locale, "grapeVarieties");
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    inLanguage: locale === "en" ? "en" : "ro",
    name: messages.grape.hubTitle,
    numberOfItems: GRAPE_GUIDES.length,
    itemListElement: GRAPE_GUIDES.map((guide, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(
        localizedHref(locale, "grapeVariety", { slug: guide.slug }),
      ),
      name: guide.copy[locale].name,
    })),
  };
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: messages.common.home, path: localizedHref(locale, "home") },
    { name: messages.grape.breadcrumbGrapes, path },
  ]);

  return (
    <>
      <JsonLd data={[itemListJsonLd, breadcrumbJsonLd]} id="soiuri-hub" />
      <SiteHeader />
      <GrapeHub
        locale={locale}
        indigenous={indigenousGrapeGuides()}
        international={internationalGrapeGuides()}
        wineCounts={wineCounts}
        messages={messages}
      />
      <SiteFooter />
    </>
  );
}
