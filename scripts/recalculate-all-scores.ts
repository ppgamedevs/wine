/**
 * Recalculeaza VinIntel Value Score 2.0 pentru toate vinurile (batch percentile).
 *
 *   npx tsx scripts/recalculate-all-scores.ts
 *   npx tsx scripts/recalculate-all-scores.ts --dry-run
 */
import "../lib/load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { wines } from "../lib/schema";
import {
  calculateBatchValueScoresV2,
  type BatchValueScoreEntry,
} from "../lib/scoring-v2";
import { valueScoreInputFromWine } from "../lib/scoring";
import { VALUE_SCORE_VERSION } from "../lib/scoring-v2/constants";

interface ScoreChange {
  id: number;
  slug: string;
  name: string;
  oldScore: number | null;
  newScore: number;
  delta: number;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const rows = await db.query.wines.findMany({
    columns: {
      id: true,
      slug: true,
      name: true,
      valueScore: true,
      priceAvg: true,
      currentPrice: true,
      grapeVarieties: true,
      medals: true,
      type: true,
      cellarPotential: true,
      acidity: true,
      tasteProfile: true,
      vintage: true,
      ratingAvg: true,
      communityScore: true,
      criticScore: true,
      estimatedQuality: true,
      drinkabilityStart: true,
      drinkabilityEnd: true,
    },
    with: {
      region: {
        columns: { name: true },
      },
      winery: {
        columns: { name: true },
      },
    },
  });

  console.log(
    `[recalculate-scores] ${rows.length} vinuri, Value Score v${VALUE_SCORE_VERSION}${dryRun ? " (dry-run)" : ""}`,
  );

  const batchEntries: BatchValueScoreEntry[] = rows.map((wine) => {
    const input = valueScoreInputFromWine({
      priceAvg: wine.priceAvg,
      currentPrice: wine.currentPrice,
      grapeVarieties: wine.grapeVarieties,
      region: wine.region,
      medals: wine.medals,
      winery: wine.winery,
      type: wine.type,
      cellarPotential: wine.cellarPotential,
      acidity: wine.acidity,
      tasteProfile: wine.tasteProfile,
      vintage: wine.vintage,
      ratingAvg: wine.ratingAvg,
      communityScore: wine.communityScore,
      criticScore: wine.criticScore,
      estimatedQuality: wine.estimatedQuality,
      drinkabilityStart: wine.drinkabilityStart,
      drinkabilityEnd: wine.drinkabilityEnd,
    });

    return {
      id: wine.id,
      input: {
        price: input.price,
        grapeVarieties: input.grapeVarieties,
        region: input.region,
        wineryName: input.wineryName,
        wineType: input.wineType,
        cellarPotential: input.cellarPotential,
        acidity: input.acidity,
        tasteProfile: input.tasteProfile,
        wineMedals: input.wineMedals,
        criticScore: input.criticScore,
        vintage: input.vintage,
        ratingAvg: input.ratingAvg,
        communityScore: input.communityScore,
        drinkabilityStart: input.drinkabilityStart,
        drinkabilityEnd: input.drinkabilityEnd,
        estimatedQuality: input.estimatedQuality ?? input.baseQuality,
      },
    };
  });

  const batchResults = calculateBatchValueScoresV2(batchEntries);
  const resultById = new Map(batchResults.map((entry) => [entry.id, entry]));

  const changes: ScoreChange[] = [];
  let updated = 0;
  let unchanged = 0;
  let newlyScored = 0;

  for (const wine of rows) {
    const result = resultById.get(wine.id);
    if (!result) continue;

    const newScore = result.finalScore;
    const oldScore = wine.valueScore;
    const delta = oldScore != null ? newScore - oldScore : newScore;

    if (oldScore === newScore) {
      unchanged += 1;
      continue;
    }

    if (oldScore == null) {
      newlyScored += 1;
    }

    changes.push({
      id: wine.id,
      slug: wine.slug,
      name: wine.name,
      oldScore,
      newScore,
      delta: oldScore != null ? newScore - oldScore : 0,
    });

    if (!dryRun) {
      await db
        .update(wines)
        .set({
          valueScore: newScore,
          valueScoreVersion: VALUE_SCORE_VERSION,
          estimatedQuality: result.core.qHat,
          qualityEffective: result.core.qEffective,
          qualityFinal: result.core.qFinal,
          qualitySurplus: result.core.qualitySurplus,
          rawSigmoidScore: result.core.rawSigmoidScore,
          drinkabilityStart: result.core.drinkabilityStart,
          drinkabilityEnd: result.core.drinkabilityEnd,
        })
        .where(eq(wines.id, wine.id));
    }

    updated += 1;
  }

  const scores = batchResults.map((entry) => entry.finalScore);
  const avg =
    scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : 0;
  const min = scores.length > 0 ? Math.min(...scores) : 0;
  const max = scores.length > 0 ? Math.max(...scores) : 0;
  const recommended = scores.filter((score) => score >= 75).length;
  const exceptional = scores.filter((score) => score >= 90).length;

  const increased = changes.filter((c) => c.oldScore != null && c.delta > 0);
  const decreased = changes.filter((c) => c.oldScore != null && c.delta < 0);

  changes.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  console.log("\n[recalculate-scores] Distributie v2");
  console.log(`  Medie:            ${avg}`);
  console.log(`  Min / Max:          ${min} / ${max}`);
  console.log(`  Recomandate (75+):  ${recommended}`);
  console.log(`  Exceptionale (90+): ${exceptional}`);

  console.log("\n[recalculate-scores] Raport final");
  console.log(`  Total vinuri:     ${rows.length}`);
  console.log(`  Actualizate:      ${updated}${dryRun ? " (simulat)" : ""}`);
  console.log(`  Neschimbate:      ${unchanged}`);
  console.log(`  Fara scor anterior: ${newlyScored}`);
  console.log(`  Scor crescut:     ${increased.length}`);
  console.log(`  Scor scazut:      ${decreased.length}`);

  const topChanges = changes.slice(0, 15);
  if (topChanges.length > 0) {
    console.log("\n[recalculate-scores] Top modificari:");
    for (const change of topChanges) {
      const from = change.oldScore != null ? String(change.oldScore) : "n/a";
      const sign = change.delta >= 0 ? "+" : "";
      const deltaLabel =
        change.oldScore != null ? ` (${sign}${change.delta})` : " (nou)";
      console.log(
        `  ${change.slug}: ${from} -> ${change.newScore}${deltaLabel}`,
      );
    }
  }

  console.log("\n[recalculate-scores] done");
}

main().catch((error) => {
  console.error("[recalculate-scores] fatal:", error);
  process.exit(1);
});
