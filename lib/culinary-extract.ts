/**
 * Deterministic culinary-section extraction from producer HTML.
 * Captures the DOM section around a culinary heading and rejects page chrome.
 */
import { stripHtml } from "@/lib/fetch-page-text-utils";
import {
  categorizeFoodText,
  normalizeFoodToken,
  type FoodCategoryId,
} from "@/lib/food-taxonomy";
import type {
  FoodEvidenceClaim,
  FoodEvidenceClass,
  FoodEvidenceSourceType,
} from "@/lib/food-evidence";
import { isGenericAllPurposeLanguage, isLaundryListText } from "@/lib/food-evidence";

export const CULINARY_HEADING_PATTERNS: RegExp[] = [
  /recomandari\s+culinare/i,
  /asocieri\s+culinare/i,
  /asociere\s+culinara/i,
  /food\s*pairing/i,
  /\bpairing\b/i,
  /se\s+recomanda\s+cu/i,
  /recomandat\s+cu/i,
  /recomandare\s+culinara/i,
  /\bgastronomie\b/i,
  /\bservire\b/i,
  /asocieri\s+gastronomice/i,
  /potrivire\s+culinara/i,
];

const CHROME_HEADING_PATTERNS: RegExp[] = [
  /produse\s+similare/i,
  /ti-ar\s+mai\s+putea\s+placa/i,
  /you\s+may\s+also\s+like/i,
  /related\s+products/i,
  /recent\s+posts/i,
  /articole\s+similare/i,
  /newsletter/i,
  /politica\s+de/i,
  /cookie/i,
  /footer/i,
  /navigare/i,
  /meniu\s+principal/i,
  /cos\s+de\s+cumparaturi/i,
  /adauga\s+in\s+cos/i,
  /categorii/i,
  /blog/i,
];

const CHROME_BODY_PATTERNS: RegExp[] = [
  /toate drepturile rezervate/i,
  /copyright\s+\d{4}/i,
  /politica de confidentialitate/i,
  /folosim cookie/i,
  /foloseste cookies/i,
  /adauga in cos/i,
  /produse similare/i,
  /you may also like/i,
  /newsletter/i,
  /urmareste-ne/i,
  /follow us/i,
  /manage consent/i,
  /cookieuri necesare/i,
  /consumul responsabil/i,
];

const CULINARY_STOP_PATTERNS: RegExp[] = [
  /promoveaza consumul responsabil/i,
  /acest site (foloseste|utilizeaza) cookies/i,
  /termeni si conditii/i,
  /manage consent/i,
  /cookieuri necesare/i,
  /setari cookies/i,
  /viewed_cookie_policy/i,
];

const TASTING_NOTE_LEAK_PATTERNS: RegExp[] = [
  /note de degustare/i,
  /culoarea (sa )?este/i,
  /la nas\b/i,
  /pe palat\b/i,
  /produs din struguri/i,
  /acest vin are o culoare/i,
  /gustul este/i,
  /gustativ/i,
  /taninurile/i,
  /corp mediu/i,
  /arome de (fructe|flori|vanilie|stejar|zmeura|capsuni|cirese)/i,
  /se prezinta proaspat/i,
  /rosu rubiniu/i,
];

const HEADING_TAG_RE = /<(h[1-4])[^>]*>([\s\S]*?)<\/\1>/gi;
const LABEL_TAG_RE = /<(p|strong|div)[^>]*>([\s\S]*?)<\/\1>/gi;

export interface CulinarySectionExtract {
  found: boolean;
  text: string;
  heading: string | null;
  chromeRejected: boolean;
  tastingNoteRejected: boolean;
  laundryListRejected: boolean;
  genericLanguageRejected: boolean;
  sourceExcerpt: string;
}

export interface ConstrainedCulinaryExtraction {
  dishes: string[];
  categories: FoodCategoryId[];
  sourceExcerpt: string;
}

function normalizePlain(value: string): string {
  return stripHtml(value).replace(/\s+/g, " ").trim();
}

function headingMatchesCulinary(title: string): boolean {
  const plain = normalizePlain(title);
  return CULINARY_HEADING_PATTERNS.some((pattern) => pattern.test(plain));
}

function headingLooksLikeChrome(title: string): boolean {
  const plain = normalizePlain(title);
  return CHROME_HEADING_PATTERNS.some((pattern) => pattern.test(plain));
}

export function stripProducerChromeTail(text: string): string {
  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  let cut = text.length;
  for (const pattern of CULINARY_STOP_PATTERNS) {
    const match = normalized.match(pattern);
    if (match?.index != null && match.index > 20 && match.index < cut) {
      cut = match.index;
    }
  }
  return text.slice(0, cut).replace(/\s+/g, " ").trim();
}

export function sanitizeCulinaryText(text: string | null | undefined): string {
  if (!text?.trim()) return "";
  return stripProducerChromeTail(text);
}

export function isCulinaryChromeText(text: string): boolean {
  const hits = CHROME_BODY_PATTERNS.filter((pattern) => pattern.test(text)).length;
  return hits >= 2 || /toate drepturile rezervate/i.test(text);
}

export function isTastingNoteLeak(text: string): boolean {
  const hits = TASTING_NOTE_LEAK_PATTERNS.filter((pattern) => pattern.test(text)).length;
  const foodCats = categorizeFoodText(text).length;
  if (hits >= 2 && foodCats <= 1) return true;
  if (hits >= 3) return true;
  return false;
}

function sliceUntilNextHeading(html: string, start: number): string {
  const rest = html.slice(start);
  const next = rest.search(/<(h[1-4]|footer|nav|aside)\b/i);
  const raw = next >= 0 ? rest.slice(0, next) : rest.slice(0, 2500);
  return raw;
}

export function extractCulinarySectionFromHtml(
  html: string,
): CulinarySectionExtract {
  const empty: CulinarySectionExtract = {
    found: false,
    text: "",
    heading: null,
    chromeRejected: false,
    tastingNoteRejected: false,
    laundryListRejected: false,
    genericLanguageRejected: false,
    sourceExcerpt: "",
  };

  const headingMatches = [...html.matchAll(HEADING_TAG_RE)];
  const labelMatches = [...html.matchAll(LABEL_TAG_RE)].filter((entry) => {
    const title = normalizePlain(entry[2] ?? "");
    if (title.length === 0 || title.length > 40) return false;
    if (categorizeFoodText(title).length > 0) return false;
    return headingMatchesCulinary(title);
  });
  const headings = [...headingMatches, ...labelMatches].sort(
    (left, right) => (left.index ?? 0) - (right.index ?? 0),
  );
  for (let i = 0; i < headings.length; i += 1) {
    const title = normalizePlain(headings[i]?.[2] ?? "");
    if (!title || !headingMatchesCulinary(title)) continue;
    if (headingLooksLikeChrome(title)) {
      return { ...empty, chromeRejected: true, heading: title };
    }

    const matchIndex = headings[i]?.index ?? 0;
    const matchLength = headings[i]?.[0]?.length ?? 0;
    const start = matchIndex + matchLength;
    let sectionHtml = "";

    const nextCulinaryOrChrome = headings.slice(i + 1).find((entry) => {
      const nextTitle = normalizePlain(entry[2] ?? "");
      return headingLooksLikeChrome(nextTitle) || headingMatchesCulinary(nextTitle);
    });
    if (nextCulinaryOrChrome?.index != null) {
      sectionHtml = html.slice(start, nextCulinaryOrChrome.index);
    } else {
      sectionHtml = sliceUntilNextHeading(html, start);
    }

    const text = sanitizeCulinaryText(normalizePlain(sectionHtml));
    if (!text) return { ...empty, heading: title };

    const chromeRejected = isCulinaryChromeText(text);
    const tastingNoteRejected = isTastingNoteLeak(text);
    const laundryListRejected = isLaundryListText(text);
    const genericLanguageRejected = isGenericAllPurposeLanguage(text);
    const usable = !chromeRejected && !tastingNoteRejected;

    return {
      found: usable,
      text: usable ? text : "",
      heading: title,
      chromeRejected,
      tastingNoteRejected,
      laundryListRejected,
      genericLanguageRejected,
      sourceExcerpt: text.slice(0, 280),
    };
  }

  return empty;
}

const DISH_SPLIT_RE = /[,;•·\n]|(\ssi\s)|(\ssau\s)/i;

export function extractDishesFromCulinaryText(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const parts = normalized
    .split(DISH_SPLIT_RE)
    .map((part) => part?.trim() ?? "")
    .filter((part) => part.length >= 3 && part.length <= 80);

  const dishes: string[] = [];
  for (const part of parts) {
    const cats = categorizeFoodText(part);
    if (cats.length === 0) continue;
    if (isGenericAllPurposeLanguage(part)) continue;
    dishes.push(part);
  }
  return [...new Set(dishes)];
}

/**
 * Constrained extraction: ONLY the culinary section, never the full page.
 * Deterministic. No grape-pairing inference, no synonym invention.
 */
export function extractConstrainedCulinaryClaims(
  sectionText: string,
  meta: {
    sourceUrl?: string;
    sourceType?: FoodEvidenceSourceType;
    evidenceClass?: FoodEvidenceClass;
  } = {},
): ConstrainedCulinaryExtraction & { claims: FoodEvidenceClaim[] } {
  const cleaned = sanitizeCulinaryText(sectionText);
  const sourceExcerpt = cleaned.slice(0, 280);
  if (!cleaned || isCulinaryChromeText(cleaned) || isTastingNoteLeak(cleaned)) {
    return { dishes: [], categories: [], sourceExcerpt, claims: [] };
  }
  if (isLaundryListText(cleaned) || isGenericAllPurposeLanguage(cleaned)) {
    return { dishes: [], categories: [], sourceExcerpt, claims: [] };
  }

  const dishes = extractDishesFromCulinaryText(cleaned);
  const categories = [...new Set(dishes.flatMap((dish) => categorizeFoodText(dish)))];
  const sourceType = meta.sourceType ?? "producer_page";
  const evidenceClass =
    meta.evidenceClass ??
    (sourceType === "tasting_sheet" ? "TASTING_SHEET" : "PRODUCER_EXACT");

  const claims: FoodEvidenceClaim[] = [];
  for (const dish of dishes) {
    for (const category of categorizeFoodText(dish)) {
      if (claims.some((claim) => claim.category === category && claim.dish === dish)) {
        continue;
      }
      claims.push({
        category,
        dish,
        ...(meta.sourceUrl ? { sourceUrl: meta.sourceUrl } : {}),
        sourceType,
        excerpt: sourceExcerpt,
        extractionMethod: "deterministic",
        evidenceClass,
        confidence: evidenceClass === "TASTING_SHEET" ? 70 : 76,
      });
    }
  }

  return { dishes, categories, sourceExcerpt, claims };
}

export function looksLikePageWideFoodAggregation(text: string): boolean {
  const tokens = normalizeFoodToken(text).split(" ");
  if (tokens.length > 120 && categorizeFoodText(text).length >= 4) return true;
  return isLaundryListText(text) && text.length > 400;
}
