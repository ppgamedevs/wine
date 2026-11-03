import { fetchPageWithResolution } from "@/lib/fetch-page-html";
import { stripHtml } from "@/lib/fetch-page-text-utils";
import type { GrapeVarietyShare } from "@/lib/schema";
import type { WineSweetnessLevel } from "@/lib/wine-tech-specs";
import type {
  CanonicalWineIdentity,
  CanonicalWineColor,
} from "@/lib/wine-identity";
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
  /** Human product label inside the range, e.g. "Muscat Ottonel". */
  productLabel: string;
  name: string;
  color: "alb" | "rosu" | "roze" | null;
  sweetness: WineSweetnessLevel | null;
  grapeVarieties: GrapeVarietyShare[];
  volumeMl: number;
  tastingNotes: string | null;
  producerPageUrl: string;
  sourceUrl: string;
  /** Unique, deterministic key (never a colour alone). */
  variantKey: string;
  /** Stable producer-side product identifier used for matching. */
  sourceProductId: string;
  identity: CanonicalWineIdentity;
  imageUrl: string | null;
  appellation: string | null;
}

export interface MurfatlarCanonicalFacts {
  name: string | null;
  grapeVarieties: GrapeVarietyShare[];
  vintage: number | null;
  alcohol: number | null;
  acidity: number | null;
  sugar: number | null;
  sweetness: WineSweetnessLevel | null;
  volumeMl: number;
  appellation: string | null;
  tastingNotes: string | null;
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
    .replace(/\bDEMISEC\b/gi, "")
    .replace(/\bDEMIDULCE\b/gi, "")
    .replace(/\bDULCE\b/gi, "")
    .replace(/\bSEC\b/gi, "")
    .replace(/\bDRY\b/gi, "")
    .replace(/\b(alb|roze|roz|rosu|red|white|rose)\b/gi, "")
    .replace(/\bDOC\s*[-–]?\s*(?:CT|CMD)\s+Murfatlar\b/gi, "")
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:ml|l)\b/gi, "")
    .replace(/\bvin(?:ul)?\b/gi, "")
    .replace(/\bvarietal\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return [];

  return cleaned
    .split(/[,;+&]|\bsi\b/i)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter((part) => part.length > 2)
    .map((name) => ({ name }));
}

function sweetnessLabel(sweetness: WineSweetnessLevel | null): string | null {
  if (sweetness === "demisec") return "Demisec";
  if (sweetness === "demidulce") return "Demidulce";
  if (sweetness === "dulce") return "Dulce";
  if (sweetness === "sec") return "Sec";
  return null;
}

function extractVintageFromSection(text: string): number | null {
  const match = text.match(/\b(?:recolt[aă]?|anul|vintage)\s*(20[0-2]\d)\b/i);
  return match?.[1] ? Number.parseInt(match[1], 10) : null;
}

function extractRangeName(html: string): string | null {
  for (const match of html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)) {
    const text = decodeHtmlEntities(stripHtml(match[1] ?? "").replace(/\s+/g, " ").trim());
    if (!text || text.includes("18 ani") || text.startsWith("DOC")) continue;
    return text;
  }
  return null;
}

interface VariantSection {
  index: number;
  end: number;
  html: string;
}

interface ProductHeading {
  productLabel: string;
  sweetness: WineSweetnessLevel | null;
  appellation: string | null;
}

function extractAppellationFromText(text: string): string | null {
  const match = text.match(/DOC\s*[-–]?\s*(CT|CMD)\s+Murfatlar/i);
  if (!match) return null;
  return `DOC - ${match[1]?.toUpperCase() ?? "CT"} Murfatlar`;
}

function extractProductHeading(
  html: string,
  sectionStart: number,
  contextStart: number,
): ProductHeading {
  const contextHtml = html.slice(contextStart, sectionStart);
  // Read leaf bde-text nodes in order. The last sweetness node and the text
  // node immediately before it are the current product heading. This is more
  // reliable than one large regex across nested wrapper divs.
  const textDivs = [
    ...contextHtml.matchAll(
      /<div[^>]*bde-text[^>]*>([\s\S]*?)<\/div>/gi,
    ),
  ]
    .map((match) =>
      decodeHtmlEntities(stripHtml(match[1] ?? ""))
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
  let sweetnessIndex = -1;
  for (let index = textDivs.length - 1; index >= 0; index -= 1) {
    if (/^(SEC|DRY|DEMISEC|DEMIDULCE|DULCE)\b/i.test(textDivs[index] ?? "")) {
      sweetnessIndex = index;
      break;
    }
  }

  if (sweetnessIndex >= 0) {
    let productLabel = "";
    for (let index = sweetnessIndex - 1; index >= 0; index -= 1) {
      const candidate = textDivs[index] ?? "";
      if (!/^(DOC|Vin cu denumire|Culoare:|Miros:|Gust:|Temperatura)/i.test(candidate)) {
        productLabel = candidate;
        break;
      }
    }
    if (productLabel) {
      return {
        productLabel,
        sweetness: parseSweetnessLabel(textDivs[sweetnessIndex] ?? ""),
        appellation: extractAppellationFromText(contextHtml),
      };
    }
  }

  // Fallback for templates without bde-text wrappers: take the last
  // "Product SWEETNESS" pair in the bounded context, never a whole-page scan.
  const contextText = decodeHtmlEntities(stripHtml(contextHtml))
    .replace(/\s+/g, " ")
    .trim();
  const matches = [
    ...contextText.matchAll(
      /([A-ZÀ-Ž][A-Za-zÀ-ž0-9\s,&+.-]{2,80}?)\s+(SEC|DRY|DEMISEC|DEMIDULCE|DULCE)\b/g,
    ),
  ];
  const last = matches.at(-1);
  return {
    productLabel: last?.[1]?.replace(/\s+/g, " ").trim() ?? "",
    sweetness: parseSweetnessLabel(last?.[2] ?? contextText),
    appellation: extractAppellationFromText(contextHtml),
  };
}

function dedupeVariants(variants: MurfatlarWineVariant[]): MurfatlarWineVariant[] {
  const seen = new Set<string>();
  const unique: MurfatlarWineVariant[] = [];

  for (const variant of variants) {
    if (!variant.variantKey || seen.has(variant.variantKey)) continue;
    seen.add(variant.variantKey);
    unique.push(variant);
  }

  return unique;
}

export function extractMurfatlarSectionText(sectionHtml: string): string {
  const text = stripHtml(sectionHtml).replace(/\s+/g, " ").trim();
  return text.slice(0, 1200);
}

function extractVolumeMl(text: string): number {
  const match = text
    .replace(/&nbsp;/gi, " ")
    .match(/(\d+(?:[.,]\d+)?)\s*(ml|l)\b/i);
  if (!match?.[1]) return 750;
  const amount = Number.parseFloat(match[1].replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) return 750;
  const unit = (match[2] ?? "ml").toLowerCase();
  return Math.round(unit === "l" ? amount * 1000 : amount);
}

function extractAppellation(html: string): string | null {
  const match = html.match(/DOC\s*[-–]?\s*CMD\s+Murfatlar/i);
  return match?.[0]?.replace(/\s+/g, " ").trim() ?? null;
}

/** Site chrome assets that show up in wp-content/uploads but are never bottle photos. */
const NON_PRODUCT_IMAGE_PATTERN =
  /^(asset|new-project|layer-|screenshot|group_|logo)/i;

function extractProductImageCandidates(
  html: string,
  pageUrl: string,
): Array<{ url: string; filename: string }> {
  const candidates: Array<{ url: string; filename: string }> = [];
  const seen = new Set<string>();

  for (const match of html.matchAll(
    /<img[^>]+src=["']([^"']+wp-content\/uploads[^"']+)["']/gi,
  )) {
    const raw = match[1];
    if (!raw) continue;

    let absolute: string;
    try {
      absolute = new URL(raw, pageUrl).toString();
    } catch {
      continue;
    }
    if (seen.has(absolute)) continue;
    seen.add(absolute);

    const filename = decodeURIComponent(
      absolute.split("/").pop()?.split("?")[0] ?? "",
    );
    if (NON_PRODUCT_IMAGE_PATTERN.test(filename)) continue;

    candidates.push({ url: absolute, filename });
  }

  return candidates;
}

const ALL_COLOR_KEYWORDS: Record<NonNullable<MurfatlarWineVariant["color"]>, string[]> = {
  rosu: ["rosu", "rosii", "red"],
  roze: ["roze", "roz", "rose"],
  alb: ["alb", "white"],
};

function findImageForVariant(input: {
  candidates: Array<{ url: string; filename: string }>;
  rangeSlug: string;
  productLabel: string;
  color: MurfatlarWineVariant["color"];
  sweetness: WineSweetnessLevel | null;
  volumeMl: number;
}): string | null {
  const rangeMatches = input.candidates.filter((candidate) =>
    normalizeMatchText(candidate.filename).includes(input.rangeSlug),
  );
  const pool = rangeMatches.length > 0 ? rangeMatches : input.candidates;
  const productTokens = normalizeMatchText(input.productLabel)
    .split(" ")
    .filter((token) => token.length > 2);
  const expectedSweetness = input.sweetness
    ? normalizeMatchText(input.sweetness)
    : null;
  const expectedVolume =
    input.volumeMl === 1500 ? ["1500", "1-5l", "15l"] : ["750"];

  const scored = pool
    .map((candidate) => {
      const norm = normalizeMatchText(candidate.filename);
      const colorScore =
        input.color != null &&
        ALL_COLOR_KEYWORDS[input.color].some((keyword) => norm.includes(keyword))
          ? 10
          : 0;
      const productScore = productTokens.filter((token) =>
        norm.includes(token),
      ).length;
      const sweetnessScore =
        expectedSweetness == null
          ? 0
          : norm.includes(expectedSweetness)
            ? 8
            : /demisec|demidulce|dulce|sec/.test(norm)
              ? -20
              : 0;
      const volumeScore = expectedVolume.some((token) =>
        norm.includes(token),
      )
        ? 4
        : 0;

      return {
        candidate,
        score: colorScore + productScore * 4 + sweetnessScore + volumeScore,
        productScore,
        sweetnessScore,
      };
    })
    .filter(
      (entry) => entry.productScore > 0 && entry.sweetnessScore >= 0,
    )
    .sort((left, right) => right.score - left.score);

  return scored[0]?.candidate.url ?? null;
}

function extractVariantSections(html: string): VariantSection[] {
  const sections: VariantSection[] = [];
  const pattern = /<p>\s*(?:<strong>\s*)?Culoare:\s*(?:<\/strong>)?/gi;
  let match: RegExpExecArray | null = pattern.exec(html);

  while (match) {
    const start = match.index;
    const slice = html.slice(start);
    const dividerAt = slice.search(/<div class="bde-fancy-divider/i);
    const end =
      dividerAt > 0
        ? start + dividerAt
        : Math.min(html.length, start + 4_000);
    sections.push({ index: start, end, html: html.slice(start, end) });
    match = pattern.exec(html);
  }

  return sections;
}

function buildVariantKey(input: {
  rangeName: string;
  productLabel: string;
  sweetness: WineSweetnessLevel | null;
  volumeMl: number;
  color: MurfatlarWineVariant["color"];
}): string {
  const productPart =
    input.productLabel ||
    colorLabel(input.color) ||
    input.rangeName;
  const colorPart = colorLabel(input.color);
  const colorAlreadyInProduct =
    colorPart.length > 0 &&
    normalizeMatchText(productPart).includes(normalizeMatchText(colorPart));
  return slugify(
    [
      input.rangeName,
      productPart,
      colorAlreadyInProduct ? null : colorPart,
      sweetnessLabel(input.sweetness),
      `${input.volumeMl}ml`,
    ]
      .filter(Boolean)
      .join(" "),
  );
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
  const imageCandidates = extractProductImageCandidates(html, pageUrl);
  const fallbackImage = imageCandidates[0]?.url ?? null;
  const rangeSlug = normalizeMatchText(rangeName);
  const sections = extractVariantSections(html);
  const variants: MurfatlarWineVariant[] = [];

  sections.forEach((section, index) => {
    // Product heading/sweetness belongs to the current bounded block. Start
    // after the previous section's end so we never read the previous variant's
    // sensory block (the critical Muscat Demisec vs Demidulce case).
    const contextStart =
      index === 0
        ? Math.max(0, section.index - 4_000)
        : (sections[index - 1]?.end ?? Math.max(0, section.index - 4_000));
    const heading = extractProductHeading(html, section.index, contextStart);
    const contextHtml = html.slice(contextStart, section.index);
    const combinedHtml = `${contextHtml}${section.html}`;
    const grapes = parseGrapeVarieties(heading.productLabel);
    const culoareText = stripHtml(section.html.split(/Miros:/i)[0] ?? "")
      .replace(/^Culoare:\s*/i, "")
      .slice(0, 300);
    const color =
      inferColorFromTasting(
        `${culoareText} ${heading.productLabel}`,
        grapes.map((grape) => grape.name).join(" "),
      ) ?? null;
    const sweetness =
      heading.sweetness ?? parseSweetnessLabel(culoareText);
    const volumeMl = extractVolumeMl(combinedHtml);
    const productLabel =
      heading.productLabel.trim() ||
      colorLabel(color) ||
      rangeName;
    const variantKey = buildVariantKey({
      rangeName,
      productLabel,
      sweetness,
      volumeMl,
      color,
    });
    const sourceProductId = variantKey;
    const variantImage =
      findImageForVariant({
        candidates: imageCandidates,
        rangeSlug,
        productLabel,
        color,
        sweetness,
        volumeMl,
      }) ?? fallbackImage;
    const variantAppellation =
      heading.appellation ?? appellation ?? extractAppellationFromText(combinedHtml);
    const vintage = extractVintageFromSection(combinedHtml);
    const identity: CanonicalWineIdentity = {
      producer: "Murfatlar",
      range: rangeName,
      productName: productLabel,
      grapeVarieties: grapes.map((grape) => grape.name),
      color: (color ?? null) as CanonicalWineColor,
      sweetness,
      bottleSizeMl: volumeMl,
      vintage,
      sourceProductId,
    };

    variants.push({
      rangeName,
      productLabel,
      name: rangeName,
      color,
      sweetness,
      grapeVarieties: grapes,
      volumeMl,
      tastingNotes: extractMurfatlarSectionText(section.html),
      producerPageUrl,
      sourceUrl: `${producerPageUrl}#${variantKey}`,
      variantKey,
      sourceProductId,
      identity,
      imageUrl: variantImage,
      appellation: variantAppellation,
    });
  });

  if (variants.length === 0) {
    const identity: CanonicalWineIdentity = {
      producer: "Murfatlar",
      range: rangeName,
      productName: rangeName,
      grapeVarieties: [],
      color: null,
      sweetness: null,
      bottleSizeMl: 750,
      vintage: null,
      sourceProductId: "default",
    };
    variants.push({
      rangeName,
      productLabel: rangeName,
      name: rangeName,
      color: null,
      sweetness: null,
      grapeVarieties: [],
      volumeMl: 750,
      tastingNotes: null,
      producerPageUrl,
      sourceUrl: producerPageUrl,
      variantKey: "default",
      sourceProductId: "default",
      identity,
      imageUrl: fallbackImage,
      appellation,
    });
  }

  const unique = dedupeVariants(variants);
  const labelCounts = new Map<string, number>();
  for (const variant of unique) {
    const key = normalizeMatchText(`${variant.rangeName}|${variant.productLabel}`);
    labelCounts.set(key, (labelCounts.get(key) ?? 0) + 1);
  }

  const named = unique.map((variant) => {
    const key = normalizeMatchText(`${variant.rangeName}|${variant.productLabel}`);
    const suffix =
      variant.productLabel.toLowerCase() === variant.rangeName.toLowerCase()
        ? null
        : variant.productLabel;
    const baseName = suffix ? `${variant.rangeName} ${suffix}` : variant.rangeName;
    const needsDisambiguation = (labelCounts.get(key) ?? 0) > 1;
    const disambiguator =
      sweetnessLabel(variant.sweetness) ??
      (needsDisambiguation ? `${variant.volumeMl}ml` : null);
    return {
      ...variant,
      name:
        needsDisambiguation && disambiguator
          ? `${baseName} ${disambiguator}`
          : baseName,
      identity: {
        ...variant.identity,
        productName: variant.productLabel,
      },
    };
  });

  const nameCounts = new Map<string, number>();
  for (const variant of named) {
    const key = normalizeMatchText(variant.name);
    nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
  }

  return named.map((variant) =>
    (nameCounts.get(normalizeMatchText(variant.name)) ?? 0) > 1
      ? { ...variant, name: `${variant.name} ${variant.volumeMl}ml` }
      : variant,
  );
}

function detectColorInText(text: string): MurfatlarWineVariant["color"] {
  const norm = normalizeMatchText(text);
  if (/\broze\b|\brose\b|\broz\b/.test(norm)) return "roze";
  if (/\brosu\b|\brosii\b|\bred\b/.test(norm)) return "rosu";
  if (/\balb\b|\balbe\b|\bwhite\b/.test(norm)) return "alb";
  return null;
}

function extractExplicitVolumeMl(text: string): number | null {
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*(ml|l)\b/i);
  if (!match?.[1]) return null;
  const amount = Number.parseFloat(match[1].replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round((match[2] ?? "ml").toLowerCase() === "l" ? amount * 1000 : amount);
}

function variantGrapesMatchQuery(
  variant: MurfatlarWineVariant,
  query: string,
): boolean {
  if (variant.grapeVarieties.length === 0) return false;
  const normalizedQuery = normalizeMatchText(query);
  return variant.grapeVarieties.some((grape) => {
    const normalizedGrape = normalizeMatchText(grape.name);
    return normalizedGrape.length > 2 && normalizedQuery.includes(normalizedGrape);
  });
}

export function matchMurfatlarVariant(
  variants: MurfatlarWineVariant[],
  wineName: string,
): MurfatlarWineVariant | null {
  if (variants.length === 0) return null;
  if (variants.length === 1) return variants[0] ?? null;

  const norm = normalizeMatchText(wineName);
  const exact = variants.filter(
    (variant) => normalizeMatchText(variant.name) === norm,
  );
  if (exact.length === 1) return exact[0] ?? null;

  const sweetness = parseSweetnessLabel(norm);
  const color = detectColorInText(norm);
  const volumeMl = extractExplicitVolumeMl(norm);

  let candidates = variants.filter((variant) => {
    if (sweetness != null && variant.sweetness !== sweetness) return false;
    if (color != null && variant.color !== color) return false;
    if (volumeMl != null && variant.volumeMl !== volumeMl) return false;
    return true;
  });

  if (candidates.length > 1) {
    const grapeMatches = candidates.filter((variant) =>
      variantGrapesMatchQuery(variant, norm),
    );
    if (grapeMatches.length > 0) candidates = grapeMatches;
  }

  return candidates.length === 1 ? (candidates[0] ?? null) : null;
}

export function matchMurfatlarVariantByHash(
  variants: MurfatlarWineVariant[],
  hash: string,
): MurfatlarWineVariant | null {
  const key = hash.replace(/^#/, "").toLowerCase();
  if (!key) return null;

  // A colour is not a product identifier, even when the range currently has
  // only one wine of that colour. Legacy colour fragments fail closed.
  return variants.find((variant) => variant.variantKey === key) ?? null;
}

export function parseMurfatlarProductPage(
  html: string,
  pageUrl: string,
  wineName?: string | null,
): MurfatlarWineVariant | null {
  const variants = parseMurfatlarProductVariants(html, pageUrl.split("#")[0] ?? pageUrl);
  if (variants.length === 0) return null;

  try {
    const hash = new URL(pageUrl).hash;
    if (hash) {
      // A fragment is an identity selector. If it is ambiguous, fail closed
      // instead of silently selecting the first same-colour product.
      const byHash = matchMurfatlarVariantByHash(variants, hash);
      if (byHash) return byHash;
      // Legacy/custom fragments (e.g. #alb-muscat-ottonel-demisec) are not
      // trusted as keys, but a fully explicit wine name can still resolve
      // uniquely. Generic colour fragments never reach this fallback.
      if (
        wineName &&
        !/^#?(alb|rosu|roze)$/i.test(hash)
      ) {
        return matchMurfatlarVariant(variants, wineName);
      }
      return null;
    }
  } catch {
    // ignore invalid URLs
  }

  if (wineName) return matchMurfatlarVariant(variants, wineName);
  return variants.length === 1 ? (variants[0] ?? null) : null;
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
    vintage: wine.identity.vintage,
    alcohol: null,
    acidity: null,
    sugar: null,
    sweetness: wine.sweetness,
    volumeMl: wine.volumeMl,
    appellation: wine.appellation,
    tastingNotes: wine.tastingNotes,
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
