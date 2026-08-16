/**
 * Food Versatility v2 (stocat in coloana legacy foodMatchScore).
 *
 * Intrebare: "Cat de versatil este vinul acesta la masa?"
 * NU inseamna "cat de bine merge cu sarmale".
 *
 * Nu foloseste: foodPairingNotes editoriale, tasteProfile, sugestii AI,
 * taninuri/aciditate inventate, numar de paragrafe generate.
 */
import {
  categorizeFoodItems,
  categorizeFoodText,
  isDessertCategory,
  type FoodCategoryId,
} from "@/lib/food-taxonomy";
import { FOOD_VERSATILITY_ALGORITHM_VERSION } from "@/lib/scoring-v2/constants";
import { clamp, roundScore } from "@/lib/scoring-v2/math";
import type { FoodPairing } from "@/lib/schema";

export const FOOD_CONFIDENCE_CEILINGS = [
  { minConfidencePercent: 80, maxScore: 94 },
  { minConfidencePercent: 65, maxScore: 88 },
  { minConfidencePercent: 50, maxScore: 80 },
  { minConfidencePercent: 35, maxScore: 72 },
  { minConfidencePercent: 0, maxScore: 62 },
] as const;

export interface FoodVersatilityInput {
  type?: string | null;
  sweetness?: string | null;
  acidity?: number | null;
  foodPairings?: FoodPairing[] | null;
  producerCulinaryPairings?: string | null;
}

export interface FoodVersatilityBreakdownItem {
  key: string;
  label: string;
  points: number;
  detail: string;
}

export interface FoodVersatilityResult {
  score: number;
  confidence: number;
  provisional: boolean;
  algorithmVersion: typeof FOOD_VERSATILITY_ALGORITHM_VERSION;
  categories: FoodCategoryId[];
  breakdown: FoodVersatilityBreakdownItem[];
}

function normalizeType(type: string | null | undefined): string {
  const value = (type ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  if (value === "rosu" || value === "red") return "red";
  if (value === "alb" || value === "white") return "white";
  if (value === "roze" || value === "rose") return "rose";
  if (value === "spumant" || value === "sparkling") return "sparkling";
  if (value === "desert" || value === "dessert" || value === "dulce") {
    return "dessert";
  }
  if (value === "orange") return "orange";
  return value;
}

function collectCategories(input: FoodVersatilityInput): {
  curated: FoodCategoryId[];
  producer: FoodCategoryId[];
  all: FoodCategoryId[];
} {
  const curated = categorizeFoodItems(
    (input.foodPairings ?? []).map((pairing) => pairing.dish),
  );
  const producer = input.producerCulinaryPairings
    ? categorizeFoodText(input.producerCulinaryPairings)
    : [];
  const producerForBreadth =
    curated.length === 0 && producer.length >= 4 ? producer.slice(0, 2) : producer;
  const all = [...new Set([...curated, ...producerForBreadth])];
  return { curated, producer: producerForBreadth, all };
}

function breadthScore(categoryCount: number): number {
  if (categoryCount <= 0) return 40;
  if (categoryCount === 1) return 56;
  if (categoryCount === 2) return 68;
  if (categoryCount === 3) return 78;
  if (categoryCount === 4) return 86;
  return 92;
}

function styleUtility(type: string, sweetness: string | null | undefined): {
  score: number;
  detail: string;
  generic: boolean;
} {
  const sweet = (sweetness ?? "").toLowerCase();
  const isSweet = sweet === "dulce" || sweet === "demidulce";
  const isOffDry = sweet === "demisec";
  const sweetnessKnown = Boolean(sweet);

  if (type === "dessert" || isSweet) {
    return {
      score: 36,
      detail: "Vin dulce: util la desert, ingust la masa savuroasa.",
      generic: !sweetnessKnown && type === "dessert",
    };
  }

  if (type === "white" && (sweet === "sec" || !sweetnessKnown)) {
    return {
      score: sweetnessKnown ? 64 : 58,
      detail: sweetnessKnown
        ? "Alb sec: utilitate de masa relativ larga (generic, incredere mica)."
        : "Alb, dulceata necunoscuta: baseline generic slab.",
      generic: true,
    };
  }
  if (type === "rose" && (sweet === "sec" || !sweetnessKnown)) {
    return {
      score: sweetnessKnown ? 62 : 56,
      detail: "Roze: utilitate de masa moderata, semnal generic.",
      generic: true,
    };
  }
  if (type === "sparkling") {
    return {
      score: isOffDry ? 60 : 64,
      detail: "Spumant: merge cu multe mese usoare, semnal generic.",
      generic: true,
    };
  }
  if (type === "red") {
    return {
      score: isOffDry ? 48 : 50,
      detail: "Rosu singur nu inseamna versatilitate. Baseline scazut.",
      generic: true,
    };
  }
  if (type === "orange") {
    return { score: 48, detail: "Orange: masa mai ingusta, baseline modest.", generic: true };
  }
  if (isOffDry) {
    return { score: 50, detail: "Demisec: utilitate mixtă, nici larga nici nula.", generic: true };
  }
  return { score: 46, detail: "Stil necunoscut, prior conservator.", generic: true };
}

function acidityBonus(
  type: string,
  acidity: number | null | undefined,
): { bonus: number; known: boolean } {
  if (acidity == null || !Number.isFinite(acidity)) {
    return { bonus: 0, known: false };
  }
  if ((type === "white" || type === "rose" || type === "sparkling") && acidity >= 5.5) {
    return { bonus: 8, known: true };
  }
  if (type === "red" && acidity >= 5.2) {
    return { bonus: 4, known: true };
  }
  return { bonus: 0, known: true };
}

function dessertComponent(
  type: string,
  sweetness: string | null | undefined,
  categories: FoodCategoryId[],
): number {
  const sweet = (sweetness ?? "").toLowerCase();
  const dessertEvidence = categories.some(isDessertCategory);
  if (type === "dessert" || sweet === "dulce" || sweet === "demidulce") {
    return dessertEvidence ? 78 : 70;
  }
  if (dessertEvidence) return 64;
  return 48;
}

function foodConfidence(input: FoodVersatilityInput, categories: FoodCategoryId[]): number {
  let confidence = 16;
  if (input.type) confidence += 10;
  if (input.sweetness) confidence += 10;
  if (input.acidity != null) confidence += 12;
  if (categories.length > 0) confidence += Math.min(28, categories.length * 8);
  if (input.producerCulinaryPairings?.trim()) confidence += 12;
  if ((input.foodPairings?.length ?? 0) > 0) confidence += 10;
  return clamp(Math.round(confidence), 10, 94);
}

function resolveFoodCeiling(confidencePercent: number): number {
  for (const row of FOOD_CONFIDENCE_CEILINGS) {
    if (confidencePercent >= row.minConfidencePercent) return row.maxScore;
  }
  return 62;
}

export function calculateFoodVersatility(
  input: FoodVersatilityInput,
): FoodVersatilityResult {
  const type = normalizeType(input.type);
  const { curated, producer, all } = collectCategories(input);
  const style = styleUtility(type, input.sweetness);
  const acid = acidityBonus(type, input.acidity);
  const styleScore = clamp(style.score + acid.bonus, 20, 80);
  const breadth = breadthScore(all.length);
  const dessert = dessertComponent(type, input.sweetness, all);
  const evidenceQuality = clamp(
    30 +
      (curated.length > 0 ? 20 : 0) +
      (producer.length > 0 ? 16 : 0) +
      (input.acidity != null ? 12 : 0) +
      (input.sweetness ? 10 : 0) +
      (input.type ? 8 : 0),
    20,
    90,
  );
  const confidence = foodConfidence(input, all);

  const breadthWeight = all.length > 0 ? 0.45 : 0.2;
  const styleWeight = all.length > 0 ? 0.25 : 0.45;
  const evidenceWeight = 0.2;
  const dessertWeight = 0.1;

  const raw =
    breadth * breadthWeight +
    styleScore * styleWeight +
    evidenceQuality * evidenceWeight +
    dessert * dessertWeight;

  const ceiling = resolveFoodCeiling(confidence);
  let score = roundScore(clamp(raw, 22, ceiling));

  if (score >= 90 && (all.length < 3 || confidence < 60)) {
    score = Math.min(score, 87);
  }

  const breakdown: FoodVersatilityBreakdownItem[] = [
    {
      key: "breadth",
      label: "Latime categorii",
      points: breadth,
      detail:
        all.length === 0
          ? "Fara pairing-uri structurate. Nu recompensam aliasuri repetate."
          : `${all.length} categorii distincte (curate ${curated.length}, producator ${producer.length}).`,
    },
    {
      key: "style",
      label: "Utilitate de stil",
      points: styleScore,
      detail: acid.known
        ? `${style.detail} Aciditate verificata ${input.acidity} g/L.`
        : `${style.detail} Aciditate necunoscuta, fara pretentie.`,
    },
    {
      key: "evidence",
      label: "Calitatea evidentiilor",
      points: evidenceQuality,
      detail: "Pairing-uri curate si fapte tehnice, nu note editoriale.",
    },
    {
      key: "dessert",
      label: "Utilitate desert",
      points: dessert,
      detail: "Doar dulceata/tip/pairing factual, nu lista editoriala de desert.",
    },
  ];

  return {
    score,
    confidence,
    provisional: confidence < 45 || (style.generic && all.length === 0),
    algorithmVersion: FOOD_VERSATILITY_ALGORITHM_VERSION,
    categories: all,
    breakdown,
  };
}
