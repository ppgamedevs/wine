import type { WineType } from "@/types";

/** Compact wine payload streamed to the chat client for recommendation cards. */
export interface ChatWineRecommendation {
  slug: string;
  name: string;
  vintage: number | null;
  type: WineType;
  wineryName: string | null;
  priceRon: number | null;
  /** True when the wine has an affiliate purchase link on its detail page. */
  hasAffiliateLink: boolean;
  valueScore: number | null;
  imageUrl: string | null;
  imageAlt: string;
}

export type SommelierChatDataParts = {
  recommendations: ChatWineRecommendation[];
};
