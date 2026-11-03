/**
 * Structured sensory/serving/culinary claim backfill.
 *
 *   npx tsx scripts/structured-claims-backfill.ts --wine=418 --fixtures
 *   npx tsx scripts/structured-claims-backfill.ts --wine=418 --fixtures --apply --confirm-apply
 *
 * Dry-run is the default. Only source-backed V2 claims in the structured field
 * allow-list are planned. Existing rows are never updated or deleted.
 */
import "../lib/load-env";
import { writeFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { wineClaimEvidence } from "@/lib/schema";
import {
  loadTargetSources,
  loadTargetWine,
} from "@/lib/intelligence/fixtures";
import {
  loadCatalogWineForIntelligence,
  loadLiveSource,
} from "@/lib/intelligence/catalog-source";
import { runWineIntelligence } from "@/lib/intelligence/pipeline";
import {
  planStructuredClaims,
  type ExistingStructuredClaim,
} from "@/lib/intelligence/structured-claims-backfill";
import { applyStructuredClaims } from "@/lib/intelligence/structured-claims-persist";

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  const wineId = Number.parseInt(arg("wine") ?? "418", 10);
  if (!Number.isFinite(wineId)) throw new Error(`Invalid --wine: ${arg("wine")}`);
  const fixtures = process.argv.includes("--fixtures");
  const apply = process.argv.includes("--apply");
  const confirmed = process.argv.includes("--confirm-apply");
  if (apply && !confirmed) {
    throw new Error("Refusing to write without --confirm-apply. Run a dry-run first.");
  }

  const fixtureInput = fixtures
    ? {
        wine: loadTargetWine(),
        fixtures: loadTargetSources(),
        sourceCandidates: [],
        loadSource: undefined,
      }
    : null;
  const catalogInput = fixtureInput
    ? null
    : await loadCatalogWineForIntelligence(wineId);
  if (!fixtureInput && !catalogInput) {
    throw new Error(`Wine ${wineId} was not found in the configured database.`);
  }
  if (fixtureInput && fixtureInput.wine.id !== wineId) {
    throw new Error(`Fixture provides wine ${fixtureInput.wine.id}, not ${wineId}.`);
  }

  const { report } = await runWineIntelligence({
    wine: fixtureInput?.wine ?? catalogInput!.input,
    fixtures: fixtureInput?.fixtures ?? [],
    sourceCandidates: fixtureInput?.sourceCandidates ?? catalogInput!.candidates,
    loadSource: fixtureInput?.loadSource ?? loadLiveSource,
    dryRun: true,
  });

  let existing: ExistingStructuredClaim[] = [];
  try {
    existing = await db
      .select({
        id: wineClaimEvidence.id,
        wineId: wineClaimEvidence.wineId,
        field: wineClaimEvidence.field,
        sourceHash: wineClaimEvidence.sourceHash,
        claimHash: wineClaimEvidence.claimHash,
        normalizedValue: wineClaimEvidence.normalizedValue,
        verificationStatus: wineClaimEvidence.verificationStatus,
      })
      .from(wineClaimEvidence)
      .where(eq(wineClaimEvidence.wineId, wineId));
  } catch {
    throw new Error(
      "wine_claim_evidence is not present. Apply/validate migration 0028 first.",
    );
  }

  const plan = planStructuredClaims({ report, existing, dryRun: !apply });
  const output = {
    wineId,
    dryRun: !apply,
    candidates: plan.candidates,
    plannedWrites: plan.writes.length,
    alreadyPresent: plan.alreadyPresent,
    existingValueConflict: plan.existingValueConflict,
    skipped: plan.skipped,
    fields: plan.fields,
    writes: plan.writes.map((write) => ({
      field: write.field,
      value: write.normalizedValue,
      sourceUrl: write.sourceUrl,
      sourceClass: write.sourceClass,
      verificationStatus: write.verificationStatus,
    })),
  };

  console.log(JSON.stringify(output, null, 2));
  const out = arg("out") ?? "docs/structured-claims-backfill-last-plan.json";
  writeFileSync(out, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  if (apply) {
    const result = await applyStructuredClaims(plan);
    console.log(
      JSON.stringify(
        { applied: result.inserted, skippedExisting: result.skippedExisting, dryRun: false },
        null,
        2,
      ),
    );
  } else {
    console.log(JSON.stringify({ applied: 0, skippedExisting: 0, dryRun: true }, null, 2));
  }
}

main().catch((error) => {
  console.error("[structured-claims-backfill]", error);
  process.exit(1);
});
