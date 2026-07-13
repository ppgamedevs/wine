import { formatRon } from "@/lib/format";
import { resolveWineImage } from "@/lib/wine-images";
import type { WineFaqItem } from "@/lib/wine-analysis";
import { absoluteUrl } from "@/lib/seo";
import { buildWineFullTitle } from "@/lib/wine-vintage";
import type { WineWithRelations } from "@/types";

const SCHEMA_CONTEXT = "https://schema.org";

export type WineStructuredDataInput = Pick<
  WineWithRelations,
  | "slug"
  | "name"
  | "vintage"
  | "tastingNotes"
  | "priceAvg"
  | "ratingAvg"
  | "ratingCount"
  | "imageUrl"
  | "imageSource"
  | "imageAlt"
  | "type"
  | "alcohol"
  | "winery"
  | "region"
>;

function winePageUrl(slug: string): string {
  return absoluteUrl(`/wines/${slug}`);
}

function buildProductOffers(wine: WineStructuredDataInput, url: string) {
  if (!wine.priceAvg) return undefined;

  return {
    "@type": "Offer" as const,
    price: wine.priceAvg,
    priceCurrency: "RON",
    availability: "https://schema.org/InStock",
    url,
  };
}

function buildProductAggregateRating(wine: WineStructuredDataInput) {
  if (!wine.ratingAvg || !wine.ratingCount || wine.ratingCount <= 0) {
    return undefined;
  }

  return {
    "@type": "AggregateRating" as const,
    ratingValue: wine.ratingAvg,
    reviewCount: wine.ratingCount,
    bestRating: 5,
    worstRating: 1,
  };
}

/**
 * Product node that satisfies Google Product snippets (needs offers, review, or aggregateRating).
 * Returns null when none of those fields are available.
 */
export function buildWineProductNode(
  wine: WineStructuredDataInput,
): Record<string, unknown> | null {
  const url = winePageUrl(wine.slug);
  const wineryName = wine.winery?.name;
  const { src: imageUrl } = resolveWineImage(wine);
  const offers = buildProductOffers(wine, url);
  const aggregateRating = buildProductAggregateRating(wine);

  if (!offers && !aggregateRating) {
    return null;
  }

  return {
    "@type": "Product",
    name: wine.name,
    description: wine.tastingNotes ?? `Vin romanesc ${wine.name}.`,
    url,
    ...(imageUrl ? { image: imageUrl } : {}),
    ...(wineryName ? { brand: { "@type": "Brand", name: wineryName } } : {}),
    category: "Wine",
    ...(offers ? { offers } : {}),
    ...(aggregateRating ? { aggregateRating } : {}),
  };
}

export function buildWineProductJsonLd(
  wine: WineStructuredDataInput,
): Record<string, unknown> | null {
  const node = buildWineProductNode(wine);
  if (!node) return null;

  return {
    "@context": SCHEMA_CONTEXT,
    ...node,
  };
}

/** Offer entry for Winery.makesOffer; avoids invalid nested Product nodes. */
export function buildWineryMakesOfferEntry(
  wine: WineStructuredDataInput,
): Record<string, unknown> {
  const url = winePageUrl(wine.slug);
  const productNode = buildWineProductNode(wine);

  return {
    "@type": "Offer",
    url,
    ...(wine.priceAvg
      ? {
          price: wine.priceAvg,
          priceCurrency: "RON",
          availability: "https://schema.org/InStock",
        }
      : {}),
    itemOffered:
      productNode ??
      ({
        "@type": "Wine",
        name: wine.name,
        url,
      } satisfies Record<string, unknown>),
  };
}

export function buildWineJsonLd(
  wine: WineWithRelations,
  faq: WineFaqItem[],
) {
  const url = winePageUrl(wine.slug);
  const wineryName = wine.winery?.name;
  const regionName = wine.region?.name;
  const { src: imageUrl, alt: imageAlt } = resolveWineImage(wine);
  const offers = buildProductOffers(wine, url);
  const aggregateRating = buildProductAggregateRating(wine);

  const wineSchema = {
    "@context": SCHEMA_CONTEXT,
    "@type": "Wine",
    name: wine.name,
    description: wine.tastingNotes ?? `${wine.name} din ${regionName ?? "Romania"}.`,
    url,
    ...(imageUrl
      ? {
          image: {
            "@type": "ImageObject",
            url: imageUrl,
            caption: imageAlt,
          },
        }
      : {}),
    alcoholContent: wine.alcohol ? `${wine.alcohol}%` : undefined,
    vintage: wine.vintage ? String(wine.vintage) : undefined,
    color: wine.type,
    countryOfOrigin: {
      "@type": "Country",
      name: "Romania",
    },
    producer: wineryName
      ? { "@type": "Organization", name: wineryName }
      : undefined,
    ...(offers ? { offers } : {}),
    ...(aggregateRating ? { aggregateRating } : {}),
  };

  const productSchema = buildWineProductJsonLd(wine);

  const faqSchema = {
    "@context": SCHEMA_CONTEXT,
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const breadcrumbSchema = {
    "@context": SCHEMA_CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Acasa",
        item: absoluteUrl("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Vinuri",
        item: absoluteUrl("/vinuri"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: wine.name,
        item: url,
      },
    ],
  };

  return [
    wineSchema,
    ...(productSchema ? [productSchema] : []),
    faqSchema,
    breadcrumbSchema,
  ];
}

export function buildWineMetadataDescription(wine: WineWithRelations): string {
  const parts = [
    `${buildWineFullTitle(wine.name, wine.vintage)}`,
    wine.winery?.name ? `de la ${wine.winery.name}` : null,
    wine.priceAvg ? `la ${formatRon(wine.priceAvg)}` : null,
    wine.valueScore ? `Value Score ${wine.valueScore}/100` : null,
    wine.foodPairings?.[0]?.dish
      ? `potrivit pentru ${wine.foodPairings[0].dish.toLowerCase()}`
      : null,
  ].filter(Boolean);

  return `${parts.join(", ")}. Analiza completa, pairing-uri romanesti si unde il gasesti.`;
}
