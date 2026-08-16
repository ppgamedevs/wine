import { eq } from "drizzle-orm";
import {
  auditCellarProvenance,
  auditExpertNotes,
  auditSensoryIssues,
  foodPairingsProvenanceNote,
} from "@/lib/catalog-audits";
import { planDeterministicRepairs } from "@/lib/catalog-cleanup";
import { db } from "@/lib/db";
import {
  extractEvidenceFromSourceText,
  extractedFactsFromEvidence,
  type ExtractedWineEvidence,
} from "@/lib/evidence-extract";
import { mergeProducerContent, mergeTastingNotes } from "@/lib/evidence-merge";
import {
  groupIssuesByWine,
  isPublicationBlockingIssue,
  runIntegrityChecks,
  type IntegrityIssue,
  type WineScanInput,
} from "@/lib/integrity-scan";
import type { ProducerPageContent } from "@/lib/schema";
import { wines } from "@/lib/schema";
import {
  classifySourceUrl,
  hasDedicatedProducerParser,
  isOfficialProducerSource,
  type WineSourceType,
} from "@/lib/source-trust";
import {
  enrichWineFromProducerSite,
  type ProducerCanonicalFacts,
} from "@/lib/wine-producer-enrichment";

const REQUEST_DELAY_MS = 1200;

/** Coada de diagnostic, nu logica speciala per vin. */
export const DIAGNOSTIC_SLUGS = [
  "avincis-vila-dobrusa-rose-negru-de-dragasani-cabernet-sauvignon-2022",
  "avincis-vila-dobrusa-feteasca-regala-tamaioasa-romaneasca-2016",
  "crama-gabai-vin-rosu-sec-feteasca-neagra-oak-cask-2020",
  "crama-gabai-vin-rosu-sec-blend-2020",
  "murfatlar-sable-noble-rosu",
  "avincis-rosu-avincis-negru-de-dragasani-sec-0-75l",
  "avincis-rose-avincis-cuvee-alexis-sec-0-75l",
  "avincis-domnul-de-roua-rose-2019",
  "balla-geza-feteasca-neagra-cabernet-franc-2021-stonewines",
  "balla-geza-grand-cuvee-reserve-2020-editie-limitata",
  "balla-geza-aradinum-cuvee-2021-editie-limitata",
  "budureasca-premium-cabernet-sauvignon-sec-2019",
  "crama-gabai-vin-rosu-sec-merlot-oak-cask-2021",
  "crama-gabai-vin-rosu-sec-cabernet-sauvignon-oak-cask-2019",
  "crama-gabai-vin-roze-sec-miraz-roze-2021",
  "murfatlar-sable-noble-roze",
  "avincis-rosu-avincis-pinot-noir-sec-0-75l",
  "avincis-domnul-de-roua-rosu-2019",
  "avincis-vila-dobrusa-negru-de-dragasani-merlot-2018",
  "balla-geza-cabernet-sauvignon-2021",
] as const;

export interface BackfillWine extends WineScanInput {
  winerySlug: string | null;
  wineryWebsite: string | null;
}

export interface EvidenceWritePatch {
  producerContent?: ProducerPageContent;
  tastingNotes?: string | null;
  producerPageUrl?: string | null;
  tastingSheetUrl?: string | null;
  alcohol?: number;
  acidity?: number;
  sugar?: number;
  drinkabilityStart?: number;
  drinkabilityEnd?: number;
}

export interface EvidenceFetchResult {
  ok: boolean;
  fetchFailed: boolean;
  fetchError?: string;
  producerPageUrl?: string | null;
  tastingSheetUrl?: string | null;
  producerText?: string;
  pdfText?: string;
  combinedText?: string;
  canonical?: ProducerCanonicalFacts | null;
}

export interface EvidenceBackfillDeps {
  fetchEvidence?: (wine: BackfillWine) => Promise<EvidenceFetchResult>;
  persist?: (wineId: number, patch: EvidenceWritePatch) => Promise<void>;
  loadWines?: () => Promise<BackfillWine[]>;
  sleepMs?: number;
}

export interface WineEvidenceDiff {
  wineId: number;
  slug: string;
  beforeBlocking: number;
  afterBlocking: number;
  beforeHigh: number;
  beforeMedium: number;
  afterHigh: number;
  afterMedium: number;
  resolved: string[];
  remaining: string[];
  sourcesDiscovered: WineSourceType[];
  sourceUrls: string[];
  evidenceRecovered: string[];
  fetchFailed: boolean;
  fetchError?: string;
  wouldWrite: boolean;
  patch: EvidenceWritePatch | null;
  disposition:
    | "fully_recoverable"
    | "partially_recoverable"
    | "unrecoverable"
    | "fetch_failed"
    | "no_source";
  safeRepairs: string[];
  humanReview: string[];
}

export interface EvidenceBackfillReport {
  dryRun: boolean;
  catalog: {
    totalWines: number;
    verifiedWines: number;
    blockingWines: number;
    blockingIssues: number;
  };
  sourceAvailability: {
    exactProducerPage: number;
    tastingSheet: number;
    retailerOnly: number;
    noRetrievableSource: number;
  };
  recovery: {
    winesResolvingAtLeastOne: number;
    blockingIssuesResolved: number;
    fullyRecoverable: number;
    partiallyRecoverable: number;
    unrecoverable: number;
  };
  residualCleanup: {
    sentencesRemovable: number;
    fieldsClearable: number;
    pairingNotesRemovable: number;
    humanReview: number;
  };
  sensory: ReturnType<typeof auditSensoryIssues>;
  cellar: ReturnType<typeof auditCellarProvenance>;
  expertNotes: ReturnType<typeof auditExpertNotes>;
  sourceConflicts: {
    total: number;
    byCode: Record<string, number>;
    examples: Array<{ slug: string; code: string; message: string }>;
  };
  foodPairingsNote: string;
  wines: WineEvidenceDiff[];
  diagnostic: WineEvidenceDiff[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function issueCodes(issues: IntegrityIssue[]): string[] {
  return [...new Set(issues.map((issue) => issue.code))];
}

function countBySeverity(
  issues: IntegrityIssue[],
  severity: IntegrityIssue["severity"],
): number {
  return issues.filter((issue) => issue.severity === severity).length;
}

function evidenceLabels(extracted: ExtractedWineEvidence): string[] {
  const labels: string[] = [];
  if (extracted.oakAged === true) labels.push("oak maturation");
  if (extracted.oakDurationMonths !== "unknown") {
    labels.push(`oak duration ${extracted.oakDurationMonths} months`);
  }
  if (extracted.tanninMentioned === true) labels.push("tannin mention");
  if (extracted.alcohol !== "unknown") labels.push("alcohol");
  if (extracted.acidity !== "unknown") labels.push("acidity");
  if (extracted.sugar !== "unknown") labels.push("residual sugar");
  if (extracted.sweetness !== "unknown") labels.push("sweetness");
  if (extracted.descriptors.length > 0) labels.push("tasting descriptors");
  if (extracted.cellarPotentialYears !== "unknown") labels.push("ageing years");
  if (
    extracted.drinkabilityStart !== "unknown" ||
    extracted.drinkabilityEnd !== "unknown"
  ) {
    labels.push("drink window");
  }
  return labels;
}

export function prioritizeBackfillQueue(wines: BackfillWine[]): BackfillWine[] {
  const diagnosticIndex = new Map<string, number>(
    DIAGNOSTIC_SLUGS.map((slug, index) => [slug, index]),
  );

  return [...wines].sort((left, right) => {
    const leftDiag = diagnosticIndex.get(left.slug);
    const rightDiag = diagnosticIndex.get(right.slug);
    if (leftDiag != null && rightDiag != null) return leftDiag - rightDiag;
    if (leftDiag != null) return -1;
    if (rightDiag != null) return 1;

    const leftOfficial = Number(Boolean(left.producerPageUrl || left.tastingSheetUrl));
    const rightOfficial = Number(Boolean(right.producerPageUrl || right.tastingSheetUrl));
    if (rightOfficial !== leftOfficial) return rightOfficial - leftOfficial;

    const leftParser = Number(hasDedicatedProducerParser(left.winerySlug));
    const rightParser = Number(hasDedicatedProducerParser(right.winerySlug));
    if (rightParser !== leftParser) return rightParser - leftParser;

    return (right.valueScore ?? 0) - (left.valueScore ?? 0);
  });
}

export async function defaultFetchEvidence(
  wine: BackfillWine,
): Promise<EvidenceFetchResult> {
  try {
    const preferred =
      wine.producerPageUrl?.trim() ||
      (isOfficialProducerSource(classifySourceUrl(wine.sourceUrl))
        ? wine.sourceUrl
        : null);

    const enrichment = await enrichWineFromProducerSite({
      wineryWebsite: wine.wineryWebsite,
      winerySlug: wine.winerySlug ?? "",
      wineName: wine.name,
      preferredPageUrl: preferred,
      sourceUrl: wine.sourceUrl,
      lockOnly: Boolean(preferred),
      skipGenericCandidates: true,
    });

    if (!enrichment.producerPageUrl && !enrichment.combinedText) {
      return {
        ok: false,
        fetchFailed: false,
        producerPageUrl: wine.producerPageUrl,
        tastingSheetUrl: wine.tastingSheetUrl,
      };
    }

    return {
      ok: Boolean(enrichment.combinedText || enrichment.producerPageUrl),
      fetchFailed: false,
      producerPageUrl: enrichment.producerPageUrl ?? wine.producerPageUrl,
      tastingSheetUrl: enrichment.tastingSheetUrl ?? wine.tastingSheetUrl,
      producerText: enrichment.producerText,
      pdfText: enrichment.pdfText,
      combinedText: enrichment.combinedText,
      canonical: enrichment.canonical,
    };
  } catch (error) {
    return {
      ok: false,
      fetchFailed: true,
      fetchError: error instanceof Error ? error.message : String(error),
      producerPageUrl: wine.producerPageUrl,
      tastingSheetUrl: wine.tastingSheetUrl,
    };
  }
}

export function buildEvidencePatch(
  wine: BackfillWine,
  fetched: EvidenceFetchResult,
): {
  patch: EvidenceWritePatch | null;
  mergedContent: ProducerPageContent | null;
  extracted: ExtractedWineEvidence | null;
  afterWine: BackfillWine;
} {
  if (fetched.fetchFailed) {
    return {
      patch: null,
      mergedContent: wine.producerContent ?? null,
      extracted: null,
      afterWine: wine,
    };
  }

  const sourceText = [
    fetched.combinedText,
    fetched.producerText,
    fetched.pdfText,
    wine.tastingNotes,
    wine.producerContent?.tastingNotes,
    wine.producerContent?.viticulture,
  ]
    .filter(Boolean)
    .join("\n");

  if (!sourceText.trim() && !fetched.producerPageUrl && !fetched.tastingSheetUrl) {
    return {
      patch: null,
      mergedContent: wine.producerContent ?? null,
      extracted: null,
      afterWine: wine,
    };
  }

  const extracted = extractEvidenceFromSourceText(sourceText, wine.name);
  const facts = extractedFactsFromEvidence(extracted);
  if (fetched.canonical) {
    if (fetched.canonical.alcohol != null) facts.alcohol = fetched.canonical.alcohol;
    if (fetched.canonical.acidity != null) facts.acidity = fetched.canonical.acidity;
    if (fetched.canonical.sweetness) facts.sweetness = fetched.canonical.sweetness;
    if (fetched.canonical.vintage != null) facts.vintage = fetched.canonical.vintage;
    if (fetched.canonical.color) facts.type = fetched.canonical.color;
    if (fetched.canonical.grapeVarieties.length > 0) {
      facts.grapes = fetched.canonical.grapeVarieties.map((grape) => grape.name);
    }
  }
  const incoming: ProducerPageContent = {
    tastingNotes: fetched.producerText || fetched.pdfText || undefined,
    viticulture: fetched.pdfText ? fetched.pdfText.slice(0, 4000) : undefined,
    sourceUrls: [fetched.producerPageUrl, fetched.tastingSheetUrl].filter(
      (url): url is string => Boolean(url),
    ),
    extractedAt: new Date().toISOString(),
    sourceType: classifySourceUrl(fetched.tastingSheetUrl ?? fetched.producerPageUrl, {
      isPdf: Boolean(fetched.pdfText),
    }),
    extractionMethod: "deterministic",
    facts,
  };

  const mergedContent = mergeProducerContent(wine.producerContent, incoming);
  const patch: EvidenceWritePatch = {};

  patch.producerContent = mergedContent;

  if (!wine.tastingNotes?.trim() && (fetched.producerText || fetched.pdfText)) {
    patch.tastingNotes = mergeTastingNotes(
      wine.tastingNotes,
      fetched.producerText || fetched.pdfText,
    );
  }
  if (!wine.producerPageUrl?.trim() && fetched.producerPageUrl) {
    patch.producerPageUrl = fetched.producerPageUrl;
  }
  if (!wine.tastingSheetUrl?.trim() && fetched.tastingSheetUrl) {
    patch.tastingSheetUrl = fetched.tastingSheetUrl;
  }
  if (wine.alcohol == null && extracted.alcohol !== "unknown") {
    patch.alcohol = extracted.alcohol;
  }
  if (wine.acidity == null && extracted.acidity !== "unknown") {
    patch.acidity = extracted.acidity;
  }
  if (wine.sugar == null && extracted.sugar !== "unknown") {
    patch.sugar = extracted.sugar;
  }
  if (
    wine.drinkabilityStart == null &&
    extracted.drinkabilityStart !== "unknown"
  ) {
    patch.drinkabilityStart = extracted.drinkabilityStart;
  }
  if (wine.drinkabilityEnd == null && extracted.drinkabilityEnd !== "unknown") {
    patch.drinkabilityEnd = extracted.drinkabilityEnd;
  }

  const afterWine: BackfillWine = {
    ...wine,
    producerContent: mergedContent,
    tastingNotes: patch.tastingNotes ?? wine.tastingNotes,
    producerPageUrl: patch.producerPageUrl ?? wine.producerPageUrl,
    tastingSheetUrl: patch.tastingSheetUrl ?? wine.tastingSheetUrl,
    alcohol: patch.alcohol ?? wine.alcohol,
    acidity: patch.acidity ?? wine.acidity,
    sugar: patch.sugar ?? wine.sugar,
    drinkabilityStart: patch.drinkabilityStart ?? wine.drinkabilityStart,
    drinkabilityEnd: patch.drinkabilityEnd ?? wine.drinkabilityEnd,
  };

  return { patch, mergedContent, extracted, afterWine };
}

function classifyStoredSource(wine: BackfillWine): WineSourceType {
  if (wine.tastingSheetUrl) return classifySourceUrl(wine.tastingSheetUrl, { isPdf: true });
  if (wine.producerPageUrl) return classifySourceUrl(wine.producerPageUrl);
  return classifySourceUrl(wine.sourceUrl);
}

export function diffWineEvidence(
  wine: BackfillWine,
  fetched: EvidenceFetchResult,
): WineEvidenceDiff {
  const beforeReport = runIntegrityChecks([wine]);
  const beforeIssues = beforeReport.issues;
  const beforeBlocking = beforeIssues.filter(isPublicationBlockingIssue);

  if (fetched.fetchFailed) {
    return {
      wineId: wine.id,
      slug: wine.slug,
      beforeBlocking: beforeBlocking.length,
      afterBlocking: beforeBlocking.length,
      beforeHigh: countBySeverity(beforeIssues, "high"),
      beforeMedium: countBySeverity(beforeIssues, "medium"),
      afterHigh: countBySeverity(beforeIssues, "high"),
      afterMedium: countBySeverity(beforeIssues, "medium"),
      resolved: [],
      remaining: issueCodes(beforeBlocking),
      sourcesDiscovered: [],
      sourceUrls: [wine.producerPageUrl, wine.tastingSheetUrl].filter(
        (url): url is string => Boolean(url),
      ),
      evidenceRecovered: [],
      fetchFailed: true,
      fetchError: fetched.fetchError,
      wouldWrite: false,
      patch: null,
      disposition: "fetch_failed",
      safeRepairs: planDeterministicRepairs(wine, beforeIssues).actions,
      humanReview: issueCodes(beforeBlocking),
    };
  }

  const { patch, extracted, afterWine } = buildEvidencePatch(wine, fetched);
  const afterReport = runIntegrityChecks([afterWine]);
  const afterIssues = afterReport.issues;
  const afterBlocking = afterIssues.filter(isPublicationBlockingIssue);

  const beforeCodes = issueCodes(beforeBlocking);
  const afterCodes = issueCodes(afterBlocking);
  const resolved = beforeCodes.filter((code) => !afterCodes.includes(code));
  const remaining = afterCodes;

  const sourcesDiscovered: WineSourceType[] = [];
  if (fetched.tastingSheetUrl) {
    sourcesDiscovered.push(classifySourceUrl(fetched.tastingSheetUrl, { isPdf: true }));
  }
  if (fetched.producerPageUrl) {
    sourcesDiscovered.push(classifySourceUrl(fetched.producerPageUrl));
  }

  let disposition: WineEvidenceDiff["disposition"] = "no_source";
  if (!fetched.ok && !extracted) {
    disposition = "no_source";
  } else if (beforeBlocking.length > 0 && afterBlocking.length === 0) {
    disposition = "fully_recoverable";
  } else if (resolved.length > 0) {
    disposition = "partially_recoverable";
  } else if (beforeBlocking.length > 0) {
    disposition = "unrecoverable";
  }

  const repairs = planDeterministicRepairs(afterWine, afterIssues);

  return {
    wineId: wine.id,
    slug: wine.slug,
    beforeBlocking: beforeBlocking.length,
    afterBlocking: afterBlocking.length,
    beforeHigh: countBySeverity(beforeIssues, "high"),
    beforeMedium: countBySeverity(beforeIssues, "medium"),
    afterHigh: countBySeverity(afterIssues, "high"),
    afterMedium: countBySeverity(afterIssues, "medium"),
    resolved,
    remaining,
    sourcesDiscovered: [...new Set(sourcesDiscovered)],
    sourceUrls: [fetched.producerPageUrl, fetched.tastingSheetUrl].filter(
      (url): url is string => Boolean(url),
    ),
    evidenceRecovered: extracted ? evidenceLabels(extracted) : [],
    fetchFailed: false,
    wouldWrite: patch != null,
    patch,
    disposition,
    safeRepairs: repairs.actions,
    humanReview: remaining.filter(
      (code) =>
        code.startsWith("SOURCE_CONFLICT") ||
        code === "AGEING_EDITORIAL_CONTRADICTION",
    ),
  };
}

export function applyEvidencePatchIdempotent(
  wine: BackfillWine,
  patch: EvidenceWritePatch,
): BackfillWine {
  return {
    ...wine,
    producerContent: patch.producerContent
      ? mergeProducerContent(wine.producerContent, patch.producerContent)
      : wine.producerContent,
    tastingNotes: wine.tastingNotes?.trim()
      ? wine.tastingNotes
      : (patch.tastingNotes ?? wine.tastingNotes),
    producerPageUrl: wine.producerPageUrl ?? patch.producerPageUrl ?? null,
    tastingSheetUrl: wine.tastingSheetUrl ?? patch.tastingSheetUrl ?? null,
    alcohol: wine.alcohol ?? patch.alcohol ?? wine.alcohol,
    acidity: wine.acidity ?? patch.acidity ?? wine.acidity,
    sugar: wine.sugar ?? patch.sugar ?? wine.sugar,
    drinkabilityStart:
      wine.drinkabilityStart ?? patch.drinkabilityStart ?? wine.drinkabilityStart,
    drinkabilityEnd:
      wine.drinkabilityEnd ?? patch.drinkabilityEnd ?? wine.drinkabilityEnd,
  };
}

async function loadBackfillWines(): Promise<BackfillWine[]> {
  const rows = await db.query.wines.findMany({
    with: {
      winery: { columns: { name: true, slug: true, website: true } },
      region: { columns: { name: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    wineryId: row.wineryId,
    wineryName: row.winery?.name ?? null,
    winerySlug: row.winery?.slug ?? null,
    wineryWebsite: row.winery?.website ?? null,
    regionId: row.regionId,
    regionName: row.region?.name ?? null,
    type: row.type,
    sweetness: row.sweetness,
    vintage: row.vintage,
    grapeVarieties: row.grapeVarieties,
    priceAvg: row.priceAvg,
    currentPrice: row.currentPrice,
    priceHistory: row.priceHistory,
    valueScore: row.valueScore,
    criticScore: row.criticScore,
    ratingAvg: row.ratingAvg,
    communityScore: row.communityScore,
    medals: row.medals,
    status: row.status,
    sourceUrl: row.sourceUrl,
    affiliateLinks: row.affiliateLinks,
    descriptionEditorial: row.descriptionEditorial,
    valueExplanation: row.valueExplanation,
    tasteProfile: row.tasteProfile,
    thingsYouShouldKnow: row.thingsYouShouldKnow,
    foodPairingNotes: row.foodPairingNotes,
    dessertPairings: row.dessertPairings,
    recommendedOccasions: row.recommendedOccasions,
    expertNotes: row.expertNotes,
    tastingNotes: row.tastingNotes,
    producerContent: row.producerContent,
    producerPageUrl: row.producerPageUrl,
    tastingSheetUrl: row.tastingSheetUrl,
    alcohol: row.alcohol,
    acidity: row.acidity,
    sugar: row.sugar,
    cellarPotential: row.cellarPotential,
    drinkabilityStart: row.drinkabilityStart,
    drinkabilityEnd: row.drinkabilityEnd,
    foodPairings: row.foodPairings,
    updatedAt: row.updatedAt,
  }));
}

export async function runEvidenceBackfill(options: {
  apply?: boolean;
  wineSlug?: string;
  blockingOnly?: boolean;
  all?: boolean;
  limit?: number;
  deps?: EvidenceBackfillDeps;
}): Promise<EvidenceBackfillReport> {
  const dryRun = options.apply !== true;
  const allWines = options.deps?.loadWines
    ? await options.deps.loadWines()
    : await loadBackfillWines();
  const baseline = runIntegrityChecks(allWines);
  const groups = groupIssuesByWine(baseline.issues, allWines);
  const blockingIds = new Set(
    groups.filter((group) => group.blocking > 0).map((group) => group.wineId),
  );

  let queue = allWines.filter((wine) => wine.status === "verified");
  if (options.wineSlug) {
    queue = allWines.filter((wine) => wine.slug === options.wineSlug);
  } else if (options.blockingOnly !== false && !options.all) {
    queue = queue.filter((wine) => blockingIds.has(wine.id));
  }

  const highIssueIds = new Set(
    groups.filter((group) => group.high >= 2).map((group) => group.wineId),
  );
  queue = prioritizeBackfillQueue(queue).sort((left, right) => {
    const leftHigh = Number(highIssueIds.has(left.id));
    const rightHigh = Number(highIssueIds.has(right.id));
    if (rightHigh !== leftHigh) return rightHigh - leftHigh;
    return 0;
  });

  if (options.limit != null && options.limit > 0) {
    queue = queue.slice(0, options.limit);
  }

  const fetchEvidence = options.deps?.fetchEvidence ?? defaultFetchEvidence;
  const persist =
    options.deps?.persist ??
    (async (wineId: number, patch: EvidenceWritePatch) => {
      await db.update(wines).set(patch).where(eq(wines.id, wineId));
    });
  const delay = options.deps?.sleepMs ?? REQUEST_DELAY_MS;

  const diffs: WineEvidenceDiff[] = [];

  for (const [index, wine] of queue.entries()) {
    const fetched = await fetchEvidence(wine);
    const diff = diffWineEvidence(wine, fetched);
    diffs.push(diff);

    if (!dryRun && diff.patch && !diff.fetchFailed) {
      await persist(wine.id, diff.patch);
    }

    if (index < queue.length - 1 && delay > 0) {
      await sleep(delay);
    }
  }

  const sourceAvailability = {
    exactProducerPage: 0,
    tastingSheet: 0,
    retailerOnly: 0,
    noRetrievableSource: 0,
  };
  for (const wine of allWines) {
    const kind = classifyStoredSource(wine);
    if (kind === "tasting_sheet") sourceAvailability.tastingSheet += 1;
    else if (kind === "producer_page" || kind === "producer_catalog") {
      sourceAvailability.exactProducerPage += 1;
    } else if (kind === "retailer" || kind === "marketplace") {
      sourceAvailability.retailerOnly += 1;
    } else {
      sourceAvailability.noRetrievableSource += 1;
    }
  }

  const plannedRepairs = allWines.flatMap((wine) => {
    const issues = baseline.issues.filter((issue) => issue.wineId === wine.id);
    return planDeterministicRepairs(wine, issues);
  });

  const conflictIssues = baseline.issues.filter((issue) =>
    issue.code.startsWith("SOURCE_CONFLICT"),
  );
  const conflictByCode: Record<string, number> = {};
  for (const issue of conflictIssues) {
    conflictByCode[issue.code] = (conflictByCode[issue.code] ?? 0) + 1;
  }

  return {
    dryRun,
    catalog: {
      totalWines: baseline.summary.totalWines,
      verifiedWines: baseline.summary.publishedWines,
      blockingWines: groups.filter((group) => group.blocking > 0).length,
      blockingIssues: baseline.issues.filter(isPublicationBlockingIssue).length,
    },
    sourceAvailability,
    recovery: {
      winesResolvingAtLeastOne: diffs.filter((item) => item.resolved.length > 0)
        .length,
      blockingIssuesResolved: diffs.reduce(
        (sum, item) => sum + Math.max(0, item.beforeBlocking - item.afterBlocking),
        0,
      ),
      fullyRecoverable: diffs.filter((item) => item.disposition === "fully_recoverable")
        .length,
      partiallyRecoverable: diffs.filter(
        (item) => item.disposition === "partially_recoverable",
      ).length,
      unrecoverable: diffs.filter((item) => item.disposition === "unrecoverable")
        .length,
    },
    residualCleanup: {
      sentencesRemovable: plannedRepairs.filter((item) =>
        item.actions.some((action) => action.includes("fraze") || action.includes("propozitie")),
      ).length,
      fieldsClearable: plannedRepairs.filter((item) =>
        item.actions.some((action) => action.includes("golit")),
      ).length,
      pairingNotesRemovable: plannedRepairs.filter((item) =>
        item.actions.some(
          (action) => action.includes("pairing") || action.includes("foodPairingNotes"),
        ),
      ).length,
      humanReview: groups.filter((group) =>
        group.issues.some((issue) => issue.code.startsWith("SOURCE_CONFLICT")),
      ).length,
    },
    sensory: auditSensoryIssues(allWines),
    cellar: auditCellarProvenance(allWines),
    expertNotes: auditExpertNotes(allWines),
    sourceConflicts: {
      total: conflictIssues.length,
      byCode: conflictByCode,
      examples: conflictIssues.slice(0, 8).map((issue) => ({
        slug: issue.slug,
        code: issue.code,
        message: issue.message,
      })),
    },
    foodPairingsNote: foodPairingsProvenanceNote(),
    wines: diffs,
    diagnostic: diffs.filter((item) =>
      (DIAGNOSTIC_SLUGS as readonly string[]).includes(item.slug),
    ),
  };
}
