import type { Metadata } from "next";
import { ChevronRight, MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getLocale } from "next-intl/server";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WineCard } from "@/components/wine-card";
import { WineryCard } from "@/components/wineries/winery-card";
import {
  getIndexableRegionSlugs,
  getRegionHubData,
} from "@/lib/queries";
import {
  absoluteUrl,
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  SITE,
  type FaqEntry,
} from "@/lib/seo";
import { MIN_INDEXABLE_TOP_LIST_WINES } from "@/lib/top-lists";
import type { AppLocale } from "@/i18n/locale";
import { localizedHref } from "@/i18n/paths";
import {
  buildLocalizedAlternates,
  getPseoMessages,
  localizedWineHref,
  openGraphLocale,
} from "@/lib/i18n/pseo";
import { getReadyTranslationValue } from "@/lib/i18n/content-translations";

interface RegionDescriptionSource {
  id: number;
  description: string | null;
  updatedAt: string;
}

async function englishRegionDescription(
  region: RegionDescriptionSource,
): Promise<{ value: string | null; ready: boolean }> {
  const source = region.description?.trim();
  if (!source) return { value: null, ready: true };
  const translated = await getReadyTranslationValue({
    entityType: "region",
    entityId: String(region.id),
    field: "description",
    sourceLocale: "ro",
    targetLocale: "en",
    sourceValueJson: source,
    sourceUpdatedAt: region.updatedAt,
  });
  return {
    value: typeof translated === "string" ? translated : null,
    ready: typeof translated === "string",
  };
}

export const revalidate = 3600;
export const dynamicParams = true;

interface RegionPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = await getIndexableRegionSlugs(MIN_INDEXABLE_TOP_LIST_WINES);
  return slugs.map((slug) => ({ slug }));
}

function buildRegionFaq(
  regionName: string,
  wineCount: number,
  wineryCount: number,
  locale: AppLocale,
): FaqEntry[] {
  if (locale === "en") {
    return [
      {
        question: `Which wines does VinIntel recommend from ${regionName}?`,
        answer: `The catalog includes ${wineCount} wines from ${regionName}, ordered by Value Score with prices in RON.`,
      },
      {
        question: `How many wineries are listed in ${regionName}?`,
        answer: `VinIntel lists ${wineryCount} wineries from ${regionName} with at least one analyzed wine.`,
      },
      {
        question: `How should I choose a wine from ${regionName}?`,
        answer:
          "Compare Value Score, price and food pairing information. Use the budget rankings or AI Sommelier for a specific occasion.",
      },
    ];
  }
  return [
    {
      question: `Ce vinuri recomanda VinIntel din ${regionName}?`,
      answer: `Avem ${wineCount} vinuri din ${regionName} in catalog, ordonate dupa Value Score, cu preturi in RON si pairing-uri pentru mancare romaneasca.`,
    },
    {
      question: `Cate crame sunt in ${regionName}?`,
      answer: `Listam ${wineryCount} crame din ${regionName} cu cel putin un vin analizat in baza noastra de date.`,
    },
    {
      question: `Cum aleg un vin din ${regionName}?`,
      answer:
        "Compara Value Score-ul, pretul si pairing-urile. Pentru ocazii specifice, foloseste topurile noastre pe buget sau somelierul AI.",
    },
  ];
}

export async function generateMetadata({ params }: RegionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = (await getLocale()) as AppLocale;
  const hub = await getRegionHubData(slug);
  if (!hub || hub.wines.length < MIN_INDEXABLE_TOP_LIST_WINES) {
    return {
      title: getPseoMessages(locale).common.notFound,
      robots: { index: false, follow: true },
    };
  }
  const translatedDescription =
    locale === "en"
      ? await englishRegionDescription(hub.region)
      : { value: null, ready: true };

  const title =
    locale === "en"
      ? `Wines from ${hub.region.name}: wineries, rankings and prices`
      : `Vinuri din ${hub.region.name}: crame, topuri si preturi`;
  const description =
    locale === "en"
      ? translatedDescription.value ??
        `Explore ${hub.region.name} through ${hub.wines.length} wines and ${hub.wineries.length} wineries, with Value Scores and prices in RON.`
      : `Descopera vinurile si cramele din ${hub.region.name}: ${hub.wines.length} vinuri, ${hub.wineries.length} crame, Value Score si preturi in RON.`;
  const path = localizedHref(locale, "region", { slug });
  const url = absoluteUrl(path);

  return {
    title,
    description,
    ...(translatedDescription.ready
      ? {}
      : { robots: { index: false, follow: true } }),
    alternates: buildLocalizedAlternates(
      locale,
      localizedHref("ro", "region", { slug }),
      localizedHref("en", "region", { slug }),
    ),
    openGraph: {
      type: "website",
      locale: openGraphLocale(locale),
      url,
      siteName: SITE.name,
      title: `${title} | VinIntel`,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | VinIntel`,
      description,
    },
  };
}

export default async function RegionPage({ params }: RegionPageProps) {
  const { slug } = await params;
  const locale = (await getLocale()) as AppLocale;
  const messages = getPseoMessages(locale);
  const hub = await getRegionHubData(slug);

  if (!hub || hub.wines.length < MIN_INDEXABLE_TOP_LIST_WINES) {
    notFound();
  }

  const { region, wineries, wines } = hub;
  const translatedDescription =
    locale === "en"
      ? await englishRegionDescription(region)
      : { value: null, ready: true };
  const faq = buildRegionFaq(
    region.name,
    wines.length,
    wineries.length,
    locale,
  );
  const path = localizedHref(locale, "region", { slug });
  const url = absoluteUrl(path);

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    inLanguage: locale === "en" ? "en" : "ro",
    name:
      locale === "en"
        ? `Wines from ${region.name}`
        : `Vinuri din ${region.name}`,
    url,
    numberOfItems: wines.length,
    itemListElement: wines.slice(0, 10).map((wine, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(localizedWineHref(locale, wine)),
      name: wine.name,
    })),
  };

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: messages.common.home, path: localizedHref(locale, "home") },
    {
      name: messages.common.wineries,
      path: localizedHref(locale, "wineries"),
    },
    { name: region.name, path },
  ]);

  return (
    <>
      <JsonLd
        data={[itemListJsonLd, breadcrumbJsonLd, buildFaqJsonLd(faq)]}
        id="region"
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
                href={localizedHref(locale, "wineries")}
                className="hover:text-wine"
              >
                {messages.common.wineries}
              </Link>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="text-foreground">{region.name}</span>
            </nav>
            <span className="inline-flex items-center gap-2 rounded-full border border-wine/30 bg-wine/5 px-4 py-1.5 text-sm font-medium text-wine">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              {region.name}
            </span>
            <h1 className="mt-5 font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              {locale === "en"
                ? `Wines from ${region.name}`
                : `Vinuri din ${region.name}`}
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {locale === "en"
                ? translatedDescription.value ??
                  `A Romanian wine region with ${wineries.length} wineries and ${wines.length} wines analyzed in the VinIntel catalog.`
                : region.description ??
                  `Regiune viticola din Romania cu ${wineries.length} crame si ${wines.length} vinuri analizate in catalogul VinIntel.`}
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-5xl space-y-14 px-6 py-12">
          <section aria-labelledby="region-wines-heading">
            <h2
              id="region-wines-heading"
              className="font-serif text-2xl font-semibold text-foreground"
            >
              {locale === "en"
                ? `Top wines from ${region.name}`
                : `Top vinuri din ${region.name}`}
            </h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {wines.slice(0, 6).map((wine) => (
                <WineCard key={wine.id} wine={wine} minValueScore={null} />
              ))}
            </div>
          </section>

          <section aria-labelledby="region-wineries-heading">
            <h2
              id="region-wineries-heading"
              className="font-serif text-2xl font-semibold text-foreground"
            >
              {locale === "en"
                ? `Wineries in ${region.name}`
                : `Crame din ${region.name}`}
            </h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {wineries.map((winery) => (
                <WineryCard
                  key={winery.id}
                  winery={winery}
                  locale={locale}
                  copy={messages.region.wineryCard}
                />
              ))}
            </div>
          </section>

          <section aria-labelledby="region-faq-heading">
            <h2
              id="region-faq-heading"
              className="font-serif text-2xl font-semibold text-foreground"
            >
              {messages.common.faq}
            </h2>
            <div className="mt-6 space-y-3">
              {faq.map((item) => (
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
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
