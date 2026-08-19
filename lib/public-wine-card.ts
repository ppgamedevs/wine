import { getWineTypeLabel } from "@/lib/format";
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
import type { AppLocale } from "@/i18n/locale";

interface PublicWineCardOptions {
  highlightScore?: TopListRankMetric;
  displayedScore?: number | null;
  analytics?: WineCardAnalyticsViewModel;
  locale?: AppLocale;
}

function rankLabel(metric: TopListRankMetric, locale: AppLocale): string {
  if (metric === "gift") return "Gift Score";
  if (metric === "relevance")
    return locale === "en" ? "Match Score" : "Scor potrivire";
  return "Value Score";
}

function localizedCardImageAlt(
  wine: WineWithRelations,
  locale: AppLocale,
  vintage: number | null,
): string | null {
  if (locale === "ro") return wine.imageAlt;
  const parts = [wine.name];
  if (vintage != null) parts.push(String(vintage));
  if (wine.winery?.name) parts.push(`by ${wine.winery.name}`);
  parts.push(`${getWineTypeLabel(wine.type, "en").toLowerCase()} wine`);
  return parts.join(", ");
}

export function buildPublicWineCardViewModel(
  wine: WineWithRelations,
  options: PublicWineCardOptions = {},
): PublicWineCardViewModel {
  const highlightScore = options.highlightScore ?? "value";
  const locale = options.locale ?? "ro";
  const vintage = resolveWineVintage(wine);
  const pricing = buildWinePriceViewModel(wine);

  return {
    id: wine.id,
    slug: wine.slug,
    name: wine.name,
    displayName: stripEmbeddedVintageFromName(wine.name, vintage),
    type: wine.type,
    typeLabel: getWineTypeLabel(wine.type, locale),
    vintage,
    valueScore: wine.valueScore,
    displayedRankScore: topListRankScore(
      wine,
      highlightScore,
      options.displayedScore,
    ),
    displayedRankLabel: rankLabel(highlightScore, locale),
    image: {
      url: wine.imageUrl,
      source: wine.imageSource,
      alt: localizedCardImageAlt(wine, locale, vintage),
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

function buildPublicWineCatalogItemForLocale(
  wine: WineWithRelations,
  locale: AppLocale,
): PublicWineCatalogItem {
  const card = buildPublicWineCardViewModel(wine, { locale });
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
    getWineTypeLabel(wine.type, locale),
    locale === "en" && wine.sweetness === "sec" ? "dry" : "",
    locale === "en" && wine.sweetness === "demisec" ? "medium-dry" : "",
    locale === "en" && wine.sweetness === "demidulce" ? "medium-sweet" : "",
    locale === "en" && wine.sweetness === "dulce" ? "sweet" : "",
    wine.vintage?.toString() ?? "",
    wine.grapeVarieties.map((grape) => grape.name).join(" "),
  ]
    .join(" ")
    .toLocaleLowerCase(locale === "en" ? "en" : "ro");

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

export function buildPublicWineCatalogItem(
  wine: WineWithRelations,
): PublicWineCatalogItem {
  return buildPublicWineCatalogItemForLocale(wine, "ro");
}

export function buildLocalizedPublicWineCatalogItem(
  wine: WineWithRelations,
  locale: AppLocale,
): PublicWineCatalogItem {
  return buildPublicWineCatalogItemForLocale(wine, locale);
}
