import { resolvePublicPrice } from "@/lib/public-price";
import type { AffiliateLink } from "@/lib/schema";

export interface ApprovalPurchaseWine {
  slug: string;
  name: string;
  vintage: number | null;
  affiliateLinks: AffiliateLink[];
}

/**
 * Email CTAs use the same canonical public-price resolver as the website. A CTA
 * is available only for a fresh, qualifying Profitshare offer whose exact
 * product/variant identity matches this wine.
 */
export function resolveApprovalPurchaseUrl(
  wine: ApprovalPurchaseWine,
  now: Date = new Date(),
): string | null {
  return (
    resolvePublicPrice(
      {
        slug: wine.slug,
        name: wine.name,
        vintage: wine.vintage,
        affiliateLinks: wine.affiliateLinks,
        priceHistory: [],
      },
      { now },
    ).bestOffer?.url ?? null
  );
}
