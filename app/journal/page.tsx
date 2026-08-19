import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ArticleCard } from "@/components/journal/article-card";
import { JournalCategoryNav } from "@/components/journal/journal-category-nav";
import { JournalHero } from "@/components/journal/journal-hero";
import { JournalSidebar } from "@/components/journal/journal-sidebar";
import {
  filterJournalArticles,
  getAllJournalArticles,
  getPopularJournalArticles,
  getTopJournalArticles,
  type JournalArticle,
} from "@/lib/journal";
import {
  JOURNAL_CATEGORIES,
  getJournalCategory,
  type JournalCategorySlug,
} from "@/lib/journal-categories";
import { getContentLocale, getContentTranslator } from "@/lib/i18n/content";
import { getJournalArticlesForLocale } from "@/lib/i18n/journal-content";
import { localizedHref } from "@/i18n/paths";
import {
  absoluteUrl,
  buildBreadcrumbJsonLd,
  SITE,
} from "@/lib/seo";
import { localizedRobots } from "@/lib/i18n/indexing";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getContentLocale();
  const t = getContentTranslator(locale);
  const href = localizedHref(locale, "journal");
  const hasEnglishArticles =
    (
      await getJournalArticlesForLocale(getAllJournalArticles(), "en")
    ).length > 0;
  const languages: Record<string, string> = {
    ro: absoluteUrl(localizedHref("ro", "journal")),
    "x-default": absoluteUrl(localizedHref("ro", "journal")),
  };
  if (hasEnglishArticles) {
    languages.en = absoluteUrl(localizedHref("en", "journal"));
  }

  return {
    title: t("Journal.metadata.title"),
    description: t("Journal.metadata.description"),
    keywords: [
      "wine journal",
      "Romanian wine",
      "wine guide",
      "food pairing",
      "Feteasca Neagra",
    ],
    alternates: {
      canonical: absoluteUrl(href),
      languages,
    },
    openGraph: {
      type: "website",
      locale: locale === "en" ? "en_US" : SITE.locale,
      url: absoluteUrl(href),
      siteName: SITE.name,
      title: `${t("Journal.metadata.title")} | VinIntel`,
      description: t("Journal.metadata.shortDescription"),
    },
    twitter: {
      card: "summary_large_image",
      site: SITE.twitter,
      title: `${t("Journal.metadata.title")} | VinIntel`,
      description: t("Journal.metadata.shortDescription"),
    },
    robots: locale === "ro" || hasEnglishArticles
      ? localizedRobots(locale)
      : { index: false, follow: true },
  };
}

interface JournalPageProps {
  searchParams: Promise<{ category?: string; q?: string }>;
}

function filterLocalizedArticles(
  articles: JournalArticle[],
  category?: string,
  query?: string,
): JournalArticle[] {
  const normalizedQuery = query?.trim().toLowerCase() ?? "";
  return articles.filter((article) => {
    if (category && article.category !== category) return false;
    if (!normalizedQuery) return true;
    return [article.title, article.excerpt, article.categoryLabel, article.body]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });
}

export default async function JournalPage({ searchParams }: JournalPageProps) {
  const { category, q } = await searchParams;
  const locale = await getContentLocale();
  const t = getContentTranslator(locale);
  const journalHref = localizedHref(locale, "journal");
  const categoryLabel = (slug: JournalCategorySlug) =>
    t(`Journal.categories.${slug}.label`);
  const withLocalizedCategories = (articles: JournalArticle[]) =>
    articles.map((article) => ({
      ...article,
      categoryLabel: categoryLabel(article.category),
    }));

  const allLocalizedArticles = withLocalizedCategories(
    await getJournalArticlesForLocale(getAllJournalArticles(), locale),
  );
  const articles =
    locale === "ro"
      ? withLocalizedCategories(
          filterJournalArticles({ category, query: q }),
        )
      : filterLocalizedArticles(allLocalizedArticles, category, q);
  const topArticles = withLocalizedCategories(
    await getJournalArticlesForLocale(getTopJournalArticles(5), locale),
  );
  const popularArticles = withLocalizedCategories(
    await getJournalArticlesForLocale(getPopularJournalArticles(5), locale),
  );
  const activeCategory = getJournalCategory(category ?? "")?.slug;
  const unavailable = locale === "en" && allLocalizedArticles.length === 0;
  const categories = JOURNAL_CATEGORIES.map((item) => ({
    slug: item.slug,
    label: categoryLabel(item.slug),
  }));

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: t("LegalShell.home"), path: localizedHref(locale, "home") },
    { name: t("Journal.metadata.title"), path: journalHref },
  ]);

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${t("Journal.metadata.title")} VinIntel`,
    numberOfItems: articles.length,
    itemListElement: articles.slice(0, 20).map((article, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(
        localizedHref(locale, "journalArticle", { slug: article.slug }),
      ),
      name: article.title,
    })),
  };

  return (
    <>
      <JsonLd data={[itemListJsonLd, breadcrumbJsonLd]} id="journal" />
      <SiteHeader />
      <main className="flex-1">
        <JournalHero
          initialQuery={q ?? ""}
          journalHref={journalHref}
          copy={{
            eyebrow: t("Journal.hero.eyebrow"),
            title: t("Journal.hero.title"),
            description: t("Journal.hero.description"),
            read: t("Journal.hero.read"),
            searchPlaceholder: t("Journal.hero.searchPlaceholder"),
            searchLabel: t("Journal.hero.searchLabel"),
          }}
        />

        <div className="mx-auto max-w-6xl px-6 py-12 lg:py-16">
          {unavailable ? (
            <section className="mx-auto max-w-2xl rounded-3xl border border-wine/20 bg-wine/5 px-8 py-12 text-center">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-wine">
                {t("Journal.unavailable.eyebrow")}
              </p>
              <h2 className="mt-3 font-serif text-3xl font-semibold text-foreground">
                {t("Journal.unavailable.title")}
              </h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                {t("Journal.unavailable.description")}
              </p>
              <Link
                href={localizedHref("ro", "journal")}
                hrefLang="ro"
                className="mt-6 inline-flex font-medium text-wine hover:underline"
              >
                {t("Journal.unavailable.back")}
              </Link>
            </section>
          ) : (
            <>
              <JournalCategoryNav
                activeCategory={activeCategory}
                query={q}
                journalHref={journalHref}
                allLabel={t("Journal.allCategories")}
                ariaLabel={t("Journal.categoriesLabel")}
                categories={categories}
              />

              <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
                <section id="articole" aria-labelledby="latest-articles-heading">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2
                        id="latest-articles-heading"
                        className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
                      >
                        {t("Journal.latest")}
                      </h2>
                      <p className="mt-2 text-muted-foreground">
                        {activeCategory
                          ? t(
                              `Journal.categories.${activeCategory}.description`,
                            )
                          : t("Journal.latestDescription")}
                      </p>
                    </div>
                    {q?.trim() ? (
                      <p
                        className="text-sm text-muted-foreground"
                        aria-live="polite"
                      >
                        {articles.length}{" "}
                        {articles.length === 1
                          ? t("Journal.resultOne")
                          : t("Journal.resultMany")}{" "}
                        <span className="font-medium text-foreground">
                          &ldquo;{q.trim()}&rdquo;
                        </span>
                      </p>
                    ) : null}
                  </div>

                  {articles.length > 0 ? (
                    <div className="mt-8 grid gap-5 sm:grid-cols-2">
                      {articles.map((article) => (
                        <ArticleCard
                          key={article.slug}
                          article={article}
                          locale={locale}
                          readLabel={t("Journal.readArticle")}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="mt-8 rounded-2xl border border-dashed border-border bg-secondary/20 p-10 text-center text-muted-foreground">
                      {t("Journal.noResults")}
                    </p>
                  )}
                </section>

                <JournalSidebar
                  topArticles={topArticles}
                  popularArticles={popularArticles}
                  locale={locale}
                  labels={{
                    ariaLabel: t("Journal.recommendedLabel"),
                    top: t("Journal.topArticles"),
                    popular: t("Journal.mostRead"),
                    reads: t("Journal.reads"),
                  }}
                />
              </div>
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
