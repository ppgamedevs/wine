import type { AppLocale } from "@/i18n/locale";
import { localizedHref } from "@/i18n/paths";

function looksLikeUrlQuery(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (
    /^[a-z0-9][a-z0-9-]*(?:\.[a-z0-9][a-z0-9-]*)+\.[a-z]{2,}(?:\/[^\s]*)?$/i.test(
      trimmed,
    )
  ) {
    return true;
  }
  return /^(?:www\.)?[a-z0-9-]+\.(?:ro|com|eu|net|org)(?:\/|\s|$)/i.test(
    trimmed,
  );
}

function normalizeForIntent(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

const QUESTION_START =
  /^(ce|cum|de ce|cat|cate|care|unde|cand|pot|poti|exista|este|sunt|ai|am|as|de unde|in ce|la ce)\b/;

const FOOD_WORDS =
  "mamaliga|branza|smantana|mici|mititei|sarmale|gratar|cozonac|desert|nunta|cina|cadou|peste|carne|miel|pui|vita|porc|paste|pizza|ciorba|tocana|tocanita|friptura|salata|omleta|burger|steak|creveti|somon|pastrav|crap|sunca|carnati|cranati|varza|fasole|cartofi|telemea|burduf|bulz|mujdei|tochitura|papanasi|clatite|placinta|zacusca|ghiveci|iahnie|drob|pasca|icre|scrumbie|hamsii|ciuperci|ardei|polenta|cheese|cheesecake|chec|tort|prajitura|tiramisu|inghetata|ciocolata|cake|seafood|chicken|pasta|lamb|pork|bbq|barbecue|wedding|dinner|sushi|risotto|turkey|duck|sausage|cabbage|beans";

const FOOD_TOKEN = new RegExp(`\\b(?:${FOOD_WORDS})\\b`);
const PAIRING_PREPOSITION_FOOD = new RegExp(
  `\\b(?:pentru|la|cu|langa|with|for)\\s+(?:${FOOD_WORDS})\\b`,
);

const SOMMELIER_PHRASES: RegExp[] = [
  /\bce inseamna\b/,
  /\bce este\b/,
  /\bce e\b/,
  /\bcare e\b/,
  /\bcare este\b/,
  /\bcare sunt\b/,
  /\bde ce\b/,
  /\bcum se\b/,
  /\bcum pot\b/,
  /\bexplica(te)?\b/,
  /\brecomand(a|at|ati)?\b/,
  /\bspune(-mi)?\b/,
  /\bajuta(-ma)?\b/,
  /\bdiferenta\b/,
  /\bce vin\b/,
  /\bcare vin\b/,
  /\bvin (bun|potrivit|recomandat|pentru)\b/,
  /\bvinuri (pentru|sub)\b/,
  /\b(mearga|merge) bine\b/,
  /\bmerge (cu|la|pentru)\b/,
  /\bun vin sa\b/,
  /\bse potriveste\b/,
  /\bpotrivit pentr/,
  /\basocier(e|i|ea)\b/,
  /\bpairing\b/,
  /\bsomelier\b/,
  /\bbuget\b/,
  /\bsub \d+\s*(lei|ron)\b/,
  /\bintre \d+\s*(si|-)\s*\d+\s*(lei|ron)\b/,
  /\bocazie\b/,
  /\btemperatur(a|i)\b/,
  /\bdecant/,
  /\btanin/,
  /\bbaric/,
  /\bfermentat/,
  /\bce (soi|sort|tip|stil)\b/,
  /\bcare (soi|sort|tip|stil)\b/,
  /\b(vreau|as vrea|as dori|imi trebuie|imi doresc)\b/,
  /\b(sa beau|de baut|sa mananc|sa mearga)\b/,
  /\bcaut (un |o |niste )?(vin|vinuri)\b/,
  /\b(da-mi|gaseste(-mi)?)\b/,
];

const ENGLISH_QUESTION_START =
  /^(what|which|how|why|where|when|can|could|should|is|are|do|does|recommend|find|show)\b/;

const ENGLISH_SOMMELIER_PHRASES: RegExp[] = [
  /\bwhat (wine|should i drink|goes with)\b/,
  /\bwhich wine\b/,
  /\bi (?:want|need|would like|'d like)\b/,
  /\blooking for\b/,
  /\bwine to drink\b/,
  /\bdrink with\b/,
  /\bgoes (?:well )?with\b/,
  /\brecommend(?:ation)?\b/,
  /\bbest value\b/,
  /\bunder \d+\s*(?:ron|lei)\b/,
  /\b(?:pair|pairing|serve) (?:with|for)\b/,
  /\b(?:gift|wedding|romantic dinner|party|christmas)\b/,
  /\b(?:sarmale|mici|stuffed cabbage|grilled meat|bbq|polenta|sour cream|cheesecake)\b/,
  /\b(?:red|white|rose|sparkling) wine\b/,
  /\b(?:dry|medium-dry|medium-sweet|sweet) wine\b/,
  /\b(?:budget|sommelier|decant|tannin|barrel)\b/,
];

const ADVICE_VERB =
  /\b(vreau|beau|baut|caut|recomand|mearga|merge|potriveste|want|drink|pair|looking|need|should)\b/;
const WINE_TOKEN = /\b(vin|vinuri|wine|wines|somelier|sommelier)\b/;
const VINTAGE_YEAR = /\b(?:19|20)\d{2}\b/;

function wordCount(query: string): number {
  return query.split(" ").filter(Boolean).length;
}

function hasFoodPairingCue(query: string): boolean {
  if (PAIRING_PREPOSITION_FOOD.test(query)) return true;
  return FOOD_TOKEN.test(query) && WINE_TOKEN.test(query);
}

function isConversationalWineAdvice(query: string): boolean {
  if (wordCount(query) < 5) return false;
  return WINE_TOKEN.test(query) && ADVICE_VERB.test(query);
}

function looksLikeVintageCatalogName(query: string): boolean {
  if (!VINTAGE_YEAR.test(query)) return false;
  if (wordCount(query) > 6) return false;
  return !ADVICE_VERB.test(query) && !hasFoodPairingCue(query);
}

function hasAdviceSignal(query: string): boolean {
  if (QUESTION_START.test(query) || ENGLISH_QUESTION_START.test(query)) {
    return true;
  }
  if (SOMMELIER_PHRASES.some((pattern) => pattern.test(query))) return true;
  if (ENGLISH_SOMMELIER_PHRASES.some((pattern) => pattern.test(query))) {
    return true;
  }
  if (hasFoodPairingCue(query)) return true;
  return isConversationalWineAdvice(query);
}

export type SearchQueryIntent = "link" | "sommelier" | "catalog";

export function classifySearchQuery(
  raw: string,
  locale: AppLocale = "ro",
): SearchQueryIntent {
  if (looksLikeUrlQuery(raw)) return "link";
  if (isSommelierQuery(raw, locale)) return "sommelier";
  return "catalog";
}

/** True when the user asks a wine question rather than searching the catalog by name. */
export function isSommelierQuery(
  raw: string,
  locale: AppLocale = "ro",
): boolean {
  if (looksLikeUrlQuery(raw)) return false;
  const query = normalizeForIntent(raw);
  if (query.length < 3) return false;

  if (query.endsWith("?")) return true;
  if (looksLikeVintageCatalogName(query)) return false;
  return hasAdviceSignal(query);
}

export function sommelierPageHref(locale: AppLocale = "ro"): string {
  return localizedHref(locale, "aiSommelier");
}

export function searchPageHref(
  locale: AppLocale = "ro",
  notice?: "link",
): string {
  const path = localizedHref(locale, "search");
  return notice ? `${path}?notice=${notice}` : path;
}

/** Short catalog names are safe to echo in titles. Long sentences and URLs are not. */
export function echoableCatalogQuery(raw: string): string | null {
  const query = raw.trim();
  if (query.length < 2 || query.length > 64) return null;
  if (looksLikeUrlQuery(query)) return null;
  return query;
}
