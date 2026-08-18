/**
 * Guarded Prompt 18 batch runner.
 *
 * Default is dry-run. Production mutation requires both --apply and
 * --production, a clean git tree, a frozen manifest, and a remote DB target.
 */
import "../lib/load-env";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../lib/db";
import { getTursoConfig } from "../lib/env";
import { wineFactEvidence, wines } from "../lib/schema";
import {
  evidenceManifestKey,
  planEvidenceMutations,
  planSourceMutations,
  validateEnvelope,
  validateManifestA,
  validateManifestB,
  validateManifestC,
  type Prompt18Batch,
  type Prompt18EvidenceManifestEntry,
  type Prompt18ManifestEnvelope,
  type Prompt18SourceManifestEntry,
} from "../lib/tech-facts/prompt18-manifests";
import { persistWineFactEvidenceStrict } from "../lib/tech-facts/persist";
import type { TechFactClaim } from "../lib/tech-facts/types";

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

function batchFromArgs(): Prompt18Batch {
  const value = argValue("manifest");
  if (value !== "A" && value !== "B" && value !== "C") {
    throw new Error("Use --manifest=A, --manifest=B, or --manifest=C");
  }
  return value;
}

function databaseTarget(url: string): string {
  if (url.startsWith("file:")) return url;
  const parsed = new URL(url);
  return `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`;
}

function assertProductionGuard(url: string): void {
  if (!process.argv.includes("--apply")) return;
  if (!process.argv.includes("--production")) {
    throw new Error("Production apply requires both --apply and --production");
  }
  if (!url.startsWith("libsql://") && !url.startsWith("https://")) {
    throw new Error("Production apply refuses a local database target");
  }
  const dirty = execFileSync("git", ["status", "--porcelain"], {
    encoding: "utf8",
  }).trim();
  if (dirty) {
    throw new Error("Production apply requires a clean git working tree");
  }
}

async function readEnvelope<T>(
  artifactDir: string,
  batch: Prompt18Batch,
): Promise<Prompt18ManifestEnvelope<T>> {
  const path = resolve(artifactDir, `manifest-${batch.toLowerCase()}.json`);
  const parsed = JSON.parse(await readFile(path, "utf8")) as Prompt18ManifestEnvelope<T>;
  validateEnvelope(parsed, batch);
  return parsed;
}

async function runBatchA(
  artifactDir: string,
  apply: boolean,
): Promise<Record<string, unknown>> {
  const artifact = await readEnvelope<Prompt18SourceManifestEntry>(artifactDir, "A");
  validateManifestA(artifact.entries);
  const ids = artifact.entries.map((row) => row.wineId);
  const currentRows = await db
    .select({
      id: wines.id,
      slug: wines.slug,
      producerPageUrl: wines.producerPageUrl,
      tastingSheetUrl: wines.tastingSheetUrl,
    })
    .from(wines)
    .where(inArray(wines.id, ids));
  const plan = planSourceMutations(artifact.entries, currentRows);
  const results: Array<Record<string, unknown>> = [];
  let writes = 0;

  for (const row of plan) {
    if (!apply || row.status !== "PENDING") {
      results.push(row);
      continue;
    }
    const field = row.field === "producerPageUrl"
      ? wines.producerPageUrl
      : wines.tastingSheetUrl;
    const updated = await db
      .update(wines)
      .set(
        row.field === "producerPageUrl"
          ? { producerPageUrl: row.newUrl }
          : { tastingSheetUrl: row.newUrl },
      )
      .where(and(eq(wines.id, row.wineId), eq(field, row.oldUrl)))
      .returning({ id: wines.id });
    if (updated.length === 1) {
      writes += 1;
      results.push({ ...row, status: "APPLIED" });
      continue;
    }
    const latest = await db.query.wines.findFirst({
      where: eq(wines.id, row.wineId),
      columns: {
        producerPageUrl: true,
        tastingSheetUrl: true,
      },
    });
    results.push({
      ...row,
      status:
        latest?.[row.field] === row.newUrl
          ? "ALREADY_APPLIED_CONCURRENTLY"
          : "STALE_MANIFEST",
    });
  }

  return {
    manifestHash: artifact.entriesHash,
    expectedActions: 9,
    dryRun: !apply,
    writes,
    statuses: countStatuses(results),
    rows: results,
  };
}

function toClaim(row: Prompt18EvidenceManifestEntry): TechFactClaim {
  return {
    field: row.field,
    value: row.value,
    unit: row.unit,
    sourceUrl: row.sourceUrl,
    sourceType: row.sourceType,
    sourceWineName: row.sourceWineName,
    sourceVintage: row.sourceVintage,
    sourceDocumentTitle: row.sourceDocumentTitle,
    excerpt: row.excerpt,
    extractionMethod: row.extractionMethod,
    identityMatchClass: row.identityMatchClass,
    confidence: row.confidence,
    observedAt: row.observedAt,
    sourceHash: row.sourceHash,
    claimIdentityHash: row.sourceHash,
  };
}

async function runBatchB(
  artifactDir: string,
  apply: boolean,
): Promise<Record<string, unknown>> {
  const artifact = await readEnvelope<Prompt18EvidenceManifestEntry>(artifactDir, "B");
  validateManifestB(artifact.entries);
  const ids = [...new Set(artifact.entries.map((row) => row.wineId))];
  const currentRows = await db
    .select({
      id: wines.id,
      slug: wines.slug,
      alcohol: wines.alcohol,
      sweetness: wines.sweetness,
      vintage: wines.vintage,
    })
    .from(wines)
    .where(inArray(wines.id, ids));
  const existing = await db
    .select({
      wineId: wineFactEvidence.wineId,
      field: wineFactEvidence.field,
      sourceHash: wineFactEvidence.sourceHash,
    })
    .from(wineFactEvidence)
    .where(inArray(wineFactEvidence.wineId, ids));
  const persistedKeys = new Set(
    existing
      .filter((row): row is typeof row & { sourceHash: string } => Boolean(row.sourceHash))
      .map(evidenceManifestKey),
  );
  const plan = planEvidenceMutations(artifact.entries, currentRows, persistedKeys);
  const results: Array<Record<string, unknown>> = [];
  let inserts = 0;

  for (const row of plan) {
    if (!apply || row.status !== "PENDING") {
      results.push(row);
      continue;
    }
    const duplicate = await db.query.wineFactEvidence.findFirst({
      where: and(
        eq(wineFactEvidence.wineId, row.wineId),
        eq(wineFactEvidence.field, row.field),
        eq(wineFactEvidence.sourceHash, row.sourceHash),
      ),
      columns: { id: true },
    });
    if (duplicate) {
      results.push({ ...row, status: "ALREADY_PERSISTED" });
      continue;
    }
    const latest = await db.query.wines.findFirst({
      where: eq(wines.id, row.wineId),
      columns: {
        slug: true,
        alcohol: true,
        sweetness: true,
        vintage: true,
      },
    });
    if (
      latest?.slug !== row.slug ||
      latest[row.field] !== row.expectedStoredValue ||
      latest[row.field] !== row.value
    ) {
      results.push({ ...row, status: "STALE_VALUE_OR_CONFLICT" });
      continue;
    }
    const inserted = await persistWineFactEvidenceStrict(row.wineId, [toClaim(row)]);
    if (inserted !== 1) {
      const concurrent = await db.query.wineFactEvidence.findFirst({
        where: and(
          eq(wineFactEvidence.wineId, row.wineId),
          eq(wineFactEvidence.field, row.field),
          eq(wineFactEvidence.sourceHash, row.sourceHash),
        ),
        columns: { id: true },
      });
      if (!concurrent) {
        throw new Error(`Strict evidence insert failed: ${evidenceManifestKey(row)}`);
      }
      results.push({ ...row, status: "ALREADY_PERSISTED_CONCURRENTLY" });
      continue;
    }
    inserts += 1;
    results.push({ ...row, status: "INSERTED" });
  }

  return {
    manifestHash: artifact.entriesHash,
    approvedMaximum: 9,
    dryRun: !apply,
    inserts,
    statuses: countStatuses(results),
    rows: results,
  };
}

async function runBatchC(artifactDir: string): Promise<Record<string, unknown>> {
  const artifact = await readEnvelope<never>(artifactDir, "C");
  validateManifestC(artifact.entries);
  return {
    manifestHash: artifact.entriesHash,
    dryRun: !process.argv.includes("--apply"),
    proposed: 0,
    writes: 0,
    rows: [],
  };
}

function countStatuses(rows: Array<Record<string, unknown>>): Record<string, number> {
  return rows.reduce<Record<string, number>>((counts, row) => {
    const status = String(row.status);
    counts[status] = (counts[status] ?? 0) + 1;
    return counts;
  }, {});
}

async function main() {
  const batch = batchFromArgs();
  const artifactDir = argValue("artifact-dir");
  if (!artifactDir) throw new Error("Provide --artifact-dir=<frozen-manifest-directory>");
  const apply = process.argv.includes("--apply");
  const { url } = getTursoConfig();
  console.log(
    JSON.stringify({
      command: "prompt18:manifest-apply",
      batch,
      mode: apply ? "APPLY" : "DRY_RUN",
      databaseTarget: databaseTarget(url),
    }),
  );
  assertProductionGuard(url);

  const result =
    batch === "A"
      ? await runBatchA(artifactDir, apply)
      : batch === "B"
        ? await runBatchB(artifactDir, apply)
        : await runBatchC(artifactDir);
  console.log(JSON.stringify({ batch, ...result }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
