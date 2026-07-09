import {
  isAutochthonousGrapeMix,
  isPremiumValueRegion,
} from "@/lib/scoring";
import {
  M3_REFERENCE_WINERY_PATTERNS,
  Q_HAT_MAX,
  Q_HAT_MIN,
} from "@/lib/scoring-v2/constants";
import {
  normalizeGrapeHaystack,
  normalizeWineryName,
} from "@/lib/scoring-v2/normalize";

export interface QualityEstimateInput {
  grapeVarieties?: string[];
  region?: string;
  wineryName?: string;
  wineType?: string;
  cellarPotential?: number | null;
  acidity?: number | null;
  tasteProfile?: string | null;
  vintage?: number | null;
  ratingAvg?: number | null;
  communityScore?: number | null;
  /** When ML service returns Q_hat, use it directly. */
  estimatedQuality?: number | null;
  referenceYear?: number;
}

/**
 * Bayesian-style prior for intrinsic quality, independent of price.
 * Replaced by ML microservice when available (see lib/scoring-ml.ts).
 */
export function estimateIntrinsicQuality(input: QualityEstimateInput): number {
  if (
    input.estimatedQuality != null &&
    Number.isFinite(input.estimatedQuality)
  ) {
    return clampQHat(input.estimatedQuality);
  }

  let q = 58;

  const grapes = input.grapeVarieties ?? [];
  const haystack = normalizeGrapeHaystack(grapes);

  if (/\bfeteasca[\s-]+neagra\b/i.test(haystack)) q += 5;
  else if (/\bnegru[\s-]+de[\s-]+dragasani\b/i.test(haystack)) q += 4;
  else if (/\bfeteasca[\s-]+regala\b/i.test(haystack)) q += 3;
  else if (isAutochthonousGrapeMix(grapes)) q += 2;

  if (isPremiumValueRegion(input.region ?? "")) q += 3;

  if (isReferenceWinery(input.wineryName)) q += 2;

  const wineType = normalizeWineType(input.wineType);
  if (wineType === "sparkling" || wineType === "spumant") q += 2;
  if (wineType === "dessert" || wineType === "dulce") q += 1;

  const cellarYears = input.cellarPotential ?? 0;
  if (cellarYears >= 8) q += 4;
  else if (cellarYears >= 5) q += 3;
  else if (cellarYears >= 3) q += 2;
  else if (cellarYears >= 1) q += 1;

  if (input.acidity != null && input.acidity >= 5.5) q += 2;
  else if (input.acidity != null && input.acidity >= 4.5) q += 1;

  if (input.tasteProfile?.trim()) {
    const taste = input.tasteProfile
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    if (/complex|elegant|mineral|persistent|structur|barrique|stejar/.test(taste)) {
      q += 2;
    }
  }

  q += vintagePrior(input.vintage, input.referenceYear);

  if (input.ratingAvg != null && input.ratingAvg >= 3.8) {
    const ratingBoost = Math.min(6, (input.ratingAvg - 3.5) * 8);
    q += ratingBoost;
  }

  if (input.communityScore != null && input.communityScore >= 60) {
    q += Math.min(4, (input.communityScore - 60) / 10);
  }

  return clampQHat(q);
}

function clampQHat(value: number): number {
  return Math.min(Q_HAT_MAX, Math.max(Q_HAT_MIN, Math.round(value * 10) / 10));
}

function isReferenceWinery(wineryName: string | undefined): boolean {
  if (!wineryName?.trim()) return false;
  const normalized = normalizeWineryName(wineryName);
  return M3_REFERENCE_WINERY_PATTERNS.some((pattern) => pattern.test(normalized));
}

function normalizeWineType(wineType: string | undefined): string {
  return (wineType ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function vintagePrior(
  vintage: number | null | undefined,
  referenceYear: number | undefined,
): number {
  if (vintage == null) return 0;
  const year = referenceYear ?? new Date().getFullYear();
  const age = year - vintage;
  if (age < 0) return -1;
  if (age <= 1) return 0;
  if (age <= 3) return 1;
  if (age <= 6) return 2;
  if (age <= 10) return 1;
  if (age <= 15) return 0;
  return -1;
}

export function inferDrinkabilityWindow(input: {
  vintage?: number | null;
  wineType?: string;
  cellarPotential?: number | null;
  drinkabilityStart?: number | null;
  drinkabilityEnd?: number | null;
}): { start: number | null; end: number | null } {
  if (input.drinkabilityStart != null && input.drinkabilityEnd != null) {
    return { start: input.drinkabilityStart, end: input.drinkabilityEnd };
  }

  const vintage = input.vintage;
  const cellarYears = input.cellarPotential;
  if (vintage == null || cellarYears == null || cellarYears <= 0) {
    return { start: null, end: null };
  }

  const wineType = normalizeWineType(input.wineType);
  const isRed = wineType === "red" || wineType === "rosu";
  const startOffset = isRed ? 2 : 1;
  const start = vintage + startOffset;
  const end = vintage + cellarYears;

  return { start, end };
}

export function calculateDrinkabilityPenalty(input: {
  drinkabilityStart: number | null;
  drinkabilityEnd: number | null;
  referenceYear?: number;
}): number {
  const start = input.drinkabilityStart;
  const end = input.drinkabilityEnd;
  if (start == null || end == null) return 0;

  const year = input.referenceYear ?? new Date().getFullYear();

  if (year < start) {
    const yearsEarly = start - year;
    return -Math.min(
      yearsEarly * 2,
      6,
    );
  }

  if (year > end) {
    const yearsLate = year - end;
    return -Math.min(
      yearsLate * 3,
      9,
    );
  }

  return 0;
}
