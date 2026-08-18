import { createHash } from "node:crypto";
import { count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  GOLDEN_CURATION_STATS,
  GOLDEN_CURATION_WINES,
} from "@/lib/pairing/golden-curation-dataset";
import { wineFactEvidence, wines } from "@/lib/schema";

function stableHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export interface ProductionInvariantSnapshot {
  generatedAt: string;
  wineCount: number;
  verifiedWineCount: number;
  identityHash: string;
  technicalHash: string;
  scoresHash: string;
  pairingsHash: string;
  editorialPublicHash: string;
  urlsStatusHash: string;
  allWineColumnsHash: string;
  evidenceRowCount: number;
  evidenceHash: string;
  goldenWineCount: number;
  goldenPairingCount: number;
  goldenHash: string;
}

export interface ProductionInvariantComparison {
  identical: boolean;
  wineCountDiff: number;
  verifiedWineCountDiff: number;
  identityDiffs: number;
  technicalDiffs: number;
  valueScoreDiffs: number;
  giftScoreDiffs: number;
  foodScoreDiffs: number;
  pairingDiffs: number;
  editorialPublicDiffs: number;
  urlsStatusDiffs: number;
  allWineColumnDiffs: number;
  evidenceRowCountDiff: number;
  evidenceDiffs: number;
  goldenDiffs: number;
}

export async function captureProductionInvariantSnapshot(): Promise<ProductionInvariantSnapshot> {
  const rows = await db.select().from(wines).orderBy(wines.id);
  const evidenceRows = await db
    .select()
    .from(wineFactEvidence)
    .orderBy(wineFactEvidence.id);
  const verified = await db
    .select({ value: count() })
    .from(wines)
    .where(eq(wines.status, "verified"));

  const identity = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    status: row.status,
  }));
  const technical = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    alcohol: row.alcohol,
    acidity: row.acidity,
    sugar: row.sugar,
    sweetness: row.sweetness,
    vintage: row.vintage,
    grapeVarieties: row.grapeVarieties,
    type: row.type,
    priceAvg: row.priceAvg,
    currentPrice: row.currentPrice,
  }));
  const scores = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    valueScore: row.valueScore,
    giftScore: row.giftScore,
    foodMatchScore: row.foodMatchScore,
  }));
  const pairings = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    foodPairings: row.foodPairings,
  }));
  const editorialPublic = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    descriptionEditorial: row.descriptionEditorial,
    tastingNotes: row.tastingNotes,
    producerContent: row.producerContent,
    expertNotes: row.expertNotes,
    valueExplanation: row.valueExplanation,
    tasteProfile: row.tasteProfile,
    thingsYouShouldKnow: row.thingsYouShouldKnow,
    foodPairingNotes: row.foodPairingNotes,
    dessertPairings: row.dessertPairings,
    recommendedOccasions: row.recommendedOccasions,
  }));
  const urlsStatus = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    status: row.status,
    sourceUrl: row.sourceUrl,
    producerPageUrl: row.producerPageUrl,
    tastingSheetUrl: row.tastingSheetUrl,
    sourceBadge: row.sourceBadge,
  }));

  return {
    generatedAt: new Date().toISOString(),
    wineCount: rows.length,
    verifiedWineCount: Number(verified[0]?.value ?? 0),
    identityHash: stableHash(identity),
    technicalHash: stableHash(technical),
    scoresHash: stableHash(scores),
    pairingsHash: stableHash(pairings),
    editorialPublicHash: stableHash(editorialPublic),
    urlsStatusHash: stableHash(urlsStatus),
    allWineColumnsHash: stableHash(rows),
    evidenceRowCount: evidenceRows.length,
    evidenceHash: stableHash(evidenceRows),
    goldenWineCount: GOLDEN_CURATION_STATS.wines,
    goldenPairingCount: GOLDEN_CURATION_STATS.pairings,
    goldenHash: stableHash(GOLDEN_CURATION_WINES),
  };
}

export function compareProductionInvariantSnapshots(
  before: ProductionInvariantSnapshot,
  after: ProductionInvariantSnapshot,
): ProductionInvariantComparison {
  const result: ProductionInvariantComparison = {
    identical: false,
    wineCountDiff: after.wineCount - before.wineCount,
    verifiedWineCountDiff:
      after.verifiedWineCount - before.verifiedWineCount,
    identityDiffs: Number(before.identityHash !== after.identityHash),
    technicalDiffs: Number(before.technicalHash !== after.technicalHash),
    valueScoreDiffs: Number(before.scoresHash !== after.scoresHash),
    giftScoreDiffs: Number(before.scoresHash !== after.scoresHash),
    foodScoreDiffs: Number(before.scoresHash !== after.scoresHash),
    pairingDiffs: Number(before.pairingsHash !== after.pairingsHash),
    editorialPublicDiffs: Number(
      before.editorialPublicHash !== after.editorialPublicHash,
    ),
    urlsStatusDiffs: Number(
      before.urlsStatusHash !== after.urlsStatusHash,
    ),
    allWineColumnDiffs: Number(
      before.allWineColumnsHash !== after.allWineColumnsHash,
    ),
    evidenceRowCountDiff:
      before.evidenceRowCount == null
        ? 0
        : after.evidenceRowCount - before.evidenceRowCount,
    evidenceDiffs:
      before.evidenceHash == null
        ? 0
        : Number(before.evidenceHash !== after.evidenceHash),
    goldenDiffs: Number(
      before.goldenHash !== after.goldenHash ||
        before.goldenWineCount !== after.goldenWineCount ||
        before.goldenPairingCount !== after.goldenPairingCount,
    ),
  };
  result.identical =
    result.wineCountDiff === 0 &&
    result.verifiedWineCountDiff === 0 &&
    result.identityDiffs === 0 &&
    result.technicalDiffs === 0 &&
    result.valueScoreDiffs === 0 &&
    result.giftScoreDiffs === 0 &&
    result.foodScoreDiffs === 0 &&
    result.pairingDiffs === 0 &&
    result.editorialPublicDiffs === 0 &&
    result.urlsStatusDiffs === 0 &&
    result.allWineColumnDiffs === 0 &&
    result.evidenceRowCountDiff === 0 &&
    result.evidenceDiffs === 0 &&
    result.goldenDiffs === 0;
  return result;
}
