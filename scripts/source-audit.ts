/**
 * Prompt 16 read-only catalog/source qualification.
 *
 *   npm run source:audit
 *   npm run source:audit -- --winery=budureasca
 *   npm run source:audit -- --wine=<slug>
 */
import "../lib/load-env";
import { db } from "../lib/db";
import { wineFactEvidence } from "../lib/schema";
import {
  buildPrompt16RecoverySummary,
  buildPrompt16SourceCandidates,
  type PersistedEvidenceKey,
} from "../lib/tech-facts/prompt16-report";
import { runProducerCatalogAudits } from "../lib/tech-facts/producer-catalog-audit";
import { runPublicTechnicalTrustAudit } from "../lib/tech-facts/public-trust-query";
import {
  PUBLIC_TECH_FIELDS,
  resolvePublicTechnicalTrust,
  type PublicTechField,
  type PublicTrustEvidenceInput,
  type PublicTrustWineInput,
} from "../lib/tech-facts/public-trust";
import { loadVerifiedTechWines } from "../lib/tech-facts/catalog";
import { isPrompt14Eligible } from "../lib/tech-facts/qualify";
import { techValuesEqual } from "../lib/tech-facts/types";
import {
  buildPrompt13Report,
  refuseApply,
  runReadOnlyCatalogRecovery,
} from "../lib/tech-facts/run-recovery";

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length);
}

async function loadPersistedEvidence() {
  return db.select().from(wineFactEvidence);
}

function simulatePublicCoverage(
  verifiedWines: Awaited<ReturnType<typeof loadVerifiedTechWines>>,
  recoveries: Awaited<ReturnType<typeof runReadOnlyCatalogRecovery>>["recoveries"],
  evidenceRows: Awaited<ReturnType<typeof loadPersistedEvidence>>,
) {
  const evidenceByWine = new Map<number, PublicTrustEvidenceInput[]>();
  for (const evidence of evidenceRows) {
    const current = evidenceByWine.get(evidence.wineId) ?? [];
    current.push(evidence);
    evidenceByWine.set(evidence.wineId, current);
  }
  const recoveryByWine = new Map(recoveries.map((recovery) => [recovery.wineId, recovery]));
  const before = Object.fromEntries(PUBLIC_TECH_FIELDS.map((field) => [field, 0])) as Record<PublicTechField, number>;
  const after = Object.fromEntries(PUBLIC_TECH_FIELDS.map((field) => [field, 0])) as Record<PublicTechField, number>;

  for (const wine of verifiedWines) {
    const persisted = evidenceByWine.get(wine.id) ?? [];
    const recovery = recoveryByWine.get(wine.id);
    const synthetic: PublicTrustEvidenceInput[] = [];
    const simulatedWine: PublicTrustWineInput = {
      alcohol: wine.alcohol,
      acidity: wine.acidity,
      sugar: wine.sugar,
      sweetness: wine.sweetness,
      vintage: wine.vintage,
    };
    for (const field of recovery?.fields ?? []) {
      if (
        !PUBLIC_TECH_FIELDS.includes(field.field as PublicTechField) ||
        !isPrompt14Eligible(field.qualification) ||
        (field.action !== "EVIDENCE_ATTACH" && field.action !== "VALUE_WRITE") ||
        field.candidate == null
      ) {
        continue;
      }
      const matchingClaim = field.claims.find((claim) => {
        const value = Array.isArray(claim.value) ? claim.value[0] : claim.value;
        return (
          claim.extractionMethod !== "legacy_producer_fact" &&
          value != null &&
          techValuesEqual(field.field, field.candidate!, value)
        );
      });
      if (!matchingClaim?.sourceUrl || !matchingClaim.sourceWineName) continue;
      if (field.action === "VALUE_WRITE") {
        simulatedWine[field.field as PublicTechField] = field.candidate as never;
      }
      synthetic.push({
        field: field.field as PublicTechField,
        valueJson: Array.isArray(matchingClaim.value)
          ? matchingClaim.value
          : matchingClaim.value,
        sourceUrl: matchingClaim.sourceUrl,
        sourceType: matchingClaim.sourceType,
        sourceWineName: matchingClaim.sourceWineName,
        sourceVintage: matchingClaim.sourceVintage,
        sourceDocumentTitle: matchingClaim.sourceDocumentTitle,
        excerpt: matchingClaim.excerpt,
        extractionMethod: matchingClaim.extractionMethod,
        identityMatchClass: matchingClaim.identityMatchClass,
        observedAt: matchingClaim.observedAt,
        sourceHash: matchingClaim.sourceHash,
      });
    }
    const currentTrust = resolvePublicTechnicalTrust(simulatedWine, persisted);
    const potentialTrust = resolvePublicTechnicalTrust(simulatedWine, [...persisted, ...synthetic]);
    for (const field of PUBLIC_TECH_FIELDS) {
      if (currentTrust.fields[field].status === "verified") before[field] += 1;
      if (potentialTrust.fields[field].status === "verified") after[field] += 1;
    }
  }
  return { before, after };
}

async function main() {
  if (refuseApply("source:audit")) process.exit(0);
  const winery = argValue("winery");
  const wineSlug = argValue("wine");
  const result = await runReadOnlyCatalogRecovery({
    winerySlug: winery,
    wineSlug,
    noFetch: process.argv.includes("--no-fetch"),
    includeAll: true,
  });
  const [persistedEvidenceRows, publicTrust, officialCatalogs, verifiedWines] = await Promise.all([
    loadPersistedEvidence(),
    runPublicTechnicalTrustAudit(),
    process.argv.includes("--no-fetch")
      ? Promise.resolve(null)
      : runProducerCatalogAudits(result.wines),
    loadVerifiedTechWines(),
  ]);
  const persistedEvidence: PersistedEvidenceKey[] = persistedEvidenceRows.map((row) => ({
    wineId: row.wineId,
    field: row.field,
    sourceUrl: row.sourceUrl,
    value: row.valueJson,
  }));
  const candidates = buildPrompt16SourceCandidates({
    wines: result.wines,
    recoveries: result.recoveries,
    sources: result.fetched.sources,
    attempts: result.fetched.attempts,
  });
  const summary = buildPrompt16RecoverySummary({
    wines: result.wines,
    recoveries: result.recoveries,
    candidates,
    persistedEvidence,
  });
  const sourcePresence = {
    producerPagePresent: result.wines.filter((wine) => wine.producerPageUrl).length,
    producerPageMissing: result.wines.filter((wine) => !wine.producerPageUrl).length,
    tastingSheetPresent: result.wines.filter((wine) => wine.tastingSheetUrl).length,
    tastingSheetMissing: result.wines.filter((wine) => !wine.tastingSheetUrl).length,
  };
  const sourcedFields = new Set(
    persistedEvidence.map((row) => `${row.wineId}:${row.field}`),
  );
  const technicalWarningsByWinery = result.wines.reduce<
    Record<string, { alcohol: number; acidity: number; sugar: number; total: number }>
  >((tally, wine) => {
    const key = wine.winerySlug ?? "unknown";
    const row = tally[key] ?? { alcohol: 0, acidity: 0, sugar: 0, total: 0 };
    for (const field of ["alcohol", "acidity", "sugar"] as const) {
      if (wine[field] != null && !sourcedFields.has(`${wine.id}:${field}`)) {
        row[field] += 1;
        row.total += 1;
      }
    }
    tally[key] = row;
    return tally;
  }, {});
  const producerRows = (slug: string) =>
    candidates.filter((candidate) => candidate.winery === slug);

  console.log(
    JSON.stringify(
      {
        prompt: 16,
        readOnly: true,
        filter: { winery: winery ?? "all", wine: wineSlug ?? "all" },
        catalog: {
          rows: result.wines.length,
          sourcePresence,
        },
        fetch: result.fetched.stats,
        fetchFailureClasses: result.fetched.attempts.reduce<Record<string, number>>(
          (tally, attempt) => {
            if (!attempt.failureClass) return tally;
            tally[attempt.failureClass] = (tally[attempt.failureClass] ?? 0) + 1;
            return tally;
          },
          {},
        ),
        summary,
        remainingTechnicalWarnings: {
          total: Object.values(technicalWarningsByWinery).reduce(
            (sum, row) => sum + row.total,
            0,
          ),
          byWinery: technicalWarningsByWinery,
        },
        publicVerifiedBaseline: Object.fromEntries(
          Object.entries(publicTrust.byField).map(([field, counts]) => [
            field,
            counts.verified,
          ]),
        ),
        publicVerifiedCoverageSimulation: simulatePublicCoverage(
          verifiedWines,
          result.recoveries,
          persistedEvidenceRows,
        ),
        priorRecoveryReport: buildPrompt13Report(
          result.wines,
          result.recoveries,
          result.fetched.stats,
        ),
        officialCatalogs,
        wineries: {
          budureasca: producerRows("budureasca"),
          avincis: producerRows("avincis"),
          ballaGeza: producerRows("balla-geza"),
          gabai: producerRows("crama-gabai"),
          murfatlar: producerRows("murfatlar"),
          recasControl: producerRows("cramele-recas"),
        },
        candidates,
        productionWrites: {
          wineTechnical: 0,
          sourceUrls: 0,
          wineFactEvidence: 0,
          value: 0,
          gift: 0,
          food: 0,
          pairing: 0,
          editorial: 0,
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
