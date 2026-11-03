import type { AffiliateLink, PriceHistoryEntry } from "@/lib/schema";
import {
  getProfitshareOfferId,
  isQualifyingProfitshareUrl,
} from "@/lib/retailer-links";
import type { WineWithRelations } from "@/types";

/**
 * Public price policy: VinIntel may keep prices from any source internally,
 * but a price/purchase CTA is public only when it belongs to a validated
 * Profitshare offer for this exact wine.
 */
export const PUBLIC_PRICE_MAX_AGE_HOURS = 48;

export type PublicPriceStatus = "verified" | "unavailable";

export interface PublicPriceOffer {
  retailer: string;
  url: string;
  priceRon: number;
  observedAt: string;
  offerId: string;
  productKey?: string;
  bottleSizeMl?: number;
  vintage?: number | null;
}

export interface PublicPriceView {
  status: PublicPriceStatus;
  offers: PublicPriceOffer[];
  bestOffer: PublicPriceOffer | null;
  displayPrice: number | null;
  isVerifiedRecent: boolean;
  /** Public policy never exposes historical price charts/comparisons. */
  lowestPrice30d: null;
  priceChange: null;
  comparison: null;
}

type PublicPriceWine = Pick<
  WineWithRelations,
  "slug" | "name" | "vintage" | "affiliateLinks" | "priceHistory"
>;

function parseDate(value: string | undefined | null): Date | null {
  if (!value?.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isFreshPublicPrice(
  observedAt: Date,
  now: Date = new Date(),
): boolean {
  const cutoff = new Date(
    now.getTime() - PUBLIC_PRICE_MAX_AGE_HOURS * 60 * 60 * 1000,
  );
  // Reject obviously forged/future observations as well as stale ones.
  const maxFuture = new Date(now.getTime() + 5 * 60 * 1000);
  return observedAt >= cutoff && observedAt <= maxFuture;
}

export function inferBottleSizeMl(name: string): number | null {
  const normalized = name.replace(",", ".");
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*(ml|l)\b/i);
  if (!match) return null;
  const amount = Number.parseFloat(match[1] ?? "");
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const unit = (match[2] ?? "").toLowerCase();
  const ml = unit === "l" ? amount * 1000 : amount;
  return Math.round(ml);
}

function matchesWineIdentity(
  wine: PublicPriceWine,
  link: AffiliateLink,
): boolean {
  if (link.wineSlug?.trim() && link.wineSlug.trim() !== wine.slug) {
    return false;
  }

  const wineBottleSize = inferBottleSizeMl(wine.name);
  if (
    link.bottleSizeMl != null &&
    wineBottleSize != null &&
    Math.round(link.bottleSizeMl) !== wineBottleSize
  ) {
    return false;
  }

  if (
    link.vintage != null &&
    wine.vintage != null &&
    link.vintage !== wine.vintage
  ) {
    return false;
  }

  return true;
}

function latestMatchingHistory(
  history: PriceHistoryEntry[],
  url: string,
): PriceHistoryEntry | null {
  const matching = history.filter(
    (entry) =>
      entry.source?.trim() === url &&
      Number.isFinite(entry.price) &&
      entry.price > 0 &&
      parseDate(entry.date) != null,
  );
  if (matching.length === 0) return null;
  return matching.sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
}

function observationForLink(
  wine: PublicPriceWine,
  link: AffiliateLink,
  now: Date,
): PublicPriceOffer | null {
  if (!isQualifyingProfitshareUrl(link.url)) return null;
  if (link.inStock === false) return null;

  const retailer = link.retailer?.trim();
  if (!retailer) return null;
  if (!matchesWineIdentity(wine, link)) return null;

  const offerId = link.offerId?.trim() || getProfitshareOfferId(link.url);
  if (!offerId) return null;

  const candidates: Array<{ price: number; observedAt: Date }> = [];

  if (
    link.priceRon != null &&
    Number.isFinite(link.priceRon) &&
    link.priceRon > 0
  ) {
    const checkedAt = parseDate(link.checkedAt);
    if (checkedAt) candidates.push({ price: link.priceRon, observedAt: checkedAt });
  }

  // Same-offer historical observation: price and Profitshare source are
  // stored together, so this cannot mix retailer A's price with link B.
  const history = latestMatchingHistory(wine.priceHistory ?? [], link.url);
  const historyDate = parseDate(history?.date);
  if (history && historyDate) {
    candidates.push({ price: history.price, observedAt: historyDate });
  }

  const fresh = candidates
    .filter((candidate) => isFreshPublicPrice(candidate.observedAt, now))
    .sort((a, b) => b.observedAt.getTime() - a.observedAt.getTime())[0];

  if (!fresh) return null;

  return {
    retailer,
    url: link.url,
    priceRon: fresh.price,
    observedAt: fresh.observedAt.toISOString(),
    offerId,
    ...(link.productKey?.trim() ? { productKey: link.productKey.trim() } : {}),
    ...(link.bottleSizeMl != null
      ? { bottleSizeMl: Math.round(link.bottleSizeMl) }
      : {}),
    ...(link.vintage != null ? { vintage: link.vintage } : {}),
  };
}

export function resolvePublicPrice(
  wine: PublicPriceWine,
  options: { now?: Date } = {},
): PublicPriceView {
  const now = options.now ?? new Date();
  const byOffer = new Map<string, PublicPriceOffer>();

  for (const link of wine.affiliateLinks ?? []) {
    const offer = observationForLink(wine, link, now);
    if (!offer) continue;
    const existing = byOffer.get(offer.offerId);
    if (!existing || offer.observedAt > existing.observedAt) {
      byOffer.set(offer.offerId, offer);
    }
  }

  const offers = [...byOffer.values()].sort(
    (a, b) =>
      a.priceRon - b.priceRon ||
      b.observedAt.localeCompare(a.observedAt) ||
      a.retailer.localeCompare(b.retailer),
  );

  const bestOffer = offers[0] ?? null;

  return {
    status: bestOffer ? "verified" : "unavailable",
    offers,
    bestOffer,
    displayPrice: bestOffer?.priceRon ?? null,
    isVerifiedRecent: bestOffer != null,
    lowestPrice30d: null,
    priceChange: null,
    comparison: null,
  };
}

export function hasQualifiedPublicPrice(
  wine: Pick<WineWithRelations, "slug" | "name" | "vintage" | "affiliateLinks" | "priceHistory">,
  now: Date = new Date(),
): boolean {
  return resolvePublicPrice(wine, { now }).bestOffer != null;
}

/**
 * Public projection: removes every non-qualified price and purchase signal.
 * Internal records remain untouched in the database.
 */
export function sanitizeWineForPublic(
  wine: WineWithRelations,
  now: Date = new Date(),
): WineWithRelations {
  const pricing = resolvePublicPrice(wine, { now });
  const qualified = pricing.offers;
  const affiliateLinks: AffiliateLink[] = qualified.map((offer) => ({
    retailer: offer.retailer,
    url: offer.url,
    priceRon: offer.priceRon,
    checkedAt: offer.observedAt,
    inStock: true,
    offerId: offer.offerId,
    ...(offer.productKey ? { productKey: offer.productKey } : {}),
    ...(offer.bottleSizeMl != null
      ? { bottleSizeMl: offer.bottleSizeMl }
      : {}),
    ...(offer.vintage != null ? { vintage: offer.vintage } : {}),
    wineSlug: wine.slug,
  }));

  return {
    ...wine,
    currentPrice: null,
    // Public projection keeps the qualified offer price in `priceAvg` so
    // legacy read-only components cannot fall back to an unqualified value.
    priceAvg: pricing.displayPrice,
    lowestPrice30d: null,
    priceHistory: [],
    affiliateLinks,
    availability:
      qualified.length > 0
        ? qualified.map((offer) => ({
            retailer: offer.retailer,
            url: offer.url,
            priceRon: offer.priceRon,
            inStock: true,
            lastCheckedAt: offer.observedAt,
          }))
        : [],
    // Value Score and overpricing risk are price-dependent. Without a
    // qualified public price we expose an explicit unavailable state, not a
    // stale score computed from a non-public price.
    valueScore: qualified.length > 0 ? wine.valueScore : null,
    overpricedRisk: qualified.length > 0 ? wine.overpricedRisk : null,
  };
}

export function sanitizeWinesForPublic(
  wines: WineWithRelations[],
  now: Date = new Date(),
): WineWithRelations[] {
  return wines.map((wine) => sanitizeWineForPublic(wine, now));
}
