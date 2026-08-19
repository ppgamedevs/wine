"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { RetailerPurchaseLink } from "@/components/wines/retailer-purchase-link";
import { VerifyPriceButton } from "@/components/wines/verify-price-button";
import type {
  WineCardAnalyticsViewModel,
  WineCardPriceViewModel,
} from "@/lib/public-wine-card-types";
import { trackWineryEvent } from "@/lib/winery-analytics-client";

export function TrackedWineCardLink({
  href,
  slug,
  analytics,
  className,
  children,
}: {
  href: string;
  slug: string;
  analytics: WineCardAnalyticsViewModel;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        void trackWineryEvent(analytics.wineryId, "wine_click", {
          wineId: analytics.wineId,
          metadata: { wineSlug: slug },
        });
      }}
    >
      {children}
    </Link>
  );
}

export function WineCardPurchaseAction({
  slug,
  price,
  analytics,
}: {
  slug: string;
  price: WineCardPriceViewModel;
  analytics: WineCardAnalyticsViewModel | null;
}) {
  const trackPurchase = analytics
    ? () => {
        void trackWineryEvent(analytics.wineryId, "purchase_click", {
          wineId: analytics.wineId,
          metadata: { wineSlug: slug },
        });
      }
    : undefined;

  if (price.status !== "unavailable" && price.purchaseLink) {
    return (
      <RetailerPurchaseLink
        url={price.purchaseLink.url}
        retailerName={price.purchaseLink.retailer}
        size="sm"
        onTrackClick={trackPurchase}
      />
    );
  }

  if (price.status !== "unavailable" && price.verifyPriceUrl) {
    return (
      <VerifyPriceButton
        url={price.verifyPriceUrl}
        enabled={price.canVerifyPrice}
      />
    );
  }

  return null;
}
