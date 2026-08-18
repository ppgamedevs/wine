/**
 * Prompt 16 read-only health and drift audit for persisted evidence URLs.
 */
import "../lib/load-env";
import { db } from "../lib/db";
import { wineFactEvidence } from "../lib/schema";
import { fetchOfficialSources } from "../lib/tech-facts/fetch-source";
import {
  classifySourceDrift,
  type SourceDriftStatus,
} from "../lib/tech-facts/official-source-recovery";
import { loadVerifiedTechWines } from "../lib/tech-facts/catalog";
import { recoverWineWithSources } from "../lib/tech-facts/recover";
import { refuseApply } from "../lib/tech-facts/run-recovery";
import { techValuesEqual, type TechFactField } from "../lib/tech-facts/types";

type EvidenceSourceHealth =
  | "AVAILABLE_SAME_CONTENT_CLASS"
  | "AVAILABLE_CHANGED"
  | "REDIRECT_VALID"
  | "REDIRECT_DIFFERENT_PRODUCT"
  | "DEAD"
  | "BLOCKED"
  | "TEMP_ERROR";

function scalar(value: string | number | string[]): string | number | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function transportHealth(
  failureClass: string | null,
): EvidenceSourceHealth | null {
  if (failureClass === "DEAD_404") return "DEAD";
  if (failureClass === "FETCH_BLOCKED") return "BLOCKED";
  if (failureClass) return "TEMP_ERROR";
  return null;
}

async function main() {
  if (refuseApply("source:health")) process.exit(0);
  const [evidenceRows, wines] = await Promise.all([
    db
      .select({
        id: wineFactEvidence.id,
        wineId: wineFactEvidence.wineId,
        field: wineFactEvidence.field,
        valueJson: wineFactEvidence.valueJson,
        sourceUrl: wineFactEvidence.sourceUrl,
        sourceWineName: wineFactEvidence.sourceWineName,
        sourceVintage: wineFactEvidence.sourceVintage,
        excerpt: wineFactEvidence.excerpt,
        observedAt: wineFactEvidence.observedAt,
      })
      .from(wineFactEvidence),
    loadVerifiedTechWines(),
  ]);
  const urls = [...new Set(evidenceRows.map((row) => row.sourceUrl).filter((url): url is string => Boolean(url)))];
  const fetched = await fetchOfficialSources(urls);
  const sourceByUrl = new Map(fetched.sources.map((source) => [source.url, source]));
  const attemptByUrl = new Map(fetched.attempts.map((attempt) => [attempt.url, attempt]));
  const wineById = new Map(wines.map((wine) => [wine.id, wine]));
  const currentRecovery = new Map<string, Awaited<ReturnType<typeof recoverWineWithSources>>>();

  for (const evidence of evidenceRows) {
    if (!evidence.sourceUrl) continue;
    const wine = wineById.get(evidence.wineId);
    const source = sourceByUrl.get(evidence.sourceUrl);
    if (!wine || !source) continue;
    const key = `${wine.id}:${evidence.sourceUrl}`;
    if (!currentRecovery.has(key)) {
      currentRecovery.set(key, await recoverWineWithSources(wine, [source]));
    }
  }

  const rows = urls.map((url) => {
    const source = sourceByUrl.get(url);
    const attempt = attemptByUrl.get(url);
    const evidenceForUrl = evidenceRows.filter((row) => row.sourceUrl === url);
    const drifts: Array<{
      wineId: number;
      field: string;
      observedAt: string;
      persisted: string | number | null;
      current: string | number | null;
      status: SourceDriftStatus;
    }> = [];

    if (source) {
      for (const evidence of evidenceForUrl) {
        const wine = wineById.get(evidence.wineId);
        const recovery = currentRecovery.get(`${evidence.wineId}:${url}`);
        const persisted = scalar(evidence.valueJson);
        if (!wine || !recovery || persisted == null) continue;
        const currentClaim = recovery.claims.find(
          (claim) =>
            claim.sourceUrl === url &&
            claim.field === evidence.field &&
            claim.extractionMethod !== "legacy_producer_fact",
        );
        const current = currentClaim ? scalar(currentClaim.value) : null;
        const status = classifySourceDrift({
          persistedWineName: evidence.sourceWineName,
          persistedVintage: evidence.sourceVintage,
          persistedValue: persisted,
          currentWineName: currentClaim?.sourceWineName ?? recovery.sourceIdentity?.sourceWineName ?? null,
          currentVintage: currentClaim?.sourceVintage ?? recovery.sourceIdentity?.sourceVintage ?? null,
          currentValue: current,
          field: evidence.field as "alcohol" | "acidity" | "sugar" | "sweetness" | "vintage",
        });
        const layoutOnly =
          current == null ||
          (techValuesEqual(evidence.field as TechFactField, persisted, current) &&
            status === "NON_MATERIAL_PAGE_CHANGE");
        drifts.push({
          wineId: evidence.wineId,
          field: evidence.field,
          observedAt: evidence.observedAt,
          persisted,
          current,
          status: layoutOnly ? "NON_MATERIAL_PAGE_CHANGE" : status,
        });
      }
    }

    const transport = transportHealth(attempt?.failureClass ?? null);
    const material = drifts.some((drift) =>
      ["VALUE_CHANGED", "VINTAGE_ROLLED_FORWARD", "PRODUCT_CHANGED", "IDENTITY_CHANGED"].includes(drift.status),
    );
    const identityChanged = drifts.some((drift) =>
      ["PRODUCT_CHANGED", "IDENTITY_CHANGED", "VINTAGE_ROLLED_FORWARD"].includes(drift.status),
    );
    const health: EvidenceSourceHealth =
      transport ??
      (source?.redirected
        ? identityChanged
          ? "REDIRECT_DIFFERENT_PRODUCT"
          : "REDIRECT_VALID"
        : material
          ? "AVAILABLE_CHANGED"
          : "AVAILABLE_SAME_CONTENT_CLASS");
    return {
      url,
      health,
      httpStatus: attempt?.httpStatus ?? null,
      finalUrl: attempt?.finalUrl ?? null,
      evidenceRows: evidenceForUrl.length,
      drifts,
    };
  });

  const tally = rows.reduce<Record<string, number>>((counts, row) => {
    counts[row.health] = (counts[row.health] ?? 0) + 1;
    return counts;
  }, {});
  console.log(
    JSON.stringify(
      {
        prompt: 16,
        readOnly: true,
        historicalEvidencePolicy:
          "Source availability is reported separately. Persisted evidence remains an observation from observedAt.",
        distinctEvidenceUrls: urls.length,
        fetch: fetched.stats,
        tally,
        sourceRolledToNewVintage: rows
          .filter((row) => row.drifts.some((drift) => drift.status === "VINTAGE_ROLLED_FORWARD"))
          .map((row) => row.url),
        brokenPublicSourceLinks: rows
          .filter((row) => row.health === "DEAD" || row.health === "BLOCKED")
          .map((row) => ({ url: row.url, health: row.health })),
        rows,
        productionWrites: {
          wineTechnical: 0,
          sourceUrls: 0,
          wineFactEvidence: 0,
          scores: 0,
          pairings: 0,
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
