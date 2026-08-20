import type { Metadata } from "next";
import { Wine } from "lucide-react";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { LocalizedSiteFooter } from "@/components/localized-site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  WineCatalogDirectory,
  type WineCatalogDirectoryCopy,
} from "@/components/wines/wine-catalog-directory";
import { Button } from "@/components/ui/button";
import { localizedHref } from "@/i18n/paths";
import { getDiscoveryI18n } from "@/lib/i18n/discovery";
import { buildLocalizedPublicWineCatalogItem } from "@/lib/public-wine-card";
import {
  parsePublicWineCatalogRequest,
  type PublicCatalogSearchParams,
} from "@/lib/public-wine-card-types";
import { getCatalogWinePage } from "@/lib/queries";
import {
  absoluteUrl,
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  SITE,
} from "@/lib/seo";
import {
  MIN_RECOMMENDED_VALUE_SCORE,
  VALUE_SCORE_EXCEPTIONAL_MIN,
} from "@/lib/value-score-thresholds";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getDiscoveryI18n();
  const path = localizedHref(locale, "wines");

  return {
    title: t("Catalog.metadata.title"),
    description: t("Catalog.metadata.description"),
    keywords:
      locale === "en"
        ? [
            "Romanian wines",
            "wine catalog",
            "Value Score",
            "Romanian red wine",
            "Romanian white wine",
          ]
        : [
            "vinuri romanesti",
            "catalog vinuri",
            "Value Score",
            "vin rosu romanesc",
            "vin alb romanesc",
          ],
    alternates: {
      canonical: absoluteUrl(path),
      languages: {
        ro: absoluteUrl(localizedHref("ro", "wines")),
        en: absoluteUrl(localizedHref("en", "wines")),
        "x-default": absoluteUrl(localizedHref("ro", "wines")),
      },
    },
    openGraph: {
      type: "website",
      locale: locale === "en" ? "en_GB" : SITE.locale,
      url: absoluteUrl(path),
      siteName: SITE.name,
      title: t("Catalog.metadata.openGraphTitle"),
      description: t("Catalog.metadata.openGraphDescription"),
    },
    twitter: {
      card: "summary_large_image",
      site: SITE.twitter,
      title: t("Catalog.metadata.openGraphTitle"),
      description: t("Catalog.metadata.openGraphDescription"),
    },
  };
}

interface VinuriCatalogPageProps {
  searchParams?: Promise<PublicCatalogSearchParams>;
}

export default async function VinuriCatalogPage({
  searchParams,
}: VinuriCatalogPageProps) {
  const params = (await searchParams) ?? {};
  const request = parsePublicWineCatalogRequest(params);
  const [{ locale, t }, catalog] = await Promise.all([
    getDiscoveryI18n(),
    getCatalogWinePage(request),
  ]);
  const publicCatalog = catalog.items.map((wine) =>
    buildLocalizedPublicWineCatalogItem(wine, locale),
  );
  const path = localizedHref(locale, "wines");
  const faq = [
    {
      question: t("Catalog.faq.value.question"),
      answer: t("Catalog.faq.value.answer"),
    },
    {
      question: t("Catalog.faq.search.question"),
      answer: t("Catalog.faq.search.answer"),
    },
    {
      question: t("Catalog.faq.add.question"),
      answer: t("Catalog.faq.add.answer"),
    },
  ];
  const directoryCopy: WineCatalogDirectoryCopy = {
    searchPlaceholder: t("Catalog.directory.searchPlaceholder"),
    searchAria: t("Catalog.directory.searchAria"),
    typeLabel: t("Catalog.directory.typeLabel"),
    sweetnessLabel: t("Catalog.directory.sweetnessLabel"),
    sortAria: t("Catalog.directory.sortAria"),
    priceAria: t("Catalog.directory.priceAria"),
    scoreAria: t("Catalog.directory.scoreAria"),
    apply: t("Catalog.directory.apply"),
    reset: t("Catalog.directory.reset"),
    foundOne: t("Catalog.directory.foundOne"),
    foundMany: t("Catalog.directory.foundMany"),
    noResults: t("Catalog.directory.noResults"),
    noResultsHint: t("Catalog.directory.noResultsHint"),
    resetFilters: t("Catalog.directory.resetFilters"),
    previous: t("Catalog.directory.pagination.previous"),
    next: t("Catalog.directory.pagination.next"),
    page: t("Catalog.directory.pagination.page", {
      page: "{page}",
      totalPages: "{totalPages}",
    }),
    types: {
      all: t("Catalog.directory.types.all"),
      red: t("Catalog.directory.types.red"),
      white: t("Catalog.directory.types.white"),
      rose: t("Catalog.directory.types.rose"),
      sparkling: t("Catalog.directory.types.sparkling"),
      orange: t("Catalog.directory.types.orange"),
      dessert: t("Catalog.directory.types.dessert"),
    },
    sweetness: {
      all: t("Catalog.directory.sweetness.all"),
      sec: t("Catalog.directory.sweetness.sec"),
      demisec: t("Catalog.directory.sweetness.demisec"),
      demidulce: t("Catalog.directory.sweetness.demidulce"),
      dulce: t("Catalog.directory.sweetness.dulce"),
    },
    sort: {
      "value-desc": t("Catalog.directory.sort.value"),
      "price-asc": t("Catalog.directory.sort.priceAsc"),
      "price-desc": t("Catalog.directory.sort.priceDesc"),
      "name-asc": t("Catalog.directory.sort.name"),
    },
    prices: {
      all: t("Catalog.directory.prices.all"),
      under50: t("Catalog.directory.prices.under50"),
      "50-100": t("Catalog.directory.prices.from50To100"),
      over100: t("Catalog.directory.prices.over100"),
    },
    scores: {
      all: t("Catalog.directory.scores.all"),
      recommended: t("Catalog.directory.scores.recommended", {
        score: MIN_RECOMMENDED_VALUE_SCORE,
      }),
      exceptional: t("Catalog.directory.scores.exceptional", {
        score: VALUE_SCORE_EXCEPTIONAL_MIN,
      }),
    },
  };

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: t("Catalog.breadcrumbHome"), path: localizedHref(locale, "home") },
    { name: t("Catalog.breadcrumbCurrent"), path },
  ]);

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: t("Catalog.listName"),
    numberOfItems: catalog.items.length,
    itemListElement: catalog.items.map((wine, index) => ({
      "@type": "ListItem",
      position: (catalog.page - 1) * catalog.pageSize + index + 1,
      url: absoluteUrl(localizedHref(locale, "wine", { slug: wine.slug })),
      name: wine.name,
    })),
  };

  return (
    <>
      <JsonLd
        data={[itemListJsonLd, breadcrumbJsonLd, buildFaqJsonLd(faq)]}
        id="vinuri"
      />
      <SiteHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-[#faf6f0] via-background to-background">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 top-0 h-64 w-64 rounded-full bg-wine/5 blur-3xl"
          />
          <div className="mx-auto max-w-6xl px-6 py-12 lg:py-16">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-wine/30 bg-wine/5 px-4 py-1.5 text-sm font-medium text-wine">
                <Wine className="h-4 w-4" aria-hidden="true" />
                {t("Catalog.verified", { count: catalog.total })}
              </span>
              <h1 className="mt-5 font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                {t("Catalog.heading")}
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                {t("Catalog.description")}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button
                  asChild
                  variant="outline"
                  className="border-wine/30 text-wine hover:bg-wine/10 hover:text-wine"
                >
                  <Link href={localizedHref(locale, "topWines")}>
                    {t("Catalog.popular")}
                  </Link>
                </Button>
                <Button
                  asChild
                  className="bg-wine text-wine-foreground hover:bg-wine/90"
                >
                  <Link href={localizedHref(locale, "addWine")}>
                    {t("Catalog.add")}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-6 py-10 lg:py-12">
          {catalog.items.length > 0 || catalog.total === 0 ? (
            <WineCatalogDirectory
              wines={publicCatalog.map((item) => item.card)}
              filters={request.filters}
              facets={catalog.facets}
              total={catalog.total}
              page={catalog.page}
              totalPages={catalog.totalPages}
              basePath={path}
              locale={locale}
              copy={directoryCopy}
            />
          ) : (
            <p className="rounded-2xl border border-dashed border-border bg-secondary/20 p-12 text-center text-muted-foreground">
              {t("Catalog.emptyPrefix")}{" "}
              <Link
                href={localizedHref(locale, "addWine")}
                className="font-medium text-wine hover:underline"
              >
                {t("Catalog.emptyLink")}
              </Link>
              .
            </p>
          )}
        </div>

        <section
          aria-labelledby="vinuri-faq-heading"
          className="border-t border-border/60 bg-secondary/20 py-14"
        >
          <div className="mx-auto max-w-3xl px-6">
            <h2
              id="vinuri-faq-heading"
              className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
            >
              {t("Catalog.faqHeading")}
            </h2>
            <dl className="mt-8 space-y-6">
              {faq.map((item) => (
                <div key={item.question}>
                  <dt className="font-medium text-foreground">{item.question}</dt>
                  <dd className="mt-2 text-muted-foreground">{item.answer}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>
      <LocalizedSiteFooter />
    </>
  );
}
