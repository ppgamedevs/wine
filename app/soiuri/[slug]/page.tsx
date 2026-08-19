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
  filterWinesByGrapeVariety,
  getIndexableGrapeVarieties,
} from "@/lib/grape-variety-index";
import {
  getGrapeVarietyCatalogEntries,
  getWinesForSommelier,
} from "@/lib/queries";
import {
  absoluteUrl,
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  SITE,
  type FaqEntry,
} from "@/lib/seo";
import {
  getTopWinesByValue,
  MIN_INDEXABLE_TOP_LIST_WINES,
} from "@/lib/top-lists";
import type { WineWithRelations } from "@/types";
import { formatRon } from "@/lib/format";
import type { AppLocale } from "@/i18n/locale";
import { localizedHref } from "@/i18n/paths";
import {
  resolveTopListDefinitionById,
  topListSlugForLocale,
} from "@/lib/i18n/top-list-routes";
import {
  buildLocalizedAlternates,
  getPseoMessages,
  localizedWineHref,
  openGraphLocale,
} from "@/lib/i18n/pseo";
import { getReadyTranslationValue } from "@/lib/i18n/content-translations";

interface GrapeDescriptionSource {
  id?: number;
  description?: string | null;
  updatedAt?: string;
}

async function englishGrapeDescription(
  grape: GrapeDescriptionSource,
): Promise<{ value: string | null; ready: boolean }> {
  const source = grape.description?.trim();
  if (!source) return { value: null, ready: true };
  if (grape.id == null || grape.updatedAt == null) {
    return { value: null, ready: false };
  }
  const translated = await getReadyTranslationValue({
    entityType: "grape_variety",
    entityId: String(grape.id),
    field: "description",
    sourceLocale: "ro",
    targetLocale: "en",
    sourceValueJson: source,
    sourceUpdatedAt: grape.updatedAt,
  });
  return {
    value: typeof translated === "string" ? translated : null,
    ready: typeof translated === "string",
  };
}

export const revalidate = 3600;
export const dynamicParams = true;

interface SoiuriPageProps {
  params: Promise<{ slug: string }>;
}

function buildGrapeFaq(
  grapeName: string,
  wines: WineWithRelations[],
  topListPath: string,
  locale: AppLocale,
): FaqEntry[] {
  const top = wines[0];
  if (locale === "en") {
    return [
      {
        question: `Which are the best ${grapeName} wines?`,
        answer: top
          ? `${top.name} currently leads with a Value Score of ${top.valueScore ?? "N/A"}/100 at ${formatRon(top.priceAvg, locale)}.`
          : `We update the ${grapeName} ranking regularly.`,
      },
      {
        question: `What is the ${grapeName} grape variety like?`,
        answer: `${grapeName} is part of Romanian viticulture and can produce different styles depending on the region and winery.`,
      },
      {
        question: "Where can I see the complete ranking?",
        answer: `The complete ${grapeName} wine ranking is available at ${absoluteUrl(topListPath)}.`,
      },
    ];
  }
  return [
    {
      question: `Care sunt cele mai bune vinuri ${grapeName}?`,
      answer: top
        ? `${top.name} conduce cu Value Score ${top.valueScore ?? "N/A"}/100 la ${formatRon(top.priceAvg)}.`
        : `Actualizam topul de vinuri ${grapeName} periodic.`,
    },
    {
      question: `Ce caracteristici are soiul ${grapeName}?`,
      answer: `${grapeName} este un soi reprezentativ in viticultura romaneasca, cu stiluri diferite in functie de regiune si crama.`,
    },
    {
      question: "Unde vad clasamentul complet?",
      answer: `Clasamentul complet de vinuri ${grapeName} este disponibil la ${absoluteUrl(topListPath)}.`,
    },
  ];
}

export async function generateStaticParams() {
  const [allWines, grapes] = await Promise.all([
    getWinesForSommelier(),
    getGrapeVarietyCatalogEntries(),
  ]);

  return getIndexableGrapeVarieties(
    allWines,
    grapes,
    MIN_INDEXABLE_TOP_LIST_WINES,
  ).map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: SoiuriPageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = (await getLocale()) as AppLocale;
  const [allWines, grapes] = await Promise.all([
    getWinesForSommelier(),
    getGrapeVarietyCatalogEntries(),
  ]);
  const grape = grapes.find((entry) => entry.slug === slug);
  const grapeWines = grape
    ? filterWinesByGrapeVariety(allWines, grape)
    : [];

  if (!grape || grapeWines.length < MIN_INDEXABLE_TOP_LIST_WINES) {
    return {
      title: getPseoMessages(locale).common.notFound,
      robots: { index: false, follow: true },
    };
  }
  const grapeName = grape.name;
  const translatedDescription =
    locale === "en"
      ? await englishGrapeDescription(grape)
      : { value: null, ready: true };

  const title =
    locale === "en"
      ? `${grapeName} grape variety: guide and top Romanian wines`
      : `Soiul ${grapeName}: ghid si top vinuri romanesti`;
  const description =
    locale === "en"
      ? translatedDescription.value ??
        `A guide to ${grapeName}, including its character, Romanian regions and the best catalog wines with prices in RON.`
      : `Ghid despre ${grapeName}: caracteristici, regiuni si cele mai bune vinuri romanesti cu preturi in RON.`;
  const path = localizedHref(locale, "grapeVariety", { slug });
  const url = absoluteUrl(path);

  return {
    title,
    description,
    ...(translatedDescription.ready
      ? {}
      : { robots: { index: false, follow: true } }),
    alternates: buildLocalizedAlternates(
      locale,
      localizedHref("ro", "grapeVariety", { slug }),
      localizedHref("en", "grapeVariety", { slug }),
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

export default async function SoiuriPage({ params }: SoiuriPageProps) {
  const { slug } = await params;
  const locale = (await getLocale()) as AppLocale;
  const messages = getPseoMessages(locale);
  const [allWines, grapes] = await Promise.all([
    getWinesForSommelier(),
    getGrapeVarietyCatalogEntries(),
  ]);
  const grape = grapes.find((entry) => entry.slug === slug);
  if (!grape) notFound();
  const grapeName = grape.name;
  const translatedDescription =
    locale === "en"
      ? await englishGrapeDescription(grape)
      : { value: null, ready: true };
  const grapeWines = filterWinesByGrapeVariety(allWines, grape);

  if (grapeWines.length < MIN_INDEXABLE_TOP_LIST_WINES) notFound();

  const topWines = getTopWinesByValue(grapeWines, 5);
  const topListDefinition = resolveTopListDefinitionById(
    `grape:${slug}`,
    [slug],
  );
  if (!topListDefinition) notFound();
  const topListSlug = topListSlugForLocale(topListDefinition, locale);
  const topListPath = localizedHref(locale, "topWine", {
    slug: topListSlug,
  });
  const faq = buildGrapeFaq(grapeName, topWines, topListPath, locale);
  const path = localizedHref(locale, "grapeVariety", { slug });

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    inLanguage: locale === "en" ? "en" : "ro",
    name:
      locale === "en" ? `Wines made with ${grapeName}` : `Vinuri ${grapeName}`,
    numberOfItems: topWines.length,
    itemListElement: topWines.map((wine, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(localizedWineHref(locale, wine)),
      name: wine.name,
    })),
  };

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: messages.common.home, path: localizedHref(locale, "home") },
    { name: messages.common.wines, path: localizedHref(locale, "wines") },
    { name: grapeName, path },
  ]);

  return (
    <>
      <JsonLd
        data={[itemListJsonLd, breadcrumbJsonLd, buildFaqJsonLd(faq)]}
        id="soiuri"
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
              <span className="text-foreground">{grapeName}</span>
            </nav>
            <h1 className="font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              {locale === "en" ? grapeName : `Soiul ${grapeName}`}
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {locale === "en"
                ? translatedDescription.value ??
                  `A guide to ${grapeName} in Romanian viticulture, including styles, regions and the strongest wines in the VinIntel catalog.`
                : `Ghid despre ${grapeName} in viticultura romaneasca: stiluri, regiuni si cele mai bune vinuri din catalogul VinIntel.`}
            </p>
            <p className="mt-4">
              <Link
                href={topListPath}
                className="font-medium text-wine hover:underline"
              >
                {locale === "en"
                  ? `See the complete ${grapeName} ranking`
                  : `Vezi clasamentul complet ${grapeName}`}
              </Link>
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-5xl space-y-14 px-6 py-12">
          <section aria-labelledby="top-wines-heading">
            <h2
              id="top-wines-heading"
              className="font-serif text-2xl font-semibold text-foreground"
            >
              {locale === "en"
                ? `Top wines made with ${grapeName}`
                : `Top vinuri ${grapeName}`}
            </h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {topWines.map((wine) => (
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
