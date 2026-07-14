import {
  FINAL_SCORE_MAX,
  FINAL_SCORE_MIN,
  PRICE_EFFICIENCY_BASE,
  PRICE_EFFICIENCY_MAX,
  PRICE_EFFICIENCY_MIN,
  PRICE_EFFICIENCY_SLOPE,
  PRICE_EFFICIENCY_WEIGHT,
  QUALITY_CEILING_OFFSET,
  QUALITY_FLOOR_OFFSET,
  QUALITY_WEIGHT,
  VALUE_SCORE_VERSION,
} from "@/lib/scoring-v2/constants";
import { expectedQualityAtPrice } from "@/lib/scoring-v2/expected-quality";
import {
  buildModelQuality,
  shrinkQualityToPrior,
  type IntrinsicQualityInput,
} from "@/lib/scoring-v2/intrinsic-quality";
import { clamp, round1, roundScore } from "@/lib/scoring-v2/math";
import {
  calculateQualityConfidence,
  confidenceLabel,
  confidencePercent,
  isProvisionalScore,
  resolveConfidenceScoreCeiling,
} from "@/lib/scoring-v2/quality-confidence";
import { resolvePeerQualityPrior } from "@/lib/scoring-v2/peer-prior";

export interface VinIntelScoreInput extends IntrinsicQualityInput {
  price: number;
  peerQualityPrior?: number;
  expectedQualityAtPrice?: number;
  qualityConfidenceOverride?: number;
}

export interface VinIntelScoreBreakdownItem {
  label: string;
  detail: string;
  points: number;
}

export interface VinIntelScoreResult {
  version: typeof VALUE_SCORE_VERSION;
  modelQuality: number;
  peerQualityPrior: number;
  qualityConfidence: number;
  /** Increderea (0-100%) folosita pentru plafonul de scor si pentru UI. */
  confidencePercent: number;
  /** Scorul maxim permis la acest nivel de incredere (vezi CONFIDENCE_SCORE_CEILINGS). */
  confidenceScoreCeiling: number;
  quality: number;
  expectedQualityAtPrice: number;
  valueDelta: number;
  priceEfficiency: number;
  rawScore: number;
  valueScore: number;
  provisional: boolean;
  confidenceLabel: string;
  items: VinIntelScoreBreakdownItem[];
}

export function calculatePriceEfficiency(
  quality: number,
  expectedQuality: number,
): number {
  const delta = quality - expectedQuality;
  return roundScore(
    clamp(
      PRICE_EFFICIENCY_BASE + PRICE_EFFICIENCY_SLOPE * delta,
      PRICE_EFFICIENCY_MIN,
      PRICE_EFFICIENCY_MAX,
    ),
  );
}

export function calculateVinIntelScore(
  input: VinIntelScoreInput,
  options?: {
    peerPriors?: Map<string, number>;
    expectedCurves?: Map<string, { intercept: number; logSlope: number }>;
  },
): VinIntelScoreResult {
  const items: VinIntelScoreBreakdownItem[] = [];
  const price = Math.max(input.price, 1);

  if (input.price <= 0) {
    const { modelQuality, mlUsed, mlPrediction, medalBoostApplied } =
      buildModelQuality(input);
    const peerQualityPrior =
      input.peerQualityPrior ??
      resolvePeerQualityPrior(input.wineType, price, options?.peerPriors);
    const qualityConfidence =
      input.qualityConfidenceOverride ??
      Math.min(
        0.35,
        calculateQualityConfidence({
          grapeVarieties: input.grapeVarieties,
          region: input.region,
          wineryName: input.wineryName,
          wineMedals: input.wineMedals,
          criticScore: input.criticScore,
          ratingAvg: input.ratingAvg,
          communityScore: input.communityScore,
          hasMlModel: mlUsed,
          mlPrediction,
        }),
      );
    const quality = shrinkQualityToPrior(
      modelQuality,
      peerQualityPrior,
      qualityConfidence,
    );

    const noPriceConfidencePercent = confidencePercent(qualityConfidence);
    const noPriceCeiling = resolveConfidenceScoreCeiling(
      noPriceConfidencePercent,
    );
    const noPriceValueScore = Math.min(Math.round(quality), noPriceCeiling);
    const noPriceItems: VinIntelScoreBreakdownItem[] = [
      {
        label: "Calitate estimata (Q)",
        detail: "Pret indisponibil: afisam doar calitatea intrinseca",
        points: quality,
      },
      {
        label: "Eficienta pret",
        detail: medalBoostApplied > 0 ? "Nu se calculeaza fara pret" : "Nu se calculeaza fara pret",
        points: 0,
      },
    ];
    if (noPriceValueScore < Math.round(quality)) {
      noPriceItems.push({
        label: "Plafon incredere date",
        detail: `Increderea datelor (${noPriceConfidencePercent}%) limiteaza scorul maxim la ${noPriceCeiling}/100`,
        points: noPriceValueScore - Math.round(quality),
      });
    }

    return {
      version: VALUE_SCORE_VERSION,
      modelQuality,
      peerQualityPrior,
      qualityConfidence,
      confidencePercent: noPriceConfidencePercent,
      confidenceScoreCeiling: noPriceCeiling,
      quality,
      expectedQualityAtPrice: 0,
      valueDelta: 0,
      priceEfficiency: PRICE_EFFICIENCY_BASE,
      rawScore: quality,
      valueScore: noPriceValueScore,
      provisional: true,
      confidenceLabel: confidenceLabel(qualityConfidence),
      items: noPriceItems,
    };
  }

  const {
    modelQuality,
    mlUsed,
    mlPrediction,
    medalBoostApplied,
  } = buildModelQuality(input);

  items.push({
    label: "Q model (calitate intrinseca)",
    detail: mlUsed
      ? `Estimare ML ${modelQuality}${medalBoostApplied > 0 ? `, medalii +${medalBoostApplied}` : ""}`
      : `Heuristica fara pret${medalBoostApplied > 0 ? `, medalii +${medalBoostApplied}` : ""}`,
    points: modelQuality,
  });

  const peerQualityPrior =
    input.peerQualityPrior ??
    resolvePeerQualityPrior(input.wineType, price, options?.peerPriors);

  items.push({
    label: "Q prior (vinuri similare)",
    detail: `Mediana segment tip + interval pret (${peerQualityPrior})`,
    points: peerQualityPrior,
  });

  const qualityConfidence =
    input.qualityConfidenceOverride ??
    calculateQualityConfidence({
      grapeVarieties: input.grapeVarieties,
      region: input.region,
      wineryName: input.wineryName,
      wineMedals: input.wineMedals,
      criticScore: input.criticScore,
      ratingAvg: input.ratingAvg,
      communityScore: input.communityScore,
      hasMlModel: mlUsed,
      mlPrediction,
    });

  const quality = shrinkQualityToPrior(
    modelQuality,
    peerQualityPrior,
    qualityConfidence,
  );

  items.push({
    label: "Calitate estimata (Q)",
    detail: `Q = prior + ${qualityConfidence} x (Q_model - prior)`,
    points: quality,
  });

  const expected =
    input.expectedQualityAtPrice ??
    expectedQualityAtPrice(price, input.wineType, options?.expectedCurves);

  const valueDelta = round1(quality - expected);
  items.push({
    label: "Calitate asteptata la pret (E)",
    detail: `Segment ${input.wineType ?? "vin"} la ${Math.round(price)} RON`,
    points: expected,
  });

  items.push({
    label: "Delta fata de segment (Q - E)",
    detail:
      valueDelta >= 0
        ? `${valueDelta} puncte peste nivelul obisnuit al pretului`
        : `${Math.abs(valueDelta)} puncte sub nivelul obisnuit al pretului`,
    points: valueDelta,
  });

  const priceEfficiency = calculatePriceEfficiency(quality, expected);
  items.push({
    label: "Eficienta pret",
    detail: `70 + 3 x (Q - E), plafon 35-97`,
    points: priceEfficiency,
  });

  const rawScore = round1(
    QUALITY_WEIGHT * quality + PRICE_EFFICIENCY_WEIGHT * priceEfficiency,
  );
  items.push({
    label: "Scor brut combinat",
    detail: `${QUALITY_WEIGHT * 100}% Q + ${PRICE_EFFICIENCY_WEIGHT * 100}% eficienta pret`,
    points: rawScore,
  });

  const minScore = Math.max(FINAL_SCORE_MIN, quality - QUALITY_FLOOR_OFFSET);
  const maxScore = Math.min(FINAL_SCORE_MAX, quality + QUALITY_CEILING_OFFSET);
  const qualityClampedScore = roundScore(clamp(rawScore, minScore, maxScore));

  if (qualityClampedScore !== Math.round(rawScore)) {
    items.push({
      label: "Plafonare calitate",
      detail: `Interval permis ${Math.round(minScore)}-${Math.round(maxScore)} (Q=${quality})`,
      points: qualityClampedScore - Math.round(rawScore),
    });
  }

  const scoreConfidencePercent = confidencePercent(qualityConfidence);
  const confidenceCeiling = resolveConfidenceScoreCeiling(
    scoreConfidencePercent,
  );
  const valueScore = Math.min(qualityClampedScore, confidenceCeiling);

  if (valueScore < qualityClampedScore) {
    items.push({
      label: "Plafon incredere date",
      detail: `Increderea datelor (${scoreConfidencePercent}%) limiteaza scorul maxim la ${confidenceCeiling}/100`,
      points: valueScore - qualityClampedScore,
    });
  }

  const provisional = isProvisionalScore(qualityConfidence);

  return {
    version: VALUE_SCORE_VERSION,
    modelQuality,
    peerQualityPrior,
    qualityConfidence,
    confidencePercent: scoreConfidencePercent,
    confidenceScoreCeiling: confidenceCeiling,
    quality,
    expectedQualityAtPrice: expected,
    valueDelta,
    priceEfficiency,
    rawScore,
    valueScore,
    provisional,
    confidenceLabel: confidenceLabel(qualityConfidence),
    items,
  };
}

export function calculateVinIntelValueScore(
  input: VinIntelScoreInput,
  options?: {
    peerPriors?: Map<string, number>;
    expectedCurves?: Map<string, { intercept: number; logSlope: number }>;
  },
): number {
  return calculateVinIntelScore(input, options).valueScore;
}
