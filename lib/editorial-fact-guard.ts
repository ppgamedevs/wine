import { db } from "@/lib/db";
import type { WineMedal } from "@/lib/schema";

/**
 * Plasa de siguranta post-LLM pentru continut editorial. Regula de business
 * (non-negociabila): un LLM poate REFORMULA fapte date, dar nu poate
 * INTRODUCE fapte noi (soi, regiune, medalie) care nu exista in datele
 * structurate ale vinului. Verificam textul generat impotriva listelor
 * canonice de soiuri/regiuni din baza de date si impotriva prezentei reale
 * de medalii, si respingem generarea daca gasim mentiuni nesustinute.
 *
 * Aceasta este o plasa de siguranta, nu o garantie perfecta (text liber),
 * dar reduce semnificativ riscul de halucinatie publicata ca fapt verificat.
 */

export interface EditorialFactCheckInput {
  grapeVarieties: string[];
  regionName?: string | null;
  medals?: WineMedal[] | null;
}

export interface EditorialTextFields {
  descriptionEditorial?: string | null;
  valueExplanation?: string | null;
  tasteProfile?: string | null;
  thingsYouShouldKnow?: string[] | null;
  foodPairingNotes?: { dish: string; note: string }[] | null;
  dessertPairings?: { dish: string; note: string }[] | null;
  recommendedOccasions?: string[] | null;
}

export interface EditorialFactCheckResult {
  ok: boolean;
  violations: string[];
}

/** Distinct error type so callers can catch fact-guard rejections specifically
 * (vs. other generation failures) and decide on a safe fallback. */
export class EditorialFactCheckError extends Error {
  readonly violations: string[];

  constructor(violations: string[]) {
    super(`Continut editorial respins (fapte nesustinute): ${violations.join(" ")}`);
    this.name = "EditorialFactCheckError";
    this.violations = violations;
  }
}

/** Fraze care indica in mod fiabil o mentiune de premiu/medalie (evitam cuvinte ambigue precum "aur" izolat, care apare si in descrieri de culoare). */
const AWARD_PHRASES = [
  "medalie de aur",
  "medalie de argint",
  "medalie de bronz",
  "medalia de aur",
  "medalia de argint",
  "medalia de bronz",
  "dublu aur",
  "castigator al",
  "castigatoare a",
  "premiul intai",
  "premiul I",
  "trofeul",
  "gold medal",
  "silver medal",
  "bronze medal",
  "double gold",
  "best in class",
  "decanter world wine",
  "concurs international de vinuri",
];

/** Soiuri/termeni prea generici pentru a fi verificati fiabil ca mentiuni specifice. */
const GRAPE_NAME_MIN_LENGTH = 5;
const GENERIC_GRAPE_TOKENS = new Set(["alb", "rosu", "roze", "rose"]);

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function collectEditorialText(editorial: EditorialTextFields): string {
  const parts: string[] = [
    editorial.descriptionEditorial ?? "",
    editorial.valueExplanation ?? "",
    editorial.tasteProfile ?? "",
    ...(editorial.thingsYouShouldKnow ?? []),
    ...(editorial.foodPairingNotes ?? []).flatMap((p) => [p.dish, p.note]),
    ...(editorial.dessertPairings ?? []).flatMap((p) => [p.dish, p.note]),
    ...(editorial.recommendedOccasions ?? []),
  ];
  return parts.join(" \n ");
}

let cachedGrapeNames: string[] | null = null;
let cachedRegionNames: string[] | null = null;

async function getCanonicalGrapeNames(): Promise<string[]> {
  if (cachedGrapeNames) return cachedGrapeNames;
  const rows = await db.query.grapeVarieties.findMany({
    columns: { name: true },
  });
  cachedGrapeNames = rows.map((row) => row.name);
  return cachedGrapeNames;
}

async function getCanonicalRegionNames(): Promise<string[]> {
  if (cachedRegionNames) return cachedRegionNames;
  const rows = await db.query.regions.findMany({ columns: { name: true } });
  cachedRegionNames = rows.map((row) => row.name);
  return cachedRegionNames;
}

/**
 * Verifica textul editorial generat impotriva faptelor structurate ale
 * vinului. Returneaza `ok: false` cu motive explicite daca textul introduce
 * soiuri, regiuni sau medalii care nu exista in date.
 */
export async function validateEditorialAgainstFacts(
  editorial: EditorialTextFields,
  facts: EditorialFactCheckInput,
): Promise<EditorialFactCheckResult> {
  const violations: string[] = [];
  const normalizedText = normalize(collectEditorialText(editorial));

  const knownGrapes = new Set(
    facts.grapeVarieties.map((grape) => normalize(grape)),
  );

  const allGrapes = await getCanonicalGrapeNames();
  for (const grape of allGrapes) {
    const normalizedGrape = normalize(grape);
    if (normalizedGrape.length < GRAPE_NAME_MIN_LENGTH) continue;
    if (GENERIC_GRAPE_TOKENS.has(normalizedGrape)) continue;
    if (knownGrapes.has(normalizedGrape)) continue;
    if (
      [...knownGrapes].some(
        (known) => known.includes(normalizedGrape) || normalizedGrape.includes(known),
      )
    ) {
      continue;
    }
    if (normalizedText.includes(normalizedGrape)) {
      violations.push(
        `Mentioneaza soiul "${grape}", care nu apare in soiurile declarate ale vinului.`,
      );
    }
  }

  const normalizedRegion = facts.regionName ? normalize(facts.regionName) : null;
  const allRegions = await getCanonicalRegionNames();
  for (const region of allRegions) {
    const normalizedCandidate = normalize(region);
    if (
      normalizedRegion &&
      (normalizedRegion === normalizedCandidate ||
        normalizedRegion.includes(normalizedCandidate) ||
        normalizedCandidate.includes(normalizedRegion))
    ) {
      continue;
    }
    if (normalizedText.includes(normalizedCandidate)) {
      violations.push(
        `Mentioneaza regiunea "${region}", diferita de regiunea vinului (${facts.regionName ?? "necunoscuta"}).`,
      );
    }
  }

  const hasMedals = (facts.medals?.length ?? 0) > 0;
  if (!hasMedals) {
    const mentionedAward = AWARD_PHRASES.find((phrase) =>
      normalizedText.includes(normalize(phrase)),
    );
    if (mentionedAward) {
      violations.push(
        `Mentioneaza un premiu/medalie ("${mentionedAward}") desi vinul nu are medalii inregistrate.`,
      );
    }
  }

  return { ok: violations.length === 0, violations };
}
