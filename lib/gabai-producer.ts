import { fetchPageWithResolution } from "@/lib/fetch-page-html";
import { stripHtml } from "@/lib/fetch-page-text-utils";
import type { GrapeVarietyShare } from "@/lib/schema";
import {
  parseResidualSugarClaim,
  parseTotalAcidityClaim,
} from "@/lib/tech-facts/parse";
import type { WineSweetnessLevel } from "@/lib/wine-tech-specs";
import { normalizeSourceUrl, slugify } from "@/lib/wine-url";

export const GABAI_BASE_URL = "https://cramagabai.ro";
export const GABAI_SHOP_URL = "https://cramagabai.ro/shop/";

export interface GabaiCatalogItem {
  name: string;
  url: string;
  price: number | null;
}

export interface GabaiWineRecord {
  name: string;
  vintage: number | null;
  color: "alb" | "rosu" | "roze" | null;
  sweetness: WineSweetnessLevel | null;
  grapeVarieties: GrapeVarietyShare[];
  alcohol: number | null;
  volumeMl: number | null;
  price: number | null;
  imageUrl: string | null;
  tastingNotes: string | null;
  producerPageUrl: string;
  sku: string | null;
  appellation: string | null;
}

export interface GabaiCanonicalFacts {
  name: string | null;
  grapeVarieties: GrapeVarietyShare[];
  vintage: number | null;
  alcohol: number | null;
  acidity: number | null;
  sugar: number | null;
  sweetness: WineSweetnessLevel | null;
  imageUrl: string | null;
  color: "alb" | "roze" | "rosu" | "spumant" | null;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number.parseInt(code, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeMatchText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDecimalToken(raw: string): number | null {
  const value = Number.parseFloat(raw.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

function cleanCatalogItemName(raw: string): string {
  return decodeHtmlEntities(
    raw
      .replace(/\s+/g, " ")
      .replace(/\d{1,4}[,.]\d{2}\s*&nbsp;?\s*lei.*$/i, "")
      .replace(/\d{1,4}[,.]\d{2}\s*lei.*$/i, "")
      .replace(/Evaluat la[\s\S]*$/i, "")
      .trim(),
  );
}

function parseRonPrice(raw: string | null | undefined): number | null {
  if (!raw?.trim()) return null;

  const commaMatch = raw.match(/(\d{1,4})[,.](\d{2})/);
  if (commaMatch) {
    return Number.parseInt(commaMatch[1] ?? "0", 10);
  }

  const plain = parseDecimalToken(raw.replace(/[^\d,.]/g, ""));
  return plain != null ? Math.round(plain) : null;
}

function parseSweetnessLabel(raw: string): WineSweetnessLevel | null {
  const norm = normalizeMatchText(raw.split("/")[0] ?? raw);
  const compact = norm.replace(/\s+/g, "");
  if (norm.includes("brut") || norm.includes("extra brut")) return "sec";
  if (compact.includes("demisec") || norm.includes("demi sec")) return "demisec";
  if (compact.includes("demidulce") || norm.includes("medium sweet")) return "demidulce";
  if (norm.includes("dulce") || norm.includes("sweet")) return "dulce";
  if (norm.includes("sec") || norm.includes("dry")) return "sec";
  return null;
}

function parseColorFromName(name: string): GabaiWineRecord["color"] {
  const norm = normalizeMatchText(name);
  if (norm.includes("rose") || norm.includes("roze") || norm.includes("roz")) {
    return "roze";
  }
  if (norm.includes("rosu")) return "rosu";
  if (norm.includes("alb")) return "alb";
  return null;
}

function extractMetaContent(html: string, keys: string[]): string | null {
  for (const key of keys) {
    const patterns = [
      new RegExp(`<meta[^>]+property=["']${key}["'][^>]+content=["']([^"']+)["']`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${key}["']`, "i"),
      new RegExp(`<meta[^>]+name=["']${key}["'][^>]+content=["']([^"']+)["']`, "i"),
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]?.trim()) return decodeHtmlEntities(match[1].trim());
    }
  }
  return null;
}

function normalizeAbsoluteUrl(raw: string, pageUrl: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith("data:")) return null;
  try {
    return new URL(trimmed, pageUrl).toString();
  } catch {
    return null;
  }
}

function parseAlcoholPercent(raw: string | null | undefined): number | null {
  if (!raw?.trim()) return null;

  const percentMatch = raw.match(/(\d{1,2}(?:[.,]\d{1,2})?)\s*%/);
  if (percentMatch?.[1]) {
    return parseDecimalToken(percentMatch[1]);
  }

  const bare = parseDecimalToken(raw.replace(/[^\d,.]/g, ""));
  return bare != null && bare <= 20 ? bare : null;
}

function isMarketingHeading(text: string): boolean {
  const norm = normalizeMatchText(text);
  return (
    norm.includes("vinurile gabai") ||
    norm.includes("comanda un vin") ||
    norm.length < 8
  );
}

function extractProductTitle(html: string): string | null {
  const ogTitle = extractMetaContent(html, ["og:title", "twitter:title"]);
  if (ogTitle) {
    const withoutSite = ogTitle.split("|")[0]?.trim();
    if (withoutSite && !isMarketingHeading(withoutSite)) return withoutSite;
  }

  const productH1 = html.match(
    /<h1[^>]*class="[^"]*product_title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i,
  )?.[1];
  if (productH1) {
    const text = decodeHtmlEntities(stripHtml(productH1).replace(/\s+/g, " ").trim());
    if (text && !isMarketingHeading(text)) return text;
  }

  for (const match of html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)) {
    const text = decodeHtmlEntities(
      stripHtml(match[1] ?? "").replace(/\s+/g, " ").trim(),
    );
    if (!text || isMarketingHeading(text)) continue;

    const norm = normalizeMatchText(text);
    if (
      norm.includes("vin ") ||
      norm.startsWith("vin ") ||
      norm.includes(" rose") ||
      norm.includes(" roze") ||
      norm.includes(" spumant")
    ) {
      return text;
    }
  }

  return null;
}

function extractOgImage(html: string, pageUrl: string): string | null {
  const raw =
    extractMetaContent(html, ["og:image", "twitter:image"]) ??
    html.match(/<img[^>]+class="[^"]*wp-post-image[^"]*"[^>]+src="([^"]+)"/i)?.[1] ??
    html.match(/data-large_image="([^"]+)"/i)?.[1] ??
    null;
  return raw ? normalizeAbsoluteUrl(raw, pageUrl) : null;
}

const GABAI_GRAPE_ABBREVIATIONS: Record<string, string> = {
  cs: "Cabernet Sauvignon",
  m: "Merlot",
  fn: "Fetească Neagră",
};

function expandGabaiGrapeAbbreviation(token: string): string {
  const trimmed = token.trim();
  const key = normalizeMatchText(trimmed);
  return GABAI_GRAPE_ABBREVIATIONS[key] ?? trimmed;
}

function extractGabaiSpecLines(html: string): string[] {
  const specBlock =
    html.match(
      /(?:Soi\s*\/?\s*Variety)[\s\S]*?(?=<h2[^>]*>\s*Informa|Informații suplimentare|<div class="et_pb_tab clearfix">)/i,
    )?.[0] ?? null;

  if (!specBlock) return [];

  const brCount = (specBlock.match(/<br\s*\/?>/gi) ?? []).length;
  if (brCount >= 2) {
    return specBlock
      .split(/<br\s*\/?>/i)
      .map((line) => stripHtml(line).replace(/\s+/g, " ").trim())
      .filter(Boolean);
  }

  const lines: string[] = [];
  const leadingLine = specBlock.match(/^([\s\S]*?)<p[\s>]/i)?.[1];
  if (leadingLine?.includes(":")) {
    const text = stripHtml(leadingLine).replace(/\s+/g, " ").trim();
    if (text) lines.push(text);
  }

  for (const match of specBlock.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
    const text = stripHtml(match[1] ?? "").replace(/\s+/g, " ").trim();
    if (text.includes(":")) lines.push(text);
  }

  return lines;
}

function extractGabaiSpecMap(html: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const text of extractGabaiSpecLines(html)) {
    const kv = text.match(/^([^:]+):\s*(.+)$/);
    if (!kv?.[1] || !kv[2]) continue;

    const key = normalizeMatchText(kv[1]);
    const value = kv[2].trim();
    if (!value) continue;

    if (key.includes("soi") || key.includes("variety")) {
      map.grape = value;
    } else if (key.includes("tip") || key.includes("type")) {
      map.type = value;
    } else if (key.includes("apelatiune") || key.includes("appellation")) {
      map.appellation = value;
    } else if (key.includes("recolta") || key.includes("vintage")) {
      map.vintage = value;
    } else if (key.includes("alcool") || key.includes("abv")) {
      map.alcohol = value;
    } else if (key.includes("aciditate") && !key.includes("volatil")) {
      map.acidity = value;
    } else if (key.includes("zahar") || key.includes("residual")) {
      map.sugar = value;
    } else if (key.includes("volume") || key.includes("volum")) {
      map.volume = value;
    }
  }

  return map;
}

function parseGrapeVarieties(raw: string | null): GrapeVarietyShare[] {
  if (!raw?.trim()) return [];

  const cleaned = raw.replace(/\s+/g, " ").trim();
  if (cleaned.includes("+")) {
    return cleaned
      .split("+")
      .map((part) => expandGabaiGrapeAbbreviation(part))
      .filter(Boolean)
      .map((name) => ({ name }));
  }

  return cleaned
    .split(/[,;/]|(?:\s+si\s+)|(?:\s+și\s+)/i)
    .map((part) => part.replace(/\s*\/\s*.+$/, "").trim())
    .filter(Boolean)
    .map((name) => ({ name }));
}

export function extractGabaiDescriptionText(html: string): string | null {
  const wcDescription = html.match(
    /et_pb_wc_description[\s\S]*?<div class="et_pb_module_inner">([\s\S]*?)<\/div>/i,
  )?.[1];

  const paragraphs: string[] = [];
  if (wcDescription) {
    for (const match of wcDescription.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
      const text = stripHtml(match[1] ?? "").replace(/\s+/g, " ").trim();
      if (text.length >= 40) paragraphs.push(text);
    }
  }

  if (paragraphs.length > 0) {
    return paragraphs.join(" ").slice(0, 1200);
  }

  const summary =
    html.match(
      /woocommerce-product-details__short-description[\s\S]*?<\/div>/i,
    )?.[0] ?? html.match(/class="[^"]*summary[\s\S]*?<\/form>/i)?.[0];

  if (!summary) return null;

  const text = stripHtml(summary).replace(/\s+/g, " ").trim();
  if (!text || text.length < 40) return null;

  const withoutPrice = text.replace(/(\d{1,4}[,.]\d{2})\s*lei.*/i, "").trim();
  return withoutPrice.length >= 40 ? withoutPrice : text;
}

function extractGabaiPrice(html: string): number | null {
  const wooAmount =
    html.match(
      /class="[^"]*woocommerce-Price-amount[^"]*"[^>]*>[\s\S]*?(\d{1,4})[,.](\d{2})/i,
    ) ??
    html.match(/<bdi>[\s\S]*?(\d{1,4})[,.](\d{2})/i);

  if (wooAmount?.[1] && wooAmount[2]) {
    return Number.parseInt(wooAmount[1], 10);
  }

  const plain = stripHtml(html.slice(0, 30_000)).match(/(\d{1,3}[,.]\d{2})\s*lei/i);
  return plain ? parseRonPrice(plain[0]) : null;
}

export function isGabaiUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "cramagabai.ro" || host === "www.cramagabai.ro";
  } catch {
    return url.toLowerCase().includes("cramagabai.ro");
  }
}

export function normalizeGabaiProductUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());
    parsed.hash = "";
    parsed.search = "";
    if (!parsed.pathname.endsWith("/")) {
      parsed.pathname = `${parsed.pathname}/`;
    }
    return parsed.toString();
  } catch {
    return normalizeSourceUrl(url);
  }
}

export function inferGabaiProducerPageUrl(
  wineName: string,
  contextUrl?: string | null,
): string | null {
  if (contextUrl && isGabaiUrl(contextUrl) && contextUrl.includes("/product/")) {
    return normalizeGabaiProductUrl(contextUrl);
  }

  const slug = slugify(wineName.replace(/\s*&\s*/g, " "));
  if (!slug) return null;

  return `${GABAI_BASE_URL}/product/${slug}/`;
}

export function parseGabaiProductPage(
  html: string,
  pageUrl: string,
): GabaiWineRecord | null {
  if (!isGabaiUrl(pageUrl)) return null;

  const name = extractProductTitle(html);
  if (!name) return null;

  const specs = extractGabaiSpecMap(html);
  const grapeRaw = specs.grape ?? null;
  const typeRaw = specs.type ?? null;
  const vintageRaw = specs.vintage ?? null;
  const alcoholRaw = specs.alcohol ?? null;
  const volumeRaw = specs.volume ?? null;
  const appellation = specs.appellation ?? null;

  const vintageMatch = vintageRaw?.match(/\b(20\d{2}|19\d{2})\b/);
  const vintage = vintageMatch?.[1]
    ? Number.parseInt(vintageMatch[1], 10)
    : name.match(/\b(20\d{2}|19\d{2})\b/)?.[1]
      ? Number.parseInt(name.match(/\b(20\d{2}|19\d{2})\b/)![1]!, 10)
      : null;

  const sku =
    stripHtml(html).match(/Cod Produs:\s*(\S+)/i)?.[1]?.trim() ?? null;

  return {
    name,
    vintage: Number.isFinite(vintage ?? NaN) ? vintage : null,
    color: parseColorFromName(name),
    sweetness: typeRaw ? parseSweetnessLabel(typeRaw) : null,
    grapeVarieties: parseGrapeVarieties(grapeRaw),
    alcohol: parseAlcoholPercent(alcoholRaw),
    volumeMl: volumeRaw?.match(/(\d+)\s*ml/i)?.[1]
      ? Number.parseInt(volumeRaw.match(/(\d+)\s*ml/i)![1]!, 10)
      : 750,
    price: extractGabaiPrice(html),
    imageUrl: extractOgImage(html, pageUrl),
    tastingNotes: extractGabaiDescriptionText(html),
    producerPageUrl: normalizeGabaiProductUrl(pageUrl),
    sku,
    appellation,
  };
}

export function parseGabaiProducerFacts(
  html: string,
  pageUrl: string,
): GabaiCanonicalFacts | null {
  const wine = parseGabaiProductPage(html, pageUrl);
  if (!wine) return null;

  const specs = extractGabaiSpecMap(html);
  const acidity = specs.acidity
    ? parseTotalAcidityClaim(`Aciditate totala ${specs.acidity}`)
    : null;
  const sugar = specs.sugar
    ? parseResidualSugarClaim(`Zahar rezidual ${specs.sugar}`)
    : null;

  return {
    name: wine.name,
    grapeVarieties: wine.grapeVarieties,
    vintage: wine.vintage,
    alcohol: wine.alcohol,
    acidity: acidity && !acidity.ambiguous ? acidity.value : null,
    sugar: sugar && !sugar.ambiguous ? sugar.value : null,
    sweetness: wine.sweetness,
    imageUrl: wine.imageUrl,
    color: wine.color,
  };
}

export function parseGabaiCatalogListing(
  html: string,
  pageUrl: string,
): GabaiCatalogItem[] {
  if (!isGabaiUrl(pageUrl)) return [];

  const items: GabaiCatalogItem[] = [];
  const seen = new Set<string>();

  for (const match of html.matchAll(
    /<a[^>]+href=["'](https:\/\/cramagabai\.ro\/product\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
  )) {
    const url = normalizeGabaiProductUrl(match[1] ?? "");
    if (!url || seen.has(url)) continue;

    const name = cleanCatalogItemName(stripHtml(match[2] ?? ""));
    if (!name || name.length < 4) continue;

    seen.add(url);
    items.push({ name, url, price: null });
  }

  return items;
}

export async function fetchGabaiCatalogItems(options?: {
  fetchPage?: typeof fetchPageWithResolution;
}): Promise<GabaiCatalogItem[]> {
  const fetchPage = options?.fetchPage ?? fetchPageWithResolution;
  const shopPage = await fetchPage(GABAI_SHOP_URL);
  return parseGabaiCatalogListing(shopPage.html, shopPage.finalUrl);
}
