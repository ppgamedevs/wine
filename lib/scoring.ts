import type { GrapeVarietyShare } from "@/lib/schema";
import type { OverpricedRisk } from "@/types";

export interface ScoreInput {
  price: number;
  category: string;
  region?: string;
  grapeVarieties?: string[];
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
  if (valueScore >= 80 && price <= 80) return "low";
  if (valueScore <= 50 || price > 120) return "high";
  if (price > 80 && valueScore < 70) return "high";
  return "medium";
}

/**
 * Rule-based scores for CSV import (1-10 logic, stored as 1-100 in DB).
 * Rafinare ulterioara: db:editorial sau logica din lib/sommelier.ts.
 */
export function calculateInitialScores(input: ScoreInput): InitialScores {
  const { price, category } = input;
  const cat = normalizeCategory(category);

  let valueScore = 7;
  if (price < 50) valueScore = 8;
  else if (price > 120) valueScore = 5;
  else if (price > 80) valueScore = 6;

  let giftScore = 6;
  if (cat === "spumant" || cat === "sparkling") giftScore = 8;
  if (price > 100) giftScore = 7;

  let foodMatchScore = 7;
  if (cat === "rosu" || cat === "red") foodMatchScore = 8;

  const scaledValue = toSiteScale(valueScore);
  const scaledGift = toSiteScale(giftScore);
  const scaledFood = toSiteScale(foodMatchScore);

  return {
    valueScore: scaledValue,
    giftScore: scaledGift,
    foodMatchScore: scaledFood,
    overpricedRisk: inferOverpricedRisk(price, scaledValue),
    beginnerFriendly: scaledValue >= 70 && price <= 65,
    cellarPotential:
      (cat === "rosu" || cat === "red") && price >= 60 ? 4 : 2,
  };
}
