import type {
  ExpertNotes,
  FoodPairing,
  ProducerPageContent,
  WineMedal,
} from "@/lib/schema";

/**
 * Evidence object consumed by the editorial claim validator.
 * Generated prose may use only facts present here. General wine knowledge
 * is allowed only when explicitly labelled as general, never as an observed
 * property of this bottle.
 */

export type WineTypeKey =
  | "red"
  | "white"
  | "rose"
  | "sparkling"
  | "dessert"
  | "orange"
  | "unknown";

export interface EvidenceValue<T> {
  value: T | null;
  present: boolean;
}

export interface WineEditorialEvidence {
  type: WineTypeKey;
  sweetness: string | null;
  grapes: string[];
  region: string | null;
  wineryName: string | null;
  vintage: number | null;

  alcohol: EvidenceValue<number>;
  acidity: EvidenceValue<number>;
  sugar: EvidenceValue<number>;

  tastingDescriptors: Set<string>;
  productionMethods: Set<string>;
  ageingClaims: Set<string>;

  producerTextAvailable: boolean;
  tastingSheetAvailable: boolean;
  tastingNotesAvailable: boolean;
  hasTastingEvidence: boolean;
  hasEvaluatedPairings: boolean;

  medals: WineMedal[];
  sourceText: string;
}

export interface WineEvidenceInput {
  type?: string | null;
  sweetness?: string | null;
  grapeVarieties?: Array<string | { name: string }>;
  regionName?: string | null;
  wineryName?: string | null;
  vintage?: number | null;
  alcohol?: number | null;
  acidity?: number | null;
  sugar?: number | null;
  tastingNotes?: string | null;
  producerContent?: ProducerPageContent | null;
  producerPageUrl?: string | null;
  tastingSheetUrl?: string | null;
  foodPairings?: FoodPairing[] | null;
  medals?: WineMedal[] | null;
  cellarPotential?: number | null;
  drinkabilityStart?: number | null;
  drinkabilityEnd?: number | null;
  expertNotes?: ExpertNotes | null;
}

export function normalizeEditorialText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function normalizeWineTypeKey(
  type: string | null | undefined,
): WineTypeKey {
  const normalized = normalizeEditorialText(type ?? "").trim();
  if (normalized === "red" || normalized === "rosu") return "red";
  if (normalized === "white" || normalized === "alb") return "white";
  if (normalized === "rose" || normalized === "roze") return "rose";
  if (normalized === "sparkling" || normalized === "spumant") return "sparkling";
  if (normalized === "dessert" || normalized === "desert") return "dessert";
  if (normalized === "orange") return "orange";
  return "unknown";
}

const DESCRIPTOR_ALIASES: Record<string, string[]> = {
  tannin: ["tanin", "tannin"],
  oak: ["stejar", "barrique", "baric", "butoi", "oak", "lemn"],
  acidity: ["aciditate", "acid"],
  mineral: ["mineral"],
  red_fruit: [
    "fructe rosii",
    "fructele rosii",
    "fructe negre",
    "fructele negre",
    "cirese",
    "visine",
    "prune",
    "mure",
    "zmeura",
    "capsuni",
  ],
  white_fruit: ["fructe albe", "piersic", "caise", "gutuie"],
  citrus: ["citrice", "lamaie", "grepfrut", "lime"],
  floral: ["floral", "flori de", "flori de tei", "salcam", "trandafir"],
  spice: ["piper negru", "condiment", "spices"],
  vanilla: ["vanilie", "vanilla"],
  smoke: ["afumat", "note afumate", "smoke"],
  oxidative: ["oxidativ"],
  body: ["corpolent", "corp plin", "medium body", "light body"],
  carbonation: ["perlage", "bule", "efervescent", "spumant"],
};

const PRODUCTION_ALIASES: Record<string, string[]> = {
  oak_ageing: ["barrique", "baric", "stejar", "butoi", "invechit in lemn", "maturat in lemn"],
  lees: ["drojdie", "lies", "batonnage"],
  skin_contact: ["maceratie", "pielite", "skin contact"],
  fermentation: ["fermentatie", "fermented"],
  harvest: ["recoltat", "culegere", "harvest"],
  vineyard_age: ["varsta vitei", "old vine", "vie veche"],
  quantity: ["sticle produse", "productie limitata", "hectare"],
};

const AGEING_ALIASES: Record<string, string[]> = {
  drink_young: ["consumat tanar", "beat tanar", "de baut tanar", "bea tanar"],
  long_ageing: [
    "invechire lunga",
    "evolutie lunga",
    "potential de pivnita",
    "potential de invechire",
    "long cellar",
  ],
  decant: ["decant"],
};

function phraseInSource(source: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`).test(source);
}

function collectSourceText(input: WineEvidenceInput): string {
  const producer = input.producerContent;
  const facts = producer?.facts;
  return [
    input.tastingNotes ?? "",
    producer?.tastingNotes ?? "",
    producer?.viticulture ?? "",
    producer?.culinaryPairings ?? "",
    facts?.oakAged ? "stejar barrique baric" : "",
    facts?.tanninMentioned ? "tanin taninuri" : "",
    facts?.oakDurationMonths != null
      ? `${facts.oakDurationMonths} luni baric stejar`
      : "",
    ...(facts?.descriptors ?? []),
  ]
    .map((part) => normalizeEditorialText(part))
    .join(" \n ");
}

function extractKeys(
  source: string,
  aliases: Record<string, string[]>,
): Set<string> {
  const found = new Set<string>();
  for (const [key, phrases] of Object.entries(aliases)) {
    if (phrases.some((phrase) => phraseInSource(source, phrase))) {
      found.add(key);
    }
  }
  return found;
}

function evidenceNumber(value: number | null | undefined): EvidenceValue<number> {
  const present = value != null && Number.isFinite(value);
  return { value: present ? value : null, present };
}

export function buildWineEditorialEvidence(
  input: WineEvidenceInput,
): WineEditorialEvidence {
  const sourceText = collectSourceText(input);
  const tastingNotesAvailable = Boolean(input.tastingNotes?.trim());
  const producerTextAvailable = Boolean(
    input.producerContent?.tastingNotes?.trim() ||
      input.producerContent?.viticulture?.trim() ||
      input.producerContent?.culinaryPairings?.trim(),
  );
  const tastingSheetAvailable = Boolean(input.tastingSheetUrl?.trim());
  const hasTastingEvidence =
    tastingNotesAvailable || producerTextAvailable || tastingSheetAvailable;

  const grapes = (input.grapeVarieties ?? []).map((entry) =>
    typeof entry === "string" ? entry : entry.name,
  );

  return {
    type: normalizeWineTypeKey(input.type),
    sweetness: input.sweetness ?? null,
    grapes,
    region: input.regionName ?? null,
    wineryName: input.wineryName ?? null,
    vintage: input.vintage ?? null,
    alcohol: evidenceNumber(input.alcohol),
    acidity: evidenceNumber(input.acidity),
    sugar: evidenceNumber(input.sugar),
    tastingDescriptors: extractKeys(sourceText, DESCRIPTOR_ALIASES),
    productionMethods: extractKeys(sourceText, PRODUCTION_ALIASES),
    ageingClaims: extractKeys(sourceText, AGEING_ALIASES),
    producerTextAvailable,
    tastingSheetAvailable,
    tastingNotesAvailable,
    hasTastingEvidence,
    hasEvaluatedPairings: (input.foodPairings?.length ?? 0) > 0,
    medals: input.medals ?? [],
    sourceText,
  };
}

export function evidenceHasDescriptor(
  evidence: WineEditorialEvidence,
  key: string,
): boolean {
  return evidence.tastingDescriptors.has(key) || evidence.productionMethods.has(key);
}
