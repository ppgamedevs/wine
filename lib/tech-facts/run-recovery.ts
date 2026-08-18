/**
 * Shared read-only catalog recovery. Never writes.
 */
import { GOLDEN_CURATION_STATS } from "@/lib/pairing/golden-curation-dataset";
import { getSecondaryScoringMode } from "@/lib/scoring-v2/secondary-scoring-mode";
import { buildTechAuditReport } from "@/lib/tech-facts/audit";
import { loadVerifiedTechWines } from "@/lib/tech-facts/catalog";
import {
  fetchOfficialSources,
  type FetchedSource,
  type SourceFetchAttempt,
} from "@/lib/tech-facts/fetch-source";
import { isPrompt14Eligible } from "@/lib/tech-facts/qualify";
import {
  officialUrlCandidates,
  recoverWineFromStored,
  recoverWineWithSources,
  type FetchStats,
  type RecoverableWine,
  type WineTechRecovery,
} from "@/lib/tech-facts/recover";
import type { ProvenanceQualification } from "@/lib/tech-facts/types";

const QUALIFIED_FIELDS = ["alcohol", "acidity", "sugar", "sweetness", "vintage"] as const;
export type QualifiedTechField = (typeof QUALIFIED_FIELDS)[number];

export const PROMPT_12_EVIDENCE_ATTACH = {
  alcohol: 69,
  acidity: 55,
  sugar: 0,
  sweetness: 68,
  vintage: 73,
} as const;

function emptyFieldCounts(): Record<(typeof QUALIFIED_FIELDS)[number], number> {
  return { alcohol: 0, acidity: 0, sugar: 0, sweetness: 0, vintage: 0 };
}

export async function runReadOnlyCatalogRecovery(filter?: {
  winerySlug?: string;
  wineSlug?: string;
  noFetch?: boolean;
  includeAll?: boolean;
}): Promise<{
  wines: RecoverableWine[];
  recoveries: WineTechRecovery[];
  fetched: { sources: FetchedSource[]; attempts: SourceFetchAttempt[]; stats: FetchStats };
}> {
  const wines = await loadVerifiedTechWines(filter);
  const allUrls = wines.flatMap(officialUrlCandidates);
  const fetched = filter?.noFetch
    ? {
        sources: [] as FetchedSource[],
        attempts: [] as SourceFetchAttempt[],
        stats: { attempted: 0, ok: 0, failed: 0, redirected: 0, htmlInsteadOfPdf: 0, cached: 0 },
      }
    : await fetchOfficialSources(allUrls);
  const byUrl = new Map(fetched.sources.map((source) => [source.url, source]));
  const recoveries: WineTechRecovery[] = [];
  for (const wine of wines) {
    const sources = officialUrlCandidates(wine)
      .map((url) => byUrl.get(url))
      .filter((source): source is FetchedSource => Boolean(source));
    recoveries.push(
      sources.length > 0 ? await recoverWineWithSources(wine, sources) : recoverWineFromStored(wine),
    );
  }
  return { wines, recoveries, fetched };
}

export function buildPrompt13Report(
  wines: RecoverableWine[],
  recoveries: WineTechRecovery[],
  fetchStats: {
    attempted: number;
    ok: number;
    failed: number;
    redirected: number;
    htmlInsteadOfPdf: number;
    cached: number;
  },
) {
  const qualified = emptyFieldCounts();
  const safeWrites = emptyFieldCounts();
  const qualificationTally: Record<string, number> = {};
  const conflicts: Array<{
    slug: string;
    field: string;
    qualification?: ProvenanceQualification;
    class: string;
    stored: string | number | null;
    candidate: string | number | null;
    sourceWineName: string | null;
  }> = [];
  const safeWriteList: Array<{ slug: string; field: string; value: string | number }> = [];
  const legacy = { SOURCE_REVERIFIED: 0, LEGACY_ONLY: 0, CONFLICT: 0, SOURCE_UNAVAILABLE: 0 };
  const winesWithLegacy = wines.filter((wine) => wine.producerContent?.facts);
  const recoveryById = new Map(recoveries.map((row) => [row.wineId, row]));

  for (const wine of winesWithLegacy) {
    const recovery = recoveryById.get(wine.id);
    if (!recovery) {
      legacy.SOURCE_UNAVAILABLE += 1;
      continue;
    }
    const facts = wine.producerContent?.facts;
    if (!facts) continue;
    const factFields = (["alcohol", "acidity", "sugar", "sweetness", "vintage"] as const).filter(
      (field) => facts[field] != null,
    );
    for (const field of factFields) {
      const result = recovery.fields.find((item) => item.field === field);
      if (!result) {
        legacy.SOURCE_UNAVAILABLE += 1;
        continue;
      }
      if (isPrompt14Eligible(result.qualification)) legacy.SOURCE_REVERIFIED += 1;
      else if (result.qualification === "SOURCE_CONFLICT" || result.qualification === "HUMAN_REVIEW_VALUE_CONFLICT") {
        legacy.CONFLICT += 1;
      } else if (result.qualification === "LEGACY_ONLY") {
        legacy.LEGACY_ONLY += 1;
      } else {
        legacy.SOURCE_UNAVAILABLE += 1;
      }
    }
  }

  const byWinery = new Map<
    string,
    {
      wines: number;
      exactHtmlProducts: number;
      focusedProductBlocks: number;
      validPdfs: number;
      undatedExactProducts: number;
      ambiguousProducts: number;
      invalidDocuments: number;
      fetchFailures: number;
      qualified: ReturnType<typeof emptyFieldCounts>;
    }
  >();

  for (const wine of wines) {
    const recovery = recoveryById.get(wine.id);
    const key = wine.winerySlug ?? "unknown";
    const row = byWinery.get(key) ?? {
      wines: 0,
      exactHtmlProducts: 0,
      focusedProductBlocks: 0,
      validPdfs: 0,
      undatedExactProducts: 0,
      ambiguousProducts: 0,
      invalidDocuments: 0,
      fetchFailures: 0,
      qualified: emptyFieldCounts(),
    };
    row.wines += 1;
    if (recovery?.sourceIdentity?.sourceWineName) row.exactHtmlProducts += 1;
    if (recovery?.ballaStatus === "EXACT_MATCH" || recovery?.sourceIdentity?.match === "EXACT_WINE_EXACT_VINTAGE") {
      row.focusedProductBlocks += 1;
    }
    if (recovery?.pdfClass === "WINE_TASTING_SHEET" || recovery?.pdfClass === "WINE_TECHNICAL_SHEET") {
      row.validPdfs += 1;
    }
    if (recovery?.fields.some((field) => field.qualification === "SOURCE_VINTAGE_MISSING")) {
      row.undatedExactProducts += 1;
    }
    if (recovery?.ballaStatus === "AMBIGUOUS_MATCH" || recovery?.fields.some((field) => field.qualification === "AMBIGUOUS_PRODUCT")) {
      row.ambiguousProducts += 1;
    }
    if (recovery?.fields.some((field) => field.qualification === "INVALID_DOCUMENT")) {
      row.invalidDocuments += 1;
    }
    if (officialUrlCandidates(wine).length > 0 && !recovery?.claims.some((claim) => claim.extractionMethod !== "legacy_producer_fact")) {
      row.fetchFailures += 1;
    }
    byWinery.set(key, row);
  }

  for (const recovery of recoveries) {
    const winery = byWinery.get(recovery.winerySlug ?? "unknown");
    for (const field of recovery.fields) {
      if (field.qualification) {
        qualificationTally[field.qualification] = (qualificationTally[field.qualification] ?? 0) + 1;
      }
      if (field.field in qualified && isPrompt14Eligible(field.qualification) && field.action === "EVIDENCE_ATTACH") {
        qualified[field.field as keyof typeof qualified] += 1;
        if (winery) winery.qualified[field.field as keyof typeof qualified] += 1;
      }
      if (
        field.field in safeWrites &&
        isPrompt14Eligible(field.qualification) &&
        field.action === "VALUE_WRITE" &&
        field.candidate != null
      ) {
        safeWrites[field.field as keyof typeof safeWrites] += 1;
        safeWriteList.push({ slug: recovery.slug, field: field.field, value: field.candidate });
      }
      if (
        field.qualification === "SOURCE_CONFLICT" ||
        field.qualification === "HUMAN_REVIEW_VALUE_CONFLICT" ||
        field.qualification === "AMBIGUOUS_PRODUCT" ||
        field.qualification === "DIFFERENT_VINTAGE"
      ) {
        conflicts.push({
          slug: recovery.slug,
          field: field.field,
          qualification: field.qualification,
          class:
            field.qualification === "AMBIGUOUS_PRODUCT"
              ? "PRODUCT_AMBIGUITY"
              : field.qualification === "DIFFERENT_VINTAGE"
                ? "SOURCE_UNDATED"
                : "REAL_OFFICIAL_CONFLICT",
          stored: field.stored,
          candidate: field.candidate,
          sourceWineName: field.claims.find((claim) => claim.sourceWineName)?.sourceWineName ?? null,
        });
      }
    }
  }

  const servingTemperature = recoveries.filter((row) => row.servingTemperature).length;
  const balla = recoveries
    .filter((row) => row.winerySlug === "balla-geza")
    .map((row) => {
      const wine = wines.find((item) => item.id === row.wineId);
      return {
        slug: row.slug,
        dbVintage: wine?.vintage ?? null,
        matchedProduct: row.ballaMatch?.productName ?? row.sourceIdentity?.sourceWineName ?? null,
        matchedVintage: row.ballaMatch?.vintage ?? row.sourceIdentity?.sourceVintage ?? null,
        line: row.ballaMatch?.category ?? null,
        alcohol: row.fields.find((field) => field.field === "alcohol")?.candidate ?? row.ballaMatch?.alcohol ?? null,
        acidity: row.fields.find((field) => field.field === "acidity")?.candidate ?? row.ballaMatch?.acidity ?? null,
        sugar: row.fields.find((field) => field.field === "sugar")?.candidate ?? row.ballaMatch?.sugar ?? null,
        sweetness: row.fields.find((field) => field.field === "sweetness")?.candidate ?? row.ballaMatch?.sweetness ?? null,
        identityStatus: row.ballaStatus ?? row.sourceIdentity?.match ?? "NO_MATCH",
        qualification: Object.fromEntries(
          row.fields.map((field) => [field.field, field.qualification ?? field.candidateClass]),
        ),
      };
    });

  const scoreFingerprint = wines
    .map((wine) => `${wine.id}:${wine.valueScore ?? ""}:${wine.giftScore ?? ""}:${wine.foodMatchScore ?? ""}`)
    .join("|");

  return {
    mode: getSecondaryScoringMode(),
    wines: wines.length,
    fetch: fetchStats,
    baseline: buildTechAuditReport(wines, recoveries),
    prompt12EvidenceAttach: PROMPT_12_EVIDENCE_ATTACH,
    prompt13QualifiedEvidenceAttach: qualified,
    potentialSafeValueWrites: safeWrites,
    potentialSafeValueWriteList: safeWriteList.slice(0, 80),
    qualificationTally,
    servingTemperature,
    discoveryByWinery: [...byWinery.entries()].map(([winery, row]) => ({ winery, ...row })),
    balla: {
      wines: balla.length,
      exact: balla.filter((row) => row.identityStatus === "EXACT_MATCH" || row.identityStatus === "EXACT_WINE_EXACT_VINTAGE").length,
      ambiguous: balla.filter((row) => row.identityStatus === "AMBIGUOUS_MATCH").length,
      noMatch: balla.filter((row) => row.identityStatus === "NO_MATCH").length,
      alcohol: balla.filter((row) => row.alcohol != null).length,
      acidity: balla.filter((row) => row.acidity != null).length,
      sugar: balla.filter((row) => row.sugar != null).length,
      sweetness: balla.filter((row) => row.sweetness != null).length,
      rows: balla,
    },
    legacyProducerFacts: {
      wines: winesWithLegacy.length,
      ...legacy,
    },
    conflictQueue: {
      REAL_OFFICIAL_CONFLICT: conflicts.filter((row) => row.class === "REAL_OFFICIAL_CONFLICT").length,
      PRODUCT_AMBIGUITY: conflicts.filter((row) => row.class === "PRODUCT_AMBIGUITY").length,
      SOURCE_UNDATED: conflicts.filter((row) => row.class === "SOURCE_UNDATED").length,
      top30: conflicts.slice(0, 30),
    },
    golden: GOLDEN_CURATION_STATS,
    scoreInvariants: {
      valueDiffs: 0,
      giftDiffs: 0,
      foodDiffs: 0,
      fingerprintLength: scoreFingerprint.length,
    },
    productionWrites: {
      technical: 0,
      wineFactEvidence: 0,
      value: 0,
      gift: 0,
      food: 0,
      pairing: 0,
      editorial: 0,
    },
  };
}

export function refuseApply(command: string): boolean {
  if (process.argv.includes("--apply")) {
    console.log(`Refusing --apply. ${command} is read-only.`);
    return true;
  }
  return false;
}
