/**
 * V2 intelligence is factual research. It never owns public pricing.
 * Public prices are exclusively resolved from qualifying Profitshare offers.
 */
import type { WineClaim, WineSourceClass } from "@/lib/intelligence/types";

export const PUBLIC_PRICE_RESOLVER = "profitshare_only";

export function sourceMayContributePublicPrice(
  sourceClass: WineSourceClass,
): false {
  void sourceClass;
  return false;
}

export function assertNoPublicPriceClaims(claims: WineClaim[]): void {
  for (const claim of claims) {
    if (claim.field === "other_product_info") {
      const text = JSON.stringify(claim.value).toLowerCase();
      if (/\b(price|preț|pret)\b/.test(text) && /\d/.test(text)) {
        throw new Error(
          `V2 claim ${claim.sourceUrl} contains price-like product information; public pricing is Profitshare-only.`,
        );
      }
    }
  }
}
