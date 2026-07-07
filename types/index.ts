import type {
  grapeVarieties,
  ratings,
  regions,
  scoresHistory,
  users,
  wineries,
  wines,
} from "@/lib/schema";

export type Region = typeof regions.$inferSelect;
export type NewRegion = typeof regions.$inferInsert;

export type GrapeVariety = typeof grapeVarieties.$inferSelect;
export type NewGrapeVariety = typeof grapeVarieties.$inferInsert;

export type Winery = typeof wineries.$inferSelect;
export type NewWinery = typeof wineries.$inferInsert;

export type Wine = typeof wines.$inferSelect;
export type NewWine = typeof wines.$inferInsert;

export type ScoreSnapshot = typeof scoresHistory.$inferSelect;
export type NewScoreSnapshot = typeof scoresHistory.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Rating = typeof ratings.$inferSelect;
export type NewRating = typeof ratings.$inferInsert;

export type WineVote = typeof import("@/lib/schema").wineVotes.$inferSelect;
export type WineVoteLog = typeof import("@/lib/schema").wineVoteLogs.$inferSelect;

export type WineryEvent = typeof import("@/lib/schema").wineryEvents.$inferSelect;
export type NewWineryEvent = typeof import("@/lib/schema").wineryEvents.$inferInsert;

export type WineryAnalyticsRow =
  typeof import("@/lib/schema").wineryAnalytics.$inferSelect;
export type NewWineryAnalyticsRow =
  typeof import("@/lib/schema").wineryAnalytics.$inferInsert;

export type WineType = Wine["type"];
export type WineSweetness = NonNullable<Wine["sweetness"]>;
export type GrapeColor = GrapeVariety["color"];
export type OverpricedRisk = NonNullable<Wine["overpricedRisk"]>;

export interface WineWithRelations extends Wine {
  winery: Winery | null;
  region: Region | null;
}

export interface WineryWithWines extends Winery {
  region: Region | null;
  wines: WineWithRelations[];
}

export interface WineryListItem extends Winery {
  region: Region | null;
  wineCount: number;
  avgValueScore: number | null;
  priceRange: { min: number; max: number } | null;
}

export type {
  AffiliateLink,
  AvailabilityEntry,
  EditorialDessertPairingNote,
  EditorialFoodPairingNote,
  ExpertNotes,
  FoodPairing,
  GrapeVarietyShare,
  PriceHistoryEntry,
  WineSubmissionStatus,
  WineryAnalyticsEventType,
  WineryAnalyticsMetadata,
  WineryEventType,
} from "@/lib/schema";

export {
  DEFAULT_WINE_SOURCE_BADGE,
  COMMUNITY_SOURCE_BADGE,
  AFFILIATE_SOURCE_BADGE,
} from "@/lib/schema";
export type { WineSubmitType } from "@/lib/schema";

export type WineReport = typeof import("@/lib/schema").wineReports.$inferSelect;

export interface ExpertRecommendationDisplay {
  wineSlug: string;
  rank: number;
  matchScore: number;
  whyThisWine: string;
  thingsYouShouldKnow: string[];
  pairingScience: string;
  servingAndStorage: string;
  wine: WineWithRelations;
  budgetFit: "under" | "ideal" | "over";
}
