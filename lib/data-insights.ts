import { MIN_RECOMMENDED_VALUE_SCORE } from "@/lib/value-score-thresholds";
import { filterWinesByBudget, getTopWinesByValue } from "@/lib/top-lists";
import type { WineWithRelations } from "@/types";

export interface Sub50StudyData {
  generatedAt: string;
  totalWinesAnalyzed: number;
  winesUnder50: number;
  avgPriceUnder50: number;
  avgValueScoreUnder50: number;
  top50: WineWithRelations[];
  topWineries: { name: string; slug: string; avgValueScore: number; count: number }[];
  topGrapes: { name: string; count: number }[];
}

export function computeAveragePrice(wines: WineWithRelations[]): number {
  const prices = wines
    .map((w) => w.priceAvg)
    .filter((p): p is number => p != null && p > 0);
  if (prices.length === 0) return 0;
  return Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
}

export function computeAverageValueScore(wines: WineWithRelations[]): number {
  const scores = wines
    .map((w) => w.valueScore)
    .filter((s): s is number => s != null);
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export function computeTopWineriesByValue(
  wines: WineWithRelations[],
  limit = 10,
): Sub50StudyData["topWineries"] {
  const byWinery = new Map<
    string,
    { name: string; slug: string; scores: number[]; count: number }
  >();

  for (const wine of wines) {
    if (!wine.winery) continue;
    const key = wine.winery.slug;
    const existing = byWinery.get(key) ?? {
      name: wine.winery.name,
      slug: wine.winery.slug,
      scores: [],
      count: 0,
    };
    if (wine.valueScore != null) existing.scores.push(wine.valueScore);
    existing.count += 1;
    byWinery.set(key, existing);
  }

  return [...byWinery.values()]
    .map((entry) => ({
      name: entry.name,
      slug: entry.slug,
      count: entry.count,
      avgValueScore:
        entry.scores.length > 0
          ? Math.round(entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length)
          : 0,
    }))
    .filter((entry) => entry.count >= 2)
    .sort((a, b) => b.avgValueScore - a.avgValueScore)
    .slice(0, limit);
}

export function computeTopGrapes(
  wines: WineWithRelations[],
  limit = 8,
): Sub50StudyData["topGrapes"] {
  const counts = new Map<string, number>();
  for (const wine of wines) {
    for (const grape of wine.grapeVarieties ?? []) {
      const label = grape.name ?? grape.slug;
      if (!label) continue;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function buildSub50Study2026(allWines: WineWithRelations[]): Sub50StudyData {
  const under50 = filterWinesByBudget(allWines, 50);
  const goodUnder50 = under50.filter(
    (w) => (w.valueScore ?? 0) >= MIN_RECOMMENDED_VALUE_SCORE,
  );

  return {
    generatedAt: new Date().toISOString(),
    totalWinesAnalyzed: allWines.length,
    winesUnder50: under50.length,
    avgPriceUnder50: computeAveragePrice(under50),
    avgValueScoreUnder50: computeAverageValueScore(goodUnder50.length > 0 ? goodUnder50 : under50),
    top50: getTopWinesByValue(under50, 50),
    topWineries: computeTopWineriesByValue(under50),
    topGrapes: computeTopGrapes(under50),
  };
}

export function computeGoodWineAveragePrice(allWines: WineWithRelations[]): number {
  const good = allWines.filter((w) => (w.valueScore ?? 0) >= MIN_RECOMMENDED_VALUE_SCORE);
  return computeAveragePrice(good);
}
