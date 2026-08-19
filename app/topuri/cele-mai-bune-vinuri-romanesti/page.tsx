import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { getLocale } from "next-intl/server";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WineCard } from "@/components/wine-card";
import {
  TopListHubSections,
} from "@/components/top-lists/top-list-hub-sections";
import { TopListQuickAnswer, TopListWineVerdict } from "@/components/top-lists/top-list-wine-verdict";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRon } from "@/lib/format";
import type { AppLocale } from "@/i18n/locale";
import { localizedHref } from "@/i18n/paths";
import { resolveLocalizedTopListRoute } from "@/lib/i18n/top-list-routes";
import {
  buildLocalizedAlternates,
  buildLocalizedTopListPresentation,
  getPseoMessages,
  localizedTopListRankColumnLabel,
  localizedTopListRankSummary,
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
import {
  TOP_LIST_SLUGS,
  topListRankScore,
} from "@/lib/top-lists";

export const revalidate = 3600;

const SLUG = "cele-mai-bune-vinuri-romanesti";

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as AppLocale;
  const allWines = await getWinesForSommelier();
  const route = resolveLocalizedTopListRoute(SLUG, "ro", allWines);
  if (!route) return { title: getPseoMessages(locale).common.notFound };

  const presentation = buildLocalizedTopListPresentation(
    route.definition,
    route.list,
    locale,
  );
  const localeSlug = locale === "en" ? route.enSlug : route.roSlug;
  const url = absoluteUrl(
    localizedHref(locale, "topWine", { slug: localeSlug }),
  );
  return {
    title: presentation.metaTitle,
    description: presentation.metaDescription,
    openGraph: {
      type: "website",
      locale: openGraphLocale(locale),
      url,
      siteName: SITE.name,
      title: `${presentation.metaTitle} | VinIntel`,
      description: presentation.metaDescription,
    },
    twitter: {
      card: "summary_large_image",
      site: SITE.twitter,
      title: `${presentation.metaTitle} | VinIntel`,
      description: presentation.metaDescription,
    },
    alternates: buildLocalizedAlternates(
      locale,
      localizedHref("ro", "topWine", { slug: route.roSlug }),
      localizedHref("en", "topWine", { slug: route.enSlug }),
    ),
  };
}

export default async function BestRomanianWinesHubPage() {
  const locale = (await getLocale()) as AppLocale;
  const messages = getPseoMessages(locale);
  const allWines = await getWinesForSommelier();
  const route = resolveLocalizedTopListRoute(SLUG, "ro", allWines);
  if (!route) return null;
  const { list, definition } = route;
  const presentation = buildLocalizedTopListPresentation(
    definition,
    list,
    locale,
  );
  const localeSlug = locale === "en" ? route.enSlug : route.roSlug;

  const path = localizedHref(locale, "topWine", { slug: localeSlug });
  const url = absoluteUrl(path);
  const relatedRoutes = TOP_LIST_SLUGS.flatMap((romanianSlug) => {
    const related = resolveLocalizedTopListRoute(
      romanianSlug,
      "ro",
      allWines,
    );
    if (!related || related.canonicalId === route.canonicalId) return [];
    return [{
      slug: locale === "en" ? related.enSlug : related.roSlug,
      label: buildLocalizedTopListPresentation(
        related.definition,
        related.list,
        locale,
      ).breadcrumbName,
    }];
  }).slice(0, 6);

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    inLanguage: locale === "en" ? "en" : "ro",
    name: presentation.metaTitle,
    description: presentation.metaDescription,
    url,
    numberOfItems: list.wines.length,
    itemListElement: list.wines.map((wine, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(localizedWineHref(locale, wine)),
      name: wine.name,
    })),
  };

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: messages.common.home, path: localizedHref(locale, "home") },
    {
      name: messages.common.topLists,
      path: localizedHref(locale, "topWines"),
    },
    { name: presentation.breadcrumbName, path },
  ]);

  return (
    <>
      <JsonLd
        data={[
          itemListJsonLd,
          breadcrumbJsonLd,
          buildFaqJsonLd(presentation.faq),
        ]}
        id="toplist-hub"
      />
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-secondary/20">
          <div className="mx-auto max-w-5xl px-6 py-12 sm:py-14">
            <nav
              aria-label="Breadcrumb"
              className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"
            >
              <Link
                href={localizedHref(locale, "home")}
                className="hover:text-wine"
              >
                {messages.common.home}
              </Link>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              <Link
                href={localizedHref(locale, "topWines")}
                className="hover:text-wine"
              >
                {messages.common.topLists}
              </Link>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="text-foreground">
                {presentation.breadcrumbName}
              </span>
            </nav>
            <h1 className="font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              {presentation.heading}
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {presentation.intro}
            </p>
          </div>
        </section>

        <div className="mx-auto w-full min-w-0 max-w-5xl space-y-14 px-6 py-12">
          <TopListQuickAnswer wines={list.wines} locale={locale} />

          <section className="min-w-0" aria-labelledby="summary-heading">
            <h2
              id="summary-heading"
              className="font-serif text-2xl font-semibold text-foreground"
            >
              {messages.topLists.generalRanking}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {localizedTopListRankSummary(list, locale)}
            </p>
            <div className="mt-6 overflow-hidden rounded-2xl border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 pl-6">#</TableHead>
                    <TableHead>{messages.common.wine}</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      {messages.common.winery}
                    </TableHead>
                    <TableHead className="text-right">
                      {messages.common.price}
                    </TableHead>
                    <TableHead className="text-right pr-6">
                      {localizedTopListRankColumnLabel(list.rankMetric, locale)}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.wines.map((wine, index) => (
                    <TableRow key={wine.id}>
                      <TableCell className="pl-6 font-semibold text-wine">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={localizedWineHref(locale, wine)}
                          className="font-medium text-foreground hover:text-wine"
                        >
                          {wine.name}
                          {wine.vintage ? ` ${wine.vintage}` : ""}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">
                        {wine.winery?.name ?? "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatRon(wine.priceAvg, locale)}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        {topListRankScore(wine, list.rankMetric, list.rankScores[index]) ?? "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>

          <section aria-labelledby="verdicts-heading">
            <h2
              id="verdicts-heading"
              className="font-serif text-2xl font-semibold text-foreground"
            >
              {messages.topLists.verdicts}
            </h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {list.wines.map((wine, index) => (
                <TopListWineVerdict
                  key={wine.id}
                  wine={wine}
                  position={index + 1}
                  locale={locale}
                />
              ))}
            </div>
          </section>

          <TopListHubSections allWines={allWines} locale={locale} />

          <section aria-labelledby="grid-heading">
            <h2
              id="grid-heading"
              className="font-serif text-2xl font-semibold text-foreground"
            >
              {messages.common.detailedRecommendations}
            </h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {list.wines.map((wine, index) => (
                <WineCard
                  key={wine.id}
                  wine={wine}
                  minValueScore={null}
                  highlightScore={list.rankMetric}
                  displayedScore={list.rankScores[index]}
                />
              ))}
            </div>
          </section>

          <section aria-labelledby="faq-heading">
            <h2
              id="faq-heading"
              className="font-serif text-2xl font-semibold text-foreground"
            >
              {messages.common.faq}
            </h2>
            <div className="mt-6 space-y-3">
              {presentation.faq.map((item) => (
                <div
                  key={item.question}
                  className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6"
                >
                  <h3 className="font-medium text-foreground">{item.question}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="related-heading">
            <h2
              id="related-heading"
              className="font-serif text-2xl font-semibold text-foreground"
            >
              {messages.common.relatedGuides}
            </h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {relatedRoutes.map((related) => (
                <Link
                  key={related.slug}
                  href={localizedHref(locale, "topWine", {
                    slug: related.slug,
                  })}
                  className="group flex items-center justify-between rounded-xl border border-border/70 bg-card px-5 py-4 transition-all hover:border-wine/30 hover:shadow-sm"
                >
                  <span className="font-medium text-foreground group-hover:text-wine">
                    {related.label}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-wine" />
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
