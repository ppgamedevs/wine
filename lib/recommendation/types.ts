import type { WineWithRelations } from "@/types";

export type RecommendationEligibility =
  | "ELIGIBLE"
  | "ELIGIBLE_LOW_CONFIDENCE"
  | "REVIEW_REQUIRED";

export type BudgetConstraint = "hard" | "approximate" | "none";

export interface ScoreBreakdownItem {
  key: string;
  label: string;
  points: number;
  weight?: number;
  detail: string;
}

export interface RankedWine {
  wine: WineWithRelations;
  score: number;
  confidence: number;
  reasons: string[];
  breakdown: ScoreBreakdownItem[];
  eligibility: RecommendationEligibility;
}

export interface DishMatchResult {
  score: number;
  confidence: number;
  reasons: string[];
  evidenceLevel: 1 | 2 | 3 | 4;
  categoryMatched: boolean;
}

export interface OccasionMatchResult {
  score: number;
  confidence: number;
  breakdown: ScoreBreakdownItem[];
  reasons: string[];
  eligibility: RecommendationEligibility;
  dish?: DishMatchResult;
}
