import type { Metadata } from "next";
import { MapPin } from "lucide-react";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { LocalizedSiteFooter } from "@/components/localized-site-footer";
import { SiteHeader } from "@/components/site-header";
import { localizedHref } from "@/i18n/paths";
import { getDiscoveryI18n } from "@/lib/i18n/discovery";
import { localizedRobots } from "@/lib/i18n/indexing";
import { getRegionDirectory } from "@/lib/queries";
import {
  absoluteUrl,
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  SITE,
} from "@/lib/seo";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getDiscoveryI18n();
  const path = localizedHref(locale, "regions");

  return {
    title: t("Regions.metadata.title"),
    description: t("Regions.metadata.description"),
    robots: localizedRobots(locale),
    keywords:
      locale === "en"
        ? ["Romanian wine regions", "vineyard areas", "DOC regions"]
        : [
            "regiuni viticole",
            "zone viticole",
            "podgorii romania",
            "DOC Romania",
          ],
    alternates: {
      canonical: absoluteUrl(path),
      languages: {
        ro: absoluteUrl(localizedHref("ro", "regions")),
        en: absoluteUrl(localizedHref("en", "regions")),
        "x-default": absoluteUrl(localizedHref("ro", "regions")),
      },
    },
    openGraph: {
      type: "website",
      locale: locale === "en" ? "en_GB" : SITE.locale,
      url: absoluteUrl(path),
      siteName: SITE.name,
      title: t("Regions.metadata.openGraphTitle"),
      description: t("Regions.metadata.openGraphDescription"),
    },
    twitter: {
      card: "summary_large_image",
      site: SITE.twitter,
      title: t("Regions.metadata.openGraphTitle"),
      description: t("Regions.metadata.openGraphDescription"),
    },
  };
}

function countLabel(
  count: number,
  one: string,
  many: string,
): string {
  return `${count} ${count === 1 ? one : many}`;
}

export default async function RegionsIndexPage() {
  const [{ locale, t }, regions] = await Promise.all([
    getDiscoveryI18n(),
    getRegionDirectory(),
  ]);
  const path = localizedHref(locale, "regions");
  const faq = [
    {
      question: t("Regions.faq.difference.question"),
      answer: t("Regions.faq.difference.answer"),
    },
    {
      question: t("Regions.faq.count.question"),
      answer: t("Regions.faq.count.answer"),
    },
    {
      question: t("Regions.faq.choose.question"),
      answer: t("Regions.faq.choose.answer"),
    },
  ];

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: t("Regions.breadcrumbHome"), path: localizedHref(locale, "home") },
    { name: t("Regions.breadcrumbCurrent"), path },
  ]);

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: t("Regions.listName"),
    numberOfItems: regions.length,
    itemListElement: regions.map((region, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(localizedHref(locale, "region", { slug: region.slug })),
      name: region.name,
    })),
  };

  return (
    <>
      <JsonLd
        data={[itemListJsonLd, breadcrumbJsonLd, buildFaqJsonLd(faq)]}
        id="regiuni"
      />
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-secondary/20">
          <div className="mx-auto max-w-4xl px-6 py-12 text-center lg:py-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-wine/30 bg-wine/5 px-4 py-1.5 text-sm font-medium text-wine">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              {t("Regions.count", { count: regions.length })}
            </span>
            <h1 className="mt-5 font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              {t("Regions.heading")}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {t("Regions.description")}
            </p>
            <Link
              href={localizedHref(locale, "wineries")}
              className="mt-6 inline-flex items-center justify-center rounded-full border border-wine/30 bg-background px-5 py-2.5 text-sm font-medium text-wine transition-colors hover:bg-wine hover:text-wine-foreground"
              aria-label={t("Regions.wineriesCtaAria")}
            >
              {t("Regions.wineriesCta")}
            </Link>
          </div>
        </section>

        <div className="mx-auto max-w-6xl space-y-14 px-6 py-12">
          {regions.length > 0 ? (
            <section aria-labelledby="regions-list-heading">
              <h2 id="regions-list-heading" className="sr-only">
                {t("Regions.listName")}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {regions.map((region) => (
                  <Link
                    key={region.slug}
                    href={localizedHref(locale, "region", {
                      slug: region.slug,
                    })}
                    className="group rounded-2xl border border-border/70 bg-card p-5 transition-all hover:border-wine/30 hover:shadow-sm"
                  >
                    <span className="inline-flex items-center gap-1.5 text-sm text-wine">
                      <MapPin className="h-4 w-4" aria-hidden="true" />
                      {t("Regions.eyebrow")}
                    </span>
                    <h3 className="mt-2 font-serif text-lg font-semibold text-foreground group-hover:text-wine">
                      {region.name}
                    </h3>
                    {region.description && locale === "ro" ? (
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {region.description}
                      </p>
                    ) : null}
                    <p className="mt-4 text-xs text-muted-foreground">
                      {countLabel(
                        region.wineryCount,
                        t("Regions.wineryOne"),
                        t("Regions.wineryMany"),
                      )}
                      {" / "}
                      {countLabel(
                        region.wineCount,
                        t("Regions.wineOne"),
                        t("Regions.wineMany"),
                      )}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ) : (
            <p className="rounded-2xl border border-dashed border-border bg-secondary/20 p-12 text-center text-muted-foreground">
              {t("Regions.empty")}
            </p>
          )}
        </div>

        <section
          aria-labelledby="regiuni-faq-heading"
          className="border-t border-border/60 bg-secondary/20 py-14"
        >
          <div className="mx-auto max-w-3xl px-6">
            <h2
              id="regiuni-faq-heading"
              className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
            >
              {t("Regions.faqHeading")}
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
