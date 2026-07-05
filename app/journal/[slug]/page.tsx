import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ArticleBody } from "@/components/journal/article-body";
import { ArticleCard } from "@/components/journal/article-card";
import { Button } from "@/components/ui/button";
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
  const article = getJournalArticleBySlug(slug);

  if (!article) {
    return { title: "Articol negasit" };
  }

  const url = absoluteUrl(`/journal/${slug}`);

  return {
    title: article.title,
    description: article.excerpt,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      locale: SITE.locale,
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
  };
}

export default async function JournalArticlePage({
  params,
}: JournalArticlePageProps) {
  const { slug } = await params;
  const article = getJournalArticleBySlug(slug);

  if (!article) notFound();

  const related = getAllJournalArticles()
    .filter(
      (item) =>
        item.slug !== article.slug && item.category === article.category,
    )
    .slice(0, 2);

  const url = absoluteUrl(`/journal/${slug}`);

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
  };

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Acasa", path: "/" },
    { name: "Wine Journal", path: "/journal" },
    { name: article.title, path: `/journal/${slug}` },
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
              <Link href="/journal">
                <ArrowLeft className="h-4 w-4" />
                Inapoi la Wine Journal
              </Link>
            </Button>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-6 py-12 lg:py-16">
          <ArticleBody article={article} />

          <p className="mx-auto mt-10 max-w-3xl text-sm text-muted-foreground">
            Publicat pe {formatJournalDate(article.publishedAt)} in categoria{" "}
            {article.categoryLabel}.
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
                Articole similare
              </h2>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                {related.map((item) => (
                  <ArticleCard key={item.slug} article={item} />
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
