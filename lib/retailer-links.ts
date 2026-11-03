const KNOWN_RETAILERS: { hostIncludes: string; label: string }[] = [
  { hostIncludes: "emag.ro", label: "eMAG.ro" },
  { hostIncludes: "altex.ro", label: "Altex.ro" },
  { hostIncludes: "flanco.ro", label: "Flanco.ro" },
  { hostIncludes: "evomag.ro", label: "evoMAG.ro" },
  { hostIncludes: "carrefour.ro", label: "Carrefour.ro" },
];

function parseUrl(raw: string): URL | null {
  try {
    return new URL(raw.trim());
  } catch {
    return null;
  }
}

export function isProfitshareUrl(url: string): boolean {
  const parsed = parseUrl(url);
  return parsed?.hostname.toLowerCase().includes("profitshare.ro") ?? false;
}

const PROFITSHARE_HOSTS = new Set([
  "l.profitshare.ro",
  "profitshare.ro",
  "www.profitshare.ro",
]);

/**
 * Strict Profitshare eligibility check.
 *
 * A tracking click-id, `ref=ps`, UTM tag or any other query parameter on a
 * retailer URL is NOT proof of a Profitshare offer. The public price policy
 * accepts only an actual Profitshare tracking link with a campaign token.
 */
export function isQualifyingProfitshareUrl(url: string): boolean {
  const parsed = parseUrl(url);
  if (!parsed) return false;
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;

  const host = parsed.hostname.toLowerCase();
  if (!PROFITSHARE_HOSTS.has(host)) return false;

  const path = parsed.pathname.replace(/\/+$/, "");
  return /^\/(?:l|lr)\/[A-Za-z0-9_-]{4,}$/.test(path);
}

export function getProfitshareOfferId(url: string): string | null {
  if (!isQualifyingProfitshareUrl(url)) return null;
  const parsed = parseUrl(url);
  if (!parsed) return null;
  const match = parsed.pathname.match(/\/(?:l|lr)\/([A-Za-z0-9_-]{4,})\/?$/);
  return match?.[1] ?? null;
}

export function detectRetailerLabel(url: string): string | null {
  const parsed = parseUrl(url);
  if (!parsed) return null;

  const host = parsed.hostname.toLowerCase();
  const match = KNOWN_RETAILERS.find((entry) => host.includes(entry.hostIncludes));
  return match?.label ?? null;
}

/**
 * @deprecated Use `isQualifyingProfitshareUrl`. Kept as an alias so callers
 * cannot accidentally reintroduce generic tracking-parameter heuristics.
 */
export function hasAffiliateTracking(url: string): boolean {
  return isQualifyingProfitshareUrl(url);
}

/** Clean product URL for price checks and catalog references (no affiliate params). */
export function resolveCatalogProductUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed || isProfitshareUrl(trimmed)) return trimmed;
  return normalizeRetailerProductUrl(trimmed);
}

/**
 * Affiliate purchase URL: Profitshare source or retailer link with tracking intact.
 * Returns null when only a clean retailer URL is available.
 */
export function resolveAffiliatePurchaseUrl(input: {
  sourceUrl?: string | null;
  affiliateLinks: { url: string }[];
  availability: { url?: string }[];
}): string | null {
  const source = input.sourceUrl?.trim();
  if (source && isProfitshareUrl(source)) {
    return source;
  }

  for (const entry of input.affiliateLinks) {
    const url = entry.url?.trim();
    if (url && hasAffiliateTracking(url)) {
      return url;
    }
  }

  for (const entry of input.availability) {
    const url = entry.url?.trim();
    if (url && hasAffiliateTracking(url)) {
      return url;
    }
  }

  return null;
}

export function inferRetailerLabelFromStoredLinks(input: {
  affiliateLinks: { url: string; retailer: string }[];
  availability: { url?: string; retailer: string }[];
  fallbackRetailer?: string;
}): string {
  for (const entry of input.affiliateLinks) {
    const label = detectRetailerLabel(entry.url);
    if (label) return label;
    if (entry.retailer?.trim()) return entry.retailer.trim();
  }

  for (const entry of input.availability) {
    const label = detectRetailerLabel(entry.url ?? "");
    if (label) return label;
    if (entry.retailer?.trim()) return entry.retailer.trim();
  }

  return input.fallbackRetailer?.trim() ?? "Magazin";
}

/** Canonical product URL without affiliate tracking params (reduces eMAG bot checks). */
export function normalizeRetailerProductUrl(url: string): string {
  const parsed = parseUrl(url);
  if (!parsed) return url.trim();

  const host = parsed.hostname.toLowerCase();

  if (host.includes("emag.ro")) {
    const productMatch = parsed.pathname.match(
      /^(\/[^?]+\/pd\/[A-Z0-9]+\/?)/i,
    );
    if (productMatch?.[1]) {
      const path = productMatch[1].endsWith("/")
        ? productMatch[1]
        : `${productMatch[1]}/`;
      return `${parsed.origin}${path}`;
    }
    const path = parsed.pathname.endsWith("/")
      ? parsed.pathname
      : `${parsed.pathname}/`;
    return `${parsed.origin}${path}`;
  }

  if (
    host.includes("altex.ro") ||
    host.includes("flanco.ro") ||
    host.includes("evomag.ro")
  ) {
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  }

  return url.trim();
}

/**
 * User-facing purchase URL: clean retailer product page, never a stale Profitshare
 * redirect or eMAG click-id chain from our crawler.
 */
export function resolveUserFacingPurchaseUrl(
  rawUrl: string,
  options: { sourceUrl?: string | null } = {},
): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return trimmed;

  if (isProfitshareUrl(trimmed)) {
    return trimmed;
  }

  const normalized = normalizeRetailerProductUrl(trimmed);
  if (detectRetailerLabel(normalized)) {
    return normalized;
  }

  const source = options.sourceUrl?.trim();
  if (source && !isProfitshareUrl(source)) {
    const fromSource = normalizeRetailerProductUrl(source);
    if (detectRetailerLabel(fromSource)) {
      return fromSource;
    }
  }

  return normalized;
}

export function buildRetailerPurchaseLabel(
  url: string,
  fallbackRetailer?: string,
): string {
  const retailer = detectRetailerLabel(url) ?? fallbackRetailer?.trim();
  if (retailer) {
    return `Vezi pe ${retailer}`;
  }
  if (fallbackRetailer?.trim()) {
    return `Vezi la ${fallbackRetailer.trim()}`;
  }
  return "Vezi in magazin";
}
