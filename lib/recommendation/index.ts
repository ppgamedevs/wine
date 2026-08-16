export {
  assessRecommendationEligibility,
  type EligibilityWine,
} from "@/lib/recommendation/eligibility";
export {
  scoreWineForDessert,
  scoreWineForDish,
  type DishMatchWine,
} from "@/lib/recommendation/dish-match";
export {
  OCCASION_MATCH_ALGORITHM_VERSION,
  compareOccasionMatches,
  occasionWeights,
  rankWinesForOccasion,
  scoreWineForOccasion,
  winePassesHardConstraints,
  type OccasionId,
  type OccasionMatchInput,
  type OccasionMatchWine,
} from "@/lib/recommendation/occasion-match";
export type {
  BudgetConstraint,
  DishMatchResult,
  OccasionMatchResult,
  RankedWine,
  RecommendationEligibility,
  ScoreBreakdownItem,
} from "@/lib/recommendation/types";
