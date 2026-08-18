import { classifyPdfDocument, isRejectedTechnicalDocumentUrl } from "@/lib/tech-facts/pdf-classify";
import {
  buildOfficialWineSourceCandidate,
  storedSourceDescriptors,
  type OfficialWineSourceCandidate,
  type StoredSourceDescriptor,
} from "@/lib/tech-facts/official-source-recovery";
import { isPrompt14Eligible } from "@/lib/tech-facts/qualify";
import type { FetchedSource, SourceFetchAttempt } from "@/lib/tech-facts/fetch-source";
import type { RecoverableWine, WineTechRecovery } from "@/lib/tech-facts/recover";
import {
  extractSourceIdentityFromHtml,
  extractSourceIdentityFromText,
  type SourceWineIdentity,
} from "@/lib/tech-facts/source-identity";
import { techValuesEqual, type PdfDocumentClass } from "@/lib/tech-facts/types";

export interface PersistedEvidenceKey {
  wineId: number;
  field: string;
  sourceUrl: string | null;
  value: string | number | string[];
}

function evidenceKey(input: PersistedEvidenceKey): string {
  const value = Array.isArray(input.value) ? input.value.join("|") : String(input.value);
  return `${input.wineId}:${input.field}:${input.sourceUrl ?? ""}:${value}`;
}

function identityForSource(
  source: FetchedSource | null,
  recovery: WineTechRecovery | undefined,
): SourceWineIdentity | null {
  if (!source) return null;
  const extracted = source.html
    ? extractSourceIdentityFromHtml(source.html)
    : extractSourceIdentityFromText({
        text: source.text,
        title: source.title,
        filename: source.finalUrl,
      });
  const sourceClaim = recovery?.claims.find(
    (claim) =>
      claim.sourceUrl === source.url &&
      claim.extractionMethod !== "legacy_producer_fact" &&
      claim.sourceWineName,
  );
  if (sourceClaim?.sourceWineName) {
    return {
      ...extracted,
      sourceWineName: sourceClaim.sourceWineName,
      sourceVintage: sourceClaim.sourceVintage,
      nameClass: sourceClaim.sourceNameClass ?? extracted.nameClass,
      vintageClass: sourceClaim.sourceVintageClass ?? extracted.vintageClass,
    };
  }
  if (
    !recovery?.sourceIdentity?.sourceWineName ||
    (recovery.winerySlug !== "balla-geza" && recovery.winerySlug !== "murfatlar")
  ) {
    return extracted;
  }
  return {
    ...extracted,
    sourceWineName: recovery.sourceIdentity.sourceWineName,
    sourceVintage: recovery.sourceIdentity.sourceVintage,
    nameClass: recovery.sourceIdentity.sourceWineName
      ? "SOURCE_NAME_EXACT"
      : extracted.nameClass,
    vintageClass:
      recovery.sourceIdentity.sourceVintage != null
        ? "SOURCE_VINTAGE_EXPLICIT"
        : extracted.vintageClass,
  };
}

function pdfClassFor(
  descriptor: StoredSourceDescriptor,
  source: FetchedSource | null,
): PdfDocumentClass | null {
  if (isRejectedTechnicalDocumentUrl(descriptor.url)) return "PRIVACY_POLICY";
  if (!source?.isPdf) return null;
  return classifyPdfDocument({
    text: source.text,
    title: source.title,
    filename: source.finalUrl,
    url: descriptor.url,
  });
}

function discoveredDescriptors(
  wine: RecoverableWine,
  sourceByUrl: Map<string, FetchedSource>,
): StoredSourceDescriptor[] {
  const rows: StoredSourceDescriptor[] = [];
  for (const descriptor of storedSourceDescriptors(wine)) {
    const source = sourceByUrl.get(descriptor.url);
    for (const url of source?.discoveredUrls ?? []) {
      rows.push({
        url,
        purpose: "technical_document",
        discoveryMethod: "product_page_link",
      });
    }
  }
  return rows;
}

export function buildPrompt16SourceCandidates(input: {
  wines: RecoverableWine[];
  recoveries: WineTechRecovery[];
  sources: FetchedSource[];
  attempts: SourceFetchAttempt[];
}): OfficialWineSourceCandidate[] {
  const sourceByUrl = new Map(input.sources.map((source) => [source.url, source]));
  const attemptByUrl = new Map(input.attempts.map((attempt) => [attempt.url, attempt]));
  const recoveryByWine = new Map(input.recoveries.map((recovery) => [recovery.wineId, recovery]));
  const candidates: OfficialWineSourceCandidate[] = [];

  for (const wine of input.wines) {
    const recovery = recoveryByWine.get(wine.id);
    const descriptors = [
      ...storedSourceDescriptors(wine),
      ...discoveredDescriptors(wine, sourceByUrl),
    ];
    const seen = new Set<string>();
    for (const descriptor of descriptors) {
      const key = descriptor.url;
      if (seen.has(key)) continue;
      seen.add(key);
      const source = sourceByUrl.get(descriptor.url) ?? null;
      candidates.push(
        buildOfficialWineSourceCandidate({
          wine,
          descriptor,
          fetched: source,
          attempt: attemptByUrl.get(descriptor.url) ?? null,
          identity: identityForSource(source, recovery),
          pdfClass: pdfClassFor(descriptor, source),
          recovery,
          sourceProductId: recovery?.ballaMatch?.productId ?? null,
          exactCatalogBlock: recovery?.ballaStatus === "EXACT_MATCH",
        }),
      );
    }
  }
  return candidates;
}

function fieldCounts(): Record<"alcohol" | "acidity" | "sugar" | "sweetness" | "vintage", number> {
  return { alcohol: 0, acidity: 0, sugar: 0, sweetness: 0, vintage: 0 };
}

export function buildPrompt16RecoverySummary(input: {
  wines: RecoverableWine[];
  recoveries: WineTechRecovery[];
  candidates: OfficialWineSourceCandidate[];
  persistedEvidence?: PersistedEvidenceKey[];
}) {
  function byWineryAndField(
    rows: Array<{ winery: string | null; field: string }>,
  ): Record<string, Record<string, number>> {
    return rows.reduce<Record<string, Record<string, number>>>((tally, row) => {
      const winery = row.winery ?? "unknown";
      const fields = tally[winery] ?? {};
      fields[row.field] = (fields[row.field] ?? 0) + 1;
      tally[winery] = fields;
      return tally;
    }, {});
  }
  const persisted = new Set((input.persistedEvidence ?? []).map(evidenceKey));
  const evidenceAttach = fieldCounts();
  const safeNewValues = fieldCounts();
  const conflicts = fieldCounts();
  const evidenceAttachList: Array<{
    slug: string;
    winery: string | null;
    field: string;
    value: string | number;
    sourceUrl: string | null;
    excerpt: string;
  }> = [];
  const safeNewValueList: typeof evidenceAttachList = [];
  const conflictList: Array<{
    slug: string;
    winery: string | null;
    field: string;
    stored: string | number | null;
    official: string | number | null;
    sourceUrl: string | null;
    excerpt: string | null;
  }> = [];

  for (const recovery of input.recoveries) {
    const wine = input.wines.find((row) => row.id === recovery.wineId);
    if (!wine) continue;
    for (const field of recovery.fields) {
      if (!["alcohol", "acidity", "sugar", "sweetness", "vintage"].includes(field.field)) continue;
      const key = field.field as keyof ReturnType<typeof fieldCounts>;
      const bestClaim = field.claims.find((claim) => {
        if (claim.extractionMethod === "legacy_producer_fact" || field.candidate == null) return false;
        const value = Array.isArray(claim.value) ? claim.value[0] : claim.value;
        return value != null && techValuesEqual(field.field, field.candidate, value);
      });
      if (
        field.action === "EVIDENCE_ATTACH" &&
        isPrompt14Eligible(field.qualification) &&
        field.candidate != null &&
        bestClaim
      ) {
        const alreadyPersisted = persisted.has(
          evidenceKey({
            wineId: wine.id,
            field: field.field,
            sourceUrl: bestClaim.sourceUrl,
            value: bestClaim.value,
          }),
        );
        if (!alreadyPersisted) {
          evidenceAttach[key] += 1;
          evidenceAttachList.push({
            slug: wine.slug,
            winery: wine.winerySlug,
            field: field.field,
            value: field.candidate,
            sourceUrl: bestClaim.sourceUrl,
            excerpt: bestClaim.excerpt,
          });
        }
      }
      if (
        field.action === "VALUE_WRITE" &&
        isPrompt14Eligible(field.qualification) &&
        field.candidate != null &&
        bestClaim
      ) {
        safeNewValues[key] += 1;
        safeNewValueList.push({
          slug: wine.slug,
          winery: wine.winerySlug,
          field: field.field,
          value: field.candidate,
          sourceUrl: bestClaim.sourceUrl,
          excerpt: bestClaim.excerpt,
        });
      }
      if (
        field.qualification === "SOURCE_CONFLICT" ||
        field.qualification === "HUMAN_REVIEW_VALUE_CONFLICT"
      ) {
        conflicts[key] += 1;
        conflictList.push({
          slug: wine.slug,
          winery: wine.winerySlug,
          field: field.field,
          stored: field.stored,
          official: field.candidate,
          sourceUrl: bestClaim?.sourceUrl ?? null,
          excerpt: bestClaim?.excerpt ?? null,
        });
      }
    }
  }

  const healthTally: Record<string, number> = {};
  const actionTally: Record<string, number> = {};
  for (const candidate of input.candidates) {
    healthTally[candidate.healthStatus] = (healthTally[candidate.healthStatus] ?? 0) + 1;
    actionTally[candidate.proposedAction] = (actionTally[candidate.proposedAction] ?? 0) + 1;
  }
  const storedSourceCleanup = input.candidates
    .filter(
      (candidate) =>
        candidate.discoveryMethod === "stored_producer_page" ||
        candidate.discoveryMethod === "stored_tasting_sheet",
    )
    .reduce<Record<string, number>>((tally, candidate) => {
      tally[candidate.proposedAction] = (tally[candidate.proposedAction] ?? 0) + 1;
      return tally;
    }, {});
  const canonicalBefore = fieldCounts();
  for (const wine of input.wines) {
    if (wine.alcohol != null) canonicalBefore.alcohol += 1;
    if (wine.acidity != null) canonicalBefore.acidity += 1;
    if (wine.sugar != null) canonicalBefore.sugar += 1;
    if (wine.sweetness != null) canonicalBefore.sweetness += 1;
    if (wine.vintage != null) canonicalBefore.vintage += 1;
  }
  const canonicalAfter = Object.fromEntries(
    Object.entries(canonicalBefore).map(([field, count]) => [
      field,
      count + safeNewValues[field as keyof typeof safeNewValues],
    ]),
  );

  return {
    sourceHealth: healthTally,
    proposedActions: actionTally,
    storedSourceCleanup,
    newlyQualifiedEvidence: {
      counts: evidenceAttach,
      byWinery: byWineryAndField(evidenceAttachList),
      rows: evidenceAttachList,
    },
    safeNewValues: {
      counts: safeNewValues,
      byWinery: byWineryAndField(safeNewValueList),
      rows: safeNewValueList,
    },
    officialConflicts: {
      counts: conflicts,
      byWinery: byWineryAndField(conflictList),
      rows: conflictList,
    },
    canonicalStoredCoverageSimulation: {
      before: canonicalBefore,
      afterSafeValues: canonicalAfter,
    },
  };
}
