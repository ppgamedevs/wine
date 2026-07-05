import type { AffiliateLink, PriceHistoryEntry } from "@/lib/schema";
import {
  buildRetailerPurchaseLabel,
  isProfitshareUrl,
  resolveUserFacingPurchaseUrl,
} from "@/lib/retailer-links";
import type { WineWithRelations } from "@/types";

/** Pret considerat verificat daca observatia e in ultimele 48h. */
export const VERIFIED_PRICE_MAX_AGE_HOURS = 48;

export type WinePriceStatus = "verified" | "estimated" | "unavailable";

export interface PriceChangeInfo {
  previousPrice: number;
  currentPrice: number;
  percentChange: number;
  direction: "up" | "down" | "unchanged";
}

export interface WinePriceViewModel {
  displayPrice: number | null;
  status: WinePriceStatus;
  lowestPrice30d: number | null;
  isVerifiedRecent: boolean;
  priceChange: PriceChangeInfo | null;
  comparison: {
    lowest: number;
    percentAboveLowest: number;
    isAtLowest: boolean;
  } | null;
  purchaseLink: (AffiliateLink | { url: string; retailer: string }) & {
    label: string;
  } | null;
  verifyPriceUrl: string | null;
}

function sanitizePurchaseEntry(
  entry: { url: string; retailer: string; priceRon?: number },
  sourceUrl: string | null | undefined,
): { url: string; retailer: string; priceRon?: number; label: string } | null {
  const trimmed = entry.url?.trim();
  if (!trimmed || isProfitshareUrl(trimmed)) return null;

  const url = resolveUserFacingPurchaseUrl(trimmed, { sourceUrl });
  if (isProfitshareUrl(url)) return null;

  return {
    ...entry,
    url,
    label: buildRetailerPurchaseLabel(url, entry.retailer),
  };
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

export function isRecentVerifiedPrice(wine: WineWithRelations): boolean {
  const latest = getLatestPriceEntry(wine.priceHistory);
  if (!latest) return false;

  const observedAt = new Date(latest.date);
  if (Number.isNaN(observedAt.getTime())) return false;

  const cutoff = new Date(
    Date.now() - VERIFIED_PRICE_MAX_AGE_HOURS * 60 * 60 * 1000,
  );
  return observedAt >= cutoff;
}

export function resolveWineDisplayPrice(wine: WineWithRelations): number | null {
  if (wine.currentPrice != null && wine.currentPrice > 0) {
    return wine.currentPrice;
  }
  if (wine.priceAvg != null && wine.priceAvg > 0) {
    return Math.round(wine.priceAvg);
  }
  return null;
}

export function resolveWinePriceStatus(
  wine: WineWithRelations,
): WinePriceStatus {
  const displayPrice = resolveWineDisplayPrice(wine);
  if (displayPrice == null) return "unavailable";
  if (isRecentVerifiedPrice(wine) && wine.currentPrice != null) {
    return "verified";
  }
  return "estimated";
}

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
  if (lowestPrice30d == null || lowestPrice30d <= 0) return null;

  const isAtLowest = currentPrice <= lowestPrice30d;
  const percentAboveLowest = isAtLowest
    ? 0
    : Math.round(((currentPrice - lowestPrice30d) / currentPrice) * 100);

  return {
    lowest: lowestPrice30d,
    percentAboveLowest,
    isAtLowest,
  };
}

export function resolvePrimaryPurchaseLink(
  wine: WineWithRelations,
): WinePriceViewModel["purchaseLink"] {
  const sourceUrl = wine.sourceUrl?.trim() || null;

  for (const affiliate of wine.affiliateLinks) {
    const sanitized = sanitizePurchaseEntry(affiliate, sourceUrl);
    if (sanitized) return sanitized;
  }

  for (const store of wine.availability) {
    if (!store.url?.trim()) continue;
    const sanitized = sanitizePurchaseEntry(
      {
        retailer: store.retailer,
        url: store.url,
        priceRon: store.priceRon,
      },
      sourceUrl,
    );
    if (sanitized) return sanitized;
  }

  if (sourceUrl && !isProfitshareUrl(sourceUrl)) {
    const url = resolveUserFacingPurchaseUrl(sourceUrl);
    const retailer = wine.winery?.name ?? "Magazin";
    return {
      retailer,
      url,
      label: buildRetailerPurchaseLabel(url, retailer),
    };
  }

  return null;
}

export function resolveVerifyPriceUrl(wine: WineWithRelations): string | null {
  const purchase = resolvePrimaryPurchaseLink(wine);
  if (purchase?.url) return purchase.url;

  const sourceUrl = wine.sourceUrl?.trim();
  if (sourceUrl && !isProfitshareUrl(sourceUrl)) {
    return resolveUserFacingPurchaseUrl(sourceUrl);
  }

  return null;
}

export function buildWinePriceViewModel(
  wine: WineWithRelations,
): WinePriceViewModel {
  const displayPrice = resolveWineDisplayPrice(wine);
  const isVerifiedRecent = isRecentVerifiedPrice(wine);
  const status = resolveWinePriceStatus(wine);
  const lowestPrice30d =
    wine.lowestPrice30d != null && wine.lowestPrice30d > 0
      ? wine.lowestPrice30d
      : null;

  const priceChange =
    status === "verified" && displayPrice != null
      ? getPriceChange(wine.priceHistory, displayPrice)
      : null;

  return {
    displayPrice,
    status,
    lowestPrice30d,
    isVerifiedRecent,
    priceChange,
    comparison:
      displayPrice != null && status === "verified"
        ? getPriceComparison(displayPrice, lowestPrice30d)
        : null,
    purchaseLink: resolvePrimaryPurchaseLink(wine),
    verifyPriceUrl: resolveVerifyPriceUrl(wine),
  };
}

export function getPriceStatusLabel(status: WinePriceStatus): string {
  switch (status) {
    case "verified":
      return "Pret actual";
    case "estimated":
      return "Pret estimativ";
    case "unavailable":
      return "Verifica pret";
  }
}
