import {
  DEFAULT_LABEL_WEIGHTS,
  QUALITY_LABEL_MAX,
  QUALITY_LABEL_MIN,
  type QualityDataPoint,
  type QualityLabelWeights,
} from "@/lib/quality-model/types";

export function vivinoToQualityScore(rating: number): number {
  const clamped = Math.max(1, Math.min(5, rating));
  return clamped * 20;
}

export function buildQualityLabel(
  point: QualityDataPoint,
  weights: QualityLabelWeights = DEFAULT_LABEL_WEIGHTS,
): { label: number | null; sources: string[] } {
  const contributions: Array<{ value: number; weight: number; source: string }> =
    [];

  if (point.criticScore != null && Number.isFinite(point.criticScore)) {
    contributions.push({
      value: point.criticScore,
      weight: weights.critic,
      source: "critic",
    });
  }

  if (point.expertRating != null && Number.isFinite(point.expertRating)) {
    contributions.push({
      value: point.expertRating,
      weight: weights.expert,
      source: "expert",
    });
  }

  if (point.vivinoRating != null && Number.isFinite(point.vivinoRating)) {
    contributions.push({
      value: vivinoToQualityScore(point.vivinoRating),
      weight: weights.vivino,
      source: "vivino",
    });
  }

  if (point.consumerRating != null && Number.isFinite(point.consumerRating)) {
    contributions.push({
      value: point.consumerRating,
      weight: weights.consumer,
      source: "consumer",
    });
  }

  if (contributions.length === 0) {
    return { label: null, sources: [] };
  }

  const totalWeight = contributions.reduce((sum, item) => sum + item.weight, 0);
  const blended =
    contributions.reduce(
      (sum, item) => sum + item.value * (item.weight / totalWeight),
      0,
    );

  const label = Math.max(
    QUALITY_LABEL_MIN,
    Math.min(QUALITY_LABEL_MAX, Math.round(blended * 10) / 10),
  );

  return {
    label,
    sources: contributions.map((item) => item.source),
  };
}

export function computeRmse(actual: number[], predicted: number[]): number {
  if (actual.length === 0 || actual.length !== predicted.length) return NaN;
  const mse =
    actual.reduce((sum, value, index) => {
      const diff = value - predicted[index];
      return sum + diff * diff;
    }, 0) / actual.length;
  return Math.round(Math.sqrt(mse) * 100) / 100;
}

export function computeMae(actual: number[], predicted: number[]): number {
  if (actual.length === 0 || actual.length !== predicted.length) return NaN;
  const mae =
    actual.reduce((sum, value, index) => {
      return sum + Math.abs(value - predicted[index]);
    }, 0) / actual.length;
  return Math.round(mae * 100) / 100;
}

/** Fisher-Yates shuffle (in-place copy). */
export function shuffle<T>(items: T[], random = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function splitTrainTest<T>(
  items: T[],
  testRatio = 0.2,
  random = Math.random,
): { train: T[]; test: T[] } {
  const shuffled = shuffle(items, random);
  const testSize = Math.max(1, Math.round(shuffled.length * testRatio));
  return {
    train: shuffled.slice(testSize),
    test: shuffled.slice(0, testSize),
  };
}
