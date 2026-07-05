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

export function detectRetailerLabel(url: string): string | null {
  const parsed = parseUrl(url);
  if (!parsed) return null;

  const host = parsed.hostname.toLowerCase();
  const match = KNOWN_RETAILERS.find((entry) => host.includes(entry.hostIncludes));
  return match?.label ?? null;
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
