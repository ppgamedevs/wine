/**
 * Independent source product identity. DB wine name is never copied in.
 */
import { foldRomanianText } from "@/lib/pairing/romanian-text";
import { extractTechnicalSourceVintage, extractVintageFromFilename } from "@/lib/tech-facts/vintage";
import type { SourceNameClass, SourceVintageClass } from "@/lib/tech-facts/types";

const GENERIC_TITLE = /catalog|magazin|privacy|confidentialitate|cookie|termeni|gdpr|crama|winery|home|acasa|vinuri$/i;
const FACT_LINE =
  /alcool|aciditate|zahar|% vol|g\/l|clasificare|temperatura|parametr|analiza|copyright|newsletter|privacy|cookie/i;

export interface SourceWineIdentity {
  sourceWineName: string | null;
  sourceProducer: string | null;
  sourceVintage: number | null;
  sourceType: string | null;
  sourceGrapes: string[];
  sourceBottleSize: number | null;
  sourceSku: string | null;
  sourceLine: string | null;
  nameClass: SourceNameClass;
  vintageClass: SourceVintageClass;
  identityEvidence: string[];
}

function decode(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number.parseInt(code, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function usableName(value: string | null | undefined): string | null {
  const cleaned = value ? decode(value) : "";
  if (!cleaned || cleaned.length < 3) return null;
  if (FACT_LINE.test(cleaned)) return null;
  if (/\.pdf(\b|$)/i.test(cleaned)) return null;
  if (/fisa\s*(tehnica|degustare)|tasting sheet|technical sheet/i.test(cleaned)) return null;
  if (GENERIC_TITLE.test(cleaned) && cleaned.split(" ").length <= 3) return null;
  return cleaned.replace(/\s+(19\d{2}|20[0-3]\d)\s*$/, "").trim() || cleaned;
}

function jsonLdProductName(html: string): string | null {
  for (const match of html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    const raw = match[1];
    if (!raw) continue;
    try {
      const parsed: unknown = JSON.parse(raw);
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      for (const node of nodes) {
        if (!node || typeof node !== "object") continue;
        const record = node as Record<string, unknown>;
        const type = String(record["@type"] ?? "");
        if (/product/i.test(type) && typeof record.name === "string") {
          return usableName(record.name);
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

export function extractSourceIdentityFromHtml(html: string): SourceWineIdentity {
  const evidence: string[] = [];
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const og = html.match(/property=["']og:title["'][^>]*content=["']([^"']+)/i)?.[1];
  const jsonLd = jsonLdProductName(html);
  const sku =
    html.match(/itemprop=["']sku["'][^>]*content=["']([^"']+)/i)?.[1] ??
    html.match(/["']sku["']\s*:\s*["']([^"']+)/i)?.[1] ??
    null;

  const name = jsonLd ?? usableName(h1 ? h1.replace(/<[^>]+>/g, " ") : null) ?? usableName(og);
  if (jsonLd) evidence.push("json-ld Product.name");
  else if (h1) evidence.push("h1");
  else if (og) evidence.push("og:title");

  const vintage = extractTechnicalSourceVintage({
    text: html.replace(/<[^>]+>/g, " ").slice(0, 4000),
    title: name,
    heading: h1 ? h1.replace(/<[^>]+>/g, " ") : name,
  });

  return {
    sourceWineName: name,
    sourceProducer: null,
    sourceVintage: vintage,
    sourceType: null,
    sourceGrapes: [],
    sourceBottleSize: null,
    sourceSku: sku?.trim() || null,
    sourceLine: null,
    nameClass: name ? "SOURCE_NAME_EXACT" : "SOURCE_NAME_MISSING",
    vintageClass: vintage != null ? "SOURCE_VINTAGE_EXPLICIT" : "SOURCE_VINTAGE_MISSING",
    identityEvidence: evidence,
  };
}

export function extractSourceIdentityFromText(input: {
  text: string;
  title?: string | null;
  filename?: string | null;
  html?: string | null;
}): SourceWineIdentity {
  if (input.html?.includes("<")) {
    const fromHtml = extractSourceIdentityFromHtml(input.html);
    if (fromHtml.sourceWineName) return fromHtml;
  }

  const evidence: string[] = [];
  const titleName = usableName(input.title);
  const heading = input.text.split("\n").map((line) => line.trim()).find((line) => line.length >= 4 && line.length <= 80);
  const headingName = usableName(heading);
  const name = titleName ?? headingName;
  if (titleName) evidence.push("document title");
  else if (headingName) evidence.push("first heading");

  const explicitVintage = extractTechnicalSourceVintage({
    text: input.text,
    title: input.title,
    heading: headingName,
  });
  const filenameVintage = extractVintageFromFilename(input.filename);
  const vintage = explicitVintage ?? filenameVintage;
  const vintageClass: SourceVintageClass =
    explicitVintage != null
      ? "SOURCE_VINTAGE_EXPLICIT"
      : filenameVintage != null
        ? "SOURCE_VINTAGE_FILENAME_ONLY"
        : "SOURCE_VINTAGE_MISSING";

  return {
    sourceWineName: name,
    sourceProducer: null,
    sourceVintage: vintage,
    sourceType: null,
    sourceGrapes: [],
    sourceBottleSize: null,
    sourceSku: null,
    sourceLine: null,
    nameClass: name ? "SOURCE_NAME_EXACT" : "SOURCE_NAME_MISSING",
    vintageClass,
    identityEvidence: evidence,
  };
}

export function classifySourceName(
  dbName: string,
  sourceName: string | null,
): SourceNameClass {
  if (!sourceName?.trim()) return "SOURCE_NAME_MISSING";
  const left = foldRomanianText(dbName).replace(/\b(19\d{2}|20[0-3]\d)\b/g, " ").replace(/\s+/g, " ").trim();
  const right = foldRomanianText(sourceName).replace(/\b(19\d{2}|20[0-3]\d)\b/g, " ").replace(/\s+/g, " ").trim();
  if (!left || !right) return "SOURCE_NAME_MISSING";
  if (left === right) return "SOURCE_NAME_EXACT";
  if (left.includes(right) || right.includes(left)) return "SOURCE_NAME_PARTIAL";
  return "SOURCE_NAME_CONFLICT";
}

export function extractFocusedProductHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<aside[\s\S]*?<\/aside>/gi, " ")
    .replace(/class=["'][^"']*(related|recommend|newsletter|cookie|footer|navbar)[^"']*["'][\s\S]*?<\/\w+>/gi, " ");
}

export function discoverOfficialDocumentUrls(html: string, pageUrl: string): string[] {
  const urls = new Set<string>();
  for (const match of html.matchAll(/href=["']([^"']+)["']/gi)) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    const haystack = raw.toLowerCase();
    if (
      !/\.pdf(\?|#|$)/i.test(raw) &&
      !/fisa|fișa|tehnica|tehnică|technical|download|specification/i.test(haystack)
    ) {
      continue;
    }
    try {
      urls.add(new URL(raw, pageUrl).toString());
    } catch {
      continue;
    }
  }
  return [...urls];
}
