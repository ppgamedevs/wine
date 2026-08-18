export interface DistributionStats {
  count: number;
  mean: number;
  median: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  min: number;
  max: number;
}

function rounded(value: number): number {
  return Math.round(value * 100) / 100;
}

function percentile(sorted: number[], fraction: number): number {
  if (sorted.length === 0) return 0;
  const position = (sorted.length - 1) * fraction;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower]!;
  const weight = position - lower;
  return sorted[lower]! * (1 - weight) + sorted[upper]! * weight;
}

export function distributionStats(values: Array<number | null | undefined>): DistributionStats {
  const sorted = values
    .filter((value): value is number => value != null && Number.isFinite(value))
    .sort((left, right) => left - right);
  const mean =
    sorted.length === 0
      ? 0
      : sorted.reduce((total, value) => total + value, 0) / sorted.length;
  return {
    count: sorted.length,
    mean: rounded(mean),
    median: rounded(percentile(sorted, 0.5)),
    p10: rounded(percentile(sorted, 0.1)),
    p25: rounded(percentile(sorted, 0.25)),
    p50: rounded(percentile(sorted, 0.5)),
    p75: rounded(percentile(sorted, 0.75)),
    p90: rounded(percentile(sorted, 0.9)),
    min: rounded(sorted[0] ?? 0),
    max: rounded(sorted.at(-1) ?? 0),
  };
}

function ranks(values: number[]): number[] {
  const ordered = values
    .map((value, index) => ({ value, index }))
    .sort((left, right) => left.value - right.value);
  const result = new Array<number>(values.length);
  let index = 0;
  while (index < ordered.length) {
    let end = index;
    while (end + 1 < ordered.length && ordered[end + 1]!.value === ordered[index]!.value) {
      end += 1;
    }
    const rank = (index + end + 2) / 2;
    for (let cursor = index; cursor <= end; cursor += 1) {
      result[ordered[cursor]!.index] = rank;
    }
    index = end + 1;
  }
  return result;
}

export function spearmanCorrelation(left: number[], right: number[]): number | null {
  if (left.length !== right.length || left.length < 2) return null;
  const leftRanks = ranks(left);
  const rightRanks = ranks(right);
  const leftMean = leftRanks.reduce((sum, value) => sum + value, 0) / leftRanks.length;
  const rightMean = rightRanks.reduce((sum, value) => sum + value, 0) / rightRanks.length;
  let numerator = 0;
  let leftSquares = 0;
  let rightSquares = 0;
  for (let index = 0; index < leftRanks.length; index += 1) {
    const leftDelta = leftRanks[index]! - leftMean;
    const rightDelta = rightRanks[index]! - rightMean;
    numerator += leftDelta * rightDelta;
    leftSquares += leftDelta ** 2;
    rightSquares += rightDelta ** 2;
  }
  const denominator = Math.sqrt(leftSquares * rightSquares);
  return denominator === 0 ? null : rounded(numerator / denominator);
}

export function overlapCount(left: string[], right: string[], limit: number): number {
  const set = new Set(left.slice(0, limit));
  return right.slice(0, limit).filter((value) => set.has(value)).length;
}

export function deltaBucket(delta: number): "0-4" | "5-9" | "10-19" | "20+" {
  const absolute = Math.abs(delta);
  if (absolute <= 4) return "0-4";
  if (absolute <= 9) return "5-9";
  if (absolute <= 19) return "10-19";
  return "20+";
}

export function giftConfidenceBand(
  confidence: number,
): "<40" | "40-54" | "55-69" | "70-84" | "85+" {
  if (confidence < 40) return "<40";
  if (confidence < 55) return "40-54";
  if (confidence < 70) return "55-69";
  if (confidence < 85) return "70-84";
  return "85+";
}

export function giftDisplayState(
  confidence: number,
): "HIDDEN" | "LIMITED" | "NORMAL" {
  if (confidence < 40) return "HIDDEN";
  if (confidence < 55) return "LIMITED";
  return "NORMAL";
}

export function priceBand(price: number | null | undefined): string {
  if (price == null) return "unknown";
  if (price < 30) return "<30";
  if (price < 50) return "30-50";
  if (price < 75) return "50-75";
  if (price < 100) return "75-100";
  if (price < 150) return "100-150";
  return "150+";
}

export function hardBudgetCompliant(
  price: number | null | undefined,
  maximum: number,
): boolean {
  return price != null && price <= maximum;
}

export function classifyOccasionSanity(input: {
  occasion: string;
  type: string;
  sweetness: string | null | undefined;
  confidence: number;
  eligibility: string;
  price: number | null | undefined;
  budgetMax?: number;
}): "OBVIOUSLY_GOOD" | "PLAUSIBLE" | "QUESTIONABLE" | "BAD" {
  if (input.budgetMax != null && !hardBudgetCompliant(input.price, input.budgetMax)) return "BAD";
  if (input.eligibility === "REVIEW_REQUIRED") return "BAD";
  if (
    input.occasion === "pentru-desert" &&
    input.sweetness === "sec" &&
    input.type !== "dessert"
  ) {
    return "BAD";
  }
  if (input.confidence < 45) return "QUESTIONABLE";
  if (input.confidence >= 65) return "OBVIOUSLY_GOOD";
  return "PLAUSIBLE";
}

export function removePairingProducerEvidence<T extends {
  dish: string;
  basis?: string[];
}>(
  pairings: T[],
  targetDish: string,
): T[] {
  return pairings.map((pairing) =>
    pairing.dish === targetDish
      ? {
          ...pairing,
          basis: (pairing.basis ?? []).filter((basis) => basis !== "producer_evidence"),
        }
      : pairing,
  );
}
