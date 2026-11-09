import type { AffiliateLink, PriceHistoryEntry } from "@/lib/schema";
import {
  isProfitshareUrl,
  isQualifyingProfitshareUrl,
} from "@/lib/retailer-links";


export const PRICE_REFRESH_LOOKBACK_HOURS = 48;

export type AffiliatePriceCase =
  | "ok"
  | "missing_producer_url"
  | "missing_emag_url"
  | "missing_profitshare_url"
  | "missing_price_observation"
  | "stale_observation"
  | "legacy_url_swap"
  | "product_id_mismatch"
  | "manual_link_correction"
  | "unavailable";

export interface PriceAuditWine {
  id: number;
  slug: string;
  name: string;
  status: string;
  sourceUrl: string | null;
  producerPageUrl: string | null;
  currentPrice: number | null;
  priceAvg: number | null;
  priceHistory: PriceHistoryEntry[];
  affiliateLinks: AffiliateLink[];
}

export interface RecoveredOffer {
  merchantUrl: string;
  affiliateUrl: string;
  merchantProductId: string;
  priceRon: number | null;
  currency: "RON";
  inStock: boolean | null;
  observedAt: string | null;
  productKey: string;
}

export interface PriceAuditResult {
  id: number;
  slug: string;
  name: string;
  status: string;
  producerUrl: string | null;
  emagUrl: string | null;
  profitshareUrl: string | null;
  merchantProductId: string | null;
  storedPrice: number | null;
  storedObservationAt: string | null;
  missingPriceObservation: boolean;
  legacyUrlSwap: boolean;
  recoverable: boolean;
  manualCorrection: boolean;
  unavailable: boolean;
  cases: AffiliatePriceCase[];
  offer: RecoveredOffer | null;
}

export function parseHttpUrl(raw: string | null | undefined): URL | null {
  if (!raw?.trim()) return null;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url;
  } catch {
    return null;
  }
}

export function isEmagUrl(raw: string | null | undefined): boolean {
  const url = parseHttpUrl(raw);
  return url?.hostname.toLowerCase().endsWith("emag.ro") ?? false;
}

/** eMAG product ID is the stable `/pd/<ID>` token, not the wine slug. */
export function extractEmagProductId(raw: string | null | undefined): string | null {
  const url = parseHttpUrl(raw);
  if (!url || !url.hostname.toLowerCase().endsWith("emag.ro")) return null;
  const match = url.pathname.match(/\/pd\/([A-Z0-9]+)(?:\/|$)/i);
  return match?.[1]?.toUpperCase() ?? null;
}

export function normalizeEmagProductUrl(raw: string): string | null {
  const url = parseHttpUrl(raw);
  const productId = extractEmagProductId(raw);
  if (!url || !productId) return null;
  const prefix = url.pathname.split(/\/pd\//i)[0] ?? "";
  return `${url.origin}${prefix}/pd/${productId}/`;
}

function isProfitshare(raw: string | null | undefined): boolean {
  return Boolean(raw && isQualifyingProfitshareUrl(raw));
}

function latestHistoryDate(history: PriceHistoryEntry[], source: string): string | null {
  const dates = history
    .filter((entry) => entry.source === source && Number.isFinite(entry.price))
    .map((entry) => entry.date)
    .filter((date) => !Number.isNaN(new Date(date).getTime()))
    .sort();
  return dates.at(-1) ?? null;
}

/**
 * Recover the three legal URLs from the legacy import layout:
 *   wine.producerPageUrl -> producer page
 *   wine.sourceUrl       -> Profitshare URL (in many old imports)
 *   affiliateLink.url    -> direct eMAG URL (in many old imports)
 * It never invents a URL and never overwrites a conflicting existing triple.
 */
export function recoverAffiliateOffer(
  wine: PriceAuditWine,
  now: Date = new Date(),
): PriceAuditResult {
  const producerUrl =
    wine.producerPageUrl?.trim() ||
    (wine.sourceUrl && !isEmagUrl(wine.sourceUrl) && !isProfitshareUrl(wine.sourceUrl)
      ? wine.sourceUrl
      : null);
  const sourceProfitshare = isProfitshare(wine.sourceUrl) ? wine.sourceUrl : null;
  const links = wine.affiliateLinks ?? [];

  const directEmag = links.find((link) => {
    const merchant = link.merchantUrl ?? (isEmagUrl(link.url) ? link.url : null);
    return Boolean(merchant && extractEmagProductId(merchant));
  });
  const rawSourceUrl = wine.sourceUrl?.trim() ?? "";
  const sourceEmag = isEmagUrl(rawSourceUrl)
    ? normalizeEmagProductUrl(rawSourceUrl)
    : null;
  const historyEmag = (wine.priceHistory ?? []).find(
    (entry) => isEmagUrl(entry.source) && extractEmagProductId(entry.source),
  );
  const explicitProfitshare = links.find(
    (link) => isProfitshare(link.url) || isProfitshare(link.merchantUrl),
  );

  const legacyUrlSwap = Boolean(
    sourceProfitshare && directEmag && isEmagUrl(directEmag.url),
  );
  const merchantUrl =
    normalizeEmagProductUrl(
      directEmag?.merchantUrl ??
        directEmag?.url ??
        sourceEmag ??
        historyEmag?.source ??
        "",
    ) ?? null;
  const merchantProductId =
    directEmag?.merchantProductId?.trim().toUpperCase() ||
    extractEmagProductId(merchantUrl);
  const affiliateUrl =
    (explicitProfitshare && isProfitshare(explicitProfitshare.url)
      ? explicitProfitshare.url
      : null) ??
    sourceProfitshare ??
    null;

  // A product key that is an eMAG ID must match the actual eMAG URL. A wine
  // slug is a legacy key and does not prove a merchant match.
  const productKey = directEmag?.productKey?.trim() || wine.slug;
  const keyLooksLikeEmagId = /^[A-Z0-9]{8,}$/.test(productKey.toUpperCase());
  const declaredMerchantId = directEmag?.merchantProductId?.trim().toUpperCase();
  const urlMerchantId = extractEmagProductId(merchantUrl);
  const productIdMismatch = Boolean(
    (declaredMerchantId &&
      urlMerchantId &&
      declaredMerchantId !== urlMerchantId) ||
      (keyLooksLikeEmagId &&
        merchantProductId &&
        productKey.toUpperCase() !== merchantProductId),
  );

  const storedObservationAt =
    directEmag?.checkedAt ??
    (merchantUrl ? latestHistoryDate(wine.priceHistory ?? [], merchantUrl) : null);
  const storedPrice =
    directEmag?.priceRon ??
    (historyEmag && Number.isFinite(historyEmag.price)
      ? historyEmag.price
      : wine.currentPrice != null
        ? wine.currentPrice
        : wine.priceAvg);
  const observationTime = storedObservationAt
    ? new Date(storedObservationAt).getTime()
    : Number.NaN;
  const stale = Number.isFinite(observationTime)
    ? observationTime < now.getTime() - PRICE_REFRESH_LOOKBACK_HOURS * 3_600_000
    : false;

  const cases: AffiliatePriceCase[] = [];
  if (!producerUrl) cases.push("missing_producer_url");
  if (!merchantProductId || !merchantUrl) cases.push("missing_emag_url");
  if (!affiliateUrl) cases.push("missing_profitshare_url");
  if (storedPrice == null || !storedObservationAt) {
    cases.push("missing_price_observation");
  }
  if (stale) cases.push("stale_observation");
  if (legacyUrlSwap) cases.push("legacy_url_swap");
  if (productIdMismatch) cases.push("product_id_mismatch");
  if (directEmag?.verificationStatus === "mismatch") {
    cases.push("product_id_mismatch");
  }

  const recoverable = Boolean(
    producerUrl &&
      merchantUrl &&
      merchantProductId &&
      affiliateUrl &&
      !productIdMismatch &&
      directEmag?.verificationStatus !== "mismatch",
  );
  const unavailable = !merchantUrl || !affiliateUrl;
  const manualCorrection = Boolean(
    productIdMismatch ||
      directEmag?.verificationStatus === "mismatch" ||
      (directEmag && !merchantProductId) ||
      (!unavailable && !recoverable),
  );
  if (recoverable && !manualCorrection && !stale && storedObservationAt) {
    cases.push("ok");
  }

  return {
    id: wine.id,
    slug: wine.slug,
    name: wine.name,
    status: wine.status,
    producerUrl,
    emagUrl: merchantUrl,
    profitshareUrl: affiliateUrl,
    merchantProductId,
    storedPrice,
    storedObservationAt,
    missingPriceObservation: storedPrice == null || !storedObservationAt,
    legacyUrlSwap,
    recoverable,
    manualCorrection,
    unavailable,
    cases: [...new Set(cases.length > 0 ? cases : (["ok"] as AffiliatePriceCase[]))],
    offer:
      recoverable && merchantUrl && affiliateUrl && merchantProductId
        ? {
            merchantUrl,
            affiliateUrl,
            merchantProductId,
            priceRon: storedPrice,
            currency: "RON",
            inStock: directEmag?.inStock ?? null,
            observedAt: storedObservationAt,
            productKey: wine.slug,
          }
        : null,
  };
}

/**
 * One wine may have multiple verified retailer offers. This returns every
 * independently recoverable merchant/affiliate pair, not just the first.
 */
export function recoverAffiliateOffers(wine: PriceAuditWine): RecoveredOffer[] {
  const producerUrl =
    wine.producerPageUrl?.trim() ||
    (wine.sourceUrl && !isEmagUrl(wine.sourceUrl) && !isProfitshareUrl(wine.sourceUrl)
      ? wine.sourceUrl
      : null);
  const sourceProfitshare = isProfitshare(wine.sourceUrl) ? wine.sourceUrl : null;
  const offers: RecoveredOffer[] = [];
  const seen = new Set<string>();

  const rawSourceUrl = wine.sourceUrl?.trim() ?? "";
  const sourceEmag = isEmagUrl(rawSourceUrl)
    ? normalizeEmagProductUrl(rawSourceUrl)
    : null;
  const historyEmag = (wine.priceHistory ?? []).find(
    (entry) => isEmagUrl(entry.source) && extractEmagProductId(entry.source),
  );
  const historyMerchantUrl =
    normalizeEmagProductUrl(historyEmag?.source ?? "") ?? sourceEmag;
  const historyProductId = extractEmagProductId(historyMerchantUrl);
  if (producerUrl && sourceProfitshare && historyMerchantUrl && historyProductId) {
    offers.push({
      merchantUrl: historyMerchantUrl,
      affiliateUrl: sourceProfitshare,
      merchantProductId: historyProductId,
      priceRon: Number.isFinite(historyEmag?.price) ? historyEmag!.price : null,
      currency: "RON",
      inStock: null,
      observedAt: historyEmag?.date ?? null,
      productKey: wine.slug,
    });
    seen.add(`${historyProductId}|${sourceProfitshare}`);
  }

  for (const link of wine.affiliateLinks ?? []) {
    const merchantUrl =
      normalizeEmagProductUrl(
        link.merchantUrl ||
          (isEmagUrl(link.url) ? link.url : null) ||
          sourceEmag ||
          "",
      ) ?? null;
    const merchantProductId =
      link.merchantProductId?.trim().toUpperCase() ||
      extractEmagProductId(merchantUrl);
    const affiliateUrl = isProfitshare(link.url)
      ? link.url
      : isProfitshare(link.merchantUrl)
        ? link.merchantUrl
        : sourceProfitshare;
    if (!producerUrl || !merchantUrl || !merchantProductId || !affiliateUrl) continue;
    const key = `${merchantProductId}|${affiliateUrl}`;
    if (seen.has(key)) continue;
    seen.add(key);
    offers.push({
      merchantUrl,
      affiliateUrl,
      merchantProductId,
      priceRon: link.priceRon ?? null,
      currency: "RON",
      inStock: link.inStock ?? null,
      observedAt: link.checkedAt ?? null,
      productKey: wine.slug,
    });
  }
  return offers;
}

export function evaluateSources(wine: PriceAuditWine, now = new Date()): PriceAuditResult {
  return recoverAffiliateOffer(wine, now);
}
