/**
 * Exact Prompt 18 production snapshot and allowlist comparator.
 */
import "../lib/load-env";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { db } from "../lib/db";
import {
  GOLDEN_CURATION_STATS,
  GOLDEN_CURATION_WINES,
} from "../lib/pairing/golden-curation-dataset";
import { wineFactEvidence, wines } from "../lib/schema";
import {
  evidenceManifestKey,
  validateEnvelope,
  validateManifestA,
  validateManifestB,
  type Prompt18EvidenceManifestEntry,
  type Prompt18ManifestEnvelope,
  type Prompt18SourceManifestEntry,
} from "../lib/tech-facts/prompt18-manifests";

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function capture() {
  const rows = await db.select().from(wines).orderBy(wines.id);
  const evidenceRows = await db.select().from(wineFactEvidence).orderBy(wineFactEvidence.id);
  const technical = rows.map((row) => ({
    id: row.id,
    alcohol: row.alcohol,
    acidity: row.acidity,
    sugar: row.sugar,
    sweetness: row.sweetness,
    vintage: row.vintage,
    grapeVarieties: row.grapeVarieties,
    type: row.type,
    priceAvg: row.priceAvg,
    currentPrice: row.currentPrice,
    lowestPrice30d: row.lowestPrice30d,
    priceHistory: row.priceHistory,
  }));
  const sourceRows = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    sourceUrl: row.sourceUrl,
    producerPageUrl: row.producerPageUrl,
    tastingSheetUrl: row.tastingSheetUrl,
  }));
  const scores = rows.map((row) => ({
    id: row.id,
    valueScore: row.valueScore,
    giftScore: row.giftScore,
    foodMatchScore: row.foodMatchScore,
    overpricedRisk: row.overpricedRisk,
    valueScoreVersion: row.valueScoreVersion,
    estimatedQuality: row.estimatedQuality,
    qualityEffective: row.qualityEffective,
    qualityFinal: row.qualityFinal,
    qualitySurplus: row.qualitySurplus,
    rawSigmoidScore: row.rawSigmoidScore,
  }));
  const pairings = rows.map((row) => ({ id: row.id, foodPairings: row.foodPairings }));
  const editorial = rows.map((row) => ({
    id: row.id,
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
  const identity = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    status: row.status,
    wineryId: row.wineryId,
    regionId: row.regionId,
  }));
  return {
    prompt: 18,
    capturedAt: new Date().toISOString(),
    wineCount: rows.length,
    evidenceRowCount: evidenceRows.length,
    goldenWineCount: GOLDEN_CURATION_STATS.wines,
    goldenPairingCount: GOLDEN_CURATION_STATS.pairings,
    canonicalCoverage: {
      alcohol: rows.filter((row) => row.alcohol != null).length,
      acidity: rows.filter((row) => row.acidity != null).length,
      sugar: rows.filter((row) => row.sugar != null).length,
      sweetness: rows.filter((row) => row.sweetness != null).length,
      vintage: rows.filter((row) => row.vintage != null).length,
    },
    hashes: {
      technical: hash(technical),
      sourceUrls: hash(sourceRows),
      scores: hash(scores),
      pairings: hash(pairings),
      editorial: hash(editorial),
      identity: hash(identity),
      evidence: hash(evidenceRows),
      golden: hash(GOLDEN_CURATION_WINES),
    },
    sourceRows,
    evidenceRows,
  };
}

type Snapshot = Awaited<ReturnType<typeof capture>>;

async function manifest<T>(
  artifactDir: string,
  batch: "A" | "B",
): Promise<Prompt18ManifestEnvelope<T>> {
  const value = JSON.parse(
    await readFile(resolve(artifactDir, `manifest-${batch.toLowerCase()}.json`), "utf8"),
  ) as Prompt18ManifestEnvelope<T>;
  validateEnvelope(value, batch);
  return value;
}

async function compare(
  before: Snapshot,
  after: Snapshot,
  artifactDir: string,
) {
  const manifestA = await manifest<Prompt18SourceManifestEntry>(artifactDir, "A");
  const manifestB = await manifest<Prompt18EvidenceManifestEntry>(artifactDir, "B");
  validateManifestA(manifestA.entries);
  validateManifestB(manifestB.entries);
  const approvedSource = new Map(
    manifestA.entries.map((row) => [`${row.wineId}|${row.field}`, row]),
  );
  const beforeSources = new Map(before.sourceRows.map((row) => [row.id, row]));
  const sourceDiffs: Array<Record<string, unknown>> = [];
  for (const row of after.sourceRows) {
    const previous = beforeSources.get(row.id);
    if (!previous) continue;
    for (const field of ["sourceUrl", "producerPageUrl", "tastingSheetUrl"] as const) {
      if (previous[field] === row[field]) continue;
      const approved = approvedSource.get(`${row.id}|${field}`);
      sourceDiffs.push({
        wineId: row.id,
        slug: row.slug,
        field,
        before: previous[field],
        after: row[field],
        approved:
          Boolean(approved) &&
          approved?.oldUrl === previous[field] &&
          approved?.newUrl === row[field],
      });
    }
  }

  const afterEvidenceById = new Map(after.evidenceRows.map((row) => [row.id, row]));
  const originalEvidenceChanges = before.evidenceRows
    .filter((row) => JSON.stringify(row) !== JSON.stringify(afterEvidenceById.get(row.id)))
    .map((row) => row.id);
  const beforeEvidenceIds = new Set(before.evidenceRows.map((row) => row.id));
  const additions = after.evidenceRows.filter((row) => !beforeEvidenceIds.has(row.id));
  const approvedEvidence = new Set(manifestB.entries.map(evidenceManifestKey));
  const evidenceDiffs = additions.map((row) => ({
    id: row.id,
    wineId: row.wineId,
    field: row.field,
    sourceHash: row.sourceHash,
    approved:
      Boolean(row.sourceHash) &&
      approvedEvidence.has(
        evidenceManifestKey({
          wineId: row.wineId,
          field: row.field,
          sourceHash: row.sourceHash ?? "",
        }),
      ),
  }));
  const protectedHashes = {
    technical: before.hashes.technical === after.hashes.technical,
    scores: before.hashes.scores === after.hashes.scores,
    pairings: before.hashes.pairings === after.hashes.pairings,
    editorial: before.hashes.editorial === after.hashes.editorial,
    identity: before.hashes.identity === after.hashes.identity,
    golden: before.hashes.golden === after.hashes.golden,
  };
  const safe =
    Object.values(protectedHashes).every(Boolean) &&
    sourceDiffs.every((row) => row.approved === true) &&
    sourceDiffs.length <= 9 &&
    originalEvidenceChanges.length === 0 &&
    evidenceDiffs.every((row) => row.approved) &&
    evidenceDiffs.length <= 9;
  return {
    safe,
    protectedHashes,
    sourceDiffs,
    evidenceDiffs,
    originalEvidenceChanges,
    evidenceRowCountDiff: after.evidenceRowCount - before.evidenceRowCount,
    canonicalCoverageBefore: before.canonicalCoverage,
    canonicalCoverageAfter: after.canonicalCoverage,
  };
}

async function main() {
  const current = await capture();
  const outputPath = argValue("output");
  if (outputPath) {
    await writeFile(resolve(outputPath), `${JSON.stringify(current, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
    });
  }
  const comparePath = argValue("compare");
  const artifactDir = argValue("artifact-dir");
  const comparison =
    comparePath && artifactDir
      ? await compare(
          JSON.parse(await readFile(resolve(comparePath), "utf8")) as Snapshot,
          current,
          artifactDir,
        )
      : null;
  console.log(JSON.stringify({ current, comparison }, null, 2));
  if (comparison && !comparison.safe) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
