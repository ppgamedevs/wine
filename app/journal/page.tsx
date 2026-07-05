import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ArticleCard } from "@/components/journal/article-card";
import { JournalCategoryNav } from "@/components/journal/journal-category-nav";
import { JournalHero } from "@/components/journal/journal-hero";
import { JournalSidebar } from "@/components/journal/journal-sidebar";
import {
  filterJournalArticles,
  getPopularJournalArticles,
  getTopJournalArticles,
} from "@/lib/journal";
import { getJournalCategory } from "@/lib/journal-categories";
import {
  absoluteUrl,
  buildBreadcrumbJsonLd,
  SITE,
} from "@/lib/seo";

export const revalidate = 3600;

const PATH = "/journal";

export const metadata: Metadata = {
  title: "Wine Journal",
  description:
    "Povesti, analize si ghiduri practice despre vinurile romanesti. Ghiduri pentru incepatori, pairing, soiuri autohtone si vintage reports.",
  keywords: [
    "wine journal",
    "jurnal vin",
    "vinuri romanesti",
    "ghid vin",
    "pairing romanesc",
    "feteasca neagra",
  ],
  alternates: { canonical: absoluteUrl(PATH) },
  openGraph: {
    type: "website",
    locale: SITE.locale,
    url: absoluteUrl(PATH),
    siteName: SITE.name,
    title: "Wine Journal | VinIntel",
    description:
      "Povesti, analize si ghiduri practice despre vinurile romanesti.",
  },
  twitter: {
    card: "summary_large_image",
    site: SITE.twitter,
    title: "Wine Journal | VinIntel",
    description:
      "Povesti, analize si ghiduri practice despre vinurile romanesti.",
  },
};

interface JournalPageProps {
  searchParams: Promise<{ category?: string; q?: string }>;
}

export default async function JournalPage({ searchParams }: JournalPageProps) {
  const { category, q } = await searchParams;
  const articles = filterJournalArticles({ category, query: q });
  const topArticles = getTopJournalArticles(5);
  const popularArticles = getPopularJournalArticles(5);
  const activeCategory = getJournalCategory(category ?? "")?.slug;

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Acasa", path: "/" },
    { name: "Wine Journal", path: PATH },
  ]);

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Wine Journal VinIntel",
    numberOfItems: articles.length,
    itemListElement: articles.slice(0, 20).map((article, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(`/journal/${article.slug}`),
      name: article.title,
    })),
  };

  return (
    <>
      <JsonLd data={[itemListJsonLd, breadcrumbJsonLd]} id="journal" />
      <SiteHeader />
      <main className="flex-1">
        <JournalHero initialQuery={q ?? ""} />

        <div className="mx-auto max-w-6xl px-6 py-12 lg:py-16">
          <JournalCategoryNav activeCategory={activeCategory} query={q} />

          <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
            <section id="articole" aria-labelledby="latest-articles-heading">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2
                    id="latest-articles-heading"
                    className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
                  >
                    Ultimele articole
                  </h2>
                  <p className="mt-2 text-muted-foreground">
                    {activeCategory
                      ? getJournalCategory(activeCategory)?.description
                      : "Analize, ghiduri si povesti din lumea vinului romanesc."}
                  </p>
                </div>
                {q?.trim() ? (
                  <p className="text-sm text-muted-foreground" aria-live="polite">
                    {articles.length}{" "}
                    {articles.length === 1
                      ? "rezultat pentru"
                      : "rezultate pentru"}{" "}
                    <span className="font-medium text-foreground">
                      &ldquo;{q.trim()}&rdquo;
                    </span>
                  </p>
                ) : null}
              </div>

              {articles.length > 0 ? (
                <div className="mt-8 grid gap-5 sm:grid-cols-2">
                  {articles.map((article) => (
                    <ArticleCard key={article.slug} article={article} />
                  ))}
                </div>
              ) : (
                <p className="mt-8 rounded-2xl border border-dashed border-border bg-secondary/20 p-10 text-center text-muted-foreground">
                  Niciun articol nu corespunde cautarii. Incearca alta categorie
                  sau un alt termen.
                </p>
              )}
            </section>

            <JournalSidebar
              topArticles={topArticles}
              popularArticles={popularArticles}
            />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
