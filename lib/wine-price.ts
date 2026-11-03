import type { AffiliateLink, PriceHistoryEntry } from "@/lib/schema";
import {
  PUBLIC_PRICE_MAX_AGE_HOURS,
  resolvePublicPrice,
  type PublicPriceOffer,
} from "@/lib/public-price";
import type { WineWithRelations } from "@/types";

/** Pret public considerat verificat daca oferta Profitshare e in ultimele 48h. */
export const VERIFIED_PRICE_MAX_AGE_HOURS = PUBLIC_PRICE_MAX_AGE_HOURS;

export type WinePriceStatus = "verified" | "unavailable";

export interface PriceChangeInfo {
  previousPrice: number;
  currentPrice: number;
  percentChange: number;
  direction: "up" | "down" | "unchanged";
}

export interface WinePriceViewModel {
  displayPrice: number | null;
  status: WinePriceStatus;
  lowestPrice30d: null;
  isVerifiedRecent: boolean;
  priceChange: null;
  comparison: null;
  purchaseLink:
    | (AffiliateLink & { label: string })
    | null;
  verifyPriceUrl: null;
  /** All qualified Profitshare offers for this exact wine. */
  offers: PublicPriceOffer[];
}

function getLatestPriceEntry(
  history: PriceHistoryEntry[],
): PriceHistoryEntry | null {
  if (history.length === 0) return null;
  return [...history].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
}

function getPreviousPriceEntry(
  history: PriceHistoryEntry[],
): PriceHistoryEntry | null {
  if (history.length < 2) return null;
  const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));
  return sorted[1] ?? null;
}

export function isRecentVerifiedPrice(
  wine: WineWithRelations,
  now: Date = new Date(),
): boolean {
  return resolvePublicPrice(wine, { now }).isVerifiedRecent;
}

export function resolveWineDisplayPrice(
  wine: WineWithRelations,
  now: Date = new Date(),
): number | null {
  return resolvePublicPrice(wine, { now }).displayPrice;
}

export function resolveWinePriceStatus(
  wine: WineWithRelations,
  now: Date = new Date(),
): WinePriceStatus {
  return resolvePublicPrice(wine, { now }).status;
}

/**
 * Legacy helper retained for internal analysis only.
 * Public components must use `buildWinePriceViewModel`; price history is not
 * exposed under the Profitshare-only policy.
 */
export function getPriceChange(
  history: PriceHistoryEntry[],
  currentPrice: number | null,
): PriceChangeInfo | null {
  const latest = getLatestPriceEntry(history);
  const previous = getPreviousPriceEntry(history);

  if (!latest || !previous) return null;

  const current = currentPrice ?? latest.price;
  if (previous.price <= 0) return null;

  const percentChange = Math.round(
    ((current - previous.price) / previous.price) * 100,
  );

  if (percentChange === 0) {
    return {
      previousPrice: previous.price,
      currentPrice: current,
      percentChange: 0,
      direction: "unchanged",
    };
  }

  return {
    previousPrice: previous.price,
    currentPrice: current,
    percentChange,
    direction: percentChange > 0 ? "up" : "down",
  };
}

export function getPriceComparison(
  currentPrice: number,
  lowestPrice30d: number | null | undefined,
): WinePriceViewModel["comparison"] {
  void currentPrice;
  void lowestPrice30d;
  return null;
}

export function resolvePrimaryPurchaseLink(
  wine: WineWithRelations,
  now: Date = new Date(),
): WinePriceViewModel["purchaseLink"] {
  const offer = resolvePublicPrice(wine, { now }).bestOffer;
  if (!offer) return null;

  return {
    retailer: offer.retailer,
    url: offer.url,
    priceRon: offer.priceRon,
    checkedAt: offer.observedAt,
    offerId: offer.offerId,
    ...(offer.productKey ? { productKey: offer.productKey } : {}),
    ...(offer.bottleSizeMl != null
      ? { bottleSizeMl: offer.bottleSizeMl }
      : {}),
    ...(offer.vintage != null ? { vintage: offer.vintage } : {}),
    wineSlug: wine.slug,
    label: "Cumpara",
  };
}

/**
 * Public policy: do not surface a non-affiliate "verify price" CTA.
 * Without a qualified Profitshare offer the price is simply unavailable.
 */
export function resolveVerifyPriceUrl(_wine: WineWithRelations): null {
  void _wine;
  return null;
}

export function buildWinePriceViewModel(
  wine: WineWithRelations,
  now: Date = new Date(),
): WinePriceViewModel {
  const pricing = resolvePublicPrice(wine, { now });
  const offer = pricing.bestOffer;

  return {
    displayPrice: pricing.displayPrice,
    status: pricing.status,
    lowestPrice30d: null,
    isVerifiedRecent: pricing.isVerifiedRecent,
    priceChange: null,
    comparison: null,
    purchaseLink: offer
      ? {
          retailer: offer.retailer,
          url: offer.url,
          priceRon: offer.priceRon,
          checkedAt: offer.observedAt,
          offerId: offer.offerId,
          ...(offer.productKey ? { productKey: offer.productKey } : {}),
          ...(offer.bottleSizeMl != null
            ? { bottleSizeMl: offer.bottleSizeMl }
            : {}),
          ...(offer.vintage != null ? { vintage: offer.vintage } : {}),
          wineSlug: wine.slug,
          label: "Cumpara",
        }
      : null,
    verifyPriceUrl: null,
    offers: pricing.offers,
  };
}

export function getPriceStatusLabel(status: WinePriceStatus): string {
  switch (status) {
    case "verified":
      return "Pret actual";
    case "unavailable":
      return "Pret indisponibil";
  }
}
