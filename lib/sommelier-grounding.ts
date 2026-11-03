/**
 * Grounding gate: decide whether VinIntel may recommend anything at all.
 *
 * The Sommelier must never fill a missing product with a random bottle. This
 * module answers three questions deterministically:
 *   1. Did the user name a specific wine, grape or producer?
 *   2. Does the catalog contain it?
 *   3. Did any hard constraint leave a usable candidate?
 *
 * When the answer to (2) or (3) is no, recommendations are suppressed and the
 * prompt is told to say so honestly.
 */
import {
  categorizeFoodText,
  normalizeFoodToken,
} from "@/lib/food-taxonomy";
import { normalizeSommelierText } from "@/lib/sommelier-constraints";
import type { BudgetExtraction } from "@/lib/sommelier-budget";
import type { ColorPreference, SweetnessPreference } from "@/lib/sommelier-occasions";
import type { AppLocale } from "@/i18n/locale";

export interface CatalogIdentity {
  slug: string;
  name: string;
  type: string;
  wineryName: string | null;
  regionName?: string | null;
  grapes: string[];
  vintage: number | null;
}

/** Words that carry no product identity. */
const REFERENCE_STOPWORDS = new Set([
  "un",
  "o",
  "niste",
  "ce",
  "care",
  "ceva",
  "vreau",
  "vrea",
  "as",
  "vrea",
  "doresc",
  "caut",
  "cauta",
  "aveti",
  "exista",
  "este",
  "sunt",
  "recomanda",
  "recomanzi",
  "recomandare",
  "recomandari",
  "despre",
  "parere",
  "pare",
  "spuneti",
  "spune",
  "imi",
  "mi",
  "ma",
  "mine",
  "meu",
  "mea",
  "mei",
  "tale",
  "tau",
  "lui",
  "noi",
  "voi",
  "ei",
  "ele",
  "sa",
  "si",
  "sau",
  "ori",
  "vs",
  "versus",
  "dar",
  "insa",
  "pentru",
  "la",
  "cu",
  "de",
  "din",
  "pe",
  "in",
  "intre",
  "pana",
  "maxim",
  "maximum",
  "max",
  "sub",
  "peste",
  "cam",
  "aproximativ",
  "buget",
  "bugetul",
  "lei",
  "ron",
  "euro",
  "eur",
  "bani",
  "cadou",
  "cadouri",
  "nunta",
  "nuntă",
  "botez",
  "aniversare",
  "petrecere",
  "sarbatori",
  "sarbatoare",
  "craciun",
  "paste",
  "romantic",
  "romantica",
  "cina",
  "masa",
  "pranz",
  "online",
  "magazin",
  "site",
  "oferta",
  "reducere",
  "ieftin",
  "scump",
  "bun",
  "buna",
  "bune",
  "special",
  "speciala",
  "recomandat",
  "recomandata",
  "zilele",
  "azi",
  "astazi",
  "main",
  "acum",
  "vreo",
  "vreun",
  "vreuna",
  "vreunul",
  "altceva",
  "unul",
  "una",
  "putin",
  "putina",
  "foarte",
  "tare",
  "chiar",
  "doar",
  "mai",
  "incerc",
  "incerca",
  "beau",
  "bea",
  "baut",
  "mananc",
  "mancam",
  "stiu",
  "aflu",
  "alege",
  "aleg",
  "cumpar",
  "cumparat",
  "servesc",
  "proba",
  "probez",
  "gasesc",
  "gasesti",
  "vand",
  "ofer",
  "oferiti",
  "avem",
  "romania",
  "roman",
  "romanesc",
  "romaneasca",
  "romanesti",
  "romaneste",
  "autohton",
  "autohtona",
  "promotie",
  "stoc",
  "livrare",
  "transport",
  "comanda",
  "comenzi",
  "zi",
  "ziua",
  "seara",
  "weekend",
  "sot",
  "sotie",
  "sotul",
  "sotia",
  "prieten",
  "prietena",
  "prieteni",
  "familie",
  "parinti",
  "coleg",
  "colegi",
  "sef",
  "sefa",
  "casa",
  "restaurant",
  "vin",
  "vinul",
  "vinuri",
  "vinurile",
  "soi",
  "soiul",
  "soiuri",
  "soiurile",
  "crama",
  "cramă",
  "crama",
  "producator",
  "producatorul",
  "domeniu",
  "domeniul",
  "sticla",
  "sticla",
  "butelia",
  "the",
  "wine",
  "a",
  "an",
  "or",
  "and",
  "with",
  "for",
  "under",
  "about",
  "what",
  "which",
  "is",
  "are",
  "i",
  "want",
  "need",
  "looking",
  "something",
  "recommend",
  "recommendation",
  "please",
]);

const COLOR_WORDS = new Set([
  "rosu",
  "rosii",
  "rosie",
  "red",
  "alb",
  "albe",
  "alba",
  "white",
  "rose",
  "roze",
  "roz",
  "spumant",
  "sparkling",
]);

const SWEETNESS_WORDS = new Set([
  "sec",
  "dry",
  "demisec",
  "demidulce",
  "dulce",
  "sweet",
  "medium",
]);

const QUESTION_WORDS = new Set([
  "merge",
  "merg",
  "potriveste",
  "pairing",
  "asociere",
  "asociaza",
  "gust",
  "bun",
  "buna",
  "mai",
  "cel",
  "cea",
  "recomandati",
]);

function isNoiseToken(token: string): boolean {
  if (REFERENCE_STOPWORDS.has(token)) return true;
  if (COLOR_WORDS.has(token)) return true;
  if (SWEETNESS_WORDS.has(token)) return true;
  if (QUESTION_WORDS.has(token)) return true;
  if (/^\d+$/.test(token)) return true;
  if (token.length < 3) return true;
  // Food words are handled by the dish engine, not as product references.
  if (categorizeFoodText(token).length > 0) return true;
  return false;
}

export interface ExtractedReference {
  /** Original phrase, for diagnostics and notes. */
  text: string;
  /** Folded, meaningful tokens used for catalog matching. */
  tokens: string[];
  kind: "comparison" | "lookup";
}

function tokensFromPhrase(phrase: string): string[] {
  const folded = normalizeFoodToken(phrase);
  return folded
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .filter((token) => !isNoiseToken(token));
}

const LOOKUP_CUE =
  /\b(?:aveti|exista|recomanda(?:ti)?|despre|parere|parerea|caut|vreau|as vrea|imi trebuie|ma intereseaza|what about|do you have|looking for)\b/;

const COMPARISON_CUE = /\s(?:sau|ori|vs\.?|versus|or)\s/;

function pushReference(
  list: ExtractedReference[],
  text: string,
  kind: ExtractedReference["kind"],
): void {
  const cleaned = text.replace(/\s+/g, " ").trim().replace(/[.?!,:;]+$/, "");
  if (cleaned.length < 3 || cleaned.length > 80) return;
  const tokens = tokensFromPhrase(cleaned);
  if (tokens.length === 0) return;
  if (tokens.length > 6) tokens.length = 6;
  const key = tokens.join(" ");
  if (list.some((entry) => entry.tokens.join(" ") === key)) return;
  list.push({ text: cleaned, tokens, kind });
}

/**
 * Extract product references the user named.
 *
 * Heuristics are deliberately conservative: a phrase only becomes a reference
 * when it appears in a comparison or after an explicit lookup cue, and it keeps
 * at least one meaningful token after generic wine/food words are removed.
 */
export function extractSpecificReferences(raw: string): ExtractedReference[] {
  const text = normalizeSommelierText(raw);
  if (!text) return [];

  const references: ExtractedReference[] = [];

  for (const quoted of text.matchAll(/"([^"]{3,60})"|„([^”]{3,60})”/g)) {
    pushReference(references, quoted[1] ?? quoted[2] ?? "", "lookup");
  }

  if (COMPARISON_CUE.test(text)) {
    const sides = text.split(COMPARISON_CUE);
    if (sides.length >= 2 && sides.length <= 4) {
      for (const side of sides) {
        // Keep the last few words of the segment, where the named item lives.
        const segment = side.split(/[,.;!?]/)[0] ?? side;
        const words = segment.trim().split(/\s+/).filter(Boolean).slice(-6);
        pushReference(references, words.join(" "), "comparison");
      }
    }
  }

  for (const match of text.matchAll(
    /\b(?:aveti|exista|recomanda(?:ti)?|despre|parere(?:a)?|caut|vreau|as vrea|imi trebuie|what about|do you have)\s+(?:un\s+|o\s+|niste\s+)?([a-z0-9][a-z0-9 -]{2,60})/g,
  )) {
    pushReference(references, match[1] ?? "", "lookup");
  }

  for (const match of text.matchAll(
    /\b(?:vinul|soiul|crama|domeniul)\s+([a-z0-9][a-z0-9 -]{2,50})/g,
  )) {
    pushReference(references, match[1] ?? "", "lookup");
  }

  if (references.length === 0 && LOOKUP_CUE.test(text)) {
    // A short question that only contains a proper-looking name.
    const words = text
      .split(/[^a-z0-9-]+/)
      .filter((word) => word.length >= 4)
      .filter((word) => !isNoiseToken(word));
    if (words.length > 0 && words.length <= 3) {
      pushReference(references, words.join(" "), "lookup");
    }
  }

  return references;
}

/** True when a full catalog lookup is worth the extra query. */
export function looksLikeSpecificReferenceRequest(raw: string): boolean {
  return extractSpecificReferences(raw).length > 0;
}

function catalogTokens(entry: CatalogIdentity): Set<string> {
  const tokens = new Set<string>();
  for (const value of [
    entry.name,
    entry.wineryName ?? "",
    entry.regionName ?? "",
    ...entry.grapes,
  ]) {
    for (const token of normalizeFoodToken(value).split(/[^a-z0-9]+/)) {
      if (token.length >= 2) tokens.add(token);
    }
  }
  for (const token of entry.slug.split("-")) {
    if (token.length >= 2) tokens.add(token);
  }
  return tokens;
}

/**
 * Match one reference against the catalog. Returns entries whose identity
 * vocabulary fully (or mostly) contains the reference.
 */
export function matchReferenceInCatalog(
  reference: ExtractedReference,
  catalog: CatalogIdentity[],
): CatalogIdentity[] {
  const matches: CatalogIdentity[] = [];

  for (const entry of catalog) {
    const tokens = catalogTokens(entry);
    const hits = reference.tokens.filter((token) => tokens.has(token)).length;
    if (hits === 0) continue;

    const full = hits === reference.tokens.length;
    const strongRatio = reference.tokens.length >= 2 && hits / reference.tokens.length >= 0.6;
    const singleLong =
      reference.tokens.length === 1 &&
      reference.tokens[0].length >= 4 &&
      hits === 1;
    if (full || strongRatio || singleLong) matches.push(entry);
  }

  return matches;
}

export type GroundingReason =
  | "ok"
  | "no_candidates"
  | "budget_excludes_all"
  | "constraints_exclude_all"
  | "specific_reference_unavailable"
  | "catalog_unavailable";

export interface GroundingReferenceResult {
  text: string;
  kind: ExtractedReference["kind"];
  matchedSlugs: string[];
}

export interface GroundingDecision {
  allowed: boolean;
  reason: GroundingReason;
  /** When set, only these catalog slugs may be recommended. */
  restrictToSlugs: string[] | null;
  references: GroundingReferenceResult[];
  /** The user asked a question; a recommendation is optional, not mandatory. */
  advisoryOnly: boolean;
  notes: string[];
}

export interface GroundingInput {
  userMessage: string;
  candidates: CatalogIdentity[];
  /** Full identity index, or null when it could not be loaded. */
  catalog: CatalogIdentity[] | null;
  budget: BudgetExtraction;
  color?: ColorPreference;
  sweetness?: SweetnessPreference;
  /** Jev's opinion, used only to raise caution, never to allow a wine. */
  jevSpecificProductRequest?: boolean | null;
  jevUserIntent?: string | null;
}

const ADVISORY_PATTERN =
  /\b(?:ce (?:este|inseamna)|cum se (?:face|bea|serveste)|care (?:e|este) diferenta|diferenta dintre|de ce (?:se|e|este))\b/;

export function isAdvisoryQuestion(raw: string): boolean {
  return ADVISORY_PATTERN.test(normalizeSommelierText(raw));
}

/**
 * Decide if this request may end with wine recommendations.
 *
 * `catalog === null` means the index could not be loaded. In that case an
 * unresolved reference is *not* treated as missing: claiming "we don't have it"
 * without checking would be worse than offering an explanation.
 */
export function evaluateSommelierGrounding(
  input: GroundingInput,
): GroundingDecision {
  const notes: string[] = [];
  const references = extractSpecificReferences(input.userMessage);
  const advisoryOnly =
    isAdvisoryQuestion(input.userMessage) || input.jevUserIntent === "learn";

  if (references.length > 0 && input.catalog == null) {
    notes.push("catalog_index_unavailable");
    if (input.candidates.length === 0) {
      return {
        allowed: false,
        reason: "catalog_unavailable",
        restrictToSlugs: null,
        references: references.map((reference) => ({
          text: reference.text,
          kind: reference.kind,
          matchedSlugs: [],
        })),
        advisoryOnly,
        notes,
      };
    }
    return {
      allowed: true,
      reason: "ok",
      restrictToSlugs: null,
      references: references.map((reference) => ({
        text: reference.text,
        kind: reference.kind,
        matchedSlugs: [],
      })),
      advisoryOnly,
      notes,
    };
  }

  if (references.length > 0 && input.catalog != null) {
    const results: GroundingReferenceResult[] = references.map((reference) => ({
      text: reference.text,
      kind: reference.kind,
      matchedSlugs: matchReferenceInCatalog(reference, input.catalog ?? []).map(
        (entry) => entry.slug,
      ),
    }));
    const resolved = results.filter((result) => result.matchedSlugs.length > 0);

    if (resolved.length === 0) {
      notes.push(
        input.jevSpecificProductRequest === true
          ? "specific_reference_unavailable_confirmed_by_jev"
          : "specific_reference_unavailable",
      );
      return {
        allowed: false,
        reason: "specific_reference_unavailable",
        restrictToSlugs: [],
        references: results,
        advisoryOnly: true,
        notes,
      };
    }

    const restrictToSlugs = [
      ...new Set(resolved.flatMap((result) => result.matchedSlugs)),
    ].slice(0, 6);

    return {
      allowed: true,
      reason: "ok",
      restrictToSlugs,
      references: results,
      advisoryOnly,
      notes,
    };
  }

  if (input.candidates.length === 0) {
    const budgetConstrained =
      input.budget.budgetSpecified && input.budget.budgetConstraint !== "none";
    const preferenceConstrained =
      (input.color != null && input.color !== "any") ||
      (input.sweetness != null && input.sweetness !== "any");
    return {
      allowed: false,
      reason: budgetConstrained
        ? "budget_excludes_all"
        : preferenceConstrained
          ? "constraints_exclude_all"
          : "no_candidates",
      restrictToSlugs: null,
      references: [],
      advisoryOnly,
      notes,
    };
  }

  return {
    allowed: true,
    reason: "ok",
    restrictToSlugs: null,
    references: [],
    advisoryOnly,
    notes,
  };
}

/** Romanian/English instructions injected into the Sommelier system prompt. */
export function describeGroundingForPrompt(
  decision: GroundingDecision,
  locale: AppLocale = "ro",
): string[] {
  const ro = locale !== "en";
  const lines: string[] = [];

  if (!decision.allowed) {
    if (decision.reason === "specific_reference_unavailable") {
      lines.push(
        ro
          ? "- Cererea numeste un vin, soi sau producator care NU exista in catalogul VinIntel de mai jos. Spune onest ca nu il ai in catalog si ca nu poti recomanda un inlocuitor. NU recomanda alt vin in locul lui. NU scrie linia RECOMMENDED_SLUGS."
          : "- The request names a wine, grape or producer that is NOT in the VinIntel catalog below. Say honestly that you do not have it and that you will not substitute another bottle. Do NOT recommend a replacement. Do NOT write the RECOMMENDED_SLUGS line.",
      );
    } else if (decision.reason === "budget_excludes_all") {
      lines.push(
        ro
          ? "- Niciun vin din catalog nu respecta bugetul cerut. NU depasi bugetul si NU propune un vin peste buget. Spune clar ca nu ai o potrivire in bugetul respectiv. NU scrie linia RECOMMENDED_SLUGS."
          : "- No catalog wine fits the stated budget. Do NOT exceed it and do NOT offer an over-budget bottle. Say clearly that nothing fits. Do NOT write the RECOMMENDED_SLUGS line.",
      );
    } else if (decision.reason === "catalog_unavailable") {
      lines.push(
        ro
          ? "- Nu am putut verifica acum catalogul pentru vinul cerut. Nu inventa si nu inlocui cu alt vin; invita userul sa reincerce."
          : "- The catalog could not be checked for the requested wine right now. Do not invent or substitute; ask the user to try again.",
      );
    } else {
      lines.push(
        ro
          ? "- Nu exista nicio potrivire reala in catalog pentru cererea de fata. NU inventa vinuri si NU recomanda ceva aleatoriu. Spune onest ca nu ai o recomandare potrivita si ce ar putea relaxa cererea. NU scrie linia RECOMMENDED_SLUGS."
          : "- Nothing in the catalog matches this request. Do NOT invent wines and do NOT recommend something at random. Say honestly that you have no fitting recommendation and what could be relaxed. Do NOT write the RECOMMENDED_SLUGS line.",
      );
    }
    return lines;
  }

  if (decision.advisoryOnly) {
    lines.push(
      ro
        ? "- Userul cere in primul rand o explicatie, nu o recomandare. Raspunde la intrebare si recomanda un vin doar daca ajuta concret."
        : "- The user primarily wants an explanation, not a recommendation. Answer the question and only recommend if it genuinely helps.",
    );
  }

  if (decision.restrictToSlugs && decision.restrictToSlugs.length > 0) {
    lines.push(
      ro
        ? `- Cererea se refera la vinuri anume. Poti recomanda DOAR slug-urile: ${decision.restrictToSlugs.join(", ")}. Nu adauga alt vin in locul lor.`
        : `- The request is about specific wines. You may only recommend these slugs: ${decision.restrictToSlugs.join(", ")}. Do not add a different wine instead.`,
    );
  }

  return lines;
}
