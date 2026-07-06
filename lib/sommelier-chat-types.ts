import type { WineType } from "@/types";

/** Compact wine payload streamed to the chat client for recommendation cards. */
export interface ChatWineRecommendation {
  slug: string;
  name: string;
  vintage: number | null;
  type: WineType;
  wineryName: string | null;
  priceRon: number | null;
  purchaseUrl: string | null;
  purchaseLabel: string | null;
  valueScore: number | null;
  imageUrl: string | null;
  imageAlt: string;
}

export type SommelierChatDataParts = {
  recommendations: ChatWineRecommendation[];
};
