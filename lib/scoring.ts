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
