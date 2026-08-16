/**
 * Occasion Match v1.
 *
 * Intrebare: "Cat de bine se potriveste ACEST vin cu ACEASTA cerere?"
 * Scor contextual. Nu se stocheaza pe wines.
 *
 * Componentele sunt 0-100. Greutatile insumeaza 1.
 * Datele lipsa se reponderaza; nu se inlocuiesc cu 50 increzator.
 */
import { OCCASION_MATCH_ALGORITHM_VERSION } from "@/lib/scoring-v2/constants";
import { calculateFoodVersatility } from "@/lib/scoring-v2/food-versatility";
import { calculateGiftScore } from "@/lib/scoring-v2/gift-score";
import { clamp, roundScore } from "@/lib/scoring-v2/math";
import {
  assessRecommendationEligibility,
} from "@/lib/recommendation/eligibility";
import { scoreWineForDessert, scoreWineForDish } from "@/lib/recommendation/dish-match";
import type {
  BudgetConstraint,
  OccasionMatchResult,
  ScoreBreakdownItem,
} from "@/lib/recommendation/types";
import type { FoodPairing, ProducerPageContent, WineMedal } from "@/lib/schema";

export type OccasionId =
  | "oricare"
  | "nunta"
  | "cadou"
  | "cadou-business"
  | "cina-romantica"
  | "sarmale"
  | "gratar"
  | "petrecere"
  | "sarbatori"
  | "pentru-desert";

export { OCCASION_MATCH_ALGORITHM_VERSION };

export interface OccasionMatchInput {
  occasion: OccasionId;
  budgetMin?: number;
  budgetMax?: number;
  budgetSpecified?: boolean;
  budgetConstraint?: BudgetConstraint;
  color?: "any" | "red" | "white" | "rose" | "sparkling";
  sweetness?: "any" | "sec" | "demisec" | "demidulce" | "dulce";
  dish?: string | null;
  preferredWinerySlugs?: string[];
}

export interface OccasionMatchWine {
  id: number;
  slug: string;
  name?: string;
  type: string;
  sweetness?: string | null;
  priceAvg?: number | null;
  valueScore?: number | null;
  estimatedQuality?: number | null;
  qualityFinal?: number | null;
  qualityEffective?: number | null;
  grapeVarieties?: Array<string | { name: string }>;
  region?: { name?: string | null } | null;
  winery?: { name?: string | null; slug?: string | null } | null;
  vintage?: number | null;
  medals?: WineMedal[] | null;
  criticScore?: number | null;
  ratingAvg?: number | null;
  communityScore?: number | null;
  acidity?: number | null;
  alcohol?: number | null;
  foodPairings?: FoodPairing[] | null;
  producerContent?: ProducerPageContent | null;
  producerPageUrl?: string | null;
  tastingSheetUrl?: string | null;
  beginnerFriendly?: boolean | null;
  descriptionEditorial?: string | null;
  valueExplanation?: string | null;
  tasteProfile?: string | null;
}

interface WeightedComponent {
  key: string;
  label: string;
  weight: number;
  value: number | null;
  detail: string;
}

const COLOR_TO_TYPE: Record<string, string[]> = {
  any: [],
  red: ["red"],
  white: ["white"],
  rose: ["rose"],
  sparkling: ["sparkling"],
};

function grapeNames(wine: OccasionMatchWine): string[] {
  return (wine.grapeVarieties ?? []).map((entry) =>
    typeof entry === "string" ? entry : entry.name,
  );
}

function giftFor(wine: OccasionMatchWine) {
  return calculateGiftScore({
    price: wine.priceAvg,
    type: wine.type,
    grapeVarieties: grapeNames(wine),
    region: wine.region?.name,
    wineryName: wine.winery?.name,
    vintage: wine.vintage,
    valueScore: wine.valueScore,
    estimatedQuality: wine.estimatedQuality,
    qualityFinal: wine.qualityFinal,
    qualityEffective: wine.qualityEffective,
    medals: wine.medals,
    criticScore: wine.criticScore,
    ratingAvg: wine.ratingAvg,
    communityScore: wine.communityScore,
    producerPageUrl: wine.producerPageUrl,
    tastingSheetUrl: wine.tastingSheetUrl,
    alcohol: wine.alcohol,
    sweetness: wine.sweetness,
  });
}

function foodFor(wine: OccasionMatchWine) {
  return calculateFoodVersatility({
    type: wine.type,
    sweetness: wine.sweetness,
    acidity: wine.acidity,
    foodPairings: wine.foodPairings,
    producerCulinaryPairings: wine.producerContent?.culinaryPairings,
  });
}

function qualityProxy(wine: OccasionMatchWine): number | null {
  if (wine.qualityFinal != null) return clamp(wine.qualityFinal, 0, 100);
  if (wine.qualityEffective != null) return clamp(wine.qualityEffective, 0, 100);
  if (wine.estimatedQuality != null) return clamp(wine.estimatedQuality, 0, 100);
  return null;
}

function accessibilityComponent(wine: OccasionMatchWine): number {
  const price = wine.priceAvg;
  let score = 55;
  if (price != null) {
    if (price <= 40) score = 82;
    else if (price <= 60) score = 76;
    else if (price <= 90) score = 64;
    else if (price <= 130) score = 52;
    else score = 40;
  }
  if (wine.beginnerFriendly) score += 6;
  if (wine.type === "sparkling" || wine.type === "rose" || wine.type === "white") {
    score += 4;
  }
  return clamp(score, 20, 90);
}

function typeSoftPrior(wine: OccasionMatchWine, occasion: OccasionId): number {
  if (occasion === "nunta" && wine.type === "sparkling") return 64;
  if (occasion === "petrecere" && (wine.type === "rose" || wine.type === "sparkling")) {
    return 62;
  }
  if (occasion === "cadou-business") return 50;
  return 50;
}

/**
 * Greutati pe ocazie. Suma = 1.
 * Documentate aici ca sa poata fi auditate fara a citi tot motorul.
 */
export function occasionWeights(occasion: OccasionId): Record<string, number> {
  switch (occasion) {
    case "oricare":
      return { value: 0.4, quality: 0.2, food: 0.25, gift: 0.15 };
    case "cadou":
      return { gift: 0.5, quality: 0.25, value: 0.15, confidence: 0.1 };
    case "cadou-business":
      return { gift: 0.45, quality: 0.25, confidence: 0.2, value: 0.1 };
    case "cina-romantica":
      return { value: 0.25, gift: 0.25, food: 0.25, quality: 0.15, access: 0.1 };
    case "sarmale":
      return { dish: 0.55, food: 0.15, value: 0.2, quality: 0.1 };
    case "gratar":
      return { dish: 0.55, food: 0.15, value: 0.2, quality: 0.1 };
    case "pentru-desert":
      return { dish: 0.6, food: 0.1, value: 0.15, gift: 0.15 };
    case "petrecere":
      return { value: 0.35, food: 0.25, access: 0.2, type: 0.1, gift: 0.1 };
    case "nunta":
      return { food: 0.3, value: 0.25, gift: 0.25, access: 0.2 };
    case "sarbatori":
      return { food: 0.3, festive: 0.25, gift: 0.2, value: 0.25 };
    default:
      return { value: 0.4, food: 0.3, gift: 0.3 };
  }
}

function dishForOccasion(occasion: OccasionId, explicitDish?: string | null): string | null {
  if (explicitDish?.trim()) return explicitDish.trim();
  if (occasion === "sarmale") return "sarmale";
  if (occasion === "gratar") return "gratar";
  if (occasion === "pentru-desert") return "desert";
  return null;
}

function festiveComponent(wine: OccasionMatchWine, foodScore: number): number {
  const festive = scoreWineForDish(wine, "masa festiva");
  return roundScore(foodScore * 0.45 + festive.score * 0.55);
}

function combine(
  parts: WeightedComponent[],
): { score: number; breakdown: ScoreBreakdownItem[]; usedConfidencePenalty: number } {
  const known = parts.filter((part) => part.value != null && part.weight > 0);
  const weightSum = known.reduce((sum, part) => sum + part.weight, 0);
  const missingWeight = parts
    .filter((part) => part.value == null && part.weight > 0)
    .reduce((sum, part) => sum + part.weight, 0);

  if (known.length === 0 || weightSum <= 0) {
    return {
      score: 38,
      usedConfidencePenalty: 24,
      breakdown: [
        {
          key: "empty",
          label: "Fara componente cunoscute",
          points: 38,
          detail: "Nu inlocuim necunoscutul cu 50.",
        },
      ],
    };
  }

  const scale = 1 / weightSum;
  let raw = 0;
  const breakdown: ScoreBreakdownItem[] = known.map((part) => {
    const value = part.value ?? 0;
    raw += value * part.weight * scale;
    return {
      key: part.key,
      label: part.label,
      points: roundScore(value),
      weight: Number((part.weight * scale).toFixed(3)),
      detail: part.detail,
    };
  });

  return {
    score: raw,
    usedConfidencePenalty: Math.round(missingWeight * 40),
    breakdown,
  };
}

export function winePassesHardConstraints(
  wine: OccasionMatchWine,
  input: OccasionMatchInput,
): boolean {
  const price = wine.priceAvg;
  const constraint = input.budgetConstraint ?? (input.budgetSpecified ? "hard" : "none");
  if (constraint === "hard" && input.budgetSpecified && price != null) {
    if (input.budgetMax != null && price > input.budgetMax) return false;
    if (input.budgetMin != null && input.budgetMin > 0 && price < input.budgetMin) {
      return false;
    }
  }
  if (constraint === "approximate" && input.budgetSpecified && price != null) {
    const max = input.budgetMax ?? Number.POSITIVE_INFINITY;
    const tolerance = Math.max(5, max * 0.08);
    if (price > max + tolerance) return false;
  }

  const color = input.color ?? "any";
  const allowed = COLOR_TO_TYPE[color] ?? [];
  if (allowed.length > 0 && !allowed.includes(wine.type)) return false;

  const sweetness = input.sweetness ?? "any";
  if (sweetness !== "any" && wine.sweetness !== sweetness) return false;

  return true;
}

export function scoreWineForOccasion(
  wine: OccasionMatchWine,
  input: OccasionMatchInput,
): OccasionMatchResult | null {
  if (!winePassesHardConstraints(wine, input)) return null;

  const eligibility = assessRecommendationEligibility(wine);
  const gift = giftFor(wine);
  const food = foodFor(wine);
  const quality = qualityProxy(wine);
  const value = wine.valueScore ?? null;
  const weights = occasionWeights(input.occasion);
  const dishName = dishForOccasion(input.occasion, input.dish);
  const dish = dishName
    ? input.occasion === "pentru-desert"
      ? scoreWineForDessert(wine)
      : scoreWineForDish(wine, dishName)
    : undefined;

  const parts: WeightedComponent[] = [];
  if (weights.value) {
    parts.push({
      key: "value",
      label: "Value Score",
      weight: weights.value,
      value,
      detail: value != null ? "Raport calitate-pret stocat." : "Value Score lipsa, reponderat.",
    });
  }
  if (weights.quality) {
    parts.push({
      key: "quality",
      label: "Calitate estimata",
      weight: weights.quality,
      value: quality,
      detail: quality != null ? "Q din catalog." : "Q lipsa, reponderat.",
    });
  }
  if (weights.gift) {
    parts.push({
      key: "gift",
      label: "Gift Score v2",
      weight: weights.gift,
      value: gift.score,
      detail: "Potrivire globala ca dar.",
    });
  }
  if (weights.food) {
    parts.push({
      key: "food",
      label: "Versatilitate la masa",
      weight: weights.food,
      value: food.score,
      detail: "Versatilitate globala, nu potrivire de fel.",
    });
  }
  if (weights.confidence) {
    parts.push({
      key: "confidence",
      label: "Incredere Gift",
      weight: weights.confidence,
      value: gift.confidence,
      detail: "Increderea in datele de cadou.",
    });
  }
  if (weights.access) {
    parts.push({
      key: "access",
      label: "Accesibilitate",
      weight: weights.access,
      value: accessibilityComponent(wine),
      detail: "Pret practic si usor de baut in grup.",
    });
  }
  if (weights.type) {
    parts.push({
      key: "type",
      label: "Prior de tip (slab)",
      weight: weights.type,
      value: typeSoftPrior(wine, input.occasion),
      detail: "Prior mic de stil, nu regula de prestigiu.",
    });
  }
  if (weights.dish) {
    parts.push({
      key: "dish",
      label: "Potrivire fel",
      weight: weights.dish,
      value: dish?.score ?? null,
      detail: dish?.reasons[0] ?? "Felul ocaziei lipseste.",
    });
  }
  if (weights.festive) {
    parts.push({
      key: "festive",
      label: "Masa festiva",
      weight: weights.festive,
      value: festiveComponent(wine, food.score),
      detail: "Versatilitate plus pairing festiv explicit daca exista.",
    });
  }

  const combined = combine(parts);
  let confidence = roundScore(
    clamp(
      gift.confidence * 0.35 +
        food.confidence * 0.35 +
        (dish ? dish.confidence * 0.2 : 15) +
        (value != null ? 10 : 0) +
        (quality != null ? 8 : 0) -
        combined.usedConfidencePenalty,
      12,
      96,
    ),
  );

  if (eligibility === "REVIEW_REQUIRED") {
    confidence = Math.min(confidence, 34);
  } else if (eligibility === "ELIGIBLE_LOW_CONFIDENCE") {
    confidence = Math.min(confidence, 52);
  }

  const prior = 48;
  const shrink = confidence < 45 ? (45 - confidence) / 45 : 0;
  let score = combined.score * (1 - shrink * 0.35) + prior * (shrink * 0.35);

  if (confidence < 40) {
    score = Math.min(score, 72);
  }
  if (confidence < 30) {
    score = Math.min(score, 64);
  }
  if (eligibility === "REVIEW_REQUIRED") {
    score = Math.min(score, 68);
  }

  score = clamp(score, 18, 96);

  const reasons: string[] = [];
  if (dish?.reasons[0]) reasons.push(dish.reasons[0]);
  const topParts = [...combined.breakdown].sort((a, b) => b.points - a.points);
  for (const part of topParts.slice(0, 2)) {
    reasons.push(`${part.label} ${part.points}/100.`);
  }

  return {
    score: roundScore(score),
    confidence,
    breakdown: combined.breakdown,
    reasons: reasons.slice(0, 3),
    eligibility,
    dish,
  };
}

export function compareOccasionMatches(
  left: { score: number; confidence: number; wine: OccasionMatchWine; primary?: number | null },
  right: { score: number; confidence: number; wine: OccasionMatchWine; primary?: number | null },
): number {
  if (right.score !== left.score) return right.score - left.score;
  if (right.confidence !== left.confidence) return right.confidence - left.confidence;
  const leftPrimary = left.primary ?? 0;
  const rightPrimary = right.primary ?? 0;
  if (rightPrimary !== leftPrimary) return rightPrimary - leftPrimary;
  const leftValue = left.wine.valueScore ?? -1;
  const rightValue = right.wine.valueScore ?? -1;
  if (rightValue !== leftValue) return rightValue - leftValue;
  return left.wine.slug.localeCompare(right.wine.slug);
}

export function rankWinesForOccasion(
  wines: OccasionMatchWine[],
  input: OccasionMatchInput,
): Array<OccasionMatchResult & { wine: OccasionMatchWine }> {
  const scored: Array<OccasionMatchResult & { wine: OccasionMatchWine }> = [];
  for (const wine of wines) {
    const result = scoreWineForOccasion(wine, input);
    if (!result) continue;
    scored.push({ ...result, wine });
  }

  const weights = occasionWeights(input.occasion);
  const primaryKey = Object.entries(weights).sort((a, b) => b[1] - a[1])[0]?.[0];

  scored.sort((left, right) =>
    compareOccasionMatches(
      {
        score: left.score,
        confidence: left.confidence,
        wine: left.wine,
        primary: left.breakdown.find((item) => item.key === primaryKey)?.points,
      },
      {
        score: right.score,
        confidence: right.confidence,
        wine: right.wine,
        primary: right.breakdown.find((item) => item.key === primaryKey)?.points,
      },
    ),
  );
  return scored;
}
