import { stripHtml } from "@/lib/fetch-page-text-utils";
import { fetchPageHtml } from "@/lib/fetch-page-html";
import type { GrapeVarietyShare } from "@/lib/schema";
import type { WineSweetnessLevel } from "@/lib/wine-tech-specs";
import { normalizeSourceUrl, slugify } from "@/lib/wine-url";

export const BUDUREASCA_CATALOG_URL = "https://budureasca.ro/vinuri/";
export const BUDUREASCA_BASE_URL = "https://budureasca.ro";

export interface BudureascaCatalogItem {
  name: string;
  url: string;
  price: number | null;
}

export interface BudureascaWineRecord {
  name: string;
  vintage: number | null;
  line: string | null;
  color: "alb" | "rosu" | "roze" | "spumant" | null;
  sweetness: WineSweetnessLevel | null;
  grapeVarieties: GrapeVarietyShare[];
  alcohol: number | null;
  volumeMl: number | null;
  price: number | null;
  imageUrl: string | null;
  tastingNotes: string | null;
  producerPageUrl: string;
  sku: string | null;
}

export interface BudureascaCanonicalFacts {
  name: string | null;
  grapeVarieties: GrapeVarietyShare[];
  vintage: number | null;
  alcohol: number | null;
  acidity: number | null;
  sweetness: WineSweetnessLevel | null;
  imageUrl: string | null;
  color: "alb" | "rosu" | "roze" | "spumant" | null;
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

function parseSweetnessLabel(raw: string): WineSweetnessLevel | null {
  const norm = normalizeMatchText(raw);
  if (norm.includes("brut natur")) return "sec";
  if (norm.includes("extra brut") || norm.includes("brut")) return "sec";
  if (norm === "sec") return "sec";
  if (norm === "demisec") return "demisec";
  if (norm === "demidulce") return "demidulce";
  if (norm === "dulce") return "dulce";
  return null;
}

function parseColorLabel(raw: string | null | undefined): BudureascaWineRecord["color"] {
  const norm = normalizeMatchText(raw ?? "");
  if (norm.includes("spumant") || norm.includes("perlant")) return "spumant";
  if (norm.includes("rose") || norm.includes("roze") || norm.includes("roz")) return "roze";
  if (norm.includes("rosu")) return "rosu";
  if (norm.includes("alb")) return "alb";
  return null;
}

function parseRonPrice(raw: string | null | undefined): number | null {
  if (!raw?.trim()) return null;

  const commaMatch = raw.match(/(\d{1,4})[,.](\d{2})/);
  if (commaMatch) {
    return Number.parseInt(commaMatch[1] ?? "0", 10);
  }

  const spacedMatch = raw.match(/(\d{1,4})\s+(\d{2})\s*Lei/i);
  if (spacedMatch) {
    return Number.parseInt(spacedMatch[1] ?? "0", 10);
  }

  const plain = parseDecimalToken(raw.replace(/[^\d,.]/g, ""));
  return plain != null ? Math.round(plain) : null;
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

function extractOgImage(html: string, pageUrl: string): string | null {
  const raw =
    extractMetaContent(html, ["og:image", "twitter:image"]) ??
    html.match(/property="og:image:secure_url"\s+content="([^"]+)"/i)?.[1] ??
    null;
  return raw ? normalizeAbsoluteUrl(raw, pageUrl) : null;
}

function extractProductTitle(html: string): string | null {
  const patterns = [
    /<h1[^>]*class="[^"]*page-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i,
    /<span[^>]*data-ui-id="page-title-wrapper"[^>]*>([\s\S]*?)<\/span>/i,
    /<h1[^>]*>([\s\S]*?)<\/h1>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    const text = match?.[1] ? stripHtml(match[1]).replace(/\s+/g, " ").trim() : null;
    if (text) return decodeHtmlEntities(text);
  }

  const ogTitle = extractMetaContent(html, ["og:title"]);
  if (ogTitle) {
    return ogTitle.split(" - ")[0]?.trim() ?? ogTitle;
  }

  return null;
}

function extractAttributeValue(html: string, label: string): string | null {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      `<th[^>]*>\\s*${escaped}\\s*<\\/th>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>`,
      "i",
    ),
    new RegExp(
      `<dt[^>]*>\\s*${escaped}\\s*<\\/dt>\\s*<dd[^>]*>([\\s\\S]*?)<\\/dd>`,
      "i",
    ),
    new RegExp(`${escaped}\\s*<\\/[^>]+>\\s*([\\s\\S]{1,240}?)(?:<\\/|<dt|<th|##)`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    const text = match?.[1] ? stripHtml(match[1]).replace(/\s+/g, " ").trim() : null;
    if (text) return decodeHtmlEntities(text);
  }

  const plain = stripHtml(html).replace(/\s+/g, " ");
  const plainMatch = plain.match(new RegExp(`${escaped}\\s*:?\\s*([^\\n#]+)`, "i"));
  return plainMatch?.[1]?.trim() ?? null;
}

function parseGrapeVarieties(raw: string | null): GrapeVarietyShare[] {
  if (!raw?.trim()) return [];

  const names = raw
    .split(/[,;]+|\n|•|-(?=[A-Za-zÀ-ž])/)
    .map((part) => part.trim())
    .filter((part) => part.length > 2 && part.length <= 50);

  if (names.length === 0) return [];

  const share = Math.round(100 / names.length);
  return names.map((name) => ({ name, percentage: share }));
}

function parseVolumeMl(raw: string | null): number | null {
  if (!raw) return null;
  const mlMatch = raw.match(/(\d{2,4})\s*ml/i);
  if (mlMatch?.[1]) return Number.parseInt(mlMatch[1], 10);
  const literMatch = raw.match(/(\d+(?:[.,]\d+)?)\s*l/i);
  if (literMatch?.[1]) {
    const liters = parseDecimalToken(literMatch[1]);
    return liters != null ? Math.round(liters * 1000) : null;
  }
  return null;
}

function extractTastingNotes(html: string): string | null {
  const shortDesc =
    html.match(/class="[^"]*product\.overview[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1] ??
    html.match(/itemprop="description"[^>]*>([\s\S]*?)<\/div>/i)?.[1] ??
    null;

  if (shortDesc) {
    const text = stripHtml(shortDesc).replace(/\s+/g, " ").trim();
    if (text.length > 40) return decodeHtmlEntities(text);
  }

  const plain = stripHtml(html).replace(/\s+/g, " ");
  const intro = plain.match(
    /Vinul ne [^#]{40,500}?\.(?:\s+Recomand|\.|$)/i,
  )?.[0];
  return intro?.trim() ?? null;
}

function inferLineFromName(name: string): string | null {
  const norm = normalizeMatchText(name);
  if (norm.includes("origini")) return "Origini";
  if (norm.includes("premium")) return "Premium";
  if (norm.includes("clasic")) return "Clasic";
  if (norm.includes("noble")) return "Noble";
  if (norm.includes("organic")) return "Organic";
  if (norm.includes("the sign")) return "The Sign";
  if (norm.includes("sabrize")) return "Sabrize";
  if (norm.includes("polar")) return "Polar";
  if (norm.includes("legamant")) return "Legamant";
  if (norm.includes("cuvee") || norm.includes("cuve")) return "Cuvee";
  if (norm.includes("vinoteca")) return "Vinoteca";
  return null;
}

function inferColorFromName(name: string): BudureascaWineRecord["color"] {
  const norm = normalizeMatchText(name);
  if (norm.includes("spumant") || norm.includes("spritz")) return "spumant";
  if (norm.includes("rose") || norm.includes("roze")) return "roze";
  if (norm.includes("rosu") || norm.includes("roșu")) return "rosu";
  if (norm.includes("alb")) return "alb";
  return null;
}

function inferSweetnessFromName(name: string): WineSweetnessLevel | null {
  const norm = normalizeMatchText(name);
  if (norm.includes("demisec")) return "demisec";
  if (norm.includes("demidulce")) return "demidulce";
  if (norm.includes(" dulce")) return "dulce";
  if (norm.includes(" sec")) return "sec";
  return null;
}

export function isBudureascaUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "budureasca.ro" || host === "www.budureasca.ro";
  } catch {
    return url.toLowerCase().includes("budureasca.ro");
  }
}

export function shouldSkipBudureascaCatalogItem(name: string, url: string): boolean {
  const norm = normalizeMatchText(`${name} ${url}`);
  return (
    norm.includes("pachet") ||
    norm.includes("set cadou") ||
    norm.includes("cadou") ||
    norm.includes("1 1 cadou") ||
    norm.includes("spritzat") ||
    norm.includes("doza 250") ||
    norm.includes("250ml") && norm.includes("spritz")
  );
}

export function normalizeBudureascaProductUrl(rawUrl: string): string {
  const normalized = normalizeSourceUrl(rawUrl);
  try {
    const parsed = new URL(normalized);
    parsed.hash = "";
    parsed.search = "";
    if (!parsed.pathname.endsWith("/")) {
      parsed.pathname = `${parsed.pathname}/`;
    }
    return parsed.toString();
  } catch {
    return normalized;
  }
}

export function buildBudureascaCatalogPageUrl(page: number, limit = 36): string {
  const url = new URL(BUDUREASCA_CATALOG_URL);
  url.searchParams.set("product_list_limit", String(limit));
  if (page > 1) {
    url.searchParams.set("p", String(page));
  }
  return url.toString();
}

export function parseBudureascaCatalogListing(
  html: string,
  baseUrl = BUDUREASCA_BASE_URL,
): BudureascaCatalogItem[] {
  const items: BudureascaCatalogItem[] = [];
  const seen = new Set<string>();

  const linkPattern =
    /<a[^>]*class="[^"]*product-item-link[^"]*"[^>]*href="([^"]+)"[^>]*(?:title="([^"]+)")?[^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(linkPattern)) {
    const href = match[1]?.trim();
    if (!href) continue;

    const absolute = normalizeAbsoluteUrl(href, baseUrl);
    if (!absolute || !isBudureascaUrl(absolute)) continue;

    const normalizedUrl = normalizeBudureascaProductUrl(absolute);
    if (seen.has(normalizedUrl)) continue;

    const name =
      decodeHtmlEntities(match[2]?.trim() ?? "") ||
      stripHtml(match[3] ?? "").replace(/\s+/g, " ").trim();
    if (!name || shouldSkipBudureascaCatalogItem(name, normalizedUrl)) continue;

    const blockStart = Math.max(0, (match.index ?? 0) - 200);
    const blockEnd = Math.min(html.length, (match.index ?? 0) + 1200);
    const block = html.slice(blockStart, blockEnd);
    const price =
      parseRonPrice(
        block.match(/class="[^"]*price[^"]*"[^>]*>([\s\S]*?)<\/span>/i)?.[1] ??
          block.match(/data-price-amount="([^"]+)"/i)?.[1] ??
          null,
      ) ?? null;

    seen.add(normalizedUrl);
    items.push({ name, url: normalizedUrl, price });
  }

  return items;
}

export function parseBudureascaProductPage(
  html: string,
  pageUrl: string,
): BudureascaWineRecord | null {
  if (!isBudureascaUrl(pageUrl)) return null;

  const name = extractProductTitle(html);
  if (!name) return null;

  const vintageRaw = extractAttributeValue(html, "An de recoltă");
  const vintageMatch = vintageRaw?.match(/\b(20\d{2}|19\d{2})\b/);
  const vintage = vintageMatch?.[1]
    ? Number.parseInt(vintageMatch[1], 10)
    : name.match(/\b(20\d{2}|19\d{2})\b/)?.[1]
      ? Number.parseInt(name.match(/\b(20\d{2}|19\d{2})\b/)![1]!, 10)
      : null;

  const grapeRaw = extractAttributeValue(html, "Soi de struguri");
  const colorRaw = extractAttributeValue(html, "Culoare vin");
  const sweetnessRaw = extractAttributeValue(html, "Tip vin");
  const alcoholRaw = extractAttributeValue(html, "Volum alcool");
  const volumeRaw = extractAttributeValue(html, "Cantitate");

  const price =
    parseRonPrice(extractMetaContent(html, ["product:price:amount"])) ??
    parseRonPrice(html.match(/class="[^"]*price[^"]*"[^>]*>([\s\S]*?)<\/span>/i)?.[1]) ??
    parseRonPrice(stripHtml(html).match(/(\d{1,4}[,.]\d{2})\s*Lei/i)?.[0]);

  const sku =
    extractAttributeValue(html, "SKU") ??
    html.match(/itemprop="sku"[^>]*content="([^"]+)"/i)?.[1]?.trim() ??
    null;

  return {
    name,
    vintage: Number.isFinite(vintage ?? NaN) ? vintage : null,
    line: inferLineFromName(name),
    color: parseColorLabel(colorRaw) ?? inferColorFromName(name),
    sweetness:
      parseSweetnessLabel(sweetnessRaw ?? "") ??
      inferSweetnessFromName(name),
    grapeVarieties: parseGrapeVarieties(grapeRaw),
    alcohol: alcoholRaw ? parseDecimalToken(alcoholRaw.replace(/[^\d,.]/g, "")) : null,
    volumeMl: parseVolumeMl(volumeRaw),
    price,
    imageUrl: extractOgImage(html, pageUrl),
    tastingNotes: extractTastingNotes(html),
    producerPageUrl: normalizeBudureascaProductUrl(pageUrl),
    sku,
  };
}

export function parseBudureascaProducerFacts(
  html: string,
  pageUrl: string,
): BudureascaCanonicalFacts | null {
  const wine = parseBudureascaProductPage(html, pageUrl);
  if (!wine) return null;

  return {
    name: wine.name,
    grapeVarieties: wine.grapeVarieties,
    vintage: wine.vintage,
    alcohol: wine.alcohol,
    acidity: null,
    sweetness: wine.sweetness,
    imageUrl: wine.imageUrl,
    color: wine.color,
  };
}

export function inferBudureascaProducerPageUrl(
  wineName: string,
  context = "",
): string | null {
  const combined = `${wineName} ${context}`.trim();
  if (!combined.trim()) return null;

  if (/emag\.ro|profitshare\.ro|altex\.ro|flanco\.ro/i.test(combined)) {
    return null;
  }

  const withoutVintage = combined
    .replace(/\b20\d{2}\b/g, " ")
    .replace(/\b0[,.]?\d+\s*l\b/gi, " ")
    .replace(/\b(vin|alb|rosu|rose|roze|sec|demisec|demidulce|dulce)\b/gi, " ")
    .replace(/\bbudureasca\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const slug = slugify(withoutVintage);
  if (!slug) return null;

  return `${BUDUREASCA_BASE_URL}/${slug}/`;
}

export async function fetchBudureascaCatalogItems(options?: {
  maxPages?: number;
  fetchHtml?: (url: string) => Promise<string>;
}): Promise<BudureascaCatalogItem[]> {
  const fetchHtml = options?.fetchHtml ?? fetchPageHtml;
  const maxPages = options?.maxPages ?? 20;
  const merged = new Map<string, BudureascaCatalogItem>();

  for (let page = 1; page <= maxPages; page += 1) {
    const pageUrl = buildBudureascaCatalogPageUrl(page);
    const html = await fetchHtml(pageUrl);
    const items = parseBudureascaCatalogListing(html, pageUrl);
    if (items.length === 0) break;

    for (const item of items) {
      merged.set(item.url, item);
    }

    const hasNextPage = /[?&]p=\d+/.test(html) && page < maxPages;
    if (!hasNextPage && items.length < 36) break;
  }

  return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name, "ro"));
}

export function budureascaWineToPlainText(wine: BudureascaWineRecord): string {
  return [
    wine.name,
    wine.line ?? "",
    wine.vintage != null ? String(wine.vintage) : "",
    wine.tastingNotes ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}
