/**
 * Catalog evidence backfill (Truth Layer recovery).
 *
 *   npx tsx scripts/evidence-backfill.ts
 *   npx tsx scripts/evidence-backfill.ts --wine=slug
 *   npx tsx scripts/evidence-backfill.ts --blocking-only
 *   npx tsx scripts/evidence-backfill.ts --limit=20
 *   npx tsx scripts/evidence-backfill.ts --offset=20 --limit=20
 *   npx tsx scripts/evidence-backfill.ts --apply
 *
 * Default is dry-run / report only. --apply writes only source-backed
 * factual fields. It never rewrites editorial copy or Value Score.
 */
import "../lib/load-env";
import { runEvidenceBackfill } from "../lib/evidence-backfill";

function readArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match?.slice(prefix.length);
}

async function main() {
  const asJson = process.argv.includes("--json");
  const apply = process.argv.includes("--apply");
  const blockingOnly = process.argv.includes("--blocking-only");
  const all = process.argv.includes("--all");
  const wineSlug = readArg("wine");
  const limitRaw = readArg("limit");
  const offsetRaw = readArg("offset");
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
  const offset = offsetRaw ? Number.parseInt(offsetRaw, 10) : undefined;

  const report = await runEvidenceBackfill({
    apply,
    wineSlug,
    blockingOnly: blockingOnly || (!all && !wineSlug),
    all,
    limit: Number.isFinite(limit) ? limit : undefined,
    offset: Number.isFinite(offset) ? offset : undefined,
  });

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log(`\n[evidence-backfill] dryRun=${report.dryRun}`);
  console.log(
    `[evidence-backfill] catalog total=${report.catalog.totalWines} verified=${report.catalog.verifiedWines} blockingWines=${report.catalog.blockingWines} blockingIssues=${report.catalog.blockingIssues}`,
  );
  console.log(
    `[evidence-backfill] sources producerPage=${report.sourceAvailability.exactProducerPage} tastingSheet=${report.sourceAvailability.tastingSheet} retailerOnly=${report.sourceAvailability.retailerOnly} none=${report.sourceAvailability.noRetrievableSource}`,
  );
  console.log(
    `[evidence-backfill] recovery resolve>=1=${report.recovery.winesResolvingAtLeastOne} issuesResolved=${report.recovery.blockingIssuesResolved} full=${report.recovery.fullyRecoverable} partial=${report.recovery.partiallyRecoverable} none=${report.recovery.unrecoverable}`,
  );
  console.log(
    `[evidence-backfill] cleanup sentences=${report.residualCleanup.sentencesRemovable} fields=${report.residualCleanup.fieldsClearable} pairings=${report.residualCleanup.pairingNotesRemovable} humanReview=${report.residualCleanup.humanReview}`,
  );
  console.log(
    `[evidence-backfill] sensory total=${report.sensory.total} contradictory=${report.sensory.byCategory.definitely_contradictory} specific=${report.sensory.byCategory.unsupported_wine_specific} generic=${report.sensory.byCategory.likely_generic} evidence=${report.sensory.byCategory.source_evidence_found} ambiguous=${report.sensory.byCategory.ambiguous}`,
  );
  console.log(
    `[evidence-backfill] cellar 2=${report.cellar.cellarPotential2} 4=${report.cellar.cellarPotential4} other=${report.cellar.cellarPotentialOther} null=${report.cellar.cellarPotentialNull} drinkWindow=${report.cellar.withDrinkWindow} algorithmic=${report.cellar.algorithmicLooks} explicit=${report.cellar.explicitAgeingEvidence} unknown=${report.cellar.unknownProvenance}`,
  );
  console.log(
    `[evidence-backfill] expertNotes wines=${report.expertNotes.winesWithNotes} stored=${report.expertNotes.sectionsStored} surviving=${report.expertNotes.sectionsSurviving} emptyAfterFilter=${report.expertNotes.notesEntirelyEmptyAfterFilter}`,
  );
  console.log(
    `[evidence-backfill] sourceConflicts=${report.sourceConflicts.total}`,
  );
  console.log(`[evidence-backfill] ${report.foodPairingsNote}`);

  console.log(
    `[evidence-backfill] classes full=${report.recoveryClasses.FULLY_RECOVERABLE} partial=${report.recoveryClasses.PARTIALLY_RECOVERABLE} cleanup=${report.recoveryClasses.CLEANUP_ONLY} review=${report.recoveryClasses.HUMAN_REVIEW} noSource=${report.recoveryClasses.NO_SOURCE} conflict=${report.recoveryClasses.SOURCE_CONFLICT} fetchFail=${report.recoveryClasses.FETCH_FAILED}`,
  );
  if (report.simulation) {
    const sim = report.simulation;
    console.log(
      `[evidence-backfill] simulation blockingWines ${sim.blockingWinesBefore}->evidence ${sim.blockingWinesAfterEvidence}->cleanup ${sim.blockingWinesAfterCleanup} issues ${sim.blockingIssuesBefore}->${sim.blockingIssuesAfterEvidence}->${sim.blockingIssuesAfterCleanup} cleanAfter=${sim.cleanWinesAfter} high=${sim.highAfter} medium=${sim.mediumAfter} low=${sim.lowAfter}`,
    );
  }

  const sample = report.wines;
  console.log(`\nBlocking queue (${sample.length}):`);
  for (const item of sample) {
    console.log(`\nWine: ${item.slug}`);
    console.log(`  Before: ${item.beforeHigh} high, ${item.beforeMedium} medium, ${item.beforeBlocking} blocking`);
    console.log(`  After evidence: ${item.afterHigh} high, ${item.afterMedium} medium, ${item.afterBlocking} blocking`);
    console.log(`  Sources: ${item.sourcesDiscovered.join(", ") || "none discovered"}`);
    console.log(`  Evidence: ${item.evidenceRecovered.join(", ") || "none"}`);
    console.log(`  Resolved: ${item.resolved.join(", ") || "none"}`);
    console.log(`  Still blocking: ${item.remaining.join(", ") || "none"}`);
    console.log(`  Safe repair: ${item.safeRepairs.join("; ") || "none"}`);
    console.log(`  Human review: ${item.humanReview.join(", ") || "none"}`);
    console.log(`  Disposition: ${item.disposition}${item.fetchFailed ? ` fetchFailed=${item.fetchError ?? ""}` : ""}`);
  }

  console.log("\n[evidence-backfill] done");
}

main().catch((error) => {
  console.error("[evidence-backfill] fatal:", error);
  process.exit(1);
});
