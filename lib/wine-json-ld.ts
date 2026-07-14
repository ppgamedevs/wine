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
  | "currentPrice"
  | "lowestPrice30d"
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

/** Best available catalog price for schema.org Offer nodes. */
export function resolveWineOfferPrice(
  wine: Pick<
    WineStructuredDataInput,
    "currentPrice" | "priceAvg" | "lowestPrice30d"
  >,
): number | null {
  const candidates = [wine.currentPrice, wine.priceAvg, wine.lowestPrice30d];
  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return value;
    }
  }
  return null;
}

function buildProductOffers(wine: WineStructuredDataInput, url: string) {
  const price = resolveWineOfferPrice(wine);

  return {
    "@type": "Offer" as const,
    url,
    priceCurrency: "RON",
    availability: "https://schema.org/InStock",
    ...(price != null ? { price } : {}),
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
 * Always includes an Offer (with price when available) so winery catalog pages validate.
 */
export function buildWineProductNode(
  wine: WineStructuredDataInput,
): Record<string, unknown> {
  const url = winePageUrl(wine.slug);
  const wineryName = wine.winery?.name;
  const { src: imageUrl } = resolveWineImage(wine);
  const offers = buildProductOffers(wine, url);
  const aggregateRating = buildProductAggregateRating(wine);

  return {
    "@type": "Product",
    name: wine.name,
    description: wine.tastingNotes ?? `Vin romanesc ${wine.name}.`,
    url,
    ...(imageUrl ? { image: imageUrl } : {}),
    ...(wineryName ? { brand: { "@type": "Brand", name: wineryName } } : {}),
    category: "Wine",
    offers,
    ...(aggregateRating ? { aggregateRating } : {}),
  };
}

export function buildWineProductJsonLd(
  wine: WineStructuredDataInput,
): Record<string, unknown> {
  return {
    "@context": SCHEMA_CONTEXT,
    ...buildWineProductNode(wine),
  };
}

/** Offer entry for Winery.makesOffer with a valid nested Product. */
export function buildWineryMakesOfferEntry(
  wine: WineStructuredDataInput,
): Record<string, unknown> {
  const url = winePageUrl(wine.slug);
  const price = resolveWineOfferPrice(wine);
  const productNode = buildWineProductNode(wine);

  return {
    "@type": "Offer",
    url,
    priceCurrency: "RON",
    availability: "https://schema.org/InStock",
    ...(price != null ? { price } : {}),
    itemOffered: productNode,
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
    offers,
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

  return [wineSchema, productSchema, faqSchema, breadcrumbSchema];
}

export function buildWineMetadataDescription(wine: WineWithRelations): string {
  const price = resolveWineOfferPrice(wine);
  const parts = [
    `${buildWineFullTitle(wine.name, wine.vintage)}`,
    wine.winery?.name ? `de la ${wine.winery.name}` : null,
    price != null ? `la ${formatRon(price)}` : null,
    wine.valueScore ? `Value Score ${wine.valueScore}/100` : null,
    wine.foodPairings?.[0]?.dish
      ? `potrivit pentru ${wine.foodPairings[0].dish.toLowerCase()}`
      : null,
  ].filter(Boolean);

  return `${parts.join(", ")}. Analiza completa, pairing-uri romanesti si unde il gasesti.`;
}
