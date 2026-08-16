import { normalizeEditorialText } from "@/lib/wine-editorial-evidence";
import type { ProducerExtractedFacts } from "@/lib/schema";
import {
  parseAcidityFromText,
  parseAlcoholFromText,
  parseSugarFromText,
} from "@/lib/wine-tech-specs";

/**
 * Extrage DOAR claim-uri explicite din textul sursei.
 * Absenta unui fapt este `unknown`, niciodata `false`.
 */

export type EvidenceFlag = true | "unknown";

export interface ExtractedWineEvidence {
  oakAged: EvidenceFlag;
  oakDurationMonths: number | "unknown";
  tanninMentioned: EvidenceFlag;
  alcohol: number | "unknown";
  acidity: number | "unknown";
  sugar: number | "unknown";
  sweetness: string | "unknown";
  cellarPotentialYears: number | "unknown";
  drinkabilityStart: number | "unknown";
  drinkabilityEnd: number | "unknown";
  descriptors: string[];
  sourcePhrases: string[];
}

const OAK_PHRASES = [
  "barrique",
  "baric",
  "stejar",
  "butoi",
  "invechit in lemn",
  "maturat in lemn",
  "oak",
];

const TANNIN_PHRASES = ["tanin", "taninuri", "tannin", "tannins"];

const DESCRIPTOR_PHRASES = [
  "fructe rosii",
  "fructele rosii",
  "fructe negre",
  "fructele negre",
  "cirese",
  "visine",
  "prune",
  "mure",
  "zmeura",
  "fructe albe",
  "piersici",
  "caise",
  "gutuie",
  "citrice",
  "lamaie",
  "grepfrut",
  "floral",
  "flori de tei",
  "salcam",
  "trandafir",
  "piper negru",
  "vanilie",
  "mineral",
  "afumat",
  "note afumate",
];

function containsPhrase(text: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}

function collectPhrases(text: string, phrases: string[]): string[] {
  return phrases.filter((phrase) => containsPhrase(text, phrase));
}

export function extractEvidenceFromSourceText(
  sourceText: string,
  wineName = "",
): ExtractedWineEvidence {
  const normalized = normalizeEditorialText(sourceText);
  const oakPhrases = collectPhrases(normalized, OAK_PHRASES);
  const tanninPhrases = collectPhrases(normalized, TANNIN_PHRASES);
  const descriptors = collectPhrases(normalized, DESCRIPTOR_PHRASES);

  const durationMatch = normalized.match(
    /(\d{1,2})\s*(?:de\s+)?luni.{0,40}(baric|barrique|stejar|butoi|lemn)/,
  );
  const durationAlt = normalized.match(
    /(baric|barrique|stejar|butoi).{0,40}(\d{1,2})\s*(?:de\s+)?luni/,
  );
  const oakMonthsRaw = durationMatch?.[1] ?? durationAlt?.[2] ?? null;
  const oakDurationMonths =
    oakMonthsRaw != null ? Number.parseInt(oakMonthsRaw, 10) : "unknown";

  const cellarMatch = normalized.match(
    /(?:potential(?:ul)? de (?:invechire|pivnita|pastrare)|se pastreaza|se poate pastra).{0,24}(\d{1,2})\s*(?:de\s+)?ani/,
  );
  const cellarAlt = normalized.match(
    /(\d{1,2})\s*(?:de\s+)?ani.{0,20}(?:invechire|pivnita|pastrare)/,
  );
  const cellarRaw = cellarMatch?.[1] ?? cellarAlt?.[1] ?? null;
  const cellarPotentialYears =
    cellarRaw != null ? Number.parseInt(cellarRaw, 10) : "unknown";

  const windowMatch = normalized.match(
    /(?:consum|beit|baut).{0,20}(?:intre|din)\s*(20\d{2}|\d{4}).{0,12}(20\d{2}|\d{4})/,
  );

  const alcohol = parseAlcoholFromText(sourceText);
  const acidity = parseAcidityFromText(sourceText);
  const sugar = parseSugarFromText(sourceText);
  void wineName;

  const sourcePhrases = [
    ...oakPhrases,
    ...tanninPhrases,
    ...descriptors,
    ...(oakDurationMonths !== "unknown" ? [`${oakDurationMonths} luni`] : []),
  ];

  return {
    oakAged: oakPhrases.length > 0 ? true : "unknown",
    oakDurationMonths:
      oakDurationMonths !== "unknown" && Number.isFinite(oakDurationMonths)
        ? oakDurationMonths
        : "unknown",
    tanninMentioned: tanninPhrases.length > 0 ? true : "unknown",
    alcohol: alcohol ?? "unknown",
    acidity: acidity ?? "unknown",
    sugar: sugar ?? "unknown",
    sweetness: "unknown",
    cellarPotentialYears:
      cellarPotentialYears !== "unknown" && Number.isFinite(cellarPotentialYears)
        ? cellarPotentialYears
        : "unknown",
    drinkabilityStart: windowMatch?.[1]
      ? Number.parseInt(windowMatch[1], 10)
      : "unknown",
    drinkabilityEnd: windowMatch?.[2]
      ? Number.parseInt(windowMatch[2], 10)
      : "unknown",
    descriptors,
    sourcePhrases,
  };
}

export function extractedFactsFromEvidence(
  evidence: ExtractedWineEvidence,
): ProducerExtractedFacts {
  const facts: ProducerExtractedFacts = {};
  if (evidence.oakAged === true) facts.oakAged = true;
  if (evidence.oakDurationMonths !== "unknown") {
    facts.oakDurationMonths = evidence.oakDurationMonths;
  }
  if (evidence.tanninMentioned === true) facts.tanninMentioned = true;
  if (evidence.alcohol !== "unknown") facts.alcohol = evidence.alcohol;
  if (evidence.acidity !== "unknown") facts.acidity = evidence.acidity;
  if (evidence.sugar !== "unknown") facts.sugar = evidence.sugar;
  if (evidence.sweetness !== "unknown") facts.sweetness = evidence.sweetness;
  if (evidence.cellarPotentialYears !== "unknown") {
    facts.cellarPotentialYears = evidence.cellarPotentialYears;
  }
  if (evidence.drinkabilityStart !== "unknown") {
    facts.drinkabilityStart = evidence.drinkabilityStart;
  }
  if (evidence.drinkabilityEnd !== "unknown") {
    facts.drinkabilityEnd = evidence.drinkabilityEnd;
  }
  if (evidence.descriptors.length > 0) facts.descriptors = evidence.descriptors;
  return facts;
}

/**
 * Un claim extras (LLM sau parser) este pastrat doar daca textul lui
 * apare in sursa. Nu semneaza LLM-ul ca sursa.
 */
export function constrainClaimsToSource(
  sourceText: string,
  claims: string[],
): string[] {
  const normalizedSource = normalizeEditorialText(sourceText);
  return claims.filter((claim) => {
    const normalized = normalizeEditorialText(claim).trim();
    if (normalized.length < 4) return false;
    return normalizedSource.includes(normalized);
  });
}
