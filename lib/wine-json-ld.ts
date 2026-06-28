import { formatRon } from "@/lib/format";
import { resolveWineImage } from "@/lib/wine-images";
import type { WineFaqItem } from "@/lib/wine-analysis";
import type { WineWithRelations } from "@/types";

const siteUrl = "https://vinintel.ro";

export function buildWineJsonLd(
  wine: WineWithRelations,
  faq: WineFaqItem[],
) {
  const url = `${siteUrl}/wines/${wine.slug}`;
  const wineryName = wine.winery?.name;
  const regionName = wine.region?.name;
  const { src: imageUrl, alt: imageAlt } = resolveWineImage(wine);

  const wineSchema = {
    "@context": "https://schema.org",
    "@type": "Wine",
    name: wine.name,
    description: wine.tastingNotes ?? `${wine.name} din ${regionName ?? "Romania"}.`,
    url,
    image: {
      "@type": "ImageObject",
      url: imageUrl,
      caption: imageAlt,
    },
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
    offers: wine.priceAvg
      ? {
          "@type": "Offer",
          price: wine.priceAvg,
          priceCurrency: "RON",
          availability: "https://schema.org/InStock",
          url,
        }
      : undefined,
    aggregateRating:
      wine.ratingAvg && wine.ratingCount > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: wine.ratingAvg,
            reviewCount: wine.ratingCount,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
  };

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: wine.name,
    description: wine.tastingNotes ?? `Vin romanesc ${wine.name}.`,
    url,
    image: imageUrl,
    brand: wineryName
      ? { "@type": "Brand", name: wineryName }
      : undefined,
    category: "Wine",
    offers: wine.priceAvg
      ? {
          "@type": "AggregateOffer",
          lowPrice: wine.priceAvg,
          highPrice: wine.priceAvg,
          priceCurrency: "RON",
          offerCount: wine.availability.length || 1,
          availability: "https://schema.org/InStock",
        }
      : undefined,
    aggregateRating:
      wine.ratingAvg && wine.ratingCount > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: wine.ratingAvg,
            reviewCount: wine.ratingCount,
          }
        : undefined,
  };

  const faqSchema = {
    "@context": "https://schema.org",
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
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Acasa",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Vinuri",
        item: `${siteUrl}/vinuri`,
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
  const parts = [
    `${wine.name}${wine.vintage ? ` ${wine.vintage}` : ""}`,
    wine.winery?.name ? `de la ${wine.winery.name}` : null,
    wine.priceAvg ? `la ${formatRon(wine.priceAvg)}` : null,
    wine.valueScore ? `Value Score ${wine.valueScore}/100` : null,
    wine.foodPairings[0]?.dish
      ? `potrivit pentru ${wine.foodPairings[0].dish.toLowerCase()}`
      : null,
  ].filter(Boolean);

  return `${parts.join(", ")}. Analiza completa, pairing-uri romanesti si unde il gasesti.`;
}
