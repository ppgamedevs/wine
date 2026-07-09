import {
  FINAL_SCORE_MAX,
  FINAL_SCORE_MIN,
  PRICE_ALPHA,
  PRICE_REF_RON,
  SIGMOID_K,
  SIGMOID_S0,
} from "@/lib/scoring-v2/constants";

export function calculateQualitySurplus(
  qFinal: number,
  price: number,
): number {
  const safePrice = Math.max(price, 1);
  const logTerm = PRICE_ALPHA * Math.log(safePrice / PRICE_REF_RON);
  return Math.round((qFinal - logTerm) * 100) / 100;
}

export function sigmoidValueScore(surplus: number): number {
  const exponent = -SIGMOID_K * (surplus - SIGMOID_S0);
  const value = 100 / (1 + Math.exp(exponent));
  return Math.round(value * 100) / 100;
}

export function clampRawSigmoidScore(score: number): number {
  return Math.max(
    FINAL_SCORE_MIN,
    Math.min(FINAL_SCORE_MAX, Math.round(score)),
  );
}

/**
 * Maps raw sigmoid scores to percentile ranks on [2, 99].
 * Uses average ranks for ties.
 */
export function percentileNormalizeScores(
  entries: Array<{ id: number; rawScore: number }>,
): Map<number, number> {
  if (entries.length === 0) return new Map();
  if (entries.length === 1) {
    return new Map([[entries[0].id, clampRawSigmoidScore(entries[0].rawScore)]]);
  }

  const sorted = [...entries].sort((a, b) => a.rawScore - b.rawScore);
  const result = new Map<number, number>();

  let index = 0;
  while (index < sorted.length) {
    let end = index;
    while (
      end + 1 < sorted.length &&
      sorted[end + 1].rawScore === sorted[index].rawScore
    ) {
      end += 1;
    }

    const avgRank = (index + end) / 2;
    const percentileScore = Math.round(
      FINAL_SCORE_MIN +
        (avgRank / (sorted.length - 1)) *
          (FINAL_SCORE_MAX - FINAL_SCORE_MIN),
    );

    for (let i = index; i <= end; i += 1) {
      result.set(sorted[i].id, percentileScore);
    }

    index = end + 1;
  }

  return result;
}

export interface DistributionBucket {
  label: string;
  min: number;
  max: number;
  targetShare: number;
}

export const TARGET_DISTRIBUTION: DistributionBucket[] = [
  { label: "sub medie", min: 25, max: 39, targetShare: 0.1 },
  { label: "slab", min: 40, max: 54, targetShare: 0.2 },
  { label: "onest", min: 55, max: 74, targetShare: 0.4 },
  { label: "bun", min: 75, max: 89, targetShare: 0.2 },
  { label: "exceptional", min: 90, max: 99, targetShare: 0.1 },
];

/**
 * Bucket-based percentile mapping aligned with the v2 target distribution.
 */
export function bucketPercentileNormalizeScores(
  entries: Array<{ id: number; rawScore: number }>,
): Map<number, number> {
  if (entries.length === 0) return new Map();
  if (entries.length === 1) {
    return new Map([[entries[0].id, clampRawSigmoidScore(entries[0].rawScore)]]);
  }

  const sorted = [...entries].sort((a, b) => a.rawScore - b.rawScore);
  const result = new Map<number, number>();
  const n = sorted.length;

  let cursor = 0;
  for (const bucket of TARGET_DISTRIBUTION) {
    const count = Math.max(1, Math.round(n * bucket.targetShare));
    const sliceEnd = Math.min(n, cursor + count);

    for (let i = cursor; i < sliceEnd; i += 1) {
      const positionInBucket = sliceEnd > cursor ? (i - cursor) / (sliceEnd - cursor) : 0;
      const score = Math.round(
        bucket.min + positionInBucket * (bucket.max - bucket.min),
      );
      result.set(sorted[i].id, Math.max(FINAL_SCORE_MIN, Math.min(FINAL_SCORE_MAX, score)));
    }

    cursor = sliceEnd;
    if (cursor >= n) break;
  }

  for (let i = cursor; i < n; i += 1) {
    result.set(sorted[i].id, TARGET_DISTRIBUTION[TARGET_DISTRIBUTION.length - 1].max);
  }

  return result;
}
