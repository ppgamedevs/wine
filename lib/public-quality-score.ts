import { resolvePublicPrice } from "@/lib/public-price";
import { calculateQualityConfidence } from "@/lib/scoring-v2/quality-confidence";
import { clamp, roundScore } from "@/lib/scoring-v2/math";
import type { WineMedal } from "@/lib/schema";
import type { WineWithRelations } from "@/types";

export type PublicQualityStatus = "known" | "insufficient";

/** Editorial quality filters, separate from Value Score thresholds. */
export const QUALITY_RECOMMENDED_MIN = 70;
export const QUALITY_EXCEPTIONAL_MIN = 78;
/** Quality is independent of price and uses its own, evidence-led color bands. */
export function qualityScoreTone(score: number | null | undefined): string {
  if (score == null || !Number.isFinite(score)) {
    return "bg-muted/60 text-muted-foreground ring-1 ring-border/70";
  }
  if (score >= QUALITY_EXCEPTIONAL_MIN) {
    return "bg-emerald-700/10 text-emerald-800 ring-1 ring-emerald-700/25";
  }
  if (score >= QUALITY_RECOMMENDED_MIN) {
    return "bg-teal-600/10 text-teal-800 ring-1 ring-teal-600/25";
  }
  if (score >= 60) {
    return "bg-amber-500/15 text-amber-900 ring-1 ring-amber-500/30";
  }
  return "bg-rose-600/10 text-rose-800 ring-1 ring-rose-600/25";
}


export interface PublicQualityScore {
  status: PublicQualityStatus;
  score: number | null;
  /** 0-100 evidence confidence, not a quality percentage. */
  confidence: number;
  source:
    | "quality_final"
    | "quality_effective"
    | "estimated_quality"
    | null;
  evidence: string[];
  missing: string[];
  reason: string;
}

export interface PublicValueScore {
  status: "known" | "unavailable";
  score: number | null;
  priceRon: number | null;
  offerId: string | null;
  reason:
    | "ok"
    | "qualified_price_required"
    | "stale_or_unqualified_offer"
    | "no_value_score";
}

type QualityWine = Pick<
  WineWithRelations,
  | "estimatedQuality"
  | "qualityEffective"
  | "qualityFinal"
  | "grapeVarieties"
  | "region"
  | "winery"
  | "vintage"
  | "tastingNotes"
  | "medals"
  | "criticScore"
  | "ratingAvg"
  | "ratingCount"
  | "communityScore"
  | "producerPageUrl"
  | "tastingSheetUrl"
  | "alcohol"
  | "acidity"
  | "producerContent"
>;

type ValueWine = Pick<
  WineWithRelations,
  "slug" | "name" | "vintage" | "affiliateLinks" | "priceHistory" | "valueScore"
>;

function finite(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value);
}

function hasTastingEvidence(wine: QualityWine): boolean {
  return Boolean(
    wine.tastingNotes?.trim() ||
      wine.producerContent?.tastingNotes?.trim() ||
      wine.tastingSheetUrl?.trim(),
  );
}

function evidenceConfidence(wine: QualityWine): number {
  return calculateQualityConfidence({
    grapeVarieties: (wine.grapeVarieties ?? []).map((grape) => grape.name),
    region: wine.region?.name,
    wineryName: wine.winery?.name,
    wineMedals: wine.medals as WineMedal[],
    criticScore: wine.criticScore,
    ratingAvg: wine.ratingAvg,
    communityScore: wine.communityScore,
    hasMlModel: finite(wine.estimatedQuality),
    mlPrediction: finite(wine.estimatedQuality) ? wine.estimatedQuality : null,
  });
}

function evidenceLabels(wine: QualityWine): string[] {
  const labels: string[] = [];
  if (hasTastingEvidence(wine)) labels.push("tasting evidence");
  if ((wine.medals?.length ?? 0) > 0) labels.push("medals");
  if (finite(wine.criticScore)) labels.push("critic score");
  if (wine.tastingSheetUrl?.trim()) labels.push("technical sheet");
  if (wine.producerPageUrl?.trim()) labels.push("producer source");
  if ((wine.ratingCount ?? 0) > 0 && finite(wine.ratingAvg)) {
    labels.push("community ratings");
  }
  if ((wine.grapeVarieties?.length ?? 0) > 0) labels.push("grape identity");
  if (wine.region?.name) labels.push("region");
  if (wine.winery?.name) labels.push("winery");
  return labels;
}

function missingQualityEvidence(wine: QualityWine): string[] {
  const missing: string[] = [];
  if (!hasTastingEvidence(wine)) missing.push("tasting notes or technical sheet");
  if ((wine.medals?.length ?? 0) === 0 && !finite(wine.criticScore)) {
    missing.push("independent or competition evidence");
  }
  if (!finite(wine.alcohol)) missing.push("alcohol");
  if (!finite(wine.acidity)) missing.push("acidity");
  return missing;
}

/**
 * Public quality score is independent from price. It only uses stored Q
 * evidence, never valueScore. A provisional Q estimate needs substantive
 * sensory/producer evidence before it is exposed.
 */
export function resolvePublicQualityScore(
  wine: QualityWine,
): PublicQualityScore {
  const evidence = evidenceLabels(wine);
  const missing = missingQualityEvidence(wine);

  if (finite(wine.qualityFinal)) {
    return {
      status: "known",
      score: roundScore(clamp(wine.qualityFinal, 0, 100)),
      confidence: 90,
      source: "quality_final",
      evidence,
      missing,
      reason:
        "Scor de calitate final, calculat din evaluarea VinIntel fara pret.",
    };
  }

  if (finite(wine.qualityEffective)) {
    return {
      status: "known",
      score: roundScore(clamp(wine.qualityEffective, 0, 100)),
      confidence: 78,
      source: "quality_effective",
      evidence,
      missing,
      reason:
        "Scor de calitate din evaluarea VinIntel, independent de oferta comerciala.",
    };
  }

  if (finite(wine.estimatedQuality)) {
    const confidence = Math.round(evidenceConfidence(wine) * 100);
    const substantive =
      hasTastingEvidence(wine) ||
      (wine.medals?.length ?? 0) > 0 ||
      finite(wine.criticScore) ||
      ((wine.ratingCount ?? 0) >= 3 && finite(wine.ratingAvg));
    if (substantive && confidence >= 55) {
      return {
        status: "known",
        score: roundScore(clamp(wine.estimatedQuality, 0, 100)),
        confidence,
        source: "estimated_quality",
        evidence,
        missing,
        reason:
          "Estimare de calitate fara pret, cu dovezi senzoriale sau de producator suficiente.",
      };
    }
    return {
      status: "insufficient",
      score: null,
      confidence,
      source: null,
      evidence,
      missing,
      reason:
        "Exista o estimare interna, dar dovezile sunt prea slabe pentru un scor public de calitate.",
    };
  }

  return {
    status: "insufficient",
    score: null,
    confidence: Math.round(evidenceConfidence(wine) * 100),
    source: null,
    evidence,
    missing,
    reason:
      "Nu exista suficiente dovezi pentru un scor de calitate. Nu inventam unul.",
  };
}

/**
 * Value Score is strictly price-dependent. A stale, non-Profitshare or
 * different-product offer cannot unlock it.
 */
export function resolvePublicValueScore(
  wine: ValueWine,
  now: Date = new Date(),
): PublicValueScore {
  const pricing = resolvePublicPrice(wine, { now });
  if (pricing.status !== "verified" || !pricing.bestOffer) {
    const anyProfitshare = (wine.affiliateLinks ?? []).some((link) =>
      /profitshare/i.test(link.url),
    );
    return {
      status: "unavailable",
      score: null,
      priceRon: null,
      offerId: null,
      reason: anyProfitshare
        ? "stale_or_unqualified_offer"
        : "qualified_price_required",
    };
  }
  if (!finite(wine.valueScore)) {
    return {
      status: "unavailable",
      score: null,
      priceRon: pricing.bestOffer.priceRon,
      offerId: pricing.bestOffer.offerId,
      reason: "no_value_score",
    };
  }
  return {
    status: "known",
    score: roundScore(clamp(wine.valueScore, 0, 100)),
    priceRon: pricing.bestOffer.priceRon,
    offerId: pricing.bestOffer.offerId,
    reason: "ok",
  };
}
