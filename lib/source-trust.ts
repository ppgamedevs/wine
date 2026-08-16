/**
 * Ierarhie explicita de incredere pentru evidenta factuale a unui vin.
 * Pretul de retailer nu este evidenta de calitate, stejar, tanin sau pivnita.
 */

export type WineSourceType =
  | "tasting_sheet"
  | "producer_page"
  | "producer_catalog"
  | "producer_general"
  | "retailer"
  | "marketplace"
  | "unknown";

const SOURCE_RANK: Record<WineSourceType, number> = {
  tasting_sheet: 100,
  producer_page: 90,
  producer_catalog: 80,
  producer_general: 50,
  retailer: 30,
  marketplace: 15,
  unknown: 0,
};

const PRODUCER_HOSTS = [
  "avincis.ro",
  "cramelerecas.ro",
  "ballageza.com",
  "budureasca.ro",
  "cramagabai.ro",
  "murfatlar-vinul.ro",
  "davino.ro",
  "serve.ro",
  "liliac.com",
  "jidvei.ro",
  "stirbey.com",
  "corcova.ro",
  "lacertawinery.ro",
  "cramaoprisor.ro",
  "tohani.ro",
  "petrovaselo.com",
  "domeniulcoroanei.ro",
  "casadevinuricotnari.ro",
  "domeniilesamburesti.ro",
  "vinarte.ro",
  "halewood.com.ro",
  "villavinea.com",
];

const MARKETPLACE_HOSTS = ["emag.ro", "altex.ro", "cel.ro", "pcgarage.ro"];
const RETAILER_HOSTS = [
  "vinul.ro",
  "vinuri.ro",
  "wineandmore",
  "goodwine",
  "vinderomania",
  "freshful",
  "kaufland",
  "carrefour",
  "mega-image",
  "auchan",
  "selgros",
  "metro.ro",
];

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

export function classifySourceUrl(
  url: string | null | undefined,
  options: { isPdf?: boolean } = {},
): WineSourceType {
  if (!url?.trim()) return "unknown";
  const host = hostOf(url);
  const path = url.toLowerCase();
  if (options.isPdf || path.endsWith(".pdf") || path.includes("fisa") || path.includes("tasting")) {
    if (PRODUCER_HOSTS.some((item) => host.includes(item))) return "tasting_sheet";
  }
  if (PRODUCER_HOSTS.some((item) => host.includes(item))) {
    if (/\/vin|\/wine|\/produs|\/product|\/shop/.test(path)) return "producer_page";
    return "producer_catalog";
  }
  if (MARKETPLACE_HOSTS.some((item) => host.includes(item))) return "marketplace";
  if (RETAILER_HOSTS.some((item) => host.includes(item))) return "retailer";
  return "unknown";
}

export function sourceRank(type: WineSourceType): number {
  return SOURCE_RANK[type];
}

export function isOfficialProducerSource(type: WineSourceType): boolean {
  return (
    type === "tasting_sheet" ||
    type === "producer_page" ||
    type === "producer_catalog"
  );
}

/** Retailer may inform price/availability, never oak/tannin/cellar/sensory. */
export function retailerMayOverride(field: string): boolean {
  return (
    field === "price" ||
    field === "bottleSize" ||
    field === "vintage" ||
    field === "name" ||
    field === "availability"
  );
}

export const DEDICATED_PRODUCER_SLUGS = [
  "avincis",
  "cramele-recas",
  "balla-geza",
  "budureasca",
  "crama-gabai",
  "murfatlar",
] as const;

export function hasDedicatedProducerParser(winerySlug: string | null | undefined): boolean {
  if (!winerySlug) return false;
  return (DEDICATED_PRODUCER_SLUGS as readonly string[]).includes(winerySlug);
}
