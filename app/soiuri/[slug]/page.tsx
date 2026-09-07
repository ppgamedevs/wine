import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { GrapeEncyclopedia } from "@/components/oenology/grape-encyclopedia";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import type { AppLocale } from "@/i18n/locale";
import { localizedHref } from "@/i18n/paths";
import { filterWinesByGrapeVariety } from "@/lib/grape-variety-index";
import { localizedRobots } from "@/lib/i18n/indexing";
import { getJournalArticlesForLocale } from "@/lib/i18n/journal-content";
import { getLocalizedResolvableTopListRoutes } from "@/lib/i18n/top-list-routes";
import { getJournalArticleBySlug } from "@/lib/journal";
import {
  catalogEntryFromGuide,
  getAllGrapeGuideSlugs,
  getGrapeGuide,
} from "@/lib/oenology";
import {
  buildLocalizedAlternates,
  getPseoMessages,
  localizedWineHref,
  openGraphLocale,
} from "@/lib/i18n/pseo";
import { getWinesForSommelier } from "@/lib/queries";
import {
  absoluteUrl,
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  SITE,
} from "@/lib/seo";
import { getTopWinesByValue } from "@/lib/top-lists";

export const revalidate = 3600;
export const dynamicParams = true;

interface SoiuriPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAllGrapeGuideSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: SoiuriPageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = (await getLocale()) as AppLocale;
  const guide = getGrapeGuide(slug);
  if (!guide) {
    return {
      title: getPseoMessages(locale).common.notFound,
      robots: { index: false, follow: true },
    };
  }

  const copy = guide.copy[locale];
  const path = localizedHref(locale, "grapeVariety", { slug });
  const url = absoluteUrl(path);

  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
    robots: localizedRobots(locale),
    alternates: buildLocalizedAlternates(
      locale,
      localizedHref("ro", "grapeVariety", { slug }),
      localizedHref("en", "grapeVariety", { slug }),
    ),
    openGraph: {
      type: "article",
      locale: openGraphLocale(locale),
      url,
      siteName: SITE.name,
      title: `${copy.metaTitle} | VinIntel`,
      description: copy.metaDescription,
    },
    twitter: {
      card: "summary_large_image",
      title: `${copy.metaTitle} | VinIntel`,
      description: copy.metaDescription,
    },
  };
}

export default async function SoiuriPage({ params }: SoiuriPageProps) {
  const { slug } = await params;
  const locale = (await getLocale()) as AppLocale;
  const guide = getGrapeGuide(slug);
  if (!guide) notFound();

  const messages = getPseoMessages(locale);
  const copy = guide.copy[locale];
  const allWines = await getWinesForSommelier();
  const grapeWines = filterWinesByGrapeVariety(
    allWines,
    catalogEntryFromGuide(guide),
  );
  const topWines = getTopWinesByValue(grapeWines, 6);
  const grapeRanking = getLocalizedResolvableTopListRoutes(allWines, [slug]).find(
    (route) =>
      route.definition.kind === "grape" && route.definition.grapeSlug === slug,
  );
  const topListPath = grapeRanking
    ? localizedHref(locale, "topWine", {
        slug: locale === "en" ? grapeRanking.enSlug : grapeRanking.roSlug,
      })
    : null;

  const related = guide.relatedSlugs
    .map((relatedSlug) => getGrapeGuide(relatedSlug))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const journalSources = guide.journalSlugs
    .map((articleSlug) => getJournalArticleBySlug(articleSlug))
    .filter((article): article is NonNullable<typeof article> => Boolean(article));
  const journalArticles = (
    await getJournalArticlesForLocale(journalSources, locale)
  ).map((article) => ({ slug: article.slug, title: article.title }));

  const path = localizedHref(locale, "grapeVariety", { slug });
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    inLanguage: locale === "en" ? "en" : "ro",
    headline: copy.metaTitle,
    description: copy.metaDescription,
    about: {
      "@type": "Thing",
      name: copy.name,
      alternateName: copy.alsoKnownAs,
    },
    author: {
      "@type": "Organization",
      name: SITE.name,
      url: SITE.url,
    },
    publisher: {
      "@type": "Organization",
      name: SITE.name,
      url: SITE.url,
      logo: absoluteUrl("/icon.svg"),
    },
    mainEntityOfPage: absoluteUrl(path),
  };

  const itemListJsonLd =
    topWines.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          inLanguage: locale === "en" ? "en" : "ro",
          name:
            locale === "en"
              ? `Wines made with ${copy.name}`
              : `Vinuri ${copy.name}`,
          numberOfItems: topWines.length,
          itemListElement: topWines.map((wine, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: absoluteUrl(localizedWineHref(locale, wine)),
            name: wine.name,
          })),
        }
      : null;

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: messages.common.home, path: localizedHref(locale, "home") },
    {
      name: messages.grape.breadcrumbGrapes,
      path: localizedHref(locale, "grapeVarieties"),
    },
    { name: copy.name, path },
  ]);

  const jsonLd = [
    articleJsonLd,
    breadcrumbJsonLd,
    buildFaqJsonLd(copy.faq),
    ...(itemListJsonLd ? [itemListJsonLd] : []),
  ];

  return (
    <>
      <JsonLd data={jsonLd} id="soiuri" />
      <SiteHeader />
      <GrapeEncyclopedia
        locale={locale}
        guide={guide}
        wines={topWines}
        related={related}
        journalArticles={journalArticles}
        topListPath={topListPath}
        messages={messages}
      />
      <SiteFooter />
    </>
  );
}
