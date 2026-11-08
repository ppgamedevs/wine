import {
  extractEmagProductId,
  normalizeEmagProductUrl,
} from "@/lib/affiliate-pricing";
import type { AffiliateLink } from "@/lib/schema";

export function buildAffiliateLinks(input: {
  slug: string;
  producer: string;
  sourceUrl: string;
  emagUrl: string | null;
  profitshareUrl: string | null;
  bottleSizeMl: number | null;
  vintage: number | null;
}): AffiliateLink[] {
  const productId = extractEmagProductId(input.emagUrl);
  if (input.emagUrl && input.profitshareUrl && productId) {
    return [
      {
        retailer: "eMAG.ro",
        url: input.profitshareUrl,
        merchantUrl: normalizeEmagProductUrl(input.emagUrl) ?? input.emagUrl,
        merchantProductId: productId,
        productKey: input.slug,
        bottleSizeMl: input.bottleSizeMl ?? undefined,
        vintage: input.vintage,
        currency: "RON",
        verificationStatus: "unverified",
      },
    ];
  }

  // Legacy flat import: source_url is all we know. Do not pretend it is an
  // affiliate link or that the CSV price is a fresh merchant observation.
  return [
    {
      retailer: input.producer,
      url: input.sourceUrl,
      priceRon: undefined,
      ...(input.bottleSizeMl != null ? { bottleSizeMl: input.bottleSizeMl } : {}),
      vintage: input.vintage,
    },
  ];
}
