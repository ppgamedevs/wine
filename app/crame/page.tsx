import type { Metadata } from "next";
import { Building2, MapPin } from "lucide-react";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { LocalizedSiteFooter } from "@/components/localized-site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  WineryDirectory,
  type WineryDirectoryCopy,
} from "@/components/wineries/winery-directory";
import { localizedHref } from "@/i18n/paths";
import { getDiscoveryI18n } from "@/lib/i18n/discovery";
import { buildPublicWineryDirectoryItem } from "@/lib/public-wine-card";
import {
  parsePublicWineryDirectoryRequest,
  type PublicCatalogSearchParams,
} from "@/lib/public-wine-card-types";
import { getFeaturedRegions, getWineryDirectoryPage } from "@/lib/queries";
import {
  absoluteUrl,
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  SITE,
} from "@/lib/seo";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getDiscoveryI18n();
  const path = localizedHref(locale, "wineries");

  return {
    title: t("Wineries.metadata.title"),
    description: t("Wineries.metadata.description"),
    keywords:
      locale === "en"
        ? ["Romanian wineries", "wine producers", "Romanian wine"]
        : ["crame romanesti", "producatori vin", "vinarii", "vinuri romanesti"],
    alternates: {
      canonical: absoluteUrl(path),
      languages: {
        ro: absoluteUrl(localizedHref("ro", "wineries")),
        en: absoluteUrl(localizedHref("en", "wineries")),
        "x-default": absoluteUrl(localizedHref("ro", "wineries")),
      },
    },
    openGraph: {
      type: "website",
      locale: locale === "en" ? "en_GB" : SITE.locale,
      url: absoluteUrl(path),
      siteName: SITE.name,
      title: t("Wineries.metadata.openGraphTitle"),
      description: t("Wineries.metadata.openGraphDescription"),
    },
    twitter: {
      card: "summary_large_image",
      site: SITE.twitter,
      title: t("Wineries.metadata.openGraphTitle"),
      description: t("Wineries.metadata.openGraphDescription"),
    },
  };
}

interface WineriesIndexPageProps {
  searchParams?: Promise<PublicCatalogSearchParams>;
}

export default async function WineriesIndexPage({
  searchParams,
}: WineriesIndexPageProps) {
  const params = (await searchParams) ?? {};
  const request = parsePublicWineryDirectoryRequest(params);
  const [{ locale, t }, directory, featuredRegions] = await Promise.all([
    getDiscoveryI18n(),
    getWineryDirectoryPage(request),
    getFeaturedRegions(6),
  ]);
  const publicWineries = directory.items.map(buildPublicWineryDirectoryItem);
  const path = localizedHref(locale, "wineries");
  const faq = [
    {
      question: t("Wineries.faq.count.question"),
      answer: t("Wineries.faq.count.answer"),
    },
    {
      question: t("Wineries.faq.choose.question"),
      answer: t("Wineries.faq.choose.answer"),
    },
    {
      question: t("Wineries.faq.claim.question"),
      answer: t("Wineries.faq.claim.answer"),
    },
  ];
  const directoryCopy: WineryDirectoryCopy = {
    searchPlaceholder: t("Wineries.directory.searchPlaceholder"),
    searchAria: t("Wineries.directory.searchAria"),
    apply: t("Wineries.directory.apply"),
    reset: t("Wineries.directory.reset"),
    foundOne: t("Wineries.directory.foundOne"),
    foundMany: t("Wineries.directory.foundMany"),
    noResults: t("Wineries.directory.noResults"),
    previous: t("Wineries.directory.pagination.previous"),
    next: t("Wineries.directory.pagination.next"),
    page: t("Wineries.directory.pagination.page", {
      page: "{page}",
      totalPages: "{totalPages}",
    }),
    card: {
      country: t("Wineries.card.country"),
      verified: t("Wineries.card.verified"),
      unverified: t("Wineries.card.unverified"),
      price: t("Wineries.card.price"),
      best: t("Wineries.card.best"),
      under50: t("Wineries.card.under50"),
      grapes: t("Wineries.card.grapes"),
      checked: t("Wineries.card.checked"),
      wineOne: t("Wineries.card.wineOne"),
      wineMany: t("Wineries.card.wineMany"),
      value: t("Wineries.card.value"),
      view: t("Wineries.card.view"),
      viewAria: t("Wineries.card.viewAria", { name: "{name}" }),
    },
  };

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: t("Wineries.breadcrumbHome"), path: localizedHref(locale, "home") },
    { name: t("Wineries.breadcrumbCurrent"), path },
  ]);

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: t("Wineries.listName"),
    numberOfItems: directory.items.length,
    itemListElement: directory.items.map((winery, index) => ({
      "@type": "ListItem",
      position: (directory.page - 1) * directory.pageSize + index + 1,
      url: absoluteUrl(localizedHref(locale, "winery", { slug: winery.slug })),
      name: winery.name,
    })),
  };

  return (
    <>
      <JsonLd
        data={[itemListJsonLd, breadcrumbJsonLd, buildFaqJsonLd(faq)]}
        id="crame"
      />
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-secondary/20">
          <div className="mx-auto max-w-4xl px-6 py-12 text-center lg:py-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-wine/30 bg-wine/5 px-4 py-1.5 text-sm font-medium text-wine">
              <Building2 className="h-4 w-4" aria-hidden="true" />
              {t("Wineries.count", { count: directory.total })}
            </span>
            <h1 className="mt-5 font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              {t("Wineries.heading")}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {t("Wineries.description")}
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-6xl space-y-14 px-6 py-12">
          {featuredRegions.length > 0 ? (
            <section aria-labelledby="regions-heading">
              <h2
                id="regions-heading"
                className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
              >
                {t("Wineries.regionsHeading")}
              </h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {featuredRegions.map((region) => (
                  <Link
                    key={region.slug}
                    href={localizedHref(locale, "region", {
                      slug: region.slug,
                    })}
                    className="group rounded-2xl border border-border/70 bg-card p-5 transition-all hover:border-wine/30 hover:shadow-sm"
                  >
                    <span className="inline-flex items-center gap-1.5 text-sm text-wine">
                      <MapPin className="h-4 w-4" aria-hidden="true" />
                      {t("Wineries.wineRegion")}
                    </span>
                    <h3 className="mt-2 font-serif text-lg font-semibold text-foreground group-hover:text-wine">
                      {region.name}
                    </h3>
                    {region.description && locale === "ro" ? (
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {region.description}
                      </p>
                    ) : null}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {directory.items.length > 0 || directory.total === 0 ? (
            <WineryDirectory
              wineries={publicWineries}
              query={request.query}
              total={directory.total}
              page={directory.page}
              totalPages={directory.totalPages}
              basePath={path}
              locale={locale}
              copy={directoryCopy}
            />
          ) : (
            <p className="rounded-2xl border border-dashed border-border bg-secondary/20 p-12 text-center text-muted-foreground">
              {t("Wineries.empty")}
            </p>
          )}
        </div>

        <section
          aria-labelledby="crame-faq-heading"
          className="border-t border-border/60 bg-secondary/20 py-14"
        >
          <div className="mx-auto max-w-3xl px-6">
            <h2
              id="crame-faq-heading"
              className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
            >
              {t("Wineries.faqHeading")}
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
