import { fetchPageWithResolution } from "@/lib/fetch-page-html";
import { stripHtml } from "@/lib/fetch-page-text-utils";
import type { GrapeVarietyShare } from "@/lib/schema";
import type { WineSweetnessLevel } from "@/lib/wine-tech-specs";
import { normalizeSourceUrl, slugify } from "@/lib/wine-url";

export const MURFATLAR_BASE_URL = "https://murfatlar-vinul.ro";
export const MURFATLAR_CATALOG_URL = `${MURFATLAR_BASE_URL}/vinuri/`;

export interface MurfatlarCatalogItem {
  name: string;
  slug: string;
  url: string;
}

export interface MurfatlarWineVariant {
  rangeName: string;
  name: string;
  color: "alb" | "rosu" | "roze" | null;
  sweetness: WineSweetnessLevel | null;
  grapeVarieties: GrapeVarietyShare[];
  volumeMl: number;
  tastingNotes: string | null;
  producerPageUrl: string;
  sourceUrl: string;
  variantKey: string;
  imageUrl: string | null;
  appellation: string | null;
}

export interface MurfatlarCanonicalFacts {
  name: string | null;
  grapeVarieties: GrapeVarietyShare[];
  vintage: number | null;
  alcohol: number | null;
  acidity: number | null;
  sweetness: WineSweetnessLevel | null;
  imageUrl: string | null;
  color: "alb" | "roze" | "rosu" | "spumant" | null;
}

const EXCLUDED_CATALOG_SLUGS = new Set([
  "vinuri",
  "podgoria",
  "experienta",
  "noutati",
  "contact",
  "jumatate-vin-jumatate-viata",
  "mostenire-pentru-viitor",
  "xmlrpc.php",
  "wp-json",
  "feed",
  "comments",
  "politica-cookie",
  "politica-de-confidentialitate",
  "termeni-si-conditii",
  "anpc",
]);

const SLUG_DISPLAY_NAMES: Record<string, string> = {
  "3hectare": "3 Hectare",
  "corabioara": "Corăbioara",
  "lacrima-lui-ovidiu": "Lacrima lui Ovidiu",
  "lacrima-lui-ovidiu-12": "Lacrima lui Ovidiu 12",
  "sec-de-murfatlar": "Sec de Murfatlar",
  "paznicii-viei": "Paznicii Viei",
  "aperitiv-mamaia": "Aperitiv Mamaia",
  "vermut-mamaia": "Vermut Mamaia",
  "zaraza-vs": "Zaraza VS",
  "zaraza-vsop": "Zaraza VSOP",
  "sable-noble": "Sable Noble",
  statornic: "Statornic",
  zestrea: "Zestrea",
  aerosoli: "Aerosoli",
  premiat: "Premiat",
  babanu: "Babanu",
};

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

function parseSweetnessLabel(raw: string): WineSweetnessLevel | null {
  const norm = normalizeMatchText(raw);
  const compact = norm.replace(/\s+/g, "");
  if (compact.includes("demisec") || norm.includes("demi sec")) return "demisec";
  if (compact.includes("demidulce") || norm.includes("medium sweet")) return "demidulce";
  if (norm.includes("dulce") || norm.includes("sweet") || norm.includes("licoros")) {
    return "dulce";
  }
  if (norm.includes("sec") || norm.includes("dry") || norm.includes("brut")) return "sec";
  return null;
}

function inferColorFromTasting(culoareText: string, grapeText?: string): MurfatlarWineVariant["color"] {
  const norm = normalizeMatchText(`${culoareText} ${grapeText ?? ""}`);
  if (norm.includes("roz") || norm.includes("rose")) return "roze";
  if (
    norm.includes("rosu") ||
    norm.includes("rubiniu") ||
    norm.includes("purpuriu") ||
    norm.includes("granat") ||
    norm.includes("viisiniu")
  ) {
    return "rosu";
  }
  if (
    norm.includes("alb") ||
    norm.includes("galben") ||
    norm.includes("verde") ||
    norm.includes("pai") ||
    norm.includes("lamai")
  ) {
    return "alb";
  }
  return null;
}

function colorLabel(color: MurfatlarWineVariant["color"]): string {
  if (color === "rosu") return "Roșu";
  if (color === "roze") return "Roze";
  if (color === "alb") return "Alb";
  return "";
}

function parseGrapeVarieties(raw: string): GrapeVarietyShare[] {
  const cleaned = raw
    .replace(/\bSEC\b/gi, "")
    .replace(/\bDRY\b/gi, "")
    .replace(/\bDEMISEC\b/gi, "")
    .replace(/\bDULCE\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return [];

  return cleaned
    .split(/[,;+]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 2)
    .map((name) => ({ name }));
}

function extractRangeName(html: string): string | null {
  for (const match of html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)) {
    const text = decodeHtmlEntities(stripHtml(match[1] ?? "").replace(/\s+/g, " ").trim());
    if (!text || text.includes("18 ani") || text.startsWith("DOC")) continue;
    return text;
  }
  return null;
}

function extractContextBefore(html: string, index: number): string {
  return stripHtml(html.slice(Math.max(0, index - 1200), index)).replace(/\s+/g, " ").trim();
}

function extractGrapeAndSweetness(context: string): {
  grapes: GrapeVarietyShare[];
  sweetness: WineSweetnessLevel | null;
} {
  const matches = [
    ...context.matchAll(
      /([A-ZÀ-Ž][A-Za-zÀ-ž\s,+]+?)\s+(SEC|DRY|DEMISEC|DEMIDULCE|DULCE)\b/g,
    ),
  ];
  const secMatch = matches.at(-1);
  if (secMatch?.[1]) {
    const grapeRaw = secMatch[1]
      .replace(/\b\d+\s*ml\b/gi, "")
      .replace(/\bvin\b/gi, "")
      .replace(/\broze\b/gi, "")
      .replace(/\balb\b/gi, "")
      .trim();
    return {
      grapes: parseGrapeVarieties(grapeRaw),
      sweetness: parseSweetnessLabel(secMatch[2] ?? ""),
    };
  }

  return { grapes: [], sweetness: parseSweetnessLabel(context) };
}

function dedupeVariants(variants: MurfatlarWineVariant[]): MurfatlarWineVariant[] {
  const seen = new Set<string>();
  const unique: MurfatlarWineVariant[] = [];

  for (const variant of variants) {
    const key = [
      variant.color ?? "unknown",
      variant.sweetness ?? "unknown",
      variant.grapeVarieties.map((grape) => normalizeMatchText(grape.name)).join("|"),
    ].join(":");
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(variant);
  }

  return unique;
}

function extractTastingNotes(sectionHtml: string): string {
  const text = stripHtml(sectionHtml).replace(/\s+/g, " ").trim();
  return text.slice(0, 1200);
}

function extractVolumeMl(sectionHtml: string): number {
  const match = sectionHtml.match(/(\d+)\s*ml/i);
  return match?.[1] ? Number.parseInt(match[1], 10) : 750;
}

function extractAppellation(html: string): string | null {
  const match = html.match(/DOC\s*[-–]?\s*CMD\s+Murfatlar/i);
  return match?.[0]?.replace(/\s+/g, " ").trim() ?? null;
}

function extractPageImage(html: string, pageUrl: string): string | null {
  const match =
    html.match(/<img[^>]+src=["'](https:\/\/murfatlar-vinul\.ro\/wp-content\/uploads\/[^"']+)["']/i)?.[1] ??
    html.match(/<img[^>]+src=["']([^"']+wp-content\/uploads[^"']+)["']/i)?.[1];
  if (!match) return null;
  try {
    return new URL(match, pageUrl).toString();
  } catch {
    return null;
  }
}

function extractVariantSections(html: string): Array<{ index: number; html: string }> {
  const sections: Array<{ index: number; html: string }> = [];
  const pattern = /<p>\s*(?:<strong>\s*)?Culoare:\s*(?:<\/strong>)?/gi;
  let match: RegExpExecArray | null = pattern.exec(html);

  while (match) {
    const start = match.index;
    const slice = html.slice(start);
    const dividerAt = slice.search(/<div class="bde-fancy-divider/i);
    const end = dividerAt > 0 ? start + dividerAt : start + 3000;
    sections.push({ index: start, html: html.slice(start, end) });
    match = pattern.exec(html);
  }

  return sections;
}

function variantKeyForColor(color: MurfatlarWineVariant["color"], index: number): string {
  if (color === "rosu") return "rosu";
  if (color === "roze") return "roze";
  if (color === "alb") return "alb";
  return `variant-${index + 1}`;
}

export function isMurfatlarUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "murfatlar-vinul.ro" || host === "www.murfatlar-vinul.ro";
  } catch {
    return url.toLowerCase().includes("murfatlar-vinul.ro");
  }
}

export function isMurfatlarProductSlug(slug: string): boolean {
  const normalized = slug.toLowerCase().trim();
  if (!normalized || EXCLUDED_CATALOG_SLUGS.has(normalized)) return false;
  if (normalized.startsWith("politica") || normalized.startsWith("termeni")) return false;
  if (normalized.startsWith("wp-") || normalized.includes("?")) return false;
  return /^[a-z0-9-]+$/.test(normalized);
}

export function normalizeMurfatlarProductUrl(url: string): string {
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

function displayNameForSlug(slug: string): string {
  if (SLUG_DISPLAY_NAMES[slug]) return SLUG_DISPLAY_NAMES[slug]!;
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function inferMurfatlarProducerPageUrl(
  wineName: string,
  contextUrl?: string | null,
): string | null {
  if (contextUrl && isMurfatlarUrl(contextUrl)) {
    return normalizeMurfatlarProductUrl(contextUrl.split("#")[0] ?? contextUrl);
  }

  const norm = normalizeMatchText(wineName);
  for (const [slug, label] of Object.entries(SLUG_DISPLAY_NAMES)) {
    if (norm.includes(normalizeMatchText(label))) {
      return `${MURFATLAR_BASE_URL}/${slug}/`;
    }
  }

  const slug = slugify(wineName.replace(/\b(rosu|roze|roz|alb|sec|demisec|demidulce|dulce)\b/gi, " "));
  if (!slug) return null;
  return `${MURFATLAR_BASE_URL}/${slug}/`;
}

export function parseMurfatlarProductVariants(
  html: string,
  pageUrl: string,
): MurfatlarWineVariant[] {
  if (!isMurfatlarUrl(pageUrl)) return [];

  const rangeName = extractRangeName(html);
  if (!rangeName) return [];

  const producerPageUrl = normalizeMurfatlarProductUrl(pageUrl);
  const appellation = extractAppellation(html);
  const fallbackImage = extractPageImage(html, pageUrl);
  const sections = extractVariantSections(html);
  const variants: MurfatlarWineVariant[] = [];

  sections.forEach((section, index) => {
    const context = extractContextBefore(html, section.index);
    const { grapes, sweetness } = extractGrapeAndSweetness(context);
    const culoareText = stripHtml(section.html.split(/Miros:/i)[0] ?? "").replace(/^Culoare:\s*/i, "");
    const color = inferColorFromTasting(culoareText, grapes.map((g) => g.name).join(" "));
    const variantKey = variantKeyForColor(color, index);
    const suffix = colorLabel(color);
    const name = suffix ? `${rangeName} ${suffix}` : rangeName;

    variants.push({
      rangeName,
      name,
      color,
      sweetness,
      grapeVarieties: grapes,
      volumeMl: extractVolumeMl(section.html),
      tastingNotes: extractTastingNotes(section.html),
      producerPageUrl,
      sourceUrl: `${producerPageUrl}#${variantKey}`,
      variantKey,
      imageUrl: fallbackImage,
      appellation,
    });
  });

  if (variants.length === 0) {
    variants.push({
      rangeName,
      name: rangeName,
      color: null,
      sweetness: null,
      grapeVarieties: [],
      volumeMl: 750,
      tastingNotes: null,
      producerPageUrl,
      sourceUrl: producerPageUrl,
      variantKey: "default",
      imageUrl: fallbackImage,
      appellation,
    });
  }

  return dedupeVariants(variants);
}

export function matchMurfatlarVariant(
  variants: MurfatlarWineVariant[],
  wineName: string,
): MurfatlarWineVariant | null {
  if (variants.length === 0) return null;
  if (variants.length === 1) return variants[0] ?? null;

  const norm = normalizeMatchText(wineName);
  const exact = variants.find((variant) => normalizeMatchText(variant.name) === norm);
  if (exact) return exact;

  if (norm.includes("roze") || norm.includes("rose") || norm.includes("roz ")) {
    return variants.find((variant) => variant.color === "roze") ?? null;
  }
  if (norm.includes(" alb") || norm.endsWith(" alb")) {
    return variants.find((variant) => variant.color === "alb") ?? null;
  }
  if (norm.includes(" rosu") || norm.includes(" ros")) {
    return variants.find((variant) => variant.color === "rosu") ?? null;
  }

  return variants[0] ?? null;
}

export function parseMurfatlarProductPage(
  html: string,
  pageUrl: string,
  wineName?: string | null,
): MurfatlarWineVariant | null {
  const variants = parseMurfatlarProductVariants(html, pageUrl);
  if (variants.length === 0) return null;
  if (wineName) return matchMurfatlarVariant(variants, wineName);
  return variants[0] ?? null;
}

export function parseMurfatlarProducerFacts(
  html: string,
  pageUrl: string,
  wineName?: string | null,
): MurfatlarCanonicalFacts | null {
  const wine = parseMurfatlarProductPage(html, pageUrl, wineName);
  if (!wine) return null;

  return {
    name: wine.name,
    grapeVarieties: wine.grapeVarieties,
    vintage: null,
    alcohol: null,
    acidity: null,
    sweetness: wine.sweetness,
    imageUrl: wine.imageUrl,
    color: wine.color,
  };
}

export function parseMurfatlarCatalogListing(
  html: string,
  pageUrl: string,
): MurfatlarCatalogItem[] {
  if (!isMurfatlarUrl(pageUrl)) return [];

  const items = new Map<string, MurfatlarCatalogItem>();

  for (const match of html.matchAll(
    /href=["']https:\/\/murfatlar-vinul\.ro\/([a-z0-9-]+)\/?["']/gi,
  )) {
    const slug = match[1]?.toLowerCase();
    if (!slug || !isMurfatlarProductSlug(slug)) continue;

    const url = `${MURFATLAR_BASE_URL}/${slug}/`;
    if (!items.has(url)) {
      items.set(url, {
        slug,
        url,
        name: displayNameForSlug(slug),
      });
    }
  }

  return [...items.values()];
}

export async function fetchMurfatlarCatalogItems(options?: {
  fetchPage?: typeof fetchPageWithResolution;
}): Promise<MurfatlarCatalogItem[]> {
  const fetchPage = options?.fetchPage ?? fetchPageWithResolution;
  const catalogPage = await fetchPage(MURFATLAR_CATALOG_URL);
  return parseMurfatlarCatalogListing(catalogPage.html, catalogPage.finalUrl);
}
