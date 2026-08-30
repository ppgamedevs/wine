import type { Metadata } from "next";
import { Building2, Search, Wine } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SmartSearch } from "@/components/smart-search";
import { WineCard } from "@/components/wine-card";
import { Button } from "@/components/ui/button";
import { searchCatalog } from "@/lib/queries";
import { isSommelierQuery, sommelierQueryHref } from "@/lib/search-intent";
import { absoluteUrl, SITE } from "@/lib/seo";
import { getLocale, getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/locale";
import { localizedHref } from "@/i18n/paths";

export const dynamic = "force-dynamic";

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations({ locale, namespace: "SearchPage" });
  const title = query ? t("metaResults", { query }) : t("metaTitle");
  const canonicalPath = localizedHref(locale, "search");

  return {
    title,
    description: t("metaDescription"),
    alternates: {
      canonical: absoluteUrl(canonicalPath),
      languages: {
        ro: absoluteUrl(localizedHref("ro", "search")),
        en: absoluteUrl(localizedHref("en", "search")),
        "x-default": absoluteUrl(localizedHref("ro", "search")),
      },
    },
    openGraph: {
      type: "website",
      locale: locale === "en" ? "en_US" : SITE.locale,
      url: absoluteUrl(canonicalPath),
      siteName: SITE.name,
      title: `${title} | VinIntel`,
    },
    twitter: {
      card: "summary",
      title: `${title} | VinIntel`,
    },
    robots: query ? { index: false, follow: true } : undefined,
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const hasQuery = query.length >= 2;
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations({ locale, namespace: "SearchPage" });

  if (hasQuery && isSommelierQuery(query, locale)) {
    redirect(sommelierQueryHref(query, locale));
  }

  const results = hasQuery ? await searchCatalog(query) : null;
  const totalResults =
    (results?.wines.length ?? 0) + (results?.wineries.length ?? 0);

  return (
    <>
      <SiteHeader />
      <main className="min-w-0 flex-1 overflow-x-clip">
        <section className="border-b border-border/60 bg-secondary/20">
          <div className="mx-auto w-full min-w-0 max-w-4xl px-4 py-12 text-center sm:px-6 lg:py-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-wine/30 bg-wine/5 px-4 py-1.5 text-sm font-medium text-wine">
              <Search className="h-4 w-4" aria-hidden="true" />
              {t("eyebrow")}
            </span>
            <h1 className="mt-5 break-words font-serif text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
              {hasQuery ? t("resultsTitle", { query }) : t("title")}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl break-words text-muted-foreground">
              {t("descriptionBefore")}{" "}
              <Link
                href={localizedHref(locale, "addWine")}
                className="text-wine underline-offset-4 hover:underline"
              >
                {t("addWine")}
              </Link>
              .
            </p>
            <div className="mx-auto mt-8 w-full min-w-0 max-w-2xl text-left">
              <SmartSearch enableLinkAnalysis={false} />
            </div>
          </div>
        </section>

        <section className="mx-auto w-full min-w-0 max-w-4xl px-4 py-10 sm:px-6">
          {!hasQuery ? (
            <p className="text-center text-muted-foreground">
              {t("instructions")}
            </p>
          ) : totalResults === 0 ? (
            <div className="rounded-2xl border border-border/70 bg-card px-4 py-10 text-center sm:px-6">
              <p className="break-words font-serif text-2xl font-semibold text-foreground">
                {t("emptyTitle", { query })}
              </p>
              <p className="mx-auto mt-3 max-w-xl break-words text-muted-foreground">
                {t("emptyDescription")}
              </p>
              <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                <Button asChild className="bg-wine text-wine-foreground">
                  <Link href={sommelierQueryHref(query, locale)}>
                    {t("askSommelier")}
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={localizedHref(locale, "addWine")}>
                    {t("addByLink")}
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-10">
              {results!.wineries.length > 0 ? (
                <div>
                  <h2 className="mb-4 flex items-center gap-2 font-serif text-2xl font-semibold text-foreground">
                    <Building2 className="h-5 w-5 text-wine" aria-hidden="true" />
                    {t("wineries")} ({results!.wineries.length})
                  </h2>
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {results!.wineries.map((winery) => (
                      <li key={winery.slug}>
                        <Link
                          href={localizedHref(locale, "winery", {
                            slug: winery.slug,
                          })}
                          className="flex items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 transition-colors hover:border-wine/30 hover:bg-wine/5"
                        >
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gold/15 text-gold">
                            <Building2 className="h-5 w-5" aria-hidden="true" />
                          </span>
                          <span className="font-medium text-foreground">{winery.name}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {results!.wines.length > 0 ? (
                <div>
                  <h2 className="mb-4 flex items-center gap-2 font-serif text-2xl font-semibold text-foreground">
                    <Wine className="h-5 w-5 text-wine" aria-hidden="true" />
                    {t("wines")} ({results!.wines.length})
                  </h2>
                  <div className="grid gap-5 sm:grid-cols-2">
                    {results!.wines.map((wine, index) => (
                      <WineCard key={wine.slug} wine={wine} priority={index < 2} />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
