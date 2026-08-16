/**
 * Production recommendation ranking used before Occasion Match v1.
 * Kept for shadow/legacy public UI so rankings do not silently switch to v2.
 */
import {
  collectSommelierPairingText,
  countDessertKeywordMatches,
  isSweetnessDessertFriendly,
} from "@/lib/dessert-pairings";
import { getOccasion, type OccasionId, type SommelierInput } from "@/lib/sommelier-occasions";
import type { WineWithRelations } from "@/types";

export interface LegacyRecommendation {
  wine: WineWithRelations;
  matchScore: number;
  reasons: string[];
  budgetFit: "under" | "ideal" | "over";
}

interface ScoredWine {
  wine: WineWithRelations;
  raw: number;
  reasons: string[];
  budgetFit: LegacyRecommendation["budgetFit"];
}

function maxAchievableScore(input: SommelierInput): number {
  const occasion = getOccasion(input.occasion);
  let max = 100;
  max += 8;
  if (input.color !== "any") max += 14;
  if (input.sweetness !== "any") max += 10;
  if (occasion.preferredTypes.length > 0) max += 10;
  if (occasion.dishKeywords.length > 0) max += 12;
  if (input.occasion === "pentru-desert") max += 44;
  if (input.preferredWinerySlugs.length > 0) max += 18;
  return max;
}

const COLOR_TO_TYPES: Record<SommelierInput["color"], WineWithRelations["type"][]> = {
  any: [],
  red: ["red"],
  white: ["white"],
  rose: ["rose"],
  sparkling: ["sparkling"],
};

function normalize(value: number | null | undefined): number {
  if (value === null || value === undefined) return 50;
  return Math.max(0, Math.min(100, value));
}

function scoreWineRaw(
  wine: WineWithRelations,
  input: SommelierInput,
): ScoredWine | null {
  const occasion = getOccasion(input.occasion);
  const reasons: string[] = [];

  const value = normalize(wine.valueScore);
  const gift = normalize(wine.giftScore);
  const food = normalize(wine.foodMatchScore);

  let score =
    value * occasion.weights.value +
    gift * occasion.weights.gift +
    food * occasion.weights.food;

  const price = wine.priceAvg ?? null;
  let budgetFit: LegacyRecommendation["budgetFit"] = "ideal";

  if (price !== null && input.budgetSpecified) {
    if (price > input.budgetMax) {
      const overBy = (price - input.budgetMax) / input.budgetMax;
      if (overBy > 0.25) return null;
      score -= overBy * 120;
      budgetFit = "over";
    } else if (price < input.budgetMin) {
      score += 4;
      budgetFit = "under";
    } else {
      score += 8;
      budgetFit = "ideal";
    }
  } else if (price !== null && !input.budgetSpecified) {
    score += (value - 50) * 0.08;
  }

  const colorTypes = COLOR_TO_TYPES[input.color];
  if (colorTypes.length > 0) {
    if (colorTypes.includes(wine.type)) {
      score += 14;
    } else {
      score -= 28;
    }
  }

  if (input.sweetness !== "any") {
    if (wine.sweetness === input.sweetness) {
      score += 10;
    } else if (wine.sweetness) {
      score -= 14;
    }
  }

  if (occasion.preferredTypes.includes(wine.type)) {
    score += 10;
  }

  const pairingText = collectSommelierPairingText(wine);

  if (occasion.dishKeywords.length > 0) {
    const matchedKeyword = occasion.dishKeywords.find((keyword) =>
      pairingText.includes(
        keyword.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(),
      ),
    );
    if (matchedKeyword) {
      score += 12;
      reasons.push(`Potrivit pentru ${matchedKeyword}.`);
    }
  }

  if (input.occasion === "pentru-desert") {
    if (wine.dessertPairings.length > 0) {
      score += 14;
      reasons.push("Are pairing-uri editoriale cu deserturi romanesti.");
    }
    if (isSweetnessDessertFriendly(wine.sweetness)) {
      score += 10;
    }
    if (wine.type === "dessert") {
      score += 12;
    }
    const dessertMatches = countDessertKeywordMatches(pairingText);
    if (dessertMatches >= 2) {
      score += 8;
    }
  }

  if (
    wine.winery?.slug &&
    input.preferredWinerySlugs.includes(wine.winery.slug)
  ) {
    score += 18;
    reasons.push(`Din ${wine.winery.name}, crama preferata.`);
  }

  return { wine, raw: score, reasons, budgetFit };
}

export function recommendWinesLegacy(
  allWines: WineWithRelations[],
  input: SommelierInput,
  limit = 5,
): LegacyRecommendation[] {
  const max = maxAchievableScore(input);
  const scored = allWines
    .map((wine) => scoreWineRaw(wine, input))
    .filter((rec): rec is ScoredWine => rec !== null)
    .sort((a, b) => b.raw - a.raw);

  return scored.slice(0, limit).map((rec) => ({
    wine: rec.wine,
    reasons: rec.reasons,
    budgetFit: rec.budgetFit,
    matchScore: Math.round(Math.max(40, Math.min(99, (rec.raw / max) * 100))),
  }));
}

export type { OccasionId };
