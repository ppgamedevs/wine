import type { OverpricedRisk } from "@/types";
import { dessertFoodMatchBoost } from "@/lib/dessert-pairings";
import {
  MIN_RECOMMENDED_VALUE_SCORE,
  VALUE_SCORE_NEUTRAL_MIN,
} from "@/lib/value-score-thresholds";

export interface ScoreInput {
  price: number;
  category: string;
  region?: string;
  grapeVarieties?: string[];
  sweetness?: string | null;
  dessertPairingCount?: number;
  /** Calitate de baza 0-100 (LLM, note degustare sau import). */
  baseQuality?: number;
  medals?: number;
  criticScore?: number;
}

export interface ValueScoreInput {
  price: number;
  isAutochthonous: boolean;
  region: string;
  /** 0-100 (din LLM sau note degustare). */
  baseQuality: number;
  medals?: number;
  criticScore?: number;
}

export interface InitialScores {
  valueScore: number;
  giftScore: number;
  foodMatchScore: number;
  overpricedRisk: OverpricedRisk;
  beginnerFriendly: boolean;
  cellarPotential: number;
}

/** LLM score suggestions on 1-10 scale (converted to 1-100 internally). */
export interface LlmScoreSuggestions {
  valueScore?: number | null;
  giftScore?: number | null;
  foodMatchScore?: number | null;
}

export interface MergedAnalysisScores extends InitialScores {
  ruleBased: InitialScores;
  llmSuggestions: {
    valueScore: number | null;
    giftScore: number | null;
    foodMatchScore: number | null;
  };
  adjustments: {
    valueScore: number;
    giftScore: number;
    foodMatchScore: number;
  };
}

const MAX_LLM_NUDGE = 12;

function llm1to10To100(score: number): number {
  return toSiteScale(score);
}

function applyRuleBasedNudge(
  ruleScore: number,
  llm1to10: number | null | undefined,
): number {
  if (llm1to10 == null) return ruleScore;
  const llm100 = llm1to10To100(llm1to10);
  const diff = llm100 - ruleScore;
  const nudge =
    Math.sign(diff) * Math.min(Math.abs(diff), MAX_LLM_NUDGE) * 0.35;
  return Math.round(Math.min(100, Math.max(10, ruleScore + nudge)));
}

/**
 * Combines rule-based scores with optional LLM suggestions.
 * Rule-based scores are the base; LLM can nudge slightly when it has extra context.
 */
export function mergeAnalysisScores(
  ruleScores: InitialScores,
  price: number,
  llm: LlmScoreSuggestions = {},
): MergedAnalysisScores {
  const llmSuggestions = {
    valueScore: llm.valueScore ?? null,
    giftScore: llm.giftScore ?? null,
    foodMatchScore: llm.foodMatchScore ?? null,
  };

  const valueScore = applyRuleBasedNudge(
    ruleScores.valueScore,
    llmSuggestions.valueScore,
  );
  const giftScore = applyRuleBasedNudge(
    ruleScores.giftScore,
    llmSuggestions.giftScore,
  );
  const foodMatchScore = applyRuleBasedNudge(
    ruleScores.foodMatchScore,
    llmSuggestions.foodMatchScore,
  );

  return {
    valueScore,
    giftScore,
    foodMatchScore,
    overpricedRisk: inferOverpricedRisk(price, valueScore),
    beginnerFriendly: ruleScores.beginnerFriendly,
    cellarPotential: ruleScores.cellarPotential,
    ruleBased: ruleScores,
    llmSuggestions,
    adjustments: {
      valueScore: valueScore - ruleScores.valueScore,
      giftScore: giftScore - ruleScores.giftScore,
      foodMatchScore: foodMatchScore - ruleScores.foodMatchScore,
    },
  };
}

export function formatScoreProvenance(merged: MergedAnalysisScores): string {
  const fmt = (score: number | null) =>
    score != null ? `${score}/10` : "n/a";

  return [
    "Scoruri VinIntel:",
    `- Value: ${merged.valueScore}/100 (baza algoritm ${merged.ruleBased.valueScore}, sugestie AI ${fmt(merged.llmSuggestions.valueScore)}, ajustare ${merged.adjustments.valueScore >= 0 ? "+" : ""}${merged.adjustments.valueScore})`,
    `- Gift: ${merged.giftScore}/100 (baza ${merged.ruleBased.giftScore}, sugestie AI ${fmt(merged.llmSuggestions.giftScore)})`,
    `- Food Match: ${merged.foodMatchScore}/100 (baza ${merged.ruleBased.foodMatchScore}, sugestie AI ${fmt(merged.llmSuggestions.foodMatchScore)})`,
  ].join("\n");
}

function clamp1to10(value: number): number {
  return Math.min(10, Math.max(1, value));
}

function normalizeCategory(category: string): string {
  return category
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function toSiteScale(score1to10: number): number {
  return clamp1to10(score1to10) * 10;
}

function inferOverpricedRisk(
  price: number,
  valueScore: number,
): OverpricedRisk {
  if (valueScore >= MIN_RECOMMENDED_VALUE_SCORE && price <= 80) return "low";
  if (valueScore < VALUE_SCORE_NEUTRAL_MIN) return "high";
  if (price > 80 && valueScore < MIN_RECOMMENDED_VALUE_SCORE) return "high";
  if (valueScore <= 50 || price > 120) return "high";
  return "medium";
}

const VALUE_SCORE_PREMIUM_REGIONS = [
  "dealu mare",
  "dragasani",
  "cotnari",
  "murfatlar",
  "dealurile moldovei",
] as const;

const AUTOCHTHONOUS_GRAPE_PATTERNS = [
  /\bfeteasca\b/i,
  /\btamaioasa\b/i,
  /\bbusuioaca\b/i,
  /\bbabeasca\b/i,
  /\brara neagra\b/i,
  /\bcramposie\b/i,
  /\bgrasa de cotnari\b/i,
  /\bgrasa\b/i,
  /\bnovac\b/i,
  /\bsarba\b/i,
  /\bfrincusa\b/i,
  /\bnegru de dragasani\b/i,
  /\bgalbena de odobesti\b/i,
  /\bgalbena\b/i,
] as const;

function normalizeRegionLabel(region: string): string {
  return region
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeGrapeHaystack(grapes: string[]): string {
  return grapes
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function isAutochthonousGrapeMix(grapeVarieties?: string[]): boolean {
  if (!grapeVarieties?.length) return false;
  const haystack = normalizeGrapeHaystack(grapeVarieties);
  return AUTOCHTHONOUS_GRAPE_PATTERNS.some((pattern) => pattern.test(haystack));
}

export function isPremiumValueRegion(region: string): boolean {
  const normalized = normalizeRegionLabel(region);
  if (!normalized) return false;
  return VALUE_SCORE_PREMIUM_REGIONS.some(
    (name) => normalized === name || normalized.includes(name),
  );
}

/**
 * Value Score VinIntel (0-100)
 * Inspirat din Vivino Value Check + QPR models profesionale
 * Scop: Sa recomandam doar vinuri romanesti care merita cu adevarat pretul
 */
export function calculateValueScore(wine: ValueScoreInput): number {
  return buildValueScoreBreakdown(wine).finalScore;
}

export interface ValueScoreBreakdownItem {
  label: string;
  detail: string;
  points: number;
}

export interface ValueScoreBreakdown {
  items: ValueScoreBreakdownItem[];
  subtotal: number;
  penaltyNote: string | null;
  finalScore: number;
}

/**
 * Transparent breakdown of VinIntel Score factors for UI display.
 */
export function buildValueScoreBreakdown(wine: ValueScoreInput): ValueScoreBreakdown {
  const items: ValueScoreBreakdownItem[] = [];
  let score = 0;

  const qualityPoints = wine.baseQuality * 0.4;
  score += qualityPoints;
  items.push({
    label: "Calitate de baza",
    detail: `${wine.baseQuality}/100 x 40%`,
    points: Math.round(qualityPoints * 10) / 10,
  });

  const priceEfficiency = Math.max(0, wine.baseQuality - wine.price / 4);
  const efficiencyPoints = priceEfficiency * 0.3;
  score += efficiencyPoints;
  items.push({
    label: "Eficienta pret",
    detail: `Calitate minus pret (${wine.price} RON / 4) x 30%`,
    points: Math.round(efficiencyPoints * 10) / 10,
  });

  if (wine.isAutochthonous) {
    score += 12;
    items.push({
      label: "Soi autohton romanesc",
      detail: "Feteasca, Busuioaca, Tamaioasa, Rara Neagra etc.",
      points: 12,
    });
  }

  if (isPremiumValueRegion(wine.region)) {
    score += 8;
    items.push({
      label: "Regiune viticola premium",
      detail: wine.region || "Regiune recunoscuta",
      points: 8,
    });
  }

  if (wine.medals != null && wine.medals > 0) {
    const medalPoints = Math.min(wine.medals * 3, 12);
    score += medalPoints;
    items.push({
      label: "Medalii si concursuri",
      detail: `${wine.medals} medalii (max +12)`,
      points: medalPoints,
    });
  }

  if (wine.criticScore != null && Number.isFinite(wine.criticScore)) {
    const criticPoints = (wine.criticScore - 80) * 0.5;
    if (criticPoints !== 0) {
      score += criticPoints;
      items.push({
        label: "Scor critic",
        detail: `${wine.criticScore}/100 (referinta 80) x 0.5`,
        points: Math.round(criticPoints * 10) / 10,
      });
    }
  }

  let penaltyNote: string | null = null;
  if (wine.price > 150 && score < 85) {
    const capped = Math.min(score, 82);
    if (capped < score) {
      penaltyNote =
        "Vin scump (peste 150 RON): scorul a fost plafonat la 82 pana cand calitatea justifica pretul.";
      score = capped;
    }
  }

  const subtotal = Math.round(score);
  const finalScore = Math.max(45, Math.min(98, Math.round(score)));

  return {
    items,
    subtotal,
    penaltyNote,
    finalScore,
  };
}

export function valueScoreInputFromWine(wine: {
  priceAvg: number | null;
  currentPrice?: number | null;
  grapeVarieties: { name: string }[] | string[];
  region?: { name: string } | null;
  valueScore?: number | null;
}): ValueScoreInput {
  const price = wine.currentPrice ?? wine.priceAvg ?? 0;
  const grapes = wine.grapeVarieties.map((g) =>
    typeof g === "string" ? g : g.name,
  );

  return {
    price,
    isAutochthonous: isAutochthonousGrapeMix(grapes),
    region: wine.region?.name ?? "",
    baseQuality: defaultBaseQuality(price),
  };
}

function defaultBaseQuality(price: number): number {
  if (price <= 35) return 72;
  if (price <= 55) return 68;
  if (price <= 85) return 65;
  if (price <= 120) return 62;
  return 58;
}

/**
 * Rule-based scores for CSV import (1-10 logic, stored as 1-100 in DB).
 * Prag minim recomandare = 75/100 (vezi lib/value-score-thresholds.ts).
 * Rafinare ulterioara: db:editorial sau logica din lib/sommelier.ts.
 */
export function calculateInitialScores(input: ScoreInput): InitialScores {
  const { price, category, sweetness, grapeVarieties, dessertPairingCount } =
    input;
  const cat = normalizeCategory(category);

  const valueScore = calculateValueScore({
    price,
    isAutochthonous: isAutochthonousGrapeMix(grapeVarieties),
    region: input.region ?? "",
    baseQuality: input.baseQuality ?? defaultBaseQuality(price),
    medals: input.medals,
    criticScore: input.criticScore,
  });

  let giftScore = 6;
  if (cat === "spumant" || cat === "sparkling") giftScore = 8;
  if (price > 100) giftScore = 7;

  let foodMatchScore = 7;
  if (cat === "rosu" || cat === "red") foodMatchScore = 8;

  const dessertBoost = dessertFoodMatchBoost({
    category: cat,
    sweetness,
    grapeVarieties,
    dessertPairingCount,
  });
  foodMatchScore = Math.min(10, foodMatchScore + dessertBoost);

  const scaledGift = toSiteScale(giftScore);
  const scaledFood = toSiteScale(foodMatchScore);

  return {
    valueScore,
    giftScore: scaledGift,
    foodMatchScore: scaledFood,
    overpricedRisk: inferOverpricedRisk(price, valueScore),
    beginnerFriendly: valueScore >= 70 && price <= 65,
    cellarPotential:
      (cat === "rosu" || cat === "red") && price >= 60 ? 4 : 2,
  };
}
