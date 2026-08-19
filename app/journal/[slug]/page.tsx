import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  ArticleBody,
  estimateReadingMinutes,
} from "@/components/journal/article-body";
import { ArticleCard } from "@/components/journal/article-card";
import { Button } from "@/components/ui/button";
import { localizedHref } from "@/i18n/paths";
import { getContentLocale, getContentTranslator } from "@/lib/i18n/content";
import {
  getJournalArticleForLocale,
  getJournalArticlesForLocale,
} from "@/lib/i18n/journal-content";
import {
  formatJournalDate,
  getAllJournalArticles,
  getJournalArticleBySlug,
} from "@/lib/journal";
import {
  absoluteUrl,
  buildBreadcrumbJsonLd,
  SITE,
} from "@/lib/seo";
import { localizedRobots } from "@/lib/i18n/indexing";

export const revalidate = 3600;

interface JournalArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllJournalArticles().map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: JournalArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getContentLocale();
  const t = getContentTranslator(locale);
  const sourceArticle = getJournalArticleBySlug(slug);

  if (!sourceArticle) {
    return { title: t("Journal.metadata.notFound") };
  }

  const article = await getJournalArticleForLocale(sourceArticle, locale);
  const englishReady =
    locale === "en"
      ? article !== null
      : (await getJournalArticleForLocale(sourceArticle, "en")) !== null;
  const href = localizedHref(locale, "journalArticle", { slug });
  const url = absoluteUrl(href);
  const languages: Record<string, string> = {
    ro: absoluteUrl(
      localizedHref("ro", "journalArticle", { slug: sourceArticle.slug }),
    ),
    "x-default": absoluteUrl(
      localizedHref("ro", "journalArticle", { slug: sourceArticle.slug }),
    ),
  };
  if (englishReady) {
    languages.en = absoluteUrl(
      localizedHref("en", "journalArticle", { slug: sourceArticle.slug }),
    );
  }

  if (!article) {
    return {
      title: t("Journal.metadata.unavailableTitle"),
      description: t("Journal.unavailable.description"),
      alternates: { canonical: url, languages },
      robots: { index: false, follow: true },
    };
  }

  return {
    title: article.title,
    description: article.excerpt,
    alternates: { canonical: url, languages },
    openGraph: {
      type: "article",
      locale: locale === "en" ? "en_US" : SITE.locale,
      url,
      siteName: SITE.name,
      title: `${article.title} | Wine Journal`,
      description: article.excerpt,
      publishedTime: article.publishedAt,
    },
    twitter: {
      card: "summary_large_image",
      site: SITE.twitter,
      title: `${article.title} | Wine Journal`,
      description: article.excerpt,
    },
    robots: localizedRobots(locale),
  };
}

export default async function JournalArticlePage({
  params,
}: JournalArticlePageProps) {
  const { slug } = await params;
  const locale = await getContentLocale();
  const t = getContentTranslator(locale);
  const sourceArticle = getJournalArticleBySlug(slug);

  if (!sourceArticle) notFound();

  const article = await getJournalArticleForLocale(sourceArticle, locale);
  const journalHref = localizedHref(locale, "journal");

  if (!article) {
    return (
      <>
        <SiteHeader />
        <main className="flex flex-1 items-center justify-center px-6 py-20">
          <section className="w-full max-w-2xl rounded-3xl border border-wine/20 bg-wine/5 px-8 py-12 text-center">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-wine">
              {t("Journal.unavailable.eyebrow")}
            </p>
            <h1 className="mt-3 font-serif text-3xl font-semibold text-foreground">
              {t("Journal.unavailable.title")}
            </h1>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              {t("Journal.unavailable.description")}
            </p>
            <Button asChild className="mt-6 bg-wine text-wine-foreground">
              <Link href={journalHref}>{t("Journal.unavailable.back")}</Link>
            </Button>
          </section>
        </main>
        <SiteFooter />
      </>
    );
  }

  article.categoryLabel = t(
    `Journal.categories.${article.category}.label`,
  );
  const relatedSource = getAllJournalArticles()
    .filter(
      (item) =>
        item.slug !== article.slug && item.category === article.category,
    )
    .slice(0, 2);
  const related = (
    await getJournalArticlesForLocale(relatedSource, locale)
  ).map((item) => ({
    ...item,
    categoryLabel: t(`Journal.categories.${item.category}.label`),
  }));

  const articleHref = localizedHref(locale, "journalArticle", { slug });
  const url = absoluteUrl(articleHref);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    datePublished: article.publishedAt,
    author: {
      "@type": "Organization",
      name: SITE.name,
    },
    publisher: {
      "@type": "Organization",
      name: SITE.name,
      url: SITE.url,
    },
    mainEntityOfPage: url,
    articleSection: article.categoryLabel,
    inLanguage: locale === "en" ? "en-GB" : SITE.language,
  };

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: t("LegalShell.home"), path: localizedHref(locale, "home") },
    { name: t("Journal.metadata.title"), path: journalHref },
    { name: article.title, path: articleHref },
  ]);

  return (
    <>
      <JsonLd data={[articleJsonLd, breadcrumbJsonLd]} id="journal-article" />
      <SiteHeader />
      <main className="flex-1">
        <div className="border-b border-border/60 bg-secondary/20">
          <div className="mx-auto max-w-6xl px-6 py-6">
            <Button
              asChild
              variant="ghost"
              className="px-0 text-wine hover:bg-transparent hover:text-wine/80"
            >
              <Link href={journalHref}>
                <ArrowLeft className="h-4 w-4" />
                {t("Journal.back")}
              </Link>
            </Button>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-6 py-12 lg:py-16">
          <ArticleBody
            article={article}
            locale={locale}
            readingLabel={t("Journal.readingMinutes", {
              minutes: estimateReadingMinutes(article.body),
            })}
          />

          <p className="mx-auto mt-10 max-w-3xl text-sm text-muted-foreground">
            {t("Journal.published", {
              date: formatJournalDate(article.publishedAt, locale),
              category: article.categoryLabel,
            })}
          </p>

          {related.length > 0 ? (
            <section
              aria-labelledby="related-articles-heading"
              className="mx-auto mt-16 max-w-6xl border-t border-border/60 pt-12"
            >
              <h2
                id="related-articles-heading"
                className="font-serif text-2xl font-semibold text-foreground"
              >
                {t("Journal.related")}
              </h2>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                {related.map((item) => (
                  <ArticleCard
                    key={item.slug}
                    article={item}
                    locale={locale}
                    readLabel={t("Journal.readArticle")}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
