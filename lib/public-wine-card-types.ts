import type { WineSweetness, WineType } from "@/types";

export interface WineCardAnalyticsViewModel {
  wineryId: number;
  wineId: number;
}

export interface WineCardPriceViewModel {
  status: "verified" | "estimated" | "unavailable";
  displayPrice: number | null;
  isVerifiedRecent: boolean;
  purchaseLink: {
    url: string;
    retailer: string;
  } | null;
  verifyPriceUrl: string | null;
  canVerifyPrice: boolean;
}

export interface PublicWineCardViewModel {
  id: number;
  slug: string;
  name: string;
  displayName: string;
  type: WineType;
  typeLabel: string;
  vintage: number | null;
  valueScore: number | null;
  displayedRankScore: number | null;
  displayedRankLabel: string;
  image: {
    url: string | null;
    source: string | null;
    alt: string | null;
    wineryName: string | null;
  };
  wineryName: string | null;
  regionName: string | null;
  price: WineCardPriceViewModel;
  analytics: WineCardAnalyticsViewModel | null;
}

export interface PublicWineCatalogItem {
  id: number;
  type: WineType;
  sweetness: WineSweetness | null;
  valueScore: number | null;
  filterPrice: number | null;
  searchText: string;
  card: PublicWineCardViewModel;
}

export interface PublicLegacySommelierWine {
  card: PublicWineCardViewModel;
  expertValueInsight: string | null;
}

export interface PublicLegacyExpertRecommendation {
  wineSlug: string;
  rank: number;
  matchScore: number;
  whyThisWine: string;
  thingsYouShouldKnow: string[];
  pairingScience: string;
  servingAndStorage: string;
  wine: PublicLegacySommelierWine;
  budgetFit: "under" | "ideal" | "over";
}
