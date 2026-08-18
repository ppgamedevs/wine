/**
 * In-memory Value Score impact of SAFE technical patches. No writes.
 *
 *   npm run tech:score-impact
 */
import "../lib/load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { wines } from "../lib/schema";
import { generateRomanianPairingDrafts } from "../lib/pairing/generate-romanian-drafts";
import { auditWineProvenance } from "../lib/pairing/provenance-audit";
import { valueScoreInputFromWine, calculateValueScore } from "../lib/scoring";
import { getSecondaryScoringMode } from "../lib/scoring-v2/secondary-scoring-mode";
import { simulatedSafePatch } from "../lib/tech-facts/recover";
import { runReadOnlyCatalogRecovery } from "../lib/tech-facts/run-recovery";
import { normalizeWineRows } from "../lib/normalize-wine";
import type { WineWithRelations } from "../types";

async function main() {
  if (process.argv.includes("--apply")) {
    console.log("Refusing --apply. Score impact is in-memory only.");
    process.exit(0);
  }
  console.log("SECONDARY_SCORING_MODE", getSecondaryScoringMode());
  console.log("tech:score-impact dry-run. No Value/Gift/Food writes.");

  const recoveryRun = await runReadOnlyCatalogRecovery();
  const catalog = recoveryRun.wines;
  const fullRows = await db.query.wines.findMany({
    where: eq(wines.status, "verified"),
    with: { winery: true, region: true },
  });
  const normalized = normalizeWineRows(fullRows as WineWithRelations[]);
  const byId = new Map(normalized.map((wine) => [wine.id, wine]));

  const deltas: number[] = [];
  let pairingAcidityGains = 0;
  let rankingChanges = 0;
  const provenance = normalized
    .filter((wine) => wine.foodPairings.length > 0)
    .flatMap((wine) => auditWineProvenance(wine));
  const mismatches = provenance.filter((row) => row.proposedBasis);

  for (const wine of catalog) {
    const recovery = recoveryRun.recoveries.find((row) => row.wineId === wine.id);
    if (!recovery) continue;
    const patch = simulatedSafePatch(recovery);
    const full = byId.get(wine.id);
    if (!full) continue;
    const before = calculateValueScore(valueScoreInputFromWine(full));
    const after = calculateValueScore(
      valueScoreInputFromWine({
        ...full,
        alcohol: patch.alcohol ?? full.alcohol,
        acidity: patch.acidity ?? full.acidity,
        sugar: patch.sugar ?? full.sugar,
        sweetness:
          (patch.sweetness as typeof full.sweetness | undefined) ?? full.sweetness,
      }),
    );
    const delta = after - before;
    if (delta !== 0) deltas.push(delta);

    const beforeDrafts = generateRomanianPairingDrafts(full);
    const afterDrafts = generateRomanianPairingDrafts({
      ...full,
      alcohol: patch.alcohol ?? full.alcohol,
      acidity: patch.acidity ?? full.acidity,
      sugar: patch.sugar ?? full.sugar,
      sweetness:
        (patch.sweetness as typeof full.sweetness | undefined) ?? full.sweetness,
    });
    if (full.acidity == null && patch.acidity != null) pairingAcidityGains += 1;
    const beforeTop = beforeDrafts[0]?.dish;
    const afterTop = afterDrafts[0]?.dish;
    if (beforeTop && afterTop && beforeTop !== afterTop) rankingChanges += 1;
  }

  const abs = (value: number) => Math.abs(value);
  console.log(
    JSON.stringify(
      {
        wines: catalog.length,
        valueUnchanged: catalog.length - deltas.length,
        plusMinus1: deltas.filter((delta) => abs(delta) === 1).length,
        plusMinus2: deltas.filter((delta) => abs(delta) === 2).length,
        greaterThan2: deltas.filter((delta) => abs(delta) > 2).length,
        maxChange: deltas.length ? Math.max(...deltas.map(abs)) : 0,
        meanChange:
          deltas.length === 0
            ? 0
            : Math.round((deltas.reduce((sum, delta) => sum + delta, 0) / deltas.length) * 100) / 100,
        pairingAcidityGains,
        pairingRankingChanges: rankingChanges,
        prompt11ProvenanceMismatches: mismatches.length,
        mismatchRows: mismatches,
        productionWrites: { value: 0, gift: 0, food: 0, pairing: 0 },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
