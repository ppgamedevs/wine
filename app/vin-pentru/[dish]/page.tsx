import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getLocale } from "next-intl/server";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WineCard } from "@/components/wine-card";
import {
  getAllDishPairingSlugs,
  getDishPairingPage,
  rankWinesForDish,
} from "@/lib/dish-pairing-pages";
import type { AppLocale } from "@/i18n/locale";
import { localizedHref } from "@/i18n/paths";
import {
  buildLocalizedAlternates,
  buildLocalizedDishFaq,
  buildLocalizedDishPresentation,
  getPseoMessages,
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
import { MIN_INDEXABLE_TOP_LIST_WINES } from "@/lib/top-lists";

export const revalidate = 3600;
export const dynamicParams = false;

interface VinPentruPageProps {
  params: Promise<{ dish: string }>;
}

export async function generateStaticParams() {
  const allWines = await getWinesForSommelier();
  return getAllDishPairingSlugs()
    .filter((slug) => {
      const config = getDishPairingPage(slug);
      if (!config) return false;
      return rankWinesForDish(allWines, config).length >= MIN_INDEXABLE_TOP_LIST_WINES;
    })
    .map((dish) => ({ dish }));
}

export async function generateMetadata({ params }: VinPentruPageProps): Promise<Metadata> {
  const { dish } = await params;
  const locale = (await getLocale()) as AppLocale;
  const config = getDishPairingPage(dish);
  if (!config) return { title: getPseoMessages(locale).common.notFound };

  const presentation = buildLocalizedDishPresentation(config, locale);
  const path = localizedHref(locale, "wineFor", { dish });
  const url = absoluteUrl(path);
  return {
    title: presentation.metaTitle,
    description: presentation.metaDescription,
    alternates: buildLocalizedAlternates(
      locale,
      localizedHref("ro", "wineFor", { dish }),
      localizedHref("en", "wineFor", { dish }),
    ),
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
      title: `${presentation.metaTitle} | VinIntel`,
      description: presentation.metaDescription,
    },
  };
}

export default async function VinPentruPage({ params }: VinPentruPageProps) {
  const { dish } = await params;
  const locale = (await getLocale()) as AppLocale;
  const messages = getPseoMessages(locale);
  const config = getDishPairingPage(dish);
  if (!config) notFound();
  const presentation = buildLocalizedDishPresentation(config, locale);

  const allWines = await getWinesForSommelier();
  const wines = rankWinesForDish(allWines, config);

  if (wines.length < MIN_INDEXABLE_TOP_LIST_WINES) notFound();

  const faq = buildLocalizedDishFaq(presentation, wines, locale);
  const path = localizedHref(locale, "wineFor", { dish });
  const url = absoluteUrl(path);

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    inLanguage: locale === "en" ? "en" : "ro",
    name: presentation.heading,
    url,
    numberOfItems: wines.length,
    itemListElement: wines.map((wine, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(localizedWineHref(locale, wine)),
      name: wine.name,
    })),
  };

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: messages.common.home, path: localizedHref(locale, "home") },
    { name: messages.common.wines, path: localizedHref(locale, "wines") },
    { name: presentation.name, path },
  ]);

  return (
    <>
      <JsonLd
        data={[itemListJsonLd, breadcrumbJsonLd, buildFaqJsonLd(faq)]}
        id="vin-pentru"
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
              <span className="text-foreground">{presentation.name}</span>
            </nav>
            <h1 className="font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              {presentation.heading}
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {presentation.intro}
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-5xl space-y-14 px-6 py-12">
          <section aria-labelledby="wines-heading">
            <h2
              id="wines-heading"
              className="font-serif text-2xl font-semibold text-foreground"
            >
              {messages.common.recommendations}
            </h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {wines.map((wine) => (
                <WineCard key={wine.id} wine={wine} minValueScore={null} />
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
