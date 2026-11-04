import { getGrapeGuide } from "@/lib/oenology";
import type { VintageSignal } from "@/lib/sommelier-vintage-evidence";
import type { WineWithRelations } from "@/types";

export type ComparisonColor =
  | "red"
  | "white"
  | "rose"
  | "sparkling"
  | "orange"
  | "any";

export type ComparisonDimension =
  | "color"
  | "body"
  | "acidity"
  | "tannin"
  | "alcohol"
  | "sweetness"
  | "aromatic"
  | "oak"
  | "freshness"
  | "ageability"
  | "food"
  | "climate";

export interface StyleVector {
  color: ComparisonColor;
  body: number;
  acidity: number;
  tannin: number;
  alcohol: number;
  sweetness: number;
  aromatic: string[];
  oak: number;
  freshness: number;
  ageability: number;
  food: string[];
  climate: string[];
}

export interface ReferenceStyle extends StyleVector {
  id: string;
  name: string;
  aliases: string[];
  grape?: string;
  origin: { region: string; country: string };
  /** Optional canonical cluster parent for closely related references. */
  clusterId?: string;
}

export interface ComparisonIntent {
  raw: string;
  reference: ReferenceStyle | null;
  referenceName: string;
  claimedOrigin: string | null;
  claimedVintage: number | null;
  premiseIssues: string[];
  dryHint: boolean;
}

export interface ComparisonClaim {
  wineId: number;
  field: string;
  value: unknown;
  sourceUrl: string;
  sourceTitle: string | null;
  confidence: number;
}

interface WineEvidence {
  confirmed: string[];
  interpreted: string[];
  missing: string[];
  references: string[];
}

interface WineStyleProfile {
  wine: WineWithRelations;
  vector: StyleVector;
  evidence: WineEvidence;
  familyKey: string;
}

interface DimensionScore {
  dimension: ComparisonDimension;
  weight: number;
  similarity: number;
  evidence: "confirmed" | "interpreted" | "missing";
}

export interface ComparisonMatch {
  wine: WineWithRelations;
  score: number;
  confidence: number;
  dimensions: DimensionScore[];
  reasons: string[];
  differences: string[];
  evidence: WineEvidence;
  familyLinks: string[];
}

export interface RomanianComparisonResult {
  intent: ComparisonIntent;
  best: ComparisonMatch;
  alternatives: ComparisonMatch[];
  considered: number;
  missingData: string[];
}

const WEIGHTS: Record<ComparisonDimension, number> = {
  color: 16,
  body: 11,
  acidity: 12,
  tannin: 9,
  alcohol: 6,
  sweetness: 6,
  aromatic: 12,
  oak: 6,
  freshness: 8,
  ageability: 5,
  food: 6,
  climate: 3,
};

const DIMENSION_LABELS: Record<ComparisonDimension, { ro: string; en: string }> = {
  color: { ro: "culoare", en: "colour" },
  body: { ro: "corp", en: "body" },
  acidity: { ro: "aciditate", en: "acidity" },
  tannin: { ro: "tanin", en: "tannin" },
  alcohol: { ro: "alcool", en: "alcohol" },
  sweetness: { ro: "dulceață", en: "sweetness" },
  aromatic: { ro: "profil aromatic", en: "aromatic profile" },
  oak: { ro: "lemn", en: "oak" },
  freshness: { ro: "prospețime", en: "freshness" },
  ageability: { ro: "potențial de evoluție", en: "ageability" },
  food: { ro: "afinitate culinară", en: "food affinity" },
  climate: { ro: "indiciu de climat", en: "climate cue" },
};

const TYPICAL_DRY = 0;

export const STYLE_REFERENCES: ReferenceStyle[] = [
  {
    id: "chianti",
    name: "Chianti",
    aliases: ["chianti classico", "chianti"],
    clusterId: "chianti",
    grape: "Sangiovese",
    origin: { region: "Tuscany", country: "Italy" },
    color: "red",
    body: 2.2,
    acidity: 4,
    tannin: 3.2,
    alcohol: 2.5,
    sweetness: TYPICAL_DRY,
    aromatic: ["sour cherry", "plum", "tomato leaf", "herbs", "earth"],
    oak: 1.4,
    freshness: 4,
    ageability: 3.2,
    food: ["tomato pasta", "grilled meat", "hard cheese", "roast pork"],
    climate: ["mediterranean", "continental"],
  },
  {
    id: "sangiovese",
    name: "Sangiovese",
    aliases: ["sangiovese"],
    clusterId: "chianti",
    grape: "Sangiovese",
    origin: { region: "Tuscany", country: "Italy" },
    color: "red",
    body: 2.2,
    acidity: 4,
    tannin: 3.2,
    alcohol: 2.4,
    sweetness: TYPICAL_DRY,
    aromatic: ["sour cherry", "plum", "tomato leaf", "herbs", "earth"],
    oak: 1.4,
    freshness: 4,
    ageability: 3,
    food: ["tomato pasta", "grilled meat", "hard cheese"],
    climate: ["mediterranean", "continental"],
  },
  {
    id: "riesling",
    name: "Riesling",
    aliases: ["dry riesling", "riesling"],
    grape: "Riesling",
    origin: { region: "Mosel", country: "Germany" },
    color: "white",
    body: 1.5,
    acidity: 4.5,
    tannin: 0,
    alcohol: 1.5,
    sweetness: TYPICAL_DRY,
    aromatic: ["lemon", "lime", "green apple", "stone fruit", "petrol", "jasmine"],
    oak: 0,
    freshness: 4.5,
    ageability: 4,
    food: ["pork", "spicy food", "fish", "cheese", "asian food"],
    climate: ["cool", "continental"],
  },
  {
    id: "sauvignon-blanc",
    name: "Sauvignon Blanc",
    aliases: ["sauvignon blanc", "sauvignon"],
    grape: "Sauvignon Blanc",
    origin: { region: "Loire", country: "France" },
    color: "white",
    body: 1.7,
    acidity: 4.1,
    tannin: 0,
    alcohol: 1.8,
    sweetness: TYPICAL_DRY,
    aromatic: ["gooseberry", "grapefruit", "green herbs", "passion fruit", "flint"],
    oak: 0.2,
    freshness: 4.2,
    ageability: 2.2,
    food: ["goat cheese", "fish", "green salad", "asparagus"],
    climate: ["cool", "maritime"],
  },
  {
    id: "pinot-noir",
    name: "Pinot Noir",
    aliases: ["pinot noir", "pinot negru"],
    grape: "Pinot Noir",
    origin: { region: "Burgundy", country: "France" },
    color: "red",
    body: 1.5,
    acidity: 3.8,
    tannin: 1.6,
    alcohol: 1.8,
    sweetness: TYPICAL_DRY,
    aromatic: ["red cherry", "raspberry", "rose", "forest floor", "mushroom"],
    oak: 1,
    freshness: 3.8,
    ageability: 3,
    food: ["duck", "mushroom", "salmon", "chicken"],
    climate: ["cool", "continental"],
  },
  {
    id: "cabernet-sauvignon",
    name: "Cabernet Sauvignon",
    aliases: ["cabernet sauvignon", "cabernet"],
    grape: "Cabernet Sauvignon",
    origin: { region: "Bordeaux", country: "France" },
    color: "red",
    body: 3.3,
    acidity: 3,
    tannin: 3.6,
    alcohol: 2.8,
    sweetness: TYPICAL_DRY,
    aromatic: ["blackcurrant", "cedar", "blackberry", "bell pepper", "tobacco"],
    oak: 2.5,
    freshness: 2.8,
    ageability: 4,
    food: ["beef", "lamb", "hard cheese", "grilled meat"],
    climate: ["maritime", "continental"],
  },
  {
    id: "merlot",
    name: "Merlot",
    aliases: ["merlot"],
    grape: "Merlot",
    origin: { region: "Bordeaux", country: "France" },
    color: "red",
    body: 2.8,
    acidity: 2.7,
    tannin: 2.6,
    alcohol: 2.8,
    sweetness: TYPICAL_DRY,
    aromatic: ["plum", "black cherry", "chocolate", "cedar"],
    oak: 2,
    freshness: 2.6,
    ageability: 3,
    food: ["beef", "lamb", "mushroom", "cheese"],
    climate: ["maritime", "continental"],
  },
  {
    id: "syrah",
    name: "Syrah",
    aliases: ["syrah", "shiraz"],
    grape: "Syrah",
    origin: { region: "Rhone", country: "France" },
    color: "red",
    body: 3,
    acidity: 2.8,
    tannin: 3.1,
    alcohol: 3,
    sweetness: TYPICAL_DRY,
    aromatic: ["blackberry", "black pepper", "smoke", "violet", "olive"],
    oak: 1.8,
    freshness: 2.8,
    ageability: 3.5,
    food: ["grilled meat", "lamb", "barbecue", "hard cheese"],
    climate: ["mediterranean", "continental"],
  },
  {
    id: "tempranillo",
    name: "Tempranillo",
    aliases: ["tempranillo", "tinta del pais"],
    grape: "Tempranillo",
    origin: { region: "Rioja", country: "Spain" },
    color: "red",
    body: 2.6,
    acidity: 3.1,
    tannin: 2.8,
    alcohol: 2.8,
    sweetness: TYPICAL_DRY,
    aromatic: ["red cherry", "plum", "leather", "tobacco", "vanilla"],
    oak: 2.2,
    freshness: 3,
    ageability: 3.8,
    food: ["lamb", "grilled meat", "chorizo", "cheese"],
    climate: ["mediterranean", "continental"],
  },
  {
    id: "nebbiolo",
    name: "Nebbiolo",
    aliases: ["nebbiolo", "barolo", "barbaresco"],
    grape: "Nebbiolo",
    origin: { region: "Piedmont", country: "Italy" },
    color: "red",
    body: 2.8,
    acidity: 4.2,
    tannin: 4,
    alcohol: 2.8,
    sweetness: TYPICAL_DRY,
    aromatic: ["rose", "tar", "red cherry", "leather", "truffle"],
    oak: 1.5,
    freshness: 4,
    ageability: 4.4,
    food: ["braised beef", "truffle", "hard cheese", "game"],
    climate: ["continental", "alpine"],
  },
  {
    id: "chardonnay",
    name: "Chardonnay",
    aliases: ["chardonnay", "white burgundy"],
    grape: "Chardonnay",
    origin: { region: "Burgundy", country: "France" },
    color: "white",
    body: 2.5,
    acidity: 3.2,
    tannin: 0,
    alcohol: 2.5,
    sweetness: TYPICAL_DRY,
    aromatic: ["apple", "lemon", "hazelnut", "butter", "vanilla"],
    oak: 2.2,
    freshness: 3,
    ageability: 3.2,
    food: ["roast chicken", "fish", "cream sauce", "cheese"],
    climate: ["cool", "continental"],
  },
  {
    id: "albarino",
    name: "Albarino",
    aliases: ["albarino", "albariño"],
    grape: "Albarino",
    origin: { region: "Rias Baixas", country: "Spain" },
    color: "white",
    body: 1.8,
    acidity: 4,
    tannin: 0,
    alcohol: 2,
    sweetness: TYPICAL_DRY,
    aromatic: ["lemon", "lime", "white peach", "salinity", "jasmine"],
    oak: 0.2,
    freshness: 4.2,
    ageability: 2.2,
    food: ["seafood", "fish", "shellfish", "fresh cheese"],
    climate: ["maritime", "cool"],
  },
  {
    id: "gruner-veltliner",
    name: "Gruner Veltliner",
    aliases: ["gruner veltliner", "grüner veltliner"],
    grape: "Gruner Veltliner",
    origin: { region: "Wachau", country: "Austria" },
    color: "white",
    body: 2,
    acidity: 4,
    tannin: 0,
    alcohol: 2,
    sweetness: TYPICAL_DRY,
    aromatic: ["green apple", "white pepper", "citrus", "herbs", "mineral"],
    oak: 0.3,
    freshness: 4.2,
    ageability: 3,
    food: ["vegetables", "fish", "pork", "asian food"],
    climate: ["cool", "continental"],
  },
  {
    id: "prosecco",
    name: "Prosecco",
    aliases: ["prosecco"],
    grape: "Glera",
    origin: { region: "Veneto", country: "Italy" },
    color: "sparkling",
    body: 1.4,
    acidity: 4,
    tannin: 0,
    alcohol: 1.5,
    sweetness: 0.5,
    aromatic: ["green apple", "pear", "white flowers", "lemon"],
    oak: 0,
    freshness: 4.3,
    ageability: 1.8,
    food: ["salty starters", "fried food", "seafood", "brunch"],
    climate: ["cool", "continental"],
  },
  {
    id: "champagne",
    name: "Champagne",
    aliases: ["champagne", "spumant"],
    grape: "Chardonnay, Pinot Noir, Meunier",
    origin: { region: "Champagne", country: "France" },
    color: "sparkling",
    body: 1.8,
    acidity: 4.2,
    tannin: 0,
    alcohol: 1.8,
    sweetness: 0.5,
    aromatic: ["lemon", "brioche", "apple", "hazelnut", "chalk"],
    oak: 0.5,
    freshness: 4.4,
    ageability: 3.8,
    food: ["oysters", "fried food", "salty starters", "cheese"],
    climate: ["cool", "continental"],
  },
];

interface GrapeStyleTemplate {
  slug: string;
  names: string[];
  vector: StyleVector;
}

export const ROMANIAN_GRAPE_STYLES: GrapeStyleTemplate[] = [
  grapeStyle("feteasca-neagra", ["Feteasca Neagra", "Feteasca Neagra"], {
    color: "red",
    body: 2.5,
    acidity: 3.5,
    tannin: 3,
    alcohol: 2.6,
    sweetness: TYPICAL_DRY,
    aromatic: ["sour cherry", "blackberry", "plum", "pepper", "herbs"],
    oak: 1.2,
    freshness: 3.5,
    ageability: 3,
    food: ["sarmale", "grilled meat", "roast pork", "hard cheese"],
    climate: ["continental"],
  }),
  grapeStyle("cadarca", ["Cadarca", "Kadarka"], {
    color: "red",
    body: 2.2,
    acidity: 3.6,
    tannin: 2.9,
    alcohol: 2.5,
    sweetness: TYPICAL_DRY,
    aromatic: ["sour cherry", "plum", "black pepper", "spice", "herbs"],
    oak: 1,
    freshness: 3.5,
    ageability: 2.8,
    food: ["grilled meat", "paprikash", "sausage", "cheese"],
    climate: ["continental"],
  }),
  grapeStyle("negru-de-dragasani", ["Negru de Dragasani"], {
    color: "red",
    body: 2.5,
    acidity: 3.2,
    tannin: 2.8,
    alcohol: 2.7,
    sweetness: TYPICAL_DRY,
    aromatic: ["black cherry", "blackberry", "pepper", "violet"],
    oak: 1.4,
    freshness: 3.1,
    ageability: 3,
    food: ["grilled meat", "game", "hard cheese"],
    climate: ["continental"],
  }),
  grapeStyle("novac", ["Novac"], {
    color: "red",
    body: 2.3,
    acidity: 3.1,
    tannin: 2.5,
    alcohol: 2.7,
    sweetness: TYPICAL_DRY,
    aromatic: ["black cherry", "plum", "spice", "earth"],
    oak: 1.3,
    freshness: 3,
    ageability: 3.2,
    food: ["grilled meat", "stew", "cheese"],
    climate: ["continental"],
  }),
  grapeStyle("babeasca-neagra", ["Babeasca Neagra", "Rara Neagra"], {
    color: "red",
    body: 1.8,
    acidity: 3.8,
    tannin: 2,
    alcohol: 2.2,
    sweetness: TYPICAL_DRY,
    aromatic: ["red cherry", "raspberry", "herbs", "pepper"],
    oak: 0.7,
    freshness: 3.8,
    ageability: 2.2,
    food: ["cabbage", "grilled meat", "cheese"],
    climate: ["continental"],
  }),
  grapeStyle("feteasca-alba", ["Feteasca Alba"], {
    color: "white",
    body: 2,
    acidity: 3.2,
    tannin: 0,
    alcohol: 2.3,
    sweetness: TYPICAL_DRY,
    aromatic: ["green apple", "pear", "white flowers", "lemon"],
    oak: 0.4,
    freshness: 3.2,
    ageability: 2.2,
    food: ["fish", "poultry", "fresh cheese", "vegetables"],
    climate: ["continental"],
  }),
  grapeStyle("feteasca-regala", ["Feteasca Regala"], {
    color: "white",
    body: 1.9,
    acidity: 3.5,
    tannin: 0,
    alcohol: 2.2,
    sweetness: TYPICAL_DRY,
    aromatic: ["green apple", "lime", "white flowers", "grapefruit"],
    oak: 0.4,
    freshness: 3.6,
    ageability: 2.4,
    food: ["fish", "vegetables", "fresh cheese", "poultry"],
    climate: ["continental"],
  }),
  grapeStyle("cramposie-selectionata", ["Cramposie Selectionata", "Cramposie"], {
    color: "white",
    body: 2,
    acidity: 4,
    tannin: 0,
    alcohol: 2.2,
    sweetness: TYPICAL_DRY,
    aromatic: ["lemon", "green apple", "white flowers", "mineral"],
    oak: 0.3,
    freshness: 4.1,
    ageability: 2.8,
    food: ["fish", "seafood", "fresh cheese", "vegetables"],
    climate: ["continental"],
  }),
  grapeStyle("mustoasa-de-maderat", ["Mustoasa de Maderat", "Mustoasa"], {
    color: "white",
    body: 1.5,
    acidity: 4.4,
    tannin: 0,
    alcohol: 1.9,
    sweetness: TYPICAL_DRY,
    aromatic: ["lemon", "green apple", "white peach", "herbs", "salinity"],
    oak: 0.2,
    freshness: 4.4,
    ageability: 2,
    food: ["fish", "roe", "fresh cheese", "salty starters"],
    climate: ["continental"],
  }),
  grapeStyle("grasa-de-cotnari", ["Grasa de Cotnari"], {
    color: "white",
    body: 2.3,
    acidity: 2.9,
    tannin: 0,
    alcohol: 2.6,
    sweetness: 1,
    aromatic: ["apricot", "honey", "quince", "white flowers"],
    oak: 0.8,
    freshness: 2.7,
    ageability: 4,
    food: ["dessert", "blue cheese", "foie gras", "fruit tart"],
    climate: ["continental"],
  }),
  grapeStyle("tamaioasa-romaneasca", ["Tamaioasa Romaneasca", "Tamaioasa"], {
    color: "white",
    body: 2.1,
    acidity: 3,
    tannin: 0,
    alcohol: 2.3,
    sweetness: 1,
    aromatic: ["rose", "honey", "grape", "apricot"],
    oak: 0.4,
    freshness: 3,
    ageability: 3,
    food: ["dessert", "blue cheese", "fruit", "spicy food"],
    climate: ["continental"],
  }),
  grapeStyle("busuioaca-de-bohotin", ["Busuioaca de Bohotin", "Busuioaca"], {
    color: "rose",
    body: 2,
    acidity: 3.2,
    tannin: 0.8,
    alcohol: 2.3,
    sweetness: 0.8,
    aromatic: ["rose", "strawberry", "raspberry", "basil"],
    oak: 0.2,
    freshness: 3.3,
    ageability: 2,
    food: ["salads", "spicy food", "fruit", "cheese"],
    climate: ["continental"],
  }),
];

function grapeStyle(
  slug: string,
  names: string[],
  vector: StyleVector,
): GrapeStyleTemplate {
  return { slug, names, vector };
}

const GRAPE_BY_NAME = new Map<string, GrapeStyleTemplate>();
for (const style of ROMANIAN_GRAPE_STYLES) {
  for (const name of style.names) {
    GRAPE_BY_NAME.set(normalize(name), style);
  }
  const guide = getGrapeGuide(style.slug);
  if (guide) {
    for (const alias of [
      guide.copy.ro.name,
      guide.copy.en.name,
      ...guide.aliases,
      ...guide.copy.ro.alsoKnownAs,
      ...guide.copy.en.alsoKnownAs,
    ]) {
      GRAPE_BY_NAME.set(normalize(alias), style);
    }
  }
}

const REFERENCE_BY_ALIAS = new Map<string, ReferenceStyle>();
for (const reference of STYLE_REFERENCES) {
  for (const alias of reference.aliases) {
    REFERENCE_BY_ALIAS.set(normalize(alias), reference);
  }
}

const KNOWN_ORIGINS = [
  "sicily",
  "sicilia",
  "tuscany",
  "toscana",
  "piedmont",
  "piemonte",
  "burgundy",
  "bordeaux",
  "rhone",
  "rioja",
  "mosel",
  "champagne",
  "loire",
  "wachau",
  "rias baixas",
  "romania",
];

const COMPARISON_CUES =
  /\b(?:closest|nearest|similar|equivalent|equivalents|like|enjoy|alternatives?|instead of|compare|comparison|versus|vs|what romanian|which romanian|should i try|should i drink|lovers|for .* lovers|asemanator|apropiat|alternativa|comparatie|iubitor|ce vin romanesc|care vin romanesc|cu ce se compara|ce sa incerc)\b/;

const ORIGIN_PATTERN =
  /\b(?:from|din)\s+([a-z][a-z\s-]{2,30}?)(?=\s+(?:in|din|from|19|20|\d{4})|\s*[,.;]|$)/;

const VINTAGE_PATTERN = /\b(19\d{2}|20\d{2})\b/;

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalOrigin(value: string): string | null {
  const normalized = normalize(value);
  const found = KNOWN_ORIGINS.find(
    (origin) => normalized === origin || normalized.includes(origin),
  );
  if (!found) return null;
  return found
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function findReference(text: string): ReferenceStyle | null {
  const normalized = normalize(text);
  let best: ReferenceStyle | null = null;
  let bestLength = 0;
  for (const reference of STYLE_REFERENCES) {
    for (const alias of reference.aliases) {
      const normalizedAlias = normalize(alias);
      if (
        normalized.includes(normalizedAlias) &&
        normalizedAlias.length > bestLength
      ) {
        best = reference;
        bestLength = normalizedAlias.length;
      }
    }
  }
  return best;
}

function findRomanianGrapeReference(text: string): ReferenceStyle | null {
  const normalized = normalize(text);
  let best: GrapeStyleTemplate | null = null;
  let bestLength = 0;
  for (const [name, style] of GRAPE_BY_NAME) {
    if (normalized.includes(name) && name.length > bestLength) {
      best = style;
      bestLength = name.length;
    }
  }
  if (!best) return null;
  return {
    id: best.slug,
    name: best.names[0],
    aliases: best.names,
    grape: best.names[0],
    origin: { region: "Romania", country: "Romania" },
    ...best.vector,
  };
}

export function parseComparisonIntent(raw: string): ComparisonIntent | null {
  const normalized = normalize(raw);
  const reference = findReference(raw) ?? findRomanianGrapeReference(raw);
  if (!reference || !COMPARISON_CUES.test(normalized)) return null;

  const originMatch = normalized.match(ORIGIN_PATTERN);
  const claimedOrigin = originMatch ? canonicalOrigin(originMatch[1]) : null;
  const vintageMatch = normalized.match(VINTAGE_PATTERN);
  const claimedVintage = vintageMatch ? Number(vintageMatch[1]) : null;
  const premiseIssues: string[] = [];

  if (
    claimedOrigin &&
    reference.origin.region !== "Romania" &&
    normalize(reference.origin.region) !== normalize(claimedOrigin) &&
    !normalize(reference.origin.region).includes(normalize(claimedOrigin)) &&
    !normalize(claimedOrigin).includes(normalize(reference.origin.region))
  ) {
    premiseIssues.push(
      `${reference.name} is from ${reference.origin.region}, ${reference.origin.country}, not ${claimedOrigin}.`,
    );
  }

  return {
    raw,
    reference,
    referenceName: reference.name,
    claimedOrigin,
    claimedVintage,
    premiseIssues,
    dryHint: /\bdry\b|\bsec\b/.test(normalized),
  };
}

function averageVectors(vectors: StyleVector[]): StyleVector {
  const base = { ...vectors[0] };
  const numericKeys: Array<keyof Omit<StyleVector, "color" | "aromatic" | "food" | "climate">> =
    [
      "body",
      "acidity",
      "tannin",
      "alcohol",
      "sweetness",
      "oak",
      "freshness",
      "ageability",
    ];
  for (const key of numericKeys) {
    base[key] =
      vectors.reduce((sum, vector) => sum + vector[key], 0) / vectors.length;
  }
  base.aromatic = unique(vectors.flatMap((vector) => vector.aromatic));
  base.food = unique(vectors.flatMap((vector) => vector.food));
  base.climate = unique(vectors.flatMap((vector) => vector.climate));
  return base;
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function clamp(value: number, min = 0, max = 4): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function levelFromText(
  text: string,
  high: RegExp,
  low: RegExp,
  fallback: number,
): number {
  if (high.test(text)) return 3.6;
  if (low.test(text)) return 1.2;
  return fallback;
}

const AROMA_TERMS: Array<[RegExp, string]> = [
  [/cirea[sș]|cherry|visin/, "sour cherry"],
  [/prun|plum/, "plum"],
  [/mur|blackberry/, "blackberry"],
  [/zmeur|raspberry/, "raspberry"],
  [/afin|blueberry/, "blueberry"],
  [/lamai|lime|lemon|citron/, "lemon"],
  [/portocal|orange/, "orange"],
  [/grapefruit|pomelo/, "grapefruit"],
  [/mar\b|apple/, "green apple"],
  [/par[aă]|pear/, "pear"],
  [/piersic|peach/, "white peach"],
  [/cais|apricot/, "apricot"],
  [/miere|honey/, "honey"],
  [/trandafir|rose/, "rose"],
  [/viore|violet/, "violet"],
  [/piper|pepper/, "pepper"],
  [/ierbur|herb|iarba/, "herbs"],
  [/ment|mint/, "mint"],
  [/piatr|mineral|flint|chalk/, "mineral"],
  [/sare|salin|salt/, "salinity"],
  [/stejar|baric|oak|vanilie|vanilla|cedru|cedar/, "oak"],
  [/fum|smoke|smoky/, "smoke"],
  [/piele|leather/, "leather"],
  [/tutun|tobacco/, "tobacco"],
  [/pamant|earth|forest/, "earth"],
  [/petrol/, "petrol"],
];

const FOOD_TERMS: Array<[RegExp, string]> = [
  [/peste|fish/, "fish"],
  [/icre|roe/, "roe"],
  [/branza|cheese/, "cheese"],
  [/porc|pork/, "pork"],
  [/pui|chicken/, "chicken"],
  [/vit|beef/, "beef"],
  [/miel|lamb/, "lamb"],
  [/rata|duck/, "duck"],
  [/paste|pasta/, "pasta"],
  [/rosii|tomato/, "tomato"],
  [/sarmale|cabbage/, "cabbage"],
  [/gratar|grill|barbecue|bbq/, "grilled meat"],
  [/legume|vegetable/, "vegetables"],
  [/salat|salad/, "salad"],
  [/desert|dessert|dulce/, "dessert"],
  [/fruct|fruit/, "fruit"],
  [/ciuperc|mushroom/, "mushroom"],
  [/ou|egg/, "egg"],
  [/picant|spicy/, "spicy food"],
  [/sushi|asian/, "asian food"],
  [/vanat|game/, "game"],
];

function aromasFromText(text: string): string[] {
  return unique(
    AROMA_TERMS.filter(([pattern]) => pattern.test(text)).map(([, term]) => term),
  );
}

function foodsFromText(text: string): string[] {
  return unique(
    FOOD_TERMS.filter(([pattern]) => pattern.test(text)).map(([, term]) => term),
  );
}

function climateFromRegion(region: string | null | undefined): string[] {
  if (!region) return [];
  const normalized = normalize(region);
  if (/dobrogea|black sea|mare/.test(normalized)) {
    return ["maritime", "mediterranean"];
  }
  if (/transilvania|ardelean|apold|tarnave/.test(normalized)) {
    return ["cool", "continental"];
  }
  if (
    /dealu mare|muntenia|oltenia|banat|crisana|moldova|minis|arad|cotnari|dragasani/.test(
      normalized,
    )
  ) {
    return ["continental"];
  }
  return [];
}

function gradeAlcohol(value: number | null): number | null {
  if (value == null || value < 5 || value > 25) return null;
  return clamp((value - 8) / 3.5);
}

function gradeAcidity(value: number | null): number | null {
  if (value == null || value < 0 || value > 25) return null;
  return clamp((value - 4) / 1.6);
}

function gradeSweetness(value: string | null): number {
  switch (value) {
    case "demisec":
      return 1;
    case "demidulce":
      return 2;
    case "dulce":
      return 3;
    default:
      return 0;
  }
}

function stripVintageAndPackaging(name: string): string {
  return normalize(
    name
      .replace(/\b(19|20)\d{2}\b/g, " ")
      .replace(/\b\d+(?:[.,]\d+)?\s*(?:l|ml|litri|litre)\b/gi, " ")
      .replace(/\b(?:magnum|jeroboam|rehoboam)\b/gi, " "),
  );
}

export function wineFamilyKey(wine: WineWithRelations): string {
  return [
    normalize(wine.winery?.name ?? ""),
    stripVintageAndPackaging(wine.name),
  ]
    .filter(Boolean)
    .join("|");
}

function buildWineProfile(
  wine: WineWithRelations,
  vintageSignal?: VintageSignal,
): WineStyleProfile {
  const confirmed: string[] = [];
  const interpreted: string[] = [];
  const missing: string[] = [];
  const references = new Set<string>([`vinintel:wine:${wine.slug}`]);

  const grapeStyles = wine.grapeVarieties
    .map((grape) => GRAPE_BY_NAME.get(normalize(grape.name)))
    .filter((style): style is GrapeStyleTemplate => Boolean(style));
  const fallback = genericVector(wine.type);
  const vector =
    grapeStyles.length > 0
      ? averageVectors(grapeStyles.map((style) => style.vector))
      : fallback;

  vector.color = (wine.type as ComparisonColor) ?? "any";
  confirmed.push(`colour=${wine.type}`);
  confirmed.push(`sweetness=${wine.sweetness ?? "not published"}`);
  if (wine.sweetness) {
    vector.sweetness = gradeSweetness(wine.sweetness);
  } else {
    missing.push("sweetness");
  }

  const alcohol = gradeAlcohol(wine.alcohol);
  if (alcohol != null) {
    vector.alcohol = alcohol;
    confirmed.push(`alcohol=${wine.alcohol}%`);
  } else {
    missing.push("alcohol");
  }

  const acidity = gradeAcidity(wine.acidity);
  if (acidity != null) {
    vector.acidity = acidity;
    vector.freshness = acidity;
    confirmed.push(`acidity=${wine.acidity}`);
  } else {
    missing.push("acidity");
  }

  const notes = [
    wine.tastingNotes,
    wine.tasteProfile,
    wine.descriptionEditorial,
    ...(wine.expertNotes
      ? [
          wine.expertNotes.history,
          wine.expertNotes.terroirSecrets,
          wine.expertNotes.pairingScience,
          wine.expertNotes.agingPotential,
        ]
      : []),
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ");
  const normalizedNotes = normalize(notes);
  if (normalizedNotes) {
    interpreted.push("tasting notes and editorial description");
    vector.body = levelFromText(
      normalizedNotes,
      /corpulent|full[- ]bodied|bogat|dense|puternic/,
      /usor|light[- ]bodied|suplu|elegant|subtire/,
      vector.body,
    );
    vector.tannin = levelFromText(
      normalizedNotes,
      /tanin ferm|taninuri ferme|structured tannin|astringent/,
      /tanin fin|taninuri fine|soft tannin|fara tanin/,
      vector.tannin,
    );
    vector.oak = levelFromText(
      normalizedNotes,
      /baric|stejar|oak|vanilie|cedru|scorcisoara/,
      /fara lemn|unwooded|no oak|inert/,
      vector.oak,
    );
    const aromas = aromasFromText(normalizedNotes);
    if (aromas.length > 0) vector.aromatic = unique([...vector.aromatic, ...aromas]);
    const foods = foodsFromText(normalizedNotes);
    if (foods.length > 0) vector.food = unique([...vector.food, ...foods]);
  } else {
    missing.push("tasting notes");
    interpreted.push("style inferred from variety and wine type");
  }

  const pairingText = [
    ...(wine.foodPairings ?? []).map((pairing) => pairing.dish),
    ...(wine.foodPairingNotes ?? []).map((pairing) => pairing.dish),
  ].join(" ");
  const pairings = foodsFromText(normalize(pairingText));
  if (pairings.length > 0) vector.food = unique([...vector.food, ...pairings]);

  const climate = climateFromRegion(wine.region?.name);
  if (climate.length > 0) {
    vector.climate = climate;
    interpreted.push("climate cue inferred from region");
  } else {
    missing.push("climate cue");
  }

  if (wine.cellarPotential != null) {
    vector.ageability = clamp(wine.cellarPotential / 5);
    confirmed.push(`cellar potential=${wine.cellarPotential} years`);
  }

  if (wine.vintage != null) {
    confirmed.push(`vintage=${wine.vintage}`);
    if (vintageSignal) {
      confirmed.push(
        `vintage assessment=${vintageSignal.classification} (${vintageSignal.sourceTitle ?? "vintage evidence"}, ${Math.round(vintageSignal.confidence * 100)}% confidence)`,
      );
      if (vintageSignal.sourceUrl) {
        references.add(`vinintel:vintage:${vintageSignal.sourceUrl}`);
      }
    } else {
      interpreted.push(
        "vintage year from catalog; no structured vintage assessment attached",
      );
    }
  }
  if (wine.winery?.name) confirmed.push(`winery=${wine.winery.name}`);
  if (wine.region?.name) {
    confirmed.push(`region=${wine.region.name}`);
    references.add(`vinintel:region:${wine.region.slug.replace(/\s+/g, "-")}`);
  }
  if (wine.grapeVarieties.length > 0) {
    confirmed.push(
      `grapes=${wine.grapeVarieties.map((grape) => grape.name).join(", ")}`,
    );
    for (const grape of wine.grapeVarieties) {
      const style = GRAPE_BY_NAME.get(normalize(grape.name));
      if (style) references.add(`vinintel:grape:${style.slug}`);
    }
  }

  if (grapeStyles.length === 0) {
    interpreted.push("variety style inferred from wine type");
    missing.push("variety knowledge");
  }

  return {
    wine,
    vector,
    evidence: {
      confirmed,
      interpreted,
      missing: unique(missing),
      references: [...references],
    },
    familyKey: wineFamilyKey(wine),
  };
}

function genericVector(type: string): StyleVector {
  if (type === "red") {
    return {
      color: "red",
      body: 2.3,
      acidity: 3,
      tannin: 2.7,
      alcohol: 2.5,
      sweetness: 0,
      aromatic: [],
      oak: 1,
      freshness: 3,
      ageability: 2.8,
      food: [],
      climate: [],
    };
  }
  if (type === "rose") {
    return {
      color: "rose",
      body: 1.8,
      acidity: 3.2,
      tannin: 0.5,
      alcohol: 2.2,
      sweetness: 0,
      aromatic: [],
      oak: 0.2,
      freshness: 3.4,
      ageability: 1.8,
      food: [],
      climate: [],
    };
  }
  if (type === "sparkling") {
    return {
      color: "sparkling",
      body: 1.8,
      acidity: 4,
      tannin: 0,
      alcohol: 2,
      sweetness: 0,
      aromatic: [],
      oak: 0.3,
      freshness: 4.2,
      ageability: 3,
      food: [],
      climate: [],
    };
  }
  return {
    color: type === "orange" ? "orange" : "white",
    body: 2,
    acidity: 3.2,
    tannin: 0,
    alcohol: 2.2,
    sweetness: 0,
    aromatic: [],
    oak: 0.4,
    freshness: 3.3,
    ageability: 2.2,
    food: [],
    climate: [],
  };
}

function colorSimilarity(a: ComparisonColor, b: ComparisonColor): number {
  if (a === b) return 1;
  if (
    (a === "red" && b === "rose") ||
    (a === "rose" && b === "red") ||
    (a === "white" && b === "orange") ||
    (a === "orange" && b === "white") ||
    (a === "white" && b === "sparkling") ||
    (a === "sparkling" && b === "white")
  ) {
    return 0.45;
  }
  return 0;
}

function numericSimilarity(a: number, b: number): number {
  return clamp(1 - Math.abs(a - b) / 4, 0, 1);
}

function tokenSimilarity(a: string[], b: string[]): number | null {
  if (a.length === 0 || b.length === 0) return null;
  const left = new Set(a.map(normalize));
  const right = new Set(b.map(normalize));
  let intersection = 0;
  for (const value of left) if (right.has(value)) intersection += 1;
  const union = new Set([...left, ...right]).size;
  return union === 0 ? null : intersection / union;
}

function scoreDimension(
  dimension: ComparisonDimension,
  reference: StyleVector,
  candidate: StyleVector,
  confidence: "confirmed" | "interpreted",
): DimensionScore {
  let similarity: number | null = null;
  let evidence: DimensionScore["evidence"] = confidence;

  switch (dimension) {
    case "color":
      similarity = colorSimilarity(reference.color, candidate.color);
      break;
    case "aromatic":
      similarity = tokenSimilarity(reference.aromatic, candidate.aromatic);
      break;
    case "food":
      similarity = tokenSimilarity(reference.food, candidate.food);
      break;
    case "climate":
      similarity = tokenSimilarity(reference.climate, candidate.climate);
      break;
    case "body":
    case "acidity":
    case "tannin":
    case "alcohol":
    case "sweetness":
    case "oak":
    case "freshness":
    case "ageability":
      similarity = numericSimilarity(reference[dimension], candidate[dimension]);
      break;
  }

  if (similarity == null) {
    evidence = "missing";
    similarity = 0;
  }

  return {
    dimension,
    weight: WEIGHTS[dimension],
    similarity,
    evidence,
  };
}

function levelLabel(value: number, locale: "ro" | "en"): string {
  const level = value >= 3.2 ? 2 : value >= 2.1 ? 1 : 0;
  if (locale === "ro") {
    return ["scăzut", "mediu", "ridicat"][level];
  }
  return ["low", "medium", "high"][level];
}

function sharedTokens(a: string[], b: string[]): string[] {
  const right = new Set(b.map(normalize));
  return a.filter((value) => right.has(normalize(value))).slice(0, 3);
}

function dimensionExplanation(
  dimension: ComparisonDimension,
  reference: ReferenceStyle,
  candidate: StyleVector,
  locale: "ro" | "en",
): string {
  if (dimension === "color") {
    return locale === "ro"
      ? `aceeași culoare (${candidate.color})`
      : `the same colour (${candidate.color})`;
  }
  if (dimension === "aromatic") {
    const shared = sharedTokens(reference.aromatic, candidate.aromatic);
    if (shared.length > 0) {
      return locale === "ro"
        ? `arome comune: ${shared.join(", ")}`
        : `shared aromas: ${shared.join(", ")}`;
    }
  }
  if (dimension === "food") {
    const shared = sharedTokens(reference.food, candidate.food);
    if (shared.length > 0) {
      return locale === "ro"
        ? `afinitate culinară comună: ${shared.join(", ")}`
        : `shared food affinity: ${shared.join(", ")}`;
    }
  }
  if (dimension === "climate") {
    const shared = sharedTokens(reference.climate, candidate.climate);
    if (shared.length > 0) {
      return locale === "ro"
        ? `același indiciu de climat: ${shared.join(", ")}`
        : `the same climate cue: ${shared.join(", ")}`;
    }
  }
  if (
    dimension === "body" ||
    dimension === "acidity" ||
    dimension === "tannin" ||
    dimension === "oak" ||
    dimension === "freshness" ||
    dimension === "ageability"
  ) {
    return locale === "ro"
      ? `nivel ${levelLabel(candidate[dimension], locale)} de ${DIMENSION_LABELS[dimension][locale]}`
      : `${levelLabel(candidate[dimension], locale)} ${DIMENSION_LABELS[dimension][locale]}`;
  }
  if (dimension === "alcohol") {
    return locale === "ro"
      ? `alcool ${levelLabel(candidate.alcohol, locale)}`
      : `${levelLabel(candidate.alcohol, locale)} alcohol`;
  }
  if (dimension === "sweetness") {
    return locale === "ro"
      ? `dulceață ${levelLabel(candidate.sweetness, locale)}`
      : `${levelLabel(candidate.sweetness, locale)} sweetness`;
  }
  return DIMENSION_LABELS[dimension][locale];
}

function chooseReasons(
  reference: ReferenceStyle,
  candidate: StyleVector,
  match: ComparisonMatch,
  locale: "ro" | "en",
): void {
  const positive = match.dimensions
    .filter((dimension) => dimension.evidence !== "missing" && dimension.similarity >= 0.75)
    .sort((a, b) => b.weight * b.similarity - a.weight * a.similarity)
    .slice(0, 3);
  const negative = match.dimensions
    .filter((dimension) => dimension.evidence !== "missing" && dimension.similarity < 0.55)
    .sort((a, b) => b.weight * (1 - b.similarity) - a.weight * (1 - a.similarity))
    .slice(0, 3);

  for (const dimension of positive) {
    const explanation = dimensionExplanation(
      dimension.dimension,
      reference,
      candidate,
      locale,
    );
    match.reasons.push(
      locale === "ro"
        ? `Se apropie de ${reference.name} prin ${explanation}.`
        : `It comes close to ${reference.name} on ${explanation}.`,
    );
  }
  for (const dimension of negative) {
    const explanation = dimensionExplanation(
      dimension.dimension,
      reference,
      candidate,
      locale,
    );
    match.differences.push(
      locale === "ro"
        ? `Diferă la ${DIMENSION_LABELS[dimension.dimension][locale]}: ${explanation}, deci nu este o copie a referinței.`
        : `It differs on ${DIMENSION_LABELS[dimension.dimension][locale]}: ${explanation}, so it is not a copy of the reference.`,
    );
  }
}

function matchWine(
  reference: ReferenceStyle,
  profile: WineStyleProfile,
  locale: "ro" | "en",
): ComparisonMatch {
  const dimensions = (
    Object.keys(WEIGHTS) as ComparisonDimension[]
  ).map((dimension) => {
    const evidence: "confirmed" | "interpreted" =
      ["color", "sweetness", "alcohol"].includes(dimension) &&
      !profile.evidence.missing.includes(dimension)
        ? "confirmed"
        : "interpreted";
    return scoreDimension(dimension, reference, profile.vector, evidence);
  });

  const availableWeight = dimensions
    .filter((dimension) => dimension.evidence !== "missing")
    .reduce((sum, dimension) => sum + dimension.weight, 0);
  const weighted = dimensions
    .filter((dimension) => dimension.evidence !== "missing")
    .reduce(
      (sum, dimension) => sum + dimension.weight * dimension.similarity,
      0,
    );
  let score = availableWeight > 0 ? Math.round((weighted / availableWeight) * 100) : 0;
  if (colorSimilarity(reference.color, profile.vector.color) === 0) {
    score = Math.round(score * 0.55);
  }
  const coverage = availableWeight / Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
  const confidence = Math.round(
    Math.min(92, 45 + coverage * 40 + (profile.evidence.missing.length === 0 ? 7 : 0)),
  );

  const match: ComparisonMatch = {
    wine: profile.wine,
    score,
    confidence,
    dimensions,
    reasons: [],
    differences: [],
    evidence: profile.evidence,
    familyLinks: [],
  };
  chooseReasons(reference, profile.vector, match, locale);
  return match;
}

function candidateWithinBudget(
  wine: WineWithRelations,
  budgetMin: number,
  budgetMax: number,
  budgetSpecified: boolean,
): boolean {
  if (!budgetSpecified || wine.priceAvg == null) return true;
  return wine.priceAvg >= budgetMin && wine.priceAvg <= budgetMax;
}

export function findClosestRomanianWines(input: {
  intent: ComparisonIntent;
  wines: WineWithRelations[];
  locale?: "ro" | "en";
  limit?: number;
  budgetMin?: number;
  budgetMax?: number;
  budgetSpecified?: boolean;
  claims?: ComparisonClaim[];
  vintageSignals?: Map<string, VintageSignal>;
}): RomanianComparisonResult | null {
  const {
    intent,
    wines,
    locale = "ro",
    limit = 4,
    budgetMin = 0,
    budgetMax = Number.POSITIVE_INFINITY,
    budgetSpecified = false,
    claims = [],
    vintageSignals = new Map(),
  } = input;
  if (!intent.reference) return null;

  const eligible = wines.filter((wine) =>
    candidateWithinBudget(wine, budgetMin, budgetMax, budgetSpecified),
  );
  if (eligible.length === 0) return null;

  const profiles = eligible.map((wine) =>
    buildWineProfile(wine, vintageSignals.get(wine.slug)),
  );
  const matches = profiles
    .map((profile) => matchWine(intent.reference!, profile, locale))
    .sort((a, b) => b.score - a.score);
  const best = matches[0];
  if (!best) return null;

  const wantedAlternatives = Math.max(2, Math.min(3, limit - 1));
  const sameColour = matches.filter(
    (match) =>
      match.wine.slug !== best.wine.slug &&
      match.wine.type === intent.reference!.color,
  );
  const alternatives = sameColour.slice(0, wantedAlternatives);
  if (alternatives.length < wantedAlternatives) {
    const fallback = matches.filter(
      (match) =>
        match.wine.slug !== best.wine.slug &&
        !alternatives.some((item) => item.wine.slug === match.wine.slug) &&
        match.score >= 50,
    );
    alternatives.push(...fallback.slice(0, wantedAlternatives - alternatives.length));
  }

  const claimsByWine = new Map<number, ComparisonClaim[]>();
  for (const claim of claims) {
    const list = claimsByWine.get(claim.wineId) ?? [];
    list.push(claim);
    claimsByWine.set(claim.wineId, list);
  }

  const allMatches = [best, ...alternatives];
  for (const match of allMatches) {
    const family = profiles
      .filter(
        (profile) =>
          profile.familyKey === wineFamilyKey(match.wine) &&
          profile.wine.slug !== match.wine.slug,
      )
      .map((profile) => profile.wine.slug)
      .slice(0, 3);
    match.familyLinks = family;
    const wineClaims = claimsByWine.get(match.wine.id) ?? [];
    for (const claim of wineClaims) {
      match.evidence.references.push(
        `vinintel:claim:${match.wine.slug}:${claim.field}`,
      );
      const claimValue =
        typeof claim.value === "string" || typeof claim.value === "number"
          ? String(claim.value).slice(0, 120)
          : null;
      match.evidence.confirmed.push(
        `claim ${claim.field}${claimValue ? `=${claimValue}` : ""}: ${claim.sourceTitle ?? "VinIntel evidence"} (${Math.round(claim.confidence * 100)}% confidence)`,
      );
    }
  }

  const missingData = unique(
    allMatches.flatMap((match) => match.evidence.missing),
  );
  return {
    intent,
    best,
    alternatives,
    considered: eligible.length,
    missingData,
  };
}

function formatMatchLines(
  match: ComparisonMatch,
  locale: "ro" | "en",
): string[] {
  return [
    locale === "ro"
      ? `- ${match.wine.name} (${match.wine.winery?.name ?? "crama necunoscută"}, ${match.wine.region?.name ?? "regiune necunoscută"}): score ${match.score}/100, confidence ${match.confidence}%.`
      : `- ${match.wine.name} (${match.wine.winery?.name ?? "unknown winery"}, ${match.wine.region?.name ?? "unknown region"}): score ${match.score}/100, confidence ${match.confidence}%.`,
    ...match.reasons.map((reason) => `  ${reason}`),
    ...match.differences.map((difference) => `  ${difference}`),
    locale === "ro"
      ? `  Fapte confirmate: ${match.evidence.confirmed.join("; ")}`
      : `  Confirmed facts: ${match.evidence.confirmed.join("; ")}`,
    locale === "ro"
      ? `  Interpretare: ${match.evidence.interpreted.join("; ") || "nu există suficient context"}`
      : `  Interpretation: ${match.evidence.interpreted.join("; ") || "not enough context"}`,
    locale === "ro"
      ? `  Incertitudini: ${match.evidence.missing.join("; ") || "nu au fost identificate goluri majore"}`
      : `  Uncertainties: ${match.evidence.missing.join("; ") || "no major gaps identified"}`,
    match.familyLinks.length > 0
      ? locale === "ro"
        ? `  Alte recolte din aceeași familie: ${match.familyLinks.join(", ")}`
        : `  Other releases in the same family: ${match.familyLinks.join(", ")}`
      : null,
    `  Evidence: ${match.evidence.references.join(", ")}`,
  ].filter((line): line is string => line != null);
}

export function formatComparisonContext(
  result: RomanianComparisonResult,
  locale: "ro" | "en" = "ro",
): string {
  const { intent, best, alternatives } = result;
  const reference = intent.reference;
  if (!reference) return "";
  const lines = [
    locale === "ro"
      ? "ANALIZĂ STRUCTURATĂ DE COMPARAȚIE"
      : "STRUCTURED COMPARISON ANALYSIS",
    locale === "ro"
      ? `Referință: ${reference.name}${reference.grape ? ` (${reference.grape})` : ""}, ${reference.origin.region}, ${reference.origin.country}.`
      : `Reference: ${reference.name}${reference.grape ? ` (${reference.grape})` : ""}, ${reference.origin.region}, ${reference.origin.country}.`,
    ...intent.premiseIssues.map((issue) =>
      locale === "ro" ? `Premisă corectată: ${issue}` : `Premise corrected: ${issue}`,
    ),
    ...(intent.claimedVintage
      ? [
          locale === "ro"
            ? `An menționat: ${intent.claimedVintage}. Nu transforma anul într-o evaluare a recoltei fără evidență.`
            : `Vintage mentioned: ${intent.claimedVintage}. Do not turn the year into a vintage assessment without evidence.`,
        ]
      : []),
    locale === "ro"
      ? `Cea mai bună potrivire românească: ${best.wine.name}.`
      : `Best Romanian match: ${best.wine.name}.`,
    ...formatMatchLines(best, locale),
    locale === "ro" ? "Alternative:" : "Alternatives:",
    ...alternatives.flatMap((match) => formatMatchLines(match, locale)),
    locale === "ro"
      ? `Date lipsă la nivel de catalog: ${result.missingData.join("; ") || "nu au fost identificate"}.`
      : `Catalog-level missing data: ${result.missingData.join("; ") || "none identified"}.`,
    locale === "ro"
      ? "Folosește aceste fapte. Nu inventa premii, recolte, prețuri sau note de degustare."
      : "Use these facts. Do not invent awards, vintages, prices or tasting notes.",
  ];
  return lines.join("\n");
}

export function formatComparisonAnswer(
  result: RomanianComparisonResult,
  locale: "ro" | "en" = "ro",
): string {
  const { best, alternatives, intent } = result;
  const heading =
    locale === "ro"
      ? `Cea mai apropiată alegere românească de ${intent.referenceName}`
      : `The closest Romanian match to ${intent.referenceName}`;
  const lines = [heading];
  if (intent.premiseIssues.length > 0) {
    lines.push(
      locale === "ro"
        ? `Mai întâi, o corectură: ${intent.premiseIssues.join(" ")}`
        : `First, a correction: ${intent.premiseIssues.join(" ")}`,
    );
  }
  lines.push(
    locale === "ro"
      ? `Recomandarea principală este ${best.wine.name} (${best.score}/100).`
      : `The main recommendation is ${best.wine.name} (${best.score}/100).`,
    ...best.reasons,
    ...best.differences,
  );
  lines.push(locale === "ro" ? "Alternative:" : "Alternatives:");
  for (const match of alternatives) {
    lines.push(`- ${match.wine.name} (${match.score}/100): ${match.reasons[0] ?? ""}`);
  }
  lines.push(
    locale === "ro"
      ? `Fapte confirmate: ${best.evidence.confirmed.join("; ")}.`
      : `Confirmed facts: ${best.evidence.confirmed.join("; ")}.`,
    locale === "ro"
      ? `Interpretare: ${best.evidence.interpreted.join("; ") || "limitată"}.`
      : `Interpretation: ${best.evidence.interpreted.join("; ") || "limited"}.`,
    locale === "ro"
      ? `Incertitudini: ${best.evidence.missing.join("; ") || "nu au fost identificate goluri majore"}.`
      : `Uncertainties: ${best.evidence.missing.join("; ") || "no major gaps identified"}.`,
    locale === "ro"
      ? "Nu am inventat premii, recolte sau note de degustare."
      : "I have not invented awards, vintages or tasting notes.",
  );
  return lines.join("\n");
}
