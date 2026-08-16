/**
 * Gift Score v2.
 *
 * Intrebare: "Cat de buna este sticla aceasta ca alegere de cadou, in general?"
 * Scor global, deterministic. Nu e ocazie-specific si nu e scor de ambalaj.
 *
 * Nu foloseste: proza AI, tasteProfile, recommendedOccasions, pret-ca-prestigiu,
 * prestigiu hardcodat de crama, ambalaj inventat, sugestii LLM.
 */
import {
  GIFT_SCORE_ALGORITHM_VERSION,
} from "@/lib/scoring-v2/constants";
import { clamp, roundScore } from "@/lib/scoring-v2/math";
import type { WineMedal } from "@/lib/schema";

const AUTOCHTHONOUS_GRAPE_PATTERNS = [
  /\bfeteasca\b/i,
  /\btamaioasa\b/i,
  /\bbusuioaca\b/i,
  /\bbabeasca\b/i,
  /\brara neagra\b/i,
  /\bcramposie\b/i,
  /\bgrasa\b/i,
  /\bnovac\b/i,
  /\bsarba\b/i,
  /\bfrincusa\b/i,
  /\bnegru de dragasani\b/i,
  /\bgalbena\b/i,
] as const;

function isAutochthonousGrapeMix(grapeVarieties?: string[]): boolean {
  if (!grapeVarieties?.length) return false;
  const haystack = grapeVarieties.join(" ");
  return AUTOCHTHONOUS_GRAPE_PATTERNS.some((pattern) => pattern.test(haystack));
}

export const GIFT_CONFIDENCE_CEILINGS = [
  { minConfidencePercent: 85, maxScore: 96 },
  { minConfidencePercent: 70, maxScore: 92 },
  { minConfidencePercent: 55, maxScore: 86 },
  { minConfidencePercent: 40, maxScore: 78 },
  { minConfidencePercent: 25, maxScore: 70 },
  { minConfidencePercent: 0, maxScore: 64 },
] as const;

const QUALITY_WEIGHT = 0.5;
const CONFIDENCE_WEIGHT = 0.2;
const VALUE_WEIGHT = 0.15;
const DISTINCTIVENESS_WEIGHT = 0.1;
const TYPE_WEIGHT = 0.05;

export interface GiftScoreInput {
  price?: number | null;
  type?: string | null;
  grapeVarieties?: string[];
  region?: string | null;
  wineryName?: string | null;
  vintage?: number | null;
  valueScore?: number | null;
  estimatedQuality?: number | null;
  qualityFinal?: number | null;
  qualityEffective?: number | null;
  medals?: WineMedal[] | null;
  criticScore?: number | null;
  ratingAvg?: number | null;
  communityScore?: number | null;
  producerPageUrl?: string | null;
  tastingSheetUrl?: string | null;
  alcohol?: number | null;
  sweetness?: string | null;
}

export interface GiftScoreBreakdownItem {
  key: string;
  label: string;
  points: number;
  detail: string;
}

export interface GiftScoreResult {
  score: number;
  confidence: number;
  provisional: boolean;
  algorithmVersion: typeof GIFT_SCORE_ALGORITHM_VERSION;
  breakdown: GiftScoreBreakdownItem[];
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

function resolveQuality(input: GiftScoreInput): {
  quality: number;
  known: boolean;
  source: string;
} {
  if (input.qualityFinal != null && Number.isFinite(input.qualityFinal)) {
    return { quality: clamp(input.qualityFinal, 0, 100), known: true, source: "qualityFinal" };
  }
  if (input.qualityEffective != null && Number.isFinite(input.qualityEffective)) {
    return {
      quality: clamp(input.qualityEffective, 0, 100),
      known: true,
      source: "qualityEffective",
    };
  }
  if (input.estimatedQuality != null && Number.isFinite(input.estimatedQuality)) {
    return {
      quality: clamp(input.estimatedQuality, 0, 100),
      known: true,
      source: "estimatedQuality",
    };
  }
  return { quality: 56, known: false, source: "prior conservator" };
}

function typeSuitability(type: string): { score: number; detail: string } {
  switch (type) {
    case "sparkling":
      return { score: 68, detail: "Spumantul e usor de oferit, semnal mic de ocazie." };
    case "dessert":
      return { score: 62, detail: "Vinul de desert e potrivit ca dar de masa, nu universal." };
    case "rose":
      return { score: 58, detail: "Roze accesibil ca dar informal." };
    case "white":
      return { score: 56, detail: "Alb sec e un dar neutru, sigur." };
    case "red":
      return { score: 56, detail: "Rosu e un dar neutru, fara prestigiu automat." };
    case "orange":
      return { score: 52, detail: "Orange e mai nicis, semnal mic de potrivire." };
    default:
      return { score: 50, detail: "Tip necunoscut, prior neutru." };
  }
}

function cheapBottlePenalty(price: number | null | undefined): number {
  if (price == null || !Number.isFinite(price)) return 0;
  if (price < 20) return 8;
  if (price < 30) return 5;
  if (price < 40) return 2;
  return 0;
}

function giftConfidence(input: GiftScoreInput, qualityKnown: boolean): number {
  let confidence = 18;
  if ((input.grapeVarieties?.length ?? 0) > 0) confidence += 12;
  if (input.region?.trim()) confidence += 10;
  if (input.wineryName?.trim()) confidence += 10;
  if (input.vintage != null) confidence += 8;
  if (qualityKnown) confidence += 14;
  if (input.valueScore != null) confidence += 8;
  if ((input.medals?.length ?? 0) > 0) {
    confidence += Math.min(8, (input.medals?.length ?? 0) * 3);
  }
  if (input.criticScore != null && input.criticScore >= 70) confidence += 8;
  if (input.producerPageUrl?.trim() || input.tastingSheetUrl?.trim()) {
    confidence += 8;
  }
  if (input.ratingAvg != null && input.ratingAvg >= 3.5) confidence += 4;
  if (input.communityScore != null && input.communityScore >= 55) confidence += 3;
  if (input.alcohol != null) confidence += 3;
  if (input.sweetness) confidence += 3;
  return clamp(Math.round(confidence), 8, 96);
}

function resolveGiftCeiling(confidencePercent: number): number {
  for (const row of GIFT_CONFIDENCE_CEILINGS) {
    if (confidencePercent >= row.minConfidencePercent) return row.maxScore;
  }
  return 64;
}

export function calculateGiftScore(input: GiftScoreInput): GiftScoreResult {
  const type = normalizeType(input.type);
  const quality = resolveQuality(input);
  const confidence = giftConfidence(input, quality.known);
  const typePart = typeSuitability(type);
  const grapes = input.grapeVarieties ?? [];
  const distinctive = isAutochthonousGrapeMix(grapes);
  const distinctiveness = distinctive ? 78 : 52;
  const valueKnown = input.valueScore != null && Number.isFinite(input.valueScore);
  const value = valueKnown ? clamp(input.valueScore ?? 0, 0, 100) : 55;

  let qualityWeight = QUALITY_WEIGHT;
  let valueWeight = VALUE_WEIGHT;
  if (!quality.known) {
    qualityWeight = 0.28;
  }
  if (!valueKnown) {
    valueWeight = 0;
  }
  const knownWeight =
    qualityWeight + CONFIDENCE_WEIGHT + valueWeight + DISTINCTIVENESS_WEIGHT + TYPE_WEIGHT;
  const scale = knownWeight > 0 ? 1 / knownWeight : 1;

  const raw =
    quality.quality * qualityWeight * scale +
    confidence * CONFIDENCE_WEIGHT * scale +
    value * valueWeight * scale +
    distinctiveness * DISTINCTIVENESS_WEIGHT * scale +
    typePart.score * TYPE_WEIGHT * scale;

  const penalty = cheapBottlePenalty(input.price);
  const ceiling = resolveGiftCeiling(confidence);
  let score = roundScore(clamp(raw - penalty, 20, ceiling));

  if (score >= 90 && (confidence < 70 || quality.quality < 80 || !quality.known)) {
    score = Math.min(score, 88);
  }

  const breakdown: GiftScoreBreakdownItem[] = [
    {
      key: "quality",
      label: "Calitate estimata",
      points: roundScore(quality.quality),
      detail: quality.known
        ? `Q din ${quality.source}, fara al doilea bonus de medalii.`
        : "Q necunoscuta, prior conservator 56.",
    },
    {
      key: "confidence",
      label: "Incredere in date",
      points: confidence,
      detail: "Identitate, surse, medalii si scoruri existente. Nu proza editoriala.",
    },
    {
      key: "value",
      label: "Value Score (secundar)",
      points: roundScore(value),
      detail: valueKnown
        ? "Un cadou bun nu trebuie sa fie o teapa de pret."
        : "Value Score lipsa, componenta reponderata.",
    },
    {
      key: "distinctiveness",
      label: "Identitate romaneasca",
      points: distinctiveness,
      detail: distinctive
        ? "Soi autohton documentat."
        : "Fara identitate de soi autohton evidenta.",
    },
    {
      key: "type",
      label: "Tip vin (semnal mic)",
      points: typePart.score,
      detail: typePart.detail,
    },
  ];

  if (penalty > 0) {
    breakdown.push({
      key: "price_floor",
      label: "Practicabilitate pret",
      points: -penalty,
      detail: `Penalizare mica pentru sticla foarte ieftina (${input.price} RON). Pretul mare nu creste scorul.`,
    });
  }

  if (score < roundScore(raw - penalty) || score === ceiling) {
    breakdown.push({
      key: "ceiling",
      label: "Plafon incredere Gift",
      points: ceiling,
      detail: `Incredere ${confidence}% limiteaza Gift Score la ${ceiling}.`,
    });
  }

  return {
    score,
    confidence,
    provisional: confidence < 45,
    algorithmVersion: GIFT_SCORE_ALGORITHM_VERSION,
    breakdown,
  };
}
