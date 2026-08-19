import { createHash } from "node:crypto";

export const MARKET_PRICE_DISCOVERY_VERSION = 1;
export const MARKET_PRICE_SPREAD_REVIEW_PERCENT = 40;
export const MARKET_PRICE_TARGET_VOLUME_ML = 750;
export const MARKET_PRICE_MAX_CANDIDATES_PER_WINE = 8;
export const MARKET_PRICE_TARGET_GOOD_SOURCES = 5;
export const MARKET_PRICE_ESTIMATE_FRESH_DAYS = 60;

export type MarketPriceSourceClass =
  | "ROMANIAN_RETAILER"
  | "SUPERMARKET"
  | "PRODUCER_SHOP"
  | "MARKETPLACE"
  | "OTHER";

export type MarketPriceIdentityMatch =
  | "EXACT"
  | "STRONG"
  | "AMBIGUOUS"
  | "WRONG";

export type MarketPriceVintageMatch =
  | "EXACT"
  | "STRONG_UNDATED"
  | "REFERENCE_ONLY_DIFFERENT_VINTAGE"
  | "NOT_APPLICABLE";

export type MarketPriceAvailabilitySignal =
  | "IN_STOCK"
  | "OUT_OF_STOCK"
  | "UNKNOWN";

export type MarketPriceType = "REGULAR" | "PROMOTIONAL" | "UNKNOWN";

export type MarketPriceQualification =
  | "QUALIFIED"
  | "REFERENCE_ONLY"
  | "EXCLUDED";

export type MarketPriceEstimateStatus =
  | "ESTIMATE_STRONG"
  | "ESTIMATE_LIMITED"
  | "SINGLE_SOURCE_ONLY"
  | "HIGH_SPREAD_REVIEW"
  | "NO_ESTIMATE";

export interface MarketPriceWineTarget {
  wineId: number;
  slug: string;
  wineName: string;
  wineryName: string;
  vintage: number | null;
  volumeMl?: number;
}

export interface AgentMarketPriceCandidate {
  wineId: number;
  slug: string;
  sourceUrl: string;
  query: string;
  discoveredAt: string;
}

export interface AgentMarketPriceSearchCache {
  version: 1;
  source: "agent-cache";
  generatedAt: string;
  candidates: AgentMarketPriceCandidate[];
}

export interface MarketPriceObservation {
  wineId: number;
  slug: string;
  retailer: string;
  sourceUrl: string;
  sourceDomain: string;
  sourceTitle: string;
  sourceClass: MarketPriceSourceClass;
  rawPriceText: string | null;
  observedPriceRon: number | null;
  originalPriceRon: number | null;
  salePriceRon: number | null;
  currency: "RON" | "OTHER" | "UNKNOWN";
  volumeMl: number | null;
  sourceWineName: string;
  sourceVintage: number | null;
  observedAt: string;
  productIdentityExcerpt: string;
  sourceHash: string;
  identityMatch: MarketPriceIdentityMatch;
  vintageMatch: MarketPriceVintageMatch;
  availabilitySignal: MarketPriceAvailabilitySignal;
  priceType: MarketPriceType;
  qualification: MarketPriceQualification;
  exclusionReason: string | null;
}

export interface WineMarketPriceEstimate {
  wineId: number;
  slug: string;
  status: MarketPriceEstimateStatus;
  estimatedMarketPrice: number | null;
  confidence: "strong" | "limited" | null;
  confidenceReasons: Array<
    | "TWO_SOURCES"
    | "NO_EXACT_VINTAGE"
    | "UNKNOWN_OR_MIXED_VOLUME"
    | "MARKETPLACE_ONLY"
    | "OUT_OF_STOCK_ONLY"
    | "HIGH_SPREAD"
    | "SINGLE_SOURCE"
    | "NO_QUALIFIED_SOURCE"
  >;
  sourceCount: number;
  qualifiedObservationCount: number;
  referenceObservationCount: number;
  minPriceRon: number | null;
  maxPriceRon: number | null;
  medianPriceRon: number | null;
  meanPriceRon: number | null;
  spreadPercent: number | null;
  potentialOutlierHashes: string[];
  observationHashes: string[];
  calculatedAt: string;
}

export interface ExtractMarketPriceInput {
  target: MarketPriceWineTarget;
  sourceUrl: string;
  html: string;
  observedAt: string;
}

interface PriceExtraction {
  rawPriceText: string | null;
  observedPriceRon: number | null;
  originalPriceRon: number | null;
  salePriceRon: number | null;
  currency: "RON" | "OTHER" | "UNKNOWN";
  priceType: MarketPriceType;
}

const GENERIC_IDENTITY_TOKENS = new Set([
  "vin",
  "wine",
  "crama",
  "cramele",
  "romania",
  "romanesc",
  "sticla",
  "ml",
]);

const LINE_MARKERS = [
  "kolna",
  "stonewines",
  "reserve",
  "magnum",
  "editie",
  "limitata",
  "grand",
] as const;

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code)),
    );
}

export function foldMarketPriceText(value: string): string {
  return decodeHtml(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function compactMarketPriceText(value: string): string {
  return foldMarketPriceText(value).replace(/\s+/g, "");
}

function stripHtml(html: string): string {
  return decodeHtml(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function extractAttribute(
  html: string,
  attribute: string,
  contentAttribute = "content",
): string | null {
  const escaped = attribute.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name|itemprop)=["']${escaped}["'][^>]+${contentAttribute}=["']([^"']+)["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+${contentAttribute}=["']([^"']+)["'][^>]+(?:property|name|itemprop)=["']${escaped}["'][^>]*>`,
      "i",
    ),
  ];
  for (const pattern of patterns) {
    const value = html.match(pattern)?.[1]?.trim();
    if (value) return decodeHtml(value);
  }
  return null;
}

export function extractMarketPriceSourceTitle(html: string): string {
  const metaTitle =
    extractAttribute(html, "og:title") ??
    extractAttribute(html, "twitter:title");
  if (metaTitle) return metaTitle;
  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return title ? stripHtml(title) : "";
}

function extractHeading(html: string): string {
  const heading = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  return heading ? stripHtml(heading) : "";
}

function parseRonNumber(raw: string): number | null {
  const normalized = raw
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value) || value < 10 || value > 10_000) return null;
  return Math.round(value * 100) / 100;
}

function extractLabeledPrice(
  text: string,
  labels: RegExp,
): { raw: string; value: number } | null {
  const match = text.match(
    new RegExp(
      `${labels.source}[^0-9]{0,24}(\\d{1,4}(?:[.,]\\d{1,2})?)\\s*(?:lei|ron)`,
      "i",
    ),
  );
  const raw = match?.[0]?.trim();
  const value = match?.[1] ? parseRonNumber(match[1]) : null;
  return raw && value != null ? { raw, value } : null;
}

function extractJsonLdPrice(html: string): {
  price: number;
  currency: string | null;
  availability: string | null;
  name: string | null;
} | null {
  const blocks = html.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  const queue: unknown[] = [];
  for (const block of blocks) {
    const source = block[1]?.trim();
    if (!source) continue;
    try {
      queue.push(JSON.parse(source) as unknown);
    } catch {
      continue;
    }
  }

  while (queue.length > 0) {
    const value = queue.shift();
    if (Array.isArray(value)) {
      queue.push(...value);
      continue;
    }
    if (value == null || typeof value !== "object") continue;
    const record = value as Record<string, unknown>;
    const graph = record["@graph"];
    if (Array.isArray(graph)) queue.push(...graph);
    const offers = record.offers;
    const offerList = Array.isArray(offers) ? offers : offers ? [offers] : [];
    for (const offer of offerList) {
      if (offer == null || typeof offer !== "object") continue;
      const offerRecord = offer as Record<string, unknown>;
      const rawPrice = offerRecord.price ?? offerRecord.lowPrice;
      const price =
        typeof rawPrice === "number"
          ? rawPrice
          : typeof rawPrice === "string"
            ? parseRonNumber(rawPrice)
            : null;
      if (price == null) continue;
      return {
        price,
        currency:
          typeof offerRecord.priceCurrency === "string"
            ? offerRecord.priceCurrency
            : null,
        availability:
          typeof offerRecord.availability === "string"
            ? offerRecord.availability
            : null,
        name: typeof record.name === "string" ? record.name : null,
      };
    }
  }
  return null;
}

function extractPrices(html: string, visibleText: string): PriceExtraction {
  const inlineDiscount = visibleText.match(
    /(\d{1,4}(?:[.,]\d{1,2})?)\s*(?:lei|ron)\s*-\s*\d{1,2}%[^0-9]{0,40}(?:de\s+la|acum)\s*(\d{1,4}(?:[.,]\d{1,2})?)\s*(?:lei|ron)/i,
  );
  const inlineOriginal = inlineDiscount?.[1]
    ? parseRonNumber(inlineDiscount[1])
    : null;
  const inlineSale = inlineDiscount?.[2]
    ? parseRonNumber(inlineDiscount[2])
    : null;
  if (inlineOriginal != null && inlineSale != null) {
    return {
      rawPriceText: inlineDiscount?.[0]?.trim() ?? null,
      observedPriceRon: inlineSale,
      originalPriceRon: inlineOriginal,
      salePriceRon: inlineSale,
      currency: "RON",
      priceType: "PROMOTIONAL",
    };
  }

  const original = extractLabeledPrice(
    visibleText,
    /(?:pre[tț]\s*(?:vechi|initial|regular)|pre[tț]\s*de\s*lista)/i,
  );
  const sale = extractLabeledPrice(
    visibleText,
    /(?:pre[tț]\s*(?:promo|promo[tț]ional|special|redus)|acum|oferta)/i,
  );
  if (sale) {
    return {
      rawPriceText: sale.raw,
      observedPriceRon: sale.value,
      originalPriceRon: original?.value ?? null,
      salePriceRon: sale.value,
      currency: "RON",
      priceType: "PROMOTIONAL",
    };
  }

  const jsonLd = extractJsonLdPrice(html);
  if (jsonLd) {
    const currency =
      jsonLd.currency == null
        ? "UNKNOWN"
        : /^(RON|LEI)$/i.test(jsonLd.currency)
          ? "RON"
          : "OTHER";
    return {
      rawPriceText: `${jsonLd.price} ${jsonLd.currency ?? ""}`.trim(),
      observedPriceRon: jsonLd.price,
      originalPriceRon: original?.value ?? null,
      salePriceRon: null,
      currency,
      priceType: "REGULAR",
    };
  }

  const metaPrice =
    extractAttribute(html, "product:price:amount") ??
    extractAttribute(html, "price");
  const parsedMetaPrice = metaPrice ? parseRonNumber(metaPrice) : null;
  if (parsedMetaPrice != null) {
    const metaCurrency =
      extractAttribute(html, "product:price:currency") ?? "RON";
    return {
      rawPriceText: metaPrice,
      observedPriceRon: parsedMetaPrice,
      originalPriceRon: original?.value ?? null,
      salePriceRon: null,
      currency: /^(RON|LEI)$/i.test(metaCurrency) ? "RON" : "OTHER",
      priceType: "REGULAR",
    };
  }

  const structuredPatterns = [
    /itemprop=["']price["'][^>]*(?:content|value)=["'](\d{1,4}(?:[.,]\d{1,2})?)["']/i,
    /(?:woocommerce-Price-amount|product-price|price__current|special-price)[^>]*>[\s\S]{0,240}?(\d{1,4}(?:[.,]\d{1,2})?)\s*(?:lei|ron)\b/i,
  ];
  let structuredRaw: string | null = null;
  let structuredValue: number | null = null;
  for (const pattern of structuredPatterns) {
    const match = html.match(pattern);
    const value = match?.[1] ? parseRonNumber(match[1]) : null;
    if (match?.[0] && value != null) {
      structuredRaw = stripHtml(match[0]).slice(0, 160);
      structuredValue = value;
      break;
    }
  }
  return {
    rawPriceText: structuredRaw,
    observedPriceRon: structuredValue,
    originalPriceRon: original?.value ?? null,
    salePriceRon: null,
    currency: structuredValue != null ? "RON" : "UNKNOWN",
    priceType: structuredValue != null ? "REGULAR" : "UNKNOWN",
  };
}

function identityTokens(value: string): string[] {
  return foldMarketPriceText(value)
    .split(" ")
    .filter((token) => token.length > 1 && !GENERIC_IDENTITY_TOKENS.has(token));
}

function lineMarkers(value: string): string[] {
  const folded = foldMarketPriceText(value);
  return LINE_MARKERS.filter((marker) => folded.includes(marker));
}

export function classifyMarketPriceIdentity(
  target: MarketPriceWineTarget,
  evidence: string,
): MarketPriceIdentityMatch {
  const foldedEvidence = foldMarketPriceText(evidence);
  const compactEvidence = compactMarketPriceText(evidence);
  const nameTokens = identityTokens(target.wineName);
  const matchedNameTokens = nameTokens.filter((token) =>
    foldedEvidence.split(" ").includes(token),
  ).length;
  const nameCoverage =
    nameTokens.length === 0 ? 0 : matchedNameTokens / nameTokens.length;
  const wineryTokens = identityTokens(target.wineryName);
  const wineryMatched =
    wineryTokens.some((token) => foldedEvidence.includes(token)) ||
    compactEvidence.includes(compactMarketPriceText(target.wineryName));
  const requiredMarkers = lineMarkers(`${target.wineName} ${target.slug}`);
  const conflictingMarkers = LINE_MARKERS.filter(
    (marker) =>
      foldedEvidence.includes(marker) && !requiredMarkers.includes(marker),
  );
  const requiredMarkersPresent = requiredMarkers.every((marker) =>
    foldedEvidence.includes(marker),
  );

  if (
    nameCoverage < 0.45 ||
    !wineryMatched ||
    conflictingMarkers.length > 0
  ) {
    return "WRONG";
  }
  if (!requiredMarkersPresent || nameCoverage < 0.75) return "AMBIGUOUS";
  if (nameCoverage === 1) return "EXACT";
  return "STRONG";
}

function extractVintage(
  evidence: string,
  targetVintage: number | null,
): { sourceVintage: number | null; match: MarketPriceVintageMatch } {
  if (targetVintage == null) {
    return { sourceVintage: null, match: "NOT_APPLICABLE" };
  }
  const years = [
    ...new Set(
      [...evidence.matchAll(/\b(19[89]\d|20[0-3]\d)\b/g)].map((match) =>
        Number(match[1]),
      ),
    ),
  ];
  if (years.includes(targetVintage)) {
    return { sourceVintage: targetVintage, match: "EXACT" };
  }
  const sourceVintage = years[0] ?? null;
  if (sourceVintage == null) {
    return { sourceVintage: null, match: "STRONG_UNDATED" };
  }
  return {
    sourceVintage,
    match: "REFERENCE_ONLY_DIFFERENT_VINTAGE",
  };
}

function extractVolumeMl(evidence: string): number | null {
  const ml = evidence.match(/\b(375|500|700|750|1000|1500)\s*ml\b/i)?.[1];
  if (ml) return Number(ml);
  const liters = evidence.match(/\b(0[.,](?:375|5|7|75)|1[.,]5|1)\s*l\b/i)?.[1];
  if (!liters) return null;
  return Math.round(Number(liters.replace(",", ".")) * 1000);
}

function hasBundleSignal(evidence: string): boolean {
  return /(?:\b(?:set|pachet|cutie|case|bax)\b|\b[2-9]\s*[x×]\s*(?:375|500|700|750)\s*ml\b|\b(?:6|12)\s+sticle\b)/i.test(
    evidence,
  );
}

function availabilityFromEvidence(
  evidence: string,
  html: string,
): MarketPriceAvailabilitySignal {
  const jsonLd = extractJsonLdPrice(html);
  const joined = `${evidence} ${jsonLd?.availability ?? ""}`;
  if (
    /(?:outofstock|stoc\s*epuizat|indisponibil|nu\s+este\s+in\s+stoc)/i.test(
      joined,
    )
  ) {
    return "OUT_OF_STOCK";
  }
  if (/(?:instock|in\s+stoc|disponibil)/i.test(joined)) return "IN_STOCK";
  return "UNKNOWN";
}

export function normalizeMarketPriceDomain(sourceUrl: string): string {
  try {
    const host = new URL(sourceUrl).hostname.toLowerCase().replace(/^www\./, "");
    const parts = host.split(".");
    if (parts.length <= 2) return host;
    const lastTwo = parts.slice(-2).join(".");
    const lastThree = parts.slice(-3).join(".");
    if (
      /^(?:com|org|net)\.ro$/.test(lastTwo) ||
      /^(?:co|com)\.[a-z]{2}$/.test(lastTwo)
    ) {
      return lastThree;
    }
    return lastTwo;
  } catch {
    return "";
  }
}

function sourceClass(
  sourceUrl: string,
  target: MarketPriceWineTarget,
): MarketPriceSourceClass {
  const domain = normalizeMarketPriceDomain(sourceUrl);
  if (/^(?:emag|olx|okazii)\./i.test(domain)) return "MARKETPLACE";
  if (/(?:carrefour|auchan|mega-image|selgros|cora|kaufland)\./i.test(domain)) {
    return "SUPERMARKET";
  }
  if (
    compactMarketPriceText(domain).includes(
      compactMarketPriceText(target.wineryName),
    )
  ) {
    return "PRODUCER_SHOP";
  }
  if (domain.endsWith(".ro")) return "ROMANIAN_RETAILER";
  return "OTHER";
}

function stableObservationHash(
  observation: Omit<MarketPriceObservation, "sourceHash" | "observedAt">,
): string {
  return createHash("sha256")
    .update(JSON.stringify(observation))
    .digest("hex");
}

export function extractMarketPriceObservation(
  input: ExtractMarketPriceInput,
): MarketPriceObservation {
  const sourceTitle = extractMarketPriceSourceTitle(input.html);
  const heading = extractHeading(input.html);
  const visibleText = stripHtml(input.html);
  const sourceWineName =
    extractJsonLdPrice(input.html)?.name || heading || sourceTitle;
  const excerpt = `${heading || sourceTitle} ${visibleText.slice(0, 500)}`
    .trim()
    .slice(0, 500);
  const identityEvidence =
    `${sourceTitle} ${heading} ${sourceWineName} ${input.sourceUrl}`;
  const price = extractPrices(input.html, visibleText);
  const identityMatch = classifyMarketPriceIdentity(
    input.target,
    identityEvidence,
  );
  const vintage = extractVintage(identityEvidence, input.target.vintage);
  const volumeMl = extractVolumeMl(
    `${identityEvidence} ${visibleText.slice(0, 1000)}`,
  );
  const targetVolume = input.target.volumeMl ?? MARKET_PRICE_TARGET_VOLUME_ML;
  const bundle = hasBundleSignal(
    `${sourceTitle} ${heading} ${sourceWineName}`,
  );
  const availabilitySignal = availabilityFromEvidence(visibleText, input.html);
  const classification = sourceClass(input.sourceUrl, input.target);

  let qualification: MarketPriceQualification = "QUALIFIED";
  let exclusionReason: string | null = null;
  if (price.observedPriceRon == null || price.currency !== "RON") {
    qualification = "EXCLUDED";
    exclusionReason = "NO_VALID_RON_PRICE";
  } else if (price.observedPriceRon >= 5_000) {
    qualification = "EXCLUDED";
    exclusionReason = "PRICE_PLACEHOLDER_OR_IMPLAUSIBLE";
  } else if (classification === "OTHER") {
    qualification = "EXCLUDED";
    exclusionReason = "NON_ROMANIAN_OR_UNSUPPORTED_SOURCE";
  } else if (bundle) {
    qualification = "EXCLUDED";
    exclusionReason = "BUNDLE_OR_GIFT_PACKAGE";
  } else if (volumeMl != null && volumeMl !== targetVolume) {
    qualification = "EXCLUDED";
    exclusionReason = "WRONG_BOTTLE_VOLUME";
  } else if (identityMatch === "WRONG" || identityMatch === "AMBIGUOUS") {
    qualification = "EXCLUDED";
    exclusionReason =
      identityMatch === "WRONG" ? "WRONG_PRODUCT_IDENTITY" : "AMBIGUOUS_IDENTITY";
  } else if (vintage.match === "REFERENCE_ONLY_DIFFERENT_VINTAGE") {
    qualification = "REFERENCE_ONLY";
    exclusionReason = "DIFFERENT_VINTAGE";
  }

  const withoutHashAndTime = {
    wineId: input.target.wineId,
    slug: input.target.slug,
    retailer: normalizeMarketPriceDomain(input.sourceUrl),
    sourceUrl: input.sourceUrl.trim(),
    sourceDomain: normalizeMarketPriceDomain(input.sourceUrl),
    sourceTitle,
    sourceClass: classification,
    rawPriceText: price.rawPriceText,
    observedPriceRon: price.observedPriceRon,
    originalPriceRon: price.originalPriceRon,
    salePriceRon: price.salePriceRon,
    currency: price.currency,
    volumeMl,
    sourceWineName,
    sourceVintage: vintage.sourceVintage,
    productIdentityExcerpt: excerpt,
    identityMatch,
    vintageMatch: vintage.match,
    availabilitySignal,
    priceType: price.priceType,
    qualification,
    exclusionReason,
  };

  return {
    ...withoutHashAndTime,
    observedAt: input.observedAt,
    sourceHash: stableObservationHash(withoutHashAndTime),
  };
}

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
  }
  return sorted[middle] ?? 0;
}

function observationPreference(
  observation: MarketPriceObservation,
): number {
  return (
    (observation.identityMatch === "EXACT" ? 4 : 2) +
    (observation.vintageMatch === "EXACT" ? 3 : 1) +
    (observation.availabilitySignal === "IN_STOCK" ? 2 : 0) +
    (observation.sourceClass === "MARKETPLACE" ? -2 : 0)
  );
}

export function independentQualifiedObservations(
  observations: MarketPriceObservation[],
): MarketPriceObservation[] {
  const byDomain = new Map<string, MarketPriceObservation>();
  for (const observation of observations) {
    if (
      observation.qualification !== "QUALIFIED" ||
      observation.observedPriceRon == null
    ) {
      continue;
    }
    const current = byDomain.get(observation.sourceDomain);
    if (
      current == null ||
      observationPreference(observation) > observationPreference(current)
    ) {
      byDomain.set(observation.sourceDomain, observation);
    }
  }
  return [...byDomain.values()].sort((left, right) =>
    left.sourceDomain.localeCompare(right.sourceDomain),
  );
}

export function aggregateMarketPriceEstimate(
  target: MarketPriceWineTarget,
  observations: MarketPriceObservation[],
  calculatedAt: string,
): WineMarketPriceEstimate {
  const qualified = independentQualifiedObservations(observations);
  const prices = qualified
    .map((observation) => observation.observedPriceRon)
    .filter((price): price is number => price != null);
  const referenceObservationCount = observations.filter(
    (observation) => observation.qualification === "REFERENCE_ONLY",
  ).length;
  const medianPrice = prices.length > 0 ? median(prices) : null;
  const minPrice = prices.length > 0 ? Math.min(...prices) : null;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : null;
  const meanPrice =
    prices.length > 0
      ? Math.round(
          (prices.reduce((sum, price) => sum + price, 0) / prices.length) * 100,
        ) / 100
      : null;
  const spreadPercent =
    medianPrice != null && medianPrice > 0 && minPrice != null && maxPrice != null
      ? Math.round(((maxPrice - minPrice) / medianPrice) * 1000) / 10
      : null;
  const potentialOutlierHashes =
    medianPrice == null
      ? []
      : qualified
          .filter(
            (observation) =>
              observation.observedPriceRon != null &&
              Math.abs(observation.observedPriceRon - medianPrice) / medianPrice >
                MARKET_PRICE_SPREAD_REVIEW_PERCENT / 100,
          )
          .map((observation) => observation.sourceHash);
  const marketplaceOnly =
    qualified.length > 0 &&
    qualified.every(
      (observation) => observation.sourceClass === "MARKETPLACE",
    );
  const outOfStockOnly =
    qualified.length > 0 &&
    qualified.every(
      (observation) =>
        observation.availabilitySignal === "OUT_OF_STOCK",
    );
  const hasExactVintageEvidence =
    target.vintage == null ||
    qualified.some(
      (observation) => observation.vintageMatch === "EXACT",
    );
  const hasExactVolumeEvidence = qualified.every(
    (observation) =>
      observation.volumeMl ===
      (target.volumeMl ?? MARKET_PRICE_TARGET_VOLUME_ML),
  );
  const strongEvidenceEligible =
    hasExactVintageEvidence &&
    hasExactVolumeEvidence &&
    !marketplaceOnly &&
    !outOfStockOnly;
  const highSpread =
    qualified.length >= 2 &&
    spreadPercent != null &&
    spreadPercent > MARKET_PRICE_SPREAD_REVIEW_PERCENT;

  let status: MarketPriceEstimateStatus;
  if (qualified.length === 0) {
    status = "NO_ESTIMATE";
  } else if (qualified.length === 1) {
    status = "SINGLE_SOURCE_ONLY";
  } else if (highSpread) {
    status = "HIGH_SPREAD_REVIEW";
  } else if (
    qualified.length === 2 ||
    !strongEvidenceEligible
  ) {
    status = "ESTIMATE_LIMITED";
  } else {
    status = "ESTIMATE_STRONG";
  }
  const confidenceReasons: WineMarketPriceEstimate["confidenceReasons"] = [];
  if (qualified.length === 0) {
    confidenceReasons.push("NO_QUALIFIED_SOURCE");
  } else if (qualified.length === 1) {
    confidenceReasons.push("SINGLE_SOURCE");
  }
  if (qualified.length === 2) confidenceReasons.push("TWO_SOURCES");
  if (!hasExactVintageEvidence) {
    confidenceReasons.push("NO_EXACT_VINTAGE");
  }
  if (!hasExactVolumeEvidence) {
    confidenceReasons.push("UNKNOWN_OR_MIXED_VOLUME");
  }
  if (marketplaceOnly) confidenceReasons.push("MARKETPLACE_ONLY");
  if (outOfStockOnly) confidenceReasons.push("OUT_OF_STOCK_ONLY");
  if (highSpread) confidenceReasons.push("HIGH_SPREAD");

  return {
    wineId: target.wineId,
    slug: target.slug,
    status,
    estimatedMarketPrice:
      status === "ESTIMATE_STRONG" || status === "ESTIMATE_LIMITED"
        ? Math.round(medianPrice ?? 0)
        : null,
    confidence:
      status === "ESTIMATE_STRONG"
        ? "strong"
        : status === "ESTIMATE_LIMITED"
          ? "limited"
          : null,
    confidenceReasons,
    sourceCount: qualified.length,
    qualifiedObservationCount: observations.filter(
      (observation) => observation.qualification === "QUALIFIED",
    ).length,
    referenceObservationCount,
    minPriceRon: minPrice,
    maxPriceRon: maxPrice,
    medianPriceRon: medianPrice,
    meanPriceRon: meanPrice,
    spreadPercent,
    potentialOutlierHashes,
    observationHashes: qualified.map(
      (observation) => observation.sourceHash,
    ),
    calculatedAt,
  };
}

export interface MarketPriceMonetizationView {
  priceCopy: string;
  supportingCopy: string;
  primaryAction: "PARTNER_OFFER" | "MONETIZABLE_ALTERNATIVES";
  sourceUrlsPublic: false;
}

export function buildMarketPriceMonetizationView(input: {
  hasProfitshareOffer: boolean;
  estimate: WineMarketPriceEstimate | null;
}): MarketPriceMonetizationView {
  const price =
    input.estimate?.estimatedMarketPrice != null
      ? `Preț estimativ: ~${input.estimate.estimatedMarketPrice} lei`
      : "Preț indisponibil";
  return {
    priceCopy: price,
    supportingCopy:
      input.estimate?.estimatedMarketPrice != null &&
      input.estimate.status === "ESTIMATE_STRONG"
        ? `Estimare din ${input.estimate.sourceCount} prețuri găsite online.`
        : input.estimate?.estimatedMarketPrice != null
          ? `Estimare orientativă din ${input.estimate.sourceCount} prețuri găsite online.`
        : "Nu avem încă suficiente date pentru o estimare de piață.",
    primaryAction: input.hasProfitshareOffer
      ? "PARTNER_OFFER"
      : "MONETIZABLE_ALTERNATIVES",
    sourceUrlsPublic: false,
  };
}

export type MarketPriceBudgetEligibility =
  | "ELIGIBLE_LOWER_CONFIDENCE"
  | "ELIGIBLE_CAUTIOUS"
  | "INELIGIBLE";

export function marketPriceBudgetEligibility(
  status: MarketPriceEstimateStatus,
): MarketPriceBudgetEligibility {
  if (status === "ESTIMATE_STRONG") return "ELIGIBLE_LOWER_CONFIDENCE";
  if (status === "ESTIMATE_LIMITED") return "ELIGIBLE_CAUTIOUS";
  return "INELIGIBLE";
}
