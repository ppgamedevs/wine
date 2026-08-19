import type {
  MarketPriceEstimateStatus,
  WineMarketPriceEstimate,
} from "@/lib/market-price-discovery";
import {
  buildValueScoreBreakdown,
  valueScoreInputFromWine,
} from "@/lib/scoring";
import type { WineWithRelations } from "@/types";

export type EstimatedPriceConfidence =
  | "estimated_strong"
  | "estimated_limited";

export interface MarketPriceValueSimulation {
  wineId: number;
  slug: string;
  storedValueScore: number | null;
  simulatedValueScore: number;
  delta: number | null;
  estimatedPriceRon: number;
  priceConfidence: EstimatedPriceConfidence;
  valueActivationRecommended: false;
}

export function estimatedPriceConfidence(
  status: MarketPriceEstimateStatus,
): EstimatedPriceConfidence | null {
  if (status === "ESTIMATE_STRONG") return "estimated_strong";
  if (status === "ESTIMATE_LIMITED") return "estimated_limited";
  return null;
}

export function simulateValueScoreWithMarketEstimate(
  wine: WineWithRelations,
  estimate: WineMarketPriceEstimate,
): MarketPriceValueSimulation | null {
  const priceConfidence = estimatedPriceConfidence(estimate.status);
  if (
    estimate.estimatedMarketPrice == null ||
    priceConfidence == null
  ) {
    return null;
  }

  const baseInput = valueScoreInputFromWine({
    ...wine,
    currentPrice: null,
    priceAvg: null,
  });
  const simulatedValueScore = buildValueScoreBreakdown({
    ...baseInput,
    price: estimate.estimatedMarketPrice,
  }).finalScore;

  return {
    wineId: wine.id,
    slug: wine.slug,
    storedValueScore: wine.valueScore,
    simulatedValueScore,
    delta:
      wine.valueScore == null ? null : simulatedValueScore - wine.valueScore,
    estimatedPriceRon: estimate.estimatedMarketPrice,
    priceConfidence,
    valueActivationRecommended: false,
  };
}
