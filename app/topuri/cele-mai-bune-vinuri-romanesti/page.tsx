import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
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
import { getWinesForSommelier } from "@/lib/queries";
import {
  absoluteUrl,
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  SITE,
} from "@/lib/seo";
import {
  resolveTopList,
  slugToLabel,
  TOP_LIST_SLUGS,
  topListRankColumnLabel,
  topListRankScore,
  topListRankSummary,
} from "@/lib/top-lists";

export const revalidate = 3600;

const SLUG = "cele-mai-bune-vinuri-romanesti";

export async function generateMetadata(): Promise<Metadata> {
  const allWines = await getWinesForSommelier();
  const list = resolveTopList(SLUG, allWines);
  if (!list) return { title: "Top negasit" };

  const url = absoluteUrl(`/topuri/${SLUG}`);
  return {
    title: list.metaTitle,
    description: list.metaDescription,
    openGraph: {
      type: "website",
      locale: SITE.locale,
      url,
      siteName: SITE.name,
      title: `${list.metaTitle} | VinIntel`,
      description: list.metaDescription,
    },
    twitter: {
      card: "summary_large_image",
      site: SITE.twitter,
      title: `${list.metaTitle} | VinIntel`,
      description: list.metaDescription,
    },
    alternates: { canonical: url },
  };
}

export default async function BestRomanianWinesHubPage() {
  const allWines = await getWinesForSommelier();
  const list = resolveTopList(SLUG, allWines);
  if (!list) return null;

  const url = absoluteUrl(`/topuri/${SLUG}`);
  const relatedSlugs = TOP_LIST_SLUGS.filter((s) => s !== SLUG).slice(0, 6);

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: list.metaTitle,
    description: list.metaDescription,
    url,
    numberOfItems: list.wines.length,
    itemListElement: list.wines.map((wine, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(`/wines/${wine.slug}`),
      name: wine.name,
    })),
  };

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Acasa", path: "/" },
    { name: "Topuri", path: "/topuri" },
    { name: list.breadcrumbName, path: `/topuri/${SLUG}` },
  ]);

  return (
    <>
      <JsonLd
        data={[itemListJsonLd, breadcrumbJsonLd, buildFaqJsonLd(list.faq)]}
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
              <Link href="/" className="hover:text-wine">
                Acasa
              </Link>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              <Link href="/topuri" className="hover:text-wine">
                Topuri
              </Link>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="text-foreground">{list.breadcrumbName}</span>
            </nav>
            <h1 className="font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              {list.heading}
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {list.intro}
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-5xl space-y-14 px-6 py-12">
          <TopListQuickAnswer wines={list.wines} />

          <section aria-labelledby="summary-heading">
            <h2
              id="summary-heading"
              className="font-serif text-2xl font-semibold text-foreground"
            >
              Top general
            </h2>
            <p className="mt-2 text-muted-foreground">{topListRankSummary(list)}</p>
            <div className="mt-6 overflow-hidden rounded-2xl border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 pl-6">#</TableHead>
                    <TableHead>Vin</TableHead>
                    <TableHead className="hidden sm:table-cell">Crama</TableHead>
                    <TableHead className="text-right">Pret</TableHead>
                    <TableHead className="text-right pr-6">
                      {topListRankColumnLabel(list.rankMetric)}
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
                          href={`/wines/${wine.slug}`}
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
                        {formatRon(wine.priceAvg)}
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
              Verdict pentru fiecare vin
            </h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {list.wines.map((wine, index) => (
                <TopListWineVerdict key={wine.id} wine={wine} position={index + 1} />
              ))}
            </div>
          </section>

          <TopListHubSections allWines={allWines} />

          <section aria-labelledby="grid-heading">
            <h2
              id="grid-heading"
              className="font-serif text-2xl font-semibold text-foreground"
            >
              Recomandari detaliate
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
              Intrebari frecvente
            </h2>
            <div className="mt-6 space-y-3">
              {list.faq.map((item) => (
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
              Ghiduri similare
            </h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {relatedSlugs.map((relatedSlug) => (
                <Link
                  key={relatedSlug}
                  href={`/topuri/${relatedSlug}`}
                  className="group flex items-center justify-between rounded-xl border border-border/70 bg-card px-5 py-4 transition-all hover:border-wine/30 hover:shadow-sm"
                >
                  <span className="font-medium text-foreground group-hover:text-wine">
                    {slugToLabel(relatedSlug)}
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
