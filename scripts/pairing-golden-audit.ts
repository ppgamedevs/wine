/**
 * Read-only audit of human-curated pairings.
 * Never writes wines, scores, or foodPairings.
 *
 *   npm run pairing:golden-audit
 */
import "../lib/load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { wines } from "../lib/schema";
import { normalizeWineRows } from "../lib/normalize-wine";
import { selectBalancedCurationBatch } from "../lib/pairing-curation";
import { getSecondaryScoringMode } from "../lib/scoring-v2/secondary-scoring-mode";
import { findRomanianDishByName } from "../lib/pairing/romanian-dishes";
import { sanitizeCulinaryText } from "../lib/culinary-extract";
import type { WineWithRelations } from "../types";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

function grapeNames(wine: WineWithRelations): string[] {
  return (wine.grapeVarieties ?? []).map((grape) => grape.name);
}

function countBy(values: Array<string | null | undefined>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) {
    const key = value || "(none)";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])),
  );
}

async function main() {
  console.log("SECONDARY_SCORING_MODE", getSecondaryScoringMode());
  console.log("pairing:golden-audit read-only. No writes.");

  const rows = await db.query.wines.findMany({
    with: { winery: true, region: true },
    where: eq(wines.status, "verified"),
  });
  const catalog = normalizeWineRows(rows as WineWithRelations[]);
  const batch = selectBalancedCurationBatch(catalog, 30);
  const curated = catalog.filter((wine) =>
    wine.foodPairings.some((pairing) => pairing.source === "vinintel_curated"),
  );

const records = curated.map((wine) => ({
  slug: wine.slug,
  name: wine.name,
  winery: wine.winery?.name ?? "",
  winerySlug: wine.winery?.slug ?? "",
  vintage: wine.vintage,
  type: wine.type,
  sweetness: wine.sweetness,
  grapes: grapeNames(wine),
  inFirstBatch: batch.some((item) => item.slug === wine.slug),
  producerCulinary: sanitizeCulinaryText(wine.producerContent?.culinaryPairings) || null,
  producerTasting: wine.producerContent?.tastingNotes ?? null,
  foodEvidence: (wine.producerContent?.foodEvidence ?? []).map((claim) => ({
    category: claim.category,
    dish: claim.dish,
    excerpt: claim.excerpt,
    evidenceClass: claim.evidenceClass,
    sourceType: claim.sourceType,
    sourceUrl: claim.sourceUrl ?? null,
  })),
  pairings: wine.foodPairings.map((pairing) => ({
    dish: pairing.dish,
    category: pairing.category ?? null,
    note: pairing.note ?? null,
    strength: pairing.strength ?? null,
    source: pairing.source ?? null,
    basis: pairing.basis ?? [],
    curatedAt: pairing.curatedAt ?? null,
    curatedBy: pairing.curatedBy ?? null,
    family: findRomanianDishByName(pairing.dish)?.family ?? null,
  })),
  valueScore: wine.valueScore,
  giftScore: wine.giftScore,
  foodMatchScore: wine.foodMatchScore,
}));

const pairings = records.flatMap((wine) =>
  wine.pairings.map((pairing) => ({ ...pairing, slug: wine.slug, winery: wine.winery })),
);

  const basisFlat = pairings.flatMap((pairing) => pairing.basis);
const report = {
  generatedAt: new Date().toISOString(),
  mode: getSecondaryScoringMode(),
  verifiedWines: catalog.length,
  firstBatchSize: batch.length,
  firstBatchCurated: batch.filter((wine) => wine.foodPairings.length > 0).length,
  totalCuratedWines: records.length,
  totalCuratedPairings: pairings.length,
  averagePairingsPerWine:
    records.length === 0 ? 0 : Math.round((pairings.length / records.length) * 100) / 100,
  strengthDistribution: countBy(pairings.map((pairing) => pairing.strength)),
  basisDistribution: countBy(basisFlat),
  producerBacked: pairings.filter((pairing) => pairing.basis.includes("producer_evidence")).length,
  structuredStyle: pairings.filter(
    (pairing) =>
      pairing.basis.includes("verified_style") || pairing.basis.includes("technical_data"),
  ).length,
  editorialOnly: pairings.filter(
    (pairing) =>
      pairing.basis.includes("editorial_judgment") &&
      !pairing.basis.includes("producer_evidence") &&
      !pairing.basis.includes("verified_style") &&
      !pairing.basis.includes("technical_data"),
  ).length,
  dishFrequency: countBy(pairings.map((pairing) => pairing.dish)),
  familyFrequency: countBy(pairings.map((pairing) => pairing.family)),
  wineryDistribution: countBy(records.map((wine) => wine.winery)),
  historicalRejections: "unknown",
  historicalRejectionsNote:
    "Rejected drafts were not persisted for the first 30 wines. APPROVED is known. REJECTED is unknown.",
  slugs: records.map((wine) => wine.slug),
};

  const outDir = resolve(process.cwd(), "tmp");
  writeFileSync(resolve(outDir, "pairing-golden-audit.json"), JSON.stringify({ report, records }, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log("Wrote tmp/pairing-golden-audit.json");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
