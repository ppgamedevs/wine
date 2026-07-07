import type { WineWithRelations } from "@/types";

/** Guard against legacy NULL JSON columns that crash `.length` / `.map` in UI. */
export function normalizeWineRow<T extends WineWithRelations>(wine: T): T {
  return {
    ...wine,
    grapeVarieties: wine.grapeVarieties ?? [],
    priceHistory: wine.priceHistory ?? [],
    thingsYouShouldKnow: wine.thingsYouShouldKnow ?? [],
    foodPairingNotes: wine.foodPairingNotes ?? [],
    dessertPairings: wine.dessertPairings ?? [],
    recommendedOccasions: wine.recommendedOccasions ?? [],
    foodPairings: wine.foodPairings ?? [],
    availability: wine.availability ?? [],
    affiliateLinks: wine.affiliateLinks ?? [],
    communityVoteCount: wine.communityVoteCount ?? 0,
  };
}

export function normalizeWineRows<T extends WineWithRelations>(rows: T[]): T[] {
  return rows.map(normalizeWineRow);
}
