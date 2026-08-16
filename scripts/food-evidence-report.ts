/**
 * Post-apply culinary evidence report. Read-only. No score writes.
 */
import "../lib/load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { wines } from "../lib/schema";
import { normalizeWineRows } from "../lib/normalize-wine";
import { buildCurationQueue } from "../lib/curation-queue";
import { assessFoodEvidence } from "../lib/food-evidence";
import { calculateFoodVersatility } from "../lib/scoring-v2/food-versatility";
import { calculateGiftScore } from "../lib/scoring-v2/gift-score";
import {
  foodVersatilityInputFromWine,
  giftScoreInputFromWine,
} from "../lib/scoring-v2/wine-score-inputs";
import { rankWinesForOccasion, type OccasionId } from "../lib/recommendation/occasion-match";
import { getSecondaryScoringMode } from "../lib/scoring-v2/secondary-scoring-mode";
import { sanitizeCulinaryText, isCulinaryChromeText } from "../lib/culinary-extract";
import type { WineWithRelations } from "../types";

async function main() {
  const rows = await db.query.wines.findMany({
    with: { winery: true, region: true },
    where: eq(wines.status, "verified"),
  });
  const catalog = normalizeWineRows(rows as WineWithRelations[]);
  console.log("SECONDARY_SCORING_MODE", getSecondaryScoringMode());
  console.log("verified", catalog.length);

  const byWinery = new Map<
    string,
    {
      wines: number;
      culinary: number;
      foodConf: number;
      giftConf: number;
    }
  >();
  let producerCulinary = 0;
  let tastingSheetCulinary = 0;
  let curated = 0;
  let displayable = 0;
  let styleOnly = 0;
  let insufficient = 0;
  let strong = 0;
  let moderate = 0;
  let chromeLeft = 0;

  for (const wine of catalog) {
    const food = calculateFoodVersatility(foodVersatilityInputFromWine(wine));
    const gift = calculateGiftScore(giftScoreInputFromWine(wine));
    const assessment = assessFoodEvidence({
      curatedDishes: wine.foodPairings.map((pairing) => pairing.dish),
      producerCulinary: wine.producerContent?.culinaryPairings,
      tastingSheetCulinary:
        wine.producerContent?.sourceType === "tasting_sheet"
          ? wine.producerContent?.culinaryPairings
          : null,
      foodEvidence: [],
      type: wine.type,
      sweetness: wine.sweetness,
    });
    if (assessment.curatedCategories.length > 0) curated += 1;
    if (assessment.producerCategories.length > 0) producerCulinary += 1;
    if (assessment.tastingSheetCategories.length > 0) tastingSheetCulinary += 1;
    if (food.displayable) displayable += 1;
    if (food.evidenceLevel === "style_only") styleOnly += 1;
    if (food.evidenceLevel === "insufficient") insufficient += 1;
    if (food.evidenceLevel === "strong") strong += 1;
    if (food.evidenceLevel === "moderate") moderate += 1;
    const raw = wine.producerContent?.culinaryPairings ?? "";
    if (raw && isCulinaryChromeText(sanitizeCulinaryText(raw))) chromeLeft += 1;

    const key = wine.winery?.name ?? "unknown";
    const current = byWinery.get(key) ?? {
      wines: 0,
      culinary: 0,
      foodConf: 0,
      giftConf: 0,
    };
    current.wines += 1;
    if (assessment.producerCategories.length > 0 || assessment.tastingSheetCategories.length > 0) {
      current.culinary += 1;
    }
    current.foodConf += food.confidence;
    current.giftConf += gift.confidence;
    byWinery.set(key, current);
  }

  const culinarySupported = [...byWinery.values()].reduce((sum, row) => sum + row.culinary, 0);
  const recasCulinary = byWinery.get("Cramele Recas")?.culinary ?? 0;
  console.log("\n=== Evidence AFTER ===");
  console.log({
    strong,
    moderate,
    styleOnly,
    insufficient,
    producerCulinary,
    tastingSheetCulinary,
    curated,
    displayable,
    chromeLeft,
    culinarySupported,
    recasShare: culinarySupported
      ? `${((recasCulinary / culinarySupported) * 100).toFixed(1)}%`
      : "n/a",
  });

  console.log("\n=== Winery coverage ===");
  for (const [name, row] of [...byWinery.entries()].sort((a, b) => b[1].wines - a[1].wines)) {
    console.log(
      `${name}: wines=${row.wines} culinary=${row.culinary} (${((row.culinary / row.wines) * 100).toFixed(0)}%) foodConf=${(row.foodConf / row.wines).toFixed(1)} giftConf=${(row.giftConf / row.wines).toFixed(1)}`,
    );
  }

  const occasions: OccasionId[] = [
    "oricare",
    "nunta",
    "cadou",
    "cadou-business",
    "cina-romantica",
    "sarmale",
    "gratar",
    "petrecere",
    "sarbatori",
    "pentru-desert",
  ];
  const hits = new Map<string, number>();
  for (const occasion of occasions) {
    const top = rankWinesForOccasion(catalog, { occasion }).slice(0, 10);
    const recas = top.filter((row) => (row.wine as WineWithRelations).winery?.slug === "cramele-recas").length;
    console.log(`\n${occasion} RecasInTop10=${recas}`);
    for (const row of top) {
      const wine = row.wine as WineWithRelations;
      hits.set(wine.winery?.name ?? "", (hits.get(wine.winery?.name ?? "") ?? 0) + 1);
    }
  }
  console.log("\n=== Top-list hits by winery ===");
  for (const [name, count] of [...hits.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`${name}: ${count}`);
  }

  console.log("\n=== Curation queue (first 30) ===");
  for (const item of buildCurationQueue(catalog, 30)) {
    console.log(
      `${item.rank}. ${item.slug} value=${item.valueScore} ${item.winery} ${item.reasons.join("; ")}`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
