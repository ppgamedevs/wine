/**
 * Canonical dish mapping dry-run over curated pairings.
 * Default DRY RUN. --apply is refused.
 *
 *   npm run pairing:canonicalize -- --dry-run
 */
import "../lib/load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { wines } from "../lib/schema";
import { normalizeWineRows } from "../lib/normalize-wine";
import { mapDishToCanonical } from "../lib/pairing/dish-canonicalize";
import { getSecondaryScoringMode } from "../lib/scoring-v2/secondary-scoring-mode";
import type { WineWithRelations } from "../types";

async function main() {
  if (process.argv.includes("--apply")) {
    console.log("Refusing --apply. Canonicalization does not mutate foodPairings in this task.");
    process.exit(0);
  }
  console.log("SECONDARY_SCORING_MODE", getSecondaryScoringMode());
  console.log("pairing:canonicalize dry-run. No writes.");
  const rows = await db.query.wines.findMany({
    with: { winery: true, region: true },
    where: eq(wines.status, "verified"),
  });
  const catalog = normalizeWineRows(rows as WineWithRelations[]).filter(
    (wine) => wine.foodPairings.length > 0,
  );
  const counts = {
    exact: 0,
    alias: 0,
    serving_variant: 0,
    unresolved: 0,
    ambiguous: 0,
  };
  const unresolved: string[] = [];
  const ambiguous: string[] = [];
  for (const wine of catalog) {
    for (const pairing of wine.foodPairings) {
      const mapped = mapDishToCanonical(pairing.dish);
      counts[mapped.matchType] += 1;
      if (mapped.matchType === "unresolved") {
        unresolved.push(`${wine.slug} :: ${pairing.dish}`);
      }
      if (mapped.matchType === "ambiguous") {
        ambiguous.push(`${wine.slug} :: ${pairing.dish} :: ${(mapped.candidates ?? []).join(",")}`);
      }
    }
  }
  console.log(JSON.stringify({ counts, unresolved, ambiguous }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
