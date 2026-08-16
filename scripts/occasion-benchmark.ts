import "../lib/load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { wines } from "../lib/schema";
import { normalizeWineRows } from "../lib/normalize-wine";
import { rankWinesForOccasion, type OccasionId } from "../lib/recommendation/occasion-match";
import { calculateFoodVersatility } from "../lib/scoring-v2/food-versatility";
import { calculateGiftScore } from "../lib/scoring-v2/gift-score";
import {
  foodVersatilityInputFromWine,
  giftScoreInputFromWine,
} from "../lib/scoring-v2/wine-score-inputs";
import type { WineWithRelations } from "../types";

async function main() {
  const rows = await db.query.wines.findMany({
    with: { winery: true, region: true },
    where: eq(wines.status, "verified"),
  });
  const catalog = normalizeWineRows(rows as WineWithRelations[]);
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
  for (const occasion of occasions) {
    const ranked = rankWinesForOccasion(catalog, { occasion }).slice(0, 10);
    console.log(`\n-- ${occasion} --`);
    for (const [index, row] of ranked.entries()) {
      const wine = row.wine as WineWithRelations;
      const gift = calculateGiftScore(giftScoreInputFromWine(wine));
      const food = calculateFoodVersatility(foodVersatilityInputFromWine(wine));
      console.log(
        `${index + 1}. ${wine.slug} p=${wine.priceAvg} V=${wine.valueScore} G=${gift.score} F=${food.score} M=${row.score} C=${row.confidence} | ${row.reasons.slice(0, 2).join(" / ")}`,
      );
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
