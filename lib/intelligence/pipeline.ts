import { createHash } from "node:crypto";
import { generateAiInterpretation, estimateAiCost } from "@/lib/intelligence/ai-enrichment";
import { extractClaimsFromDiscoveredSource } from "@/lib/intelligence/claim-extraction";
import { persistIntelligenceReport } from "@/lib/intelligence/persist";
import { assertNoPublicPriceClaims } from "@/lib/intelligence/pricing-firewall";
import { buildCompleteness, reconcileClaims } from "@/lib/intelligence/reconcile";
import { discoverWineSources } from "@/lib/intelligence/source-discovery";
import { getVarietyKnowledge } from "@/lib/intelligence/variety-knowledge";
import type {
  AiInterpretation,
  ClaimValue,
  CompletenessReport,
  DiscoveredSource,
  IntelligenceField,
  IntelligenceReport,
  ReconciledClaim,
  SourceFixture,
  SourceResult,
  WineClaim,
  WineIntelligenceInput,
} from "@/lib/intelligence/types";
import { ALL_INTELLIGENCE_FIELDS } from "@/lib/intelligence/types";

export interface RunWineIntelligenceInput {
  wine: WineIntelligenceInput;
  fixtures: SourceFixture[];
  dryRun: boolean;
  aiGenerator?: (prompt: string) => Promise<string>;
  /** Optional network loader. Fixtures are used by default; no bypassing. */
  loadSource?: (source: DiscoveredSource) => Promise<SourceFixture | null>;
  cache?: Map<string, SourceFixture | null>;
  concurrency?: number;
  maxRetries?: number;
  now?: string;
}

export interface RunWineIntelligenceResult {
  report: IntelligenceReport;
  persisted: { claims: number; technical: number; ai: number; run: number } | null;
}

function stableHash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

function valueMap(claims: ReconciledClaim[]): Partial<Record<IntelligenceField, ClaimValue>> {
  return Object.fromEntries(
    claims
      .filter((claim) => claim.value != null)
      .map((claim) => [claim.field, claim.value]),
  ) as Partial<Record<IntelligenceField, ClaimValue>>;
}

function coverage(sources: SourceResult[]): IntelligenceReport["sourceCoverage"] {
  const result: IntelligenceReport["sourceCoverage"] = {};
  for (const source of sources) {
    const bucket = (result[source.source.classification] ??= {
      available: 0,
      unavailable: 0,
      blocked: 0,
      requiresAuth: 0,
    });
    if (source.status === "available") bucket.available += 1;
    else if (source.status === "blocked") bucket.blocked += 1;
    else if (source.status === "requires_auth") bucket.requiresAuth += 1;
    else bucket.unavailable += 1;
  }
  return result;
}

async function loadWithRetry(input: {
  source: DiscoveredSource;
  loader?: RunWineIntelligenceInput["loadSource"];
  retries: number;
}): Promise<{ fixture: SourceFixture | null; requests: number; error: string | null }> {
  if (!input.loader) {
    return { fixture: input.source.fixture, requests: 0, error: null };
  }
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= input.retries; attempt += 1) {
    try {
      const fixture = await input.loader(input.source);
      return { fixture, requests: attempt + 1, error: null };
    } catch (error) {
      lastError = error;
    }
  }
  return {
    fixture: null,
    requests: input.retries + 1,
    error: lastError instanceof Error ? lastError.message : String(lastError),
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index]!);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(Math.max(1, concurrency), items.length || 1) }, worker),
  );
  return results;
}

export async function runWineIntelligence(
  input: RunWineIntelligenceInput,
): Promise<RunWineIntelligenceResult> {
  const now = input.now ?? new Date().toISOString();
  const cache = input.cache ?? new Map<string, SourceFixture | null>();
  const sources = discoverWineSources({
    wine: input.wine,
    fixtures: input.fixtures,
  });
  const errors: string[] = [];

  const sourceResults = await mapWithConcurrency(
    sources,
    input.concurrency ?? 2,
    async (source): Promise<SourceResult> => {
      if (source.availability !== "available") {
        return {
          source,
          status: source.availability,
          claims: [],
          error: source.availabilityReason,
          requestCount: 0,
          cached: false,
        };
      }
      if (source.classification === "existing_record") {
        return {
          source,
          status: "available",
          claims: extractClaimsFromDiscoveredSource(input.wine, source),
          error: null,
          requestCount: 0,
          cached: false,
        };
      }

      const cached = cache.get(source.url);
      const loaded = await loadWithRetry({
        source,
        loader: input.loadSource,
        retries: input.maxRetries ?? 2,
      });
      const fixture = loaded.fixture ?? cached ?? source.fixture;
      cache.set(source.url, fixture);
      const effectiveSource = fixture
        ? { ...source, fixture, availability: "available" as const }
        : source;
      if (loaded.error) errors.push(`${source.url}: ${loaded.error}`);

      return {
        source: effectiveSource,
        status: fixture ? "available" : source.availability,
        claims: fixture
          ? extractClaimsFromDiscoveredSource(input.wine, effectiveSource)
          : [],
        error: loaded.error ?? (fixture ? null : source.availabilityReason),
        requestCount: loaded.requests,
        cached: cached != null,
      };
    },
  );

  const claims = sourceResults.flatMap((result) => result.claims);
  assertNoPublicPriceClaims(claims);
  const reconciled = reconcileClaims(claims);
  const completeness = buildCompleteness(claims);
  const aiEstimate = estimateAiCost(reconciled);
  const before = (input.wine.currentFacts ?? {}) as Partial<
    Record<IntelligenceField, ClaimValue>
  >;
  const after = valueMap(reconciled);
  const addedFields = ALL_INTELLIGENCE_FIELDS.filter(
    (field) => before[field] == null && after[field] != null,
  );
  const changedFields = ALL_INTELLIGENCE_FIELDS.filter(
    (field) =>
      before[field] != null &&
      after[field] != null &&
      JSON.stringify(before[field]) !== JSON.stringify(after[field]),
  );
  const fingerprint = stableHash(
    [
      input.wine.id,
      input.wine.slug,
      ...sources.map((source) => source.url),
      ...claims.map((claim) => claim.claimHash).sort(),
    ].join("|"),
  );
  const runId = `v2-${input.wine.id}-${fingerprint.slice(0, 12)}`;

  let aiInterpretation: AiInterpretation | null = null;
  if (!input.dryRun && input.aiGenerator) {
    const variety = getVarietyKnowledge(input.wine.grapeVarieties[0]);
    aiInterpretation = await generateAiInterpretation({
      wineName: input.wine.name,
      claims: reconciled,
      generator: input.aiGenerator,
      forbiddenGenericAromas: variety?.typicalAromas,
    });
  }

  const report: IntelligenceReport = {
    wineId: input.wine.id,
    wineName: input.wine.name,
    generatedAt: now,
    dryRun: input.dryRun,
    runId,
    fingerprint,
    sources: sourceResults,
    claims,
    reconciled,
    completeness,
    aiEstimate,
    aiInterpretation,
    errors,
    requestCount: sourceResults.reduce((sum, source) => sum + source.requestCount, 0),
    sourceCoverage: coverage(sourceResults),
    beforeAfter: { before, after, addedFields, changedFields },
    mutationPlan: {
      claimsToInsert: claims.length,
      claimsToUpdate: 0,
      technicalMirrorCount: reconciled.filter((claim) => {
        return (
          claim.value != null &&
          (claim.field === "alcohol" ||
            claim.field === "sweetness" ||
            claim.field === "vintage" ||
            claim.field === "grape_varieties" ||
            claim.field === "wine_color" ||
            claim.field === "serving_temperature")
        );
      }).length,
      aiInterpretationsToInsert: aiInterpretation ? 1 : 0,
      runsToInsert: 1,
    },
  };

  const persisted =
    input.dryRun ? null : await persistIntelligenceReport(report);

  return { report, persisted };
}

export { buildCompleteness, reconcileClaims };
export type { CompletenessReport, ReconciledClaim, WineClaim };
