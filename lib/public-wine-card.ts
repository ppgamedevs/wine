import { wineTypeLabel } from "@/lib/format";
import type {
  PublicWineCardViewModel,
  PublicWineCatalogItem,
  WineCardAnalyticsViewModel,
} from "@/lib/public-wine-card-types";
import {
  topListRankScore,
  type TopListRankMetric,
} from "@/lib/top-lists";
import { buildWinePriceViewModel } from "@/lib/wine-price";
import {
  resolveWineVintage,
  stripEmbeddedVintageFromName,
} from "@/lib/wine-vintage";
import type { WineWithRelations } from "@/types";

interface PublicWineCardOptions {
  highlightScore?: TopListRankMetric;
  displayedScore?: number | null;
  analytics?: WineCardAnalyticsViewModel;
}

function rankLabel(metric: TopListRankMetric): string {
  if (metric === "gift") return "Gift Score";
  if (metric === "relevance") return "Scor potrivire";
  return "Value Score";
}

export function buildPublicWineCardViewModel(
  wine: WineWithRelations,
  options: PublicWineCardOptions = {},
): PublicWineCardViewModel {
  const highlightScore = options.highlightScore ?? "value";
  const vintage = resolveWineVintage(wine);
  const pricing = buildWinePriceViewModel(wine);

  return {
    id: wine.id,
    slug: wine.slug,
    name: wine.name,
    displayName: stripEmbeddedVintageFromName(wine.name, vintage),
    type: wine.type,
    typeLabel: wineTypeLabel[wine.type],
    vintage,
    valueScore: wine.valueScore,
    displayedRankScore: topListRankScore(
      wine,
      highlightScore,
      options.displayedScore,
    ),
    displayedRankLabel: rankLabel(highlightScore),
    image: {
      url: wine.imageUrl,
      source: wine.imageSource,
      alt: wine.imageAlt,
      wineryName: wine.winery?.name ?? null,
    },
    wineryName: wine.winery?.name ?? null,
    regionName: wine.region?.name ?? null,
    price: {
      status: pricing.status,
      displayPrice: pricing.displayPrice,
      isVerifiedRecent: pricing.isVerifiedRecent,
      purchaseLink: pricing.purchaseLink
        ? {
            url: pricing.purchaseLink.url,
            retailer: pricing.purchaseLink.retailer,
          }
        : null,
      verifyPriceUrl: pricing.verifyPriceUrl,
      canVerifyPrice: wine.winery?.verified === true,
    },
    analytics: options.analytics ?? null,
  };
}

export function buildPublicWineCatalogItem(
  wine: WineWithRelations,
): PublicWineCatalogItem {
  const card = buildPublicWineCardViewModel(wine);
  const filterPrice =
    wine.currentPrice != null && wine.currentPrice > 0
      ? wine.currentPrice
      : wine.priceAvg != null && wine.priceAvg > 0
        ? wine.priceAvg
        : null;
  const searchText = [
    wine.name,
    wine.winery?.name ?? "",
    wine.region?.name ?? "",
    wineTypeLabel[wine.type],
    wine.vintage?.toString() ?? "",
    wine.grapeVarieties.map((grape) => grape.name).join(" "),
  ]
    .join(" ")
    .toLocaleLowerCase("ro");

  return {
    id: wine.id,
    type: wine.type,
    sweetness: wine.sweetness,
    valueScore: wine.valueScore,
    filterPrice,
    searchText,
    card,
  };
}
