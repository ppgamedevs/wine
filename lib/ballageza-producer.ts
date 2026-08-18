import { stripHtml } from "@/lib/fetch-page-text-utils";
import type { GrapeVarietyShare } from "@/lib/schema";
import {
  parseResidualSugarClaim,
  parseTotalAcidityClaim,
} from "@/lib/tech-facts/parse";
import type { WineSweetnessLevel } from "@/lib/wine-tech-specs";
import { slugify } from "@/lib/wine-url";

/** Logo oficial Balla Geza (PNG), acelasi folosit la import pe paginile de produs. */
export const BALLA_GEZA_WINERY_LOGO_URL =
  "https://www.ballageza.com/assets/site/img/logo/BG_f.w.logo3.png";

export interface BallaGezaCanonicalFacts {
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

export interface BallaGezaWineRecord {
  productId: number;
  name: string;
  vintage: number | null;
  category: string | null;
  color: "alb" | "rosu" | "roze" | "spumant" | null;
  sweetness: WineSweetnessLevel | null;
  grapeVarieties: GrapeVarietyShare[];
  alcohol: number | null;
  acidity: number | null;
  sugar: number | null;
  volumeMl: number | null;
  imageUrl: string | null;
  tastingNotes: string | null;
  producerPageUrl: string;
}

const BALLAGEZA_CATALOG_BASE = "https://www.ballageza.com/ro/catalog/vinuri";

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
  if (norm.includes("brut")) return "sec";
  if (norm === "sec") return "sec";
  if (norm === "demisec") return "demisec";
  if (norm === "demidulce") return "demidulce";
  if (norm === "dulce") return "dulce";
  return null;
}

function parseBallaGezaColor(raw: string | null | undefined): BallaGezaWineRecord["color"] {
  const norm = normalizeMatchText(raw ?? "");
  if (norm.includes("spumant") || norm.includes("perlant")) return "spumant";
  if (norm.includes("rose") || norm.includes("roze") || norm.includes("roz")) return "roze";
  if (norm.includes("rosu") || norm.includes("ros")) return "rosu";
  if (norm.includes("alb")) return "alb";
  return null;
}

function parseListField(block: string, label: string): string | null {
  const pattern = new RegExp(
    `${label}:\\s*<\\/span>\\s*([^<\\n]+?)\\s*<\\/li>`,
    "i",
  );
  const match = block.match(pattern);
  return match?.[1]?.replace(/\s+/g, " ").trim() ?? null;
}

function parseGrapeVarieties(raw: string | null): GrapeVarietyShare[] {
  if (!raw?.trim()) return [];

  const names = raw
    .split(/[,;&]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 2 && part.length <= 50);

  if (names.length === 0) return [];

  const share = Math.round(100 / names.length);
  return names.map((name) => ({ name, percentage: share }));
}

function parseVolumeMl(raw: string | null): number | null {
  if (!raw) return null;
  const liters = parseDecimalToken(raw.replace(/[^\d,.]/g, ""));
  if (liters == null) return null;
  return Math.round(liters * 1000);
}

export function buildBallaGezaWineUrl(input: {
  name: string;
  vintage: number | null;
  category?: string | null;
}): string {
  const slug = slugify(input.name.replace(/\s*&\s*/g, " "));
  if (!slug) return BALLAGEZA_CATALOG_BASE;

  const categorySlug = input.category
    ? slugify(input.category.replace(/\s+/g, " "))
    : null;

  if (input.vintage == null) {
    return `${BALLAGEZA_CATALOG_BASE}/${slug}`;
  }

  const vintageSegment =
    categorySlug && categorySlug !== "classic"
      ? `${input.vintage}-${categorySlug}`
      : String(input.vintage);

  return `${BALLAGEZA_CATALOG_BASE}/${slug},${vintageSegment}`;
}

export function isBallaGezaUrl(url: string): boolean {
  try {
    return new URL(url).hostname.replace(/^www\./, "").includes("ballageza.com");
  } catch {
    return url.includes("ballageza.com");
  }
}

export function parseBallaGezaUrlHint(
  pageUrl: string,
): { slug: string; vintage: number | null; category: string | null } | null {
  try {
    const pathname = new URL(pageUrl).pathname.replace(/\/+$/, "");
    const segments = pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1];
    if (!last || last === "vinuri" || last.startsWith("categoria")) {
      return null;
    }

    const [slugPart, vintagePartRaw] = last.split(",");
    const slug = decodeURIComponent(slugPart ?? "").trim();
    if (!slug) return null;

    const vintagePart = vintagePartRaw?.trim() ?? "";
    const vintageMatch = vintagePart.match(/^(\d{4})/);
    const categoryMatch = vintagePart.match(/^\d{4}-(.+)$/);

    const vintage = vintageMatch?.[1]
      ? Number.parseInt(vintageMatch[1], 10)
      : null;

    const category = categoryMatch?.[1]
      ? normalizeMatchText(categoryMatch[1].replace(/-/g, " "))
      : null;

    return {
      slug,
      vintage: Number.isFinite(vintage ?? NaN) ? vintage : null,
      category,
    };
  } catch {
    return null;
  }
}

function wineSlugFromName(name: string): string {
  return slugify(name.replace(/\s*&\s*/g, " "));
}

function slugMatchesWine(urlSlug: string, wineName: string): boolean {
  const wineSlug = wineSlugFromName(wineName);
  const normalizedUrlSlug = slugify(urlSlug.replace(/,/g, " "));
  if (!wineSlug || !normalizedUrlSlug) return false;
  if (wineSlug === normalizedUrlSlug) return true;

  const wineTokens = normalizeMatchText(wineName).split(" ").filter(Boolean);
  const urlTokens = normalizeMatchText(urlSlug).split(/[\s-]+/).filter(Boolean);
  if (urlTokens.length === 0) return false;

  return urlTokens.every((token) =>
    wineTokens.some(
      (wineToken) => wineToken === token || wineToken.startsWith(token),
    ),
  );
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number.parseInt(code, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function parseBallaGezaModalBlock(
  block: string,
  productId: number,
): BallaGezaWineRecord | null {
  const nameRaw =
    block.match(/class="wine__name"[^>]*>\s*([^<]+?)\s*<\/div>/i)?.[1]?.trim() ??
    null;
  const name = nameRaw ? decodeHtmlEntities(nameRaw) : null;
  if (!name) return null;

  const vintageRaw = parseListField(block, "An de producție");
  const vintage = vintageRaw ? Number.parseInt(vintageRaw, 10) : null;
  const category = parseListField(block, "Categoria");
  const grapeRaw = parseListField(block, "Soi");
  const colorRaw = parseListField(block, "Culoare");
  const tipRaw = parseListField(block, "Tip");
  const alcoholRaw = parseListField(block, "Alcool");
  const acidityRaw = parseListField(block, "Aciditate");
  const sugarRaw =
    parseListField(block, "Zahar rezidual") ??
    parseListField(block, "Zahăr rezidual");
  const volumeRaw = parseListField(block, "Butelii");

  const topColorMatch = block.match(
    /class="text-secondary"[^>]*>\s*(alb|ro[sș]u|ros[eé]|spumant|perlant)\s*<\/span>/i,
  );
  const topSweetnessMatch = block.match(
    /class="text-secondary"[^>]*>\s*(sec|demisec|demidulce|dulce|brut[^<]*)\s*<\/span>/gi,
  );

  const imageUrl =
    block.match(/class="wine__img"[\s\S]*?src="([^"]+)"/i)?.[1]?.trim() ??
    null;
  const tastingNotes =
    block
      .match(/class="mb-4">\s*<p>\s*([\s\S]*?)<\/p>/i)?.[1]
      ?.replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim() ?? null;

  const color =
    parseBallaGezaColor(colorRaw) ??
    parseBallaGezaColor(topColorMatch?.[1]) ??
    parseBallaGezaColor(name);

  let sweetness = parseSweetnessLabel(tipRaw ?? "");
  if (!sweetness && topSweetnessMatch) {
    for (const match of topSweetnessMatch) {
      const label = match.match(/>\s*([^<]+)\s*<\/span/i)?.[1];
      sweetness = parseSweetnessLabel(label ?? "");
      if (sweetness) break;
    }
  }

  return {
    productId,
    name,
    vintage: Number.isFinite(vintage ?? NaN) ? vintage : null,
    category,
    color,
    sweetness,
    grapeVarieties: parseGrapeVarieties(grapeRaw),
    alcohol: alcoholRaw ? parseDecimalToken(alcoholRaw) : null,
    acidity: (() => {
      if (!acidityRaw) return null;
      const parsed = parseTotalAcidityClaim(`Aciditate totala ${acidityRaw}`);
      return parsed && !parsed.ambiguous ? parsed.value : null;
    })(),
    sugar: (() => {
      if (!sugarRaw) return null;
      const parsed = parseResidualSugarClaim(`Zahar rezidual ${sugarRaw}`);
      return parsed && !parsed.ambiguous ? parsed.value : null;
    })(),
    volumeMl: parseVolumeMl(volumeRaw),
    imageUrl,
    tastingNotes,
    producerPageUrl: buildBallaGezaWineUrl({
      name,
      vintage: Number.isFinite(vintage ?? NaN) ? vintage : null,
      category,
    }),
  };
}

export function parseAllBallaGezaWinesFromCatalog(html: string): BallaGezaWineRecord[] {
  const wines: BallaGezaWineRecord[] = [];
  const parts = html.split(/id="product-/i).slice(1);

  for (const part of parts) {
    const idMatch = part.match(/^(\d+)"/);
    const productId = idMatch?.[1] ? Number.parseInt(idMatch[1], 10) : NaN;
    if (!Number.isFinite(productId)) continue;

    const block = `id="product-${part}`;
    const parsed = parseBallaGezaModalBlock(block, productId);
    if (parsed) wines.push(parsed);
  }

  return wines;
}

function scoreWineMatch(
  wine: BallaGezaWineRecord,
  hint: { slug: string; vintage: number | null; category: string | null },
  wineNameHint?: string | null,
): number {
  let score = 0;

  if (slugMatchesWine(hint.slug, wine.name)) score += 40;
  if (hint.vintage != null && wine.vintage === hint.vintage) score += 30;
  if (wineNameHint && slugMatchesWine(wineSlugFromName(wineNameHint), wine.name)) {
    score += 20;
  }

  if (hint.category) {
    const wineCategory = normalizeMatchText(wine.category ?? "");
    if (wineCategory.includes(hint.category) || hint.category.includes(wineCategory)) {
      score += 25;
    } else {
      score -= 20;
    }
  } else if (wine.category?.toLowerCase() === "classic") {
    score += 5;
  }

  return score;
}

export function resolveBallaGezaWineFromCatalog(
  html: string,
  pageUrl: string,
  wineNameHint?: string | null,
): BallaGezaWineRecord | null {
  const wines = parseAllBallaGezaWinesFromCatalog(html);
  if (wines.length === 0) return null;

  const hint = parseBallaGezaUrlHint(pageUrl);
  if (!hint && !wineNameHint?.trim()) return null;

  if (!hint && wineNameHint?.trim()) {
    const normalizedHint = normalizeMatchText(wineNameHint);
    const vintageFromHint = wineNameHint.match(/\b(20\d{2})\b/)?.[1];
    const vintage =
      vintageFromHint != null ? Number.parseInt(vintageFromHint, 10) : null;

    const matches = wines.filter((wine) => {
      const wineNorm = normalizeMatchText(wine.name);
      return (
        normalizedHint.includes(wineNorm) ||
        wineNorm.includes(normalizedHint.replace(/\b20\d{2}\b/g, "").trim())
      );
    });

    if (matches.length === 1) return matches[0] ?? null;
    if (matches.length > 1 && vintage != null) {
      return matches.find((wine) => wine.vintage === vintage) ?? matches[0] ?? null;
    }
    return matches[0] ?? null;
  }

  if (!hint) return null;

  let best: BallaGezaWineRecord | null = null;
  let bestScore = 0;

  for (const wine of wines) {
    const score = scoreWineMatch(wine, hint, wineNameHint);
    if (score > bestScore) {
      bestScore = score;
      best = wine;
    }
  }

  return bestScore >= 40 ? best : null;
}

export function parseBallaGezaProducerFacts(
  html: string,
  pageUrl: string,
  wineNameHint?: string | null,
): BallaGezaCanonicalFacts | null {
  if (!isBallaGezaUrl(pageUrl)) return null;

  const wine = resolveBallaGezaWineFromCatalog(html, pageUrl, wineNameHint);
  if (!wine) return null;

  return {
    name: wine.name,
    grapeVarieties: wine.grapeVarieties,
    vintage: wine.vintage,
    alcohol: wine.alcohol,
    acidity: wine.acidity,
    sugar: wine.sugar,
    sweetness: wine.sweetness,
    imageUrl: wine.imageUrl,
    color: wine.color,
  };
}

export function resolveBallaGezaLineSlugSuffix(pageUrl: string): string {
  const hint = parseBallaGezaUrlHint(pageUrl);
  if (!hint?.category || hint.category === "classic") return "";
  const categorySlug = slugify(hint.category);
  return categorySlug ? `-${categorySlug}` : "";
}

export function buildBallaGezaFocusedPageText(
  html: string,
  pageUrl: string,
  wineNameHint?: string | null,
): string | null {
  const wine = resolveBallaGezaWineFromCatalog(html, pageUrl, wineNameHint);
  if (!wine) return null;

  const parts = [
    `Producator: Balla Geza`,
    `Vin: ${wine.name}`,
    wine.vintage != null ? `An: ${wine.vintage}` : null,
    wine.category ? `Categorie: ${wine.category}` : null,
    wine.color ? `Culoare: ${wine.color}` : null,
    wine.sweetness ? `Tip: ${wine.sweetness}` : null,
    wine.alcohol != null ? `Alcool: ${wine.alcohol}%` : null,
    wine.grapeVarieties.length > 0
      ? `Soi: ${wine.grapeVarieties.map((grape) => grape.name).join(", ")}`
      : null,
    wine.tastingNotes ? `Note: ${wine.tastingNotes}` : null,
  ].filter(Boolean);

  return parts.join("\n");
}

export function inferBallaGezaProducerPageUrl(
  wineName: string,
  context = "",
): string | null {
  const combined = `${wineName} ${context}`.trim();
  if (!combined.trim()) return null;

  const vintageMatch = combined.match(/\b(20\d{2})\b/);
  const vintage = vintageMatch?.[1]
    ? Number.parseInt(vintageMatch[1], 10)
    : null;

  const cleanedName = wineName
    .replace(/\b20\d{2}\b/g, " ")
    .replace(/\b(classic|kolna|stonewines|reserve|cuvée|cuvee)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleanedName) return null;

  return buildBallaGezaWineUrl({
    name: cleanedName,
    vintage: Number.isFinite(vintage ?? NaN) ? vintage : null,
  });
}

export function ballaGezaWineToPlainText(wine: BallaGezaWineRecord): string {
  return [
    wine.name,
    wine.vintage != null ? String(wine.vintage) : "",
    wine.category ?? "",
    wine.tastingNotes ?? "",
    stripHtml(wine.tastingNotes ?? ""),
  ]
    .filter(Boolean)
    .join(" ");
}
