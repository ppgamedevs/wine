import { WineCardView } from "@/components/wines/wine-card-view";
import { buildPublicWineCardViewModel } from "@/lib/public-wine-card";
import { MIN_RECOMMENDED_VALUE_SCORE } from "@/lib/value-score-thresholds";
import type { TopListRankMetric } from "@/lib/top-lists";
import type { WineWithRelations } from "@/types";
import { getLocale } from "next-intl/server";
import type { AppLocale } from "@/i18n/locale";

export async function WineCard({
  wine,
  priority = false,
  /** Prag minim recomandare = 75/100. Cand e setat, ascunde vinurile sub prag. */
  minValueScore = MIN_RECOMMENDED_VALUE_SCORE,
  highlightScore = "value",
  displayedScore,
  trackAnalytics,
}: {
  wine: WineWithRelations;
  priority?: boolean;
  minValueScore?: number | null;
  highlightScore?: TopListRankMetric;
  displayedScore?: number | null;
  trackAnalytics?: { wineryId: number; wineId: number };
}) {
  const locale = (await getLocale()) as AppLocale;
  if (
    minValueScore != null &&
    (wine.valueScore ?? 0) < minValueScore
  ) {
    return null;
  }

  const card = buildPublicWineCardViewModel(wine, {
    highlightScore,
    displayedScore,
    analytics: trackAnalytics,
    locale,
  });

  return <WineCardView card={card} priority={priority} locale={locale} />;
}
