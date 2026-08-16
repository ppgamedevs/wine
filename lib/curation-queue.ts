/**
 * Future VinIntel curated-pairing queue.
 * Does not create pairings. Ranks wines where human curation adds the most value.
 */
import { rankWinesForOccasion, type OccasionId } from "@/lib/recommendation/occasion-match";
import { assessFoodEvidence } from "@/lib/food-evidence";
import { isAutochthonousGrapeMix } from "@/lib/scoring";
import type { WineWithRelations } from "@/types";

export interface CurationQueueItem {
  rank: number;
  slug: string;
  name: string;
  winery: string;
  valueScore: number | null;
  priceAvg: number | null;
  type: string | null;
  grapes: string[];
  evidenceLevel: string;
  producerEvidence: boolean;
  topListHits: number;
  score: number;
  reasons: string[];
}

const KEY_OCCASIONS: OccasionId[] = [
  "oricare",
  "cadou",
  "sarmale",
  "gratar",
  "pentru-desert",
  "sarbatori",
];

function priceBand(price: number | null): string {
  if (price == null) return "unknown";
  if (price < 40) return "sub-40";
  if (price < 70) return "40-70";
  if (price < 120) return "70-120";
  return "120+";
}

export function buildCurationQueue(
  catalog: WineWithRelations[],
  limit = 30,
): CurationQueueItem[] {
  const topHits = new Map<string, number>();
  for (const occasion of KEY_OCCASIONS) {
    for (const row of rankWinesForOccasion(catalog, { occasion }).slice(0, 15)) {
      const wine = row.wine as WineWithRelations;
      topHits.set(wine.slug, (topHits.get(wine.slug) ?? 0) + 1);
    }
  }

  const items: CurationQueueItem[] = catalog.map((wine) => {
    const assessment = assessFoodEvidence({
      curatedDishes: wine.foodPairings.map((pairing) => pairing.dish),
      producerCulinary: wine.producerContent?.culinaryPairings,
      foodEvidence: [],
      type: wine.type,
      sweetness: wine.sweetness,
    });
    const grapes = (wine.grapeVarieties ?? []).map((grape) => grape.name);
    const romanian = isAutochthonousGrapeMix(grapes);
    const hits = topHits.get(wine.slug) ?? 0;
    const reasons: string[] = [];
    let score = wine.valueScore ?? 0;
    if ((wine.valueScore ?? 0) >= 80) {
      score += 20;
      reasons.push("high Value Score");
    }
    if (romanian) {
      score += 16;
      reasons.push("Romanian variety");
    }
    if (hits > 0) {
      score += hits * 8;
      reasons.push(`top-list hits ${hits}`);
    }
    if (assessment.curatedCategories.length === 0) {
      score += 12;
      reasons.push("no curated pairing");
    }
    if (assessment.producerCategories.length === 0) {
      score += 10;
      reasons.push("no producer culinary");
    } else {
      reasons.push("has producer culinary");
    }
    const band = priceBand(wine.priceAvg);
    if (band === "40-70" || band === "70-120") {
      score += 6;
      reasons.push(`price band ${band}`);
    }
    return {
      rank: 0,
      slug: wine.slug,
      name: wine.name,
      winery: wine.winery?.name ?? "",
      valueScore: wine.valueScore,
      priceAvg: wine.priceAvg,
      type: wine.type,
      grapes,
      evidenceLevel: assessment.evidenceLevel,
      producerEvidence: assessment.producerCategories.length > 0,
      topListHits: hits,
      score,
      reasons,
    };
  });

  items.sort((left, right) => right.score - left.score || (right.valueScore ?? 0) - (left.valueScore ?? 0));
  return items.slice(0, limit).map((item, index) => ({ ...item, rank: index + 1 }));
}
