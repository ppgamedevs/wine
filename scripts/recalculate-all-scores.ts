/**
 * Recalculeaza VinIntel Value Score pentru toate vinurile (logica medalii inclusa).
 *
 *   npx tsx scripts/recalculate-all-scores.ts
 *   npx tsx scripts/recalculate-all-scores.ts --dry-run
 */
import "../lib/load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { wines } from "../lib/schema";
import {
  calculateValueScore,
  valueScoreInputFromWine,
} from "../lib/scoring";

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
    },
    with: {
      region: {
        columns: { name: true },
      },
    },
  });

  console.log(
    `[recalculate-scores] ${rows.length} vinuri de procesat${dryRun ? " (dry-run)" : ""}`,
  );

  const changes: ScoreChange[] = [];
  let updated = 0;
  let unchanged = 0;
  let newlyScored = 0;

  for (const wine of rows) {
    const newScore = calculateValueScore(
      valueScoreInputFromWine({
        priceAvg: wine.priceAvg,
        currentPrice: wine.currentPrice,
        grapeVarieties: wine.grapeVarieties,
        region: wine.region,
        medals: wine.medals,
      }),
    );

    const oldScore = wine.valueScore;
    const delta =
      oldScore != null ? newScore - oldScore : newScore;

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
        .set({ valueScore: newScore })
        .where(eq(wines.id, wine.id));
    }

    updated += 1;
  }

  const increased = changes.filter((c) => c.oldScore != null && c.delta > 0);
  const decreased = changes.filter((c) => c.oldScore != null && c.delta < 0);

  changes.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  console.log("\n[recalculate-scores] Raport final");
  console.log(`  Total vinuri:     ${rows.length}`);
  console.log(`  Actualizate:      ${updated}${dryRun ? " (simulat)" : ""}`);
  console.log(`  Neschimbate:      ${unchanged}`);
  console.log(`  Fara scor anterior: ${newlyScored}`);
  console.log(`  Scor crescut:     ${increased.length}`);
  console.log(`  Scor scazut:      ${decreased.length}`);

  if (increased.length > 0) {
    const totalGain = increased.reduce((sum, c) => sum + c.delta, 0);
    console.log(`  Delta total (+):  +${totalGain}`);
  }

  if (decreased.length > 0) {
    const totalLoss = decreased.reduce((sum, c) => sum + c.delta, 0);
    console.log(`  Delta total (-):  ${totalLoss}`);
  }

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
