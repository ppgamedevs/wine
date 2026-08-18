/**
 * Read-only provenance qualification. Never attaches evidence.
 *
 *   npm run tech:provenance-qualify
 *   npm run tech:provenance-qualify -- --winery=cramele-recas
 */
import "../lib/load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { wines } from "../lib/schema";
import { normalizeWineRows } from "../lib/normalize-wine";
import { auditWineProvenance } from "../lib/pairing/provenance-audit";
import { GOLDEN_CURATION_STATS } from "../lib/pairing/golden-curation-dataset";
import { isPrompt14Eligible } from "../lib/tech-facts/qualify";
import { refuseApply, runReadOnlyCatalogRecovery, buildPrompt13Report } from "../lib/tech-facts/run-recovery";
import type { WineWithRelations } from "../types";

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  if (refuseApply("tech:provenance-qualify")) process.exit(0);
  const { wines: catalog, recoveries, fetched } = await runReadOnlyCatalogRecovery({
    winerySlug: argValue("winery"),
    wineSlug: argValue("wine"),
    noFetch: process.argv.includes("--no-fetch"),
  });
  const report = buildPrompt13Report(catalog, recoveries, fetched.stats);

  const pairingRows = await db.query.wines.findMany({
    with: { winery: true, region: true },
    where: eq(wines.status, "verified"),
  });
  const pairingCatalog = normalizeWineRows(pairingRows as WineWithRelations[]).filter(
    (wine) => wine.foodPairings.length > 0,
  );
  const provenance = pairingCatalog.flatMap((wine) => auditWineProvenance(wine));
  const mismatches = provenance.filter((row) => row.proposedBasis);
  const explicitTocanita = mismatches.filter(
    (row) =>
      /feteasca neagra/i.test(row.wineName) && /tocanita de vanat/i.test(row.dish),
  );

  const recas = recoveries.filter((row) => row.winerySlug === "cramele-recas");
  const recasQualified = { alcohol: 0, acidity: 0, sugar: 0, sweetness: 0, vintage: 0 };
  for (const recovery of recas) {
    for (const field of recovery.fields) {
      if (field.field in recasQualified && isPrompt14Eligible(field.qualification) && field.action === "EVIDENCE_ATTACH") {
        recasQualified[field.field as keyof typeof recasQualified] += 1;
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        ...report,
        recasRequalification: {
          wines: recas.length,
          prompt12: { alcohol: 69, acidity: 55, sweetness: 68, vintage: 73 },
          prompt13Qualified: recasQualified,
        },
        pairingProvenance: {
          producerEvidencePairings: provenance.length,
          mismatches: mismatches.length,
          explicitFeteascaNeagraTocanita: explicitTocanita,
          golden: GOLDEN_CURATION_STATS,
        },
        recommendationGate: {
          qualifiedExactOrCorroborated:
            report.prompt13QualifiedEvidenceAttach.alcohol +
            report.prompt13QualifiedEvidenceAttach.acidity +
            report.prompt13QualifiedEvidenceAttach.sugar +
            report.prompt13QualifiedEvidenceAttach.sweetness +
            report.prompt13QualifiedEvidenceAttach.vintage,
          potentialSafeWrites:
            report.potentialSafeValueWrites.alcohol +
            report.potentialSafeValueWrites.acidity +
            report.potentialSafeValueWrites.sugar +
            report.potentialSafeValueWrites.sweetness +
            report.potentialSafeValueWrites.vintage,
        },
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
