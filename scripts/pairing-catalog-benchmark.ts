/**
 * In-memory generator coverage over verified wines. No approvals.
 *
 *   npm run pairing:catalog-benchmark
 */
import "../lib/load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { wines } from "../lib/schema";
import { normalizeWineRows } from "../lib/normalize-wine";
import { generatePairingDrafts } from "../lib/pairing-curation";
import { findRomanianDishByName, foldDishName } from "../lib/pairing/romanian-dishes";
import { getSecondaryScoringMode } from "../lib/scoring-v2/secondary-scoring-mode";
import type { WineWithRelations } from "../types";

async function main() {
  console.log("SECONDARY_SCORING_MODE", getSecondaryScoringMode());
  console.log("pairing:catalog-benchmark in-memory. No writes.");
  const rows = await db.query.wines.findMany({
    with: { winery: true, region: true },
    where: eq(wines.status, "verified"),
  });
  const catalog = normalizeWineRows(rows as WineWithRelations[]);
  const coverage = { 4: 0, 3: 0, 2: 0, 1: 0, 0: 0 };
  const dishCounts = new Map<string, number>();
  let romanian = 0;
  let vegetarian = 0;
  let dessert = 0;
  let ciorba = 0;
  let meatball = 0;
  let piftie = 0;
  let mamaliga = 0;
  let bread = 0;
  let carp = 0;
  const fishSpecies = new Set<string>();
  let totalDrafts = 0;

  for (const wine of catalog) {
    const drafts = generatePairingDrafts({ ...wine, foodPairings: [] });
    const bucket = Math.min(drafts.length, 4) as 0 | 1 | 2 | 3 | 4;
    coverage[bucket] += 1;
    for (const draft of drafts) {
      totalDrafts += 1;
      dishCounts.set(draft.dish, (dishCounts.get(draft.dish) ?? 0) + 1);
      const profile = findRomanianDishByName(draft.dish);
      if (profile?.romanian) romanian += 1;
      if (profile?.protein === "none" && profile.foodCategory === "vegetable") {
        vegetarian += 1;
      }
      if (profile?.foodCategory === "dessert" || profile?.foodCategory === "chocolate") {
        dessert += 1;
      }
      const folded = foldDishName(draft.dish);
      if (folded.includes("ciorba") || folded.includes("bors")) ciorba += 1;
      if (folded.includes("chiftele") || folded.includes("parjoale")) meatball += 1;
      if (folded.includes("piftie")) piftie += 1;
      if (folded.includes("mamaliga")) mamaliga += 1;
      if (folded.includes("paine")) bread += 1;
      if (folded.includes("crap")) carp += 1;
      if (profile?.protein === "fish" || profile?.protein === "seafood") {
        fishSpecies.add(profile.id);
      }
    }
  }

  const top = [...dishCounts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 20)
    .map(([dish, count]) => ({
      dish,
      count,
      share: catalog.length === 0 ? 0 : Math.round((count / catalog.length) * 1000) / 10,
    }));
  const flagged = top.filter((row) => row.share > 25);

  console.log(
    JSON.stringify(
      {
        verifiedWines: catalog.length,
        coverage,
        uniqueDishes: dishCounts.size,
        romanianShare: totalDrafts === 0 ? 0 : Math.round((romanian / totalDrafts) * 1000) / 10,
        vegetarianShare: totalDrafts === 0 ? 0 : Math.round((vegetarian / totalDrafts) * 1000) / 10,
        dessertDiversity: dessert,
        fishSpecies: [...fishSpecies],
        ciorba,
        chifteleParjoale: meatball,
        piftie,
        mamaliga,
        bread,
        carp,
        top20: top,
        over25Percent: flagged,
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
