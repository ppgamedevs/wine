/**
 * Prompt 26 read-only market price discovery.
 *
 * Agent search contributes candidate URLs only. Price extraction, identity
 * qualification and aggregation are deterministic.
 */
import "../lib/load-env";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { db } from "../lib/db";
import { fetchPageWithResolution } from "../lib/fetch-page-html";
import {
  aggregateMarketPriceEstimate,
  buildMarketPriceMonetizationView,
  extractMarketPriceObservation,
  marketPriceBudgetEligibility,
  MARKET_PRICE_DISCOVERY_VERSION,
  MARKET_PRICE_ESTIMATE_FRESH_DAYS,
  MARKET_PRICE_MAX_CANDIDATES_PER_WINE,
  MARKET_PRICE_TARGET_GOOD_SOURCES,
  type AgentMarketPriceCandidate,
  type AgentMarketPriceSearchCache,
  type MarketPriceObservation,
  type MarketPriceWineTarget,
  type WineMarketPriceEstimate,
} from "../lib/market-price-discovery";
import { simulateValueScoreWithMarketEstimate } from "../lib/market-price-simulation";
import { normalizeWineRows } from "../lib/normalize-wine";
import {
  detectRetailerLabel,
  resolveAffiliatePurchaseUrl,
} from "../lib/retailer-links";
import { buildWinePriceViewModel } from "../lib/wine-price";
import type { WineWithRelations } from "../types";

const DEFAULT_AGENT_CACHE = "artifacts/missing-price-search-cache.json";
const DEFAULT_PAGE_CACHE = "artifacts/missing-price-page-cache.json";
const DEFAULT_JSON_REPORT = "artifacts/missing-price-discovery.json";
const DEFAULT_MARKDOWN_REPORT = "artifacts/missing-price-discovery.md";
const FETCH_WINE_CONCURRENCY = 5;

interface CachedMarketPricePage {
  candidate: AgentMarketPriceCandidate;
  finalUrl: string;
  fetchedAt: string;
  html: string;
  fetchError: string | null;
}

interface MarketPricePageCache {
  version: 1;
  source: "deterministic-fetch";
  generatedAt: string;
  pages: CachedMarketPricePage[];
}

type MonetizationReason =
  | "PROFITSHARE_OFFER"
  | "NO_KNOWN_PROFITSHARE_OFFER"
  | "KNOWN_RETAILER_MATCHING_GAP"
  | "NO_MARKET_RESULT";

interface MissingPriceWineReport {
  wineId: number;
  slug: string;
  wineName: string;
  wineryName: string;
  vintage: number | null;
  hasProfitshareOffer: boolean;
  monetizationReason: MonetizationReason;
  sourceUrl: string | null;
  estimate: WineMarketPriceEstimate;
  observations: MarketPriceObservation[];
  valueSimulation: ReturnType<typeof simulateValueScoreWithMarketEstimate>;
  budgetEligibility: ReturnType<typeof marketPriceBudgetEligibility>;
  publicSimulation: ReturnType<typeof buildMarketPriceMonetizationView>;
}

interface Prompt26DiscoveryReport {
  prompt: 26;
  version: number;
  generatedAt: string;
  readOnly: true;
  agentCacheSource: "agent-cache";
  productionWrites: 0;
  productionWineCount: number;
  verifiedWineCount: number;
  missingPriceCount: number;
  profitshareMissingPriceCount: number;
  missingPriceProfile: {
    vintagePresent: number;
    affiliateLinkPresence: number;
    availabilityRowPresence: number;
    sourceUrlPresence: number;
  };
  searchedWineCount: number;
  candidateUrlCount: number;
  fetchedPageCount: number;
  failedFetchCount: number;
  estimateStatusCounts: Record<WineMarketPriceEstimate["status"], number>;
  observationCounts: {
    total: number;
    qualified: number;
    referenceOnly: number;
    excluded: number;
    regular: number;
    promotional: number;
    outOfStock: number;
  };
  exclusionReasonCounts: Record<string, number>;
  sourceMix: Record<MarketPriceObservation["sourceClass"], number>;
  priceBands: Record<string, number>;
  wineryCounts: Record<string, number>;
  monetizationCounts: Record<MonetizationReason, number>;
  valueSimulation: {
    eligibleWineCount: number;
    averageDelta: number | null;
    minDelta: number | null;
    maxDelta: number | null;
  };
  budgetSimulation: Record<
    ReturnType<typeof marketPriceBudgetEligibility>,
    number
  >;
  seoPriceIntentPagesImproved: number;
  wines: MissingPriceWineReport[];
}

interface CliOptions {
  applyRequested: boolean;
  offline: boolean;
  agentCachePath: string;
  pageCachePath: string;
  jsonReportPath: string;
  markdownReportPath: string;
}

function parseOptionValue(argument: string, name: string): string | null {
  const prefix = `--${name}=`;
  return argument.startsWith(prefix) ? argument.slice(prefix.length) : null;
}

export function parsePriceDiscoveryCli(args: string[]): CliOptions {
  const value = (name: string, fallback: string) =>
    args
      .map((argument) => parseOptionValue(argument, name))
      .find((entry): entry is string => entry != null) ?? fallback;
  return {
    applyRequested: args.includes("--apply"),
    offline: args.includes("--offline"),
    agentCachePath: value("agent-cache", DEFAULT_AGENT_CACHE),
    pageCachePath: value("page-cache", DEFAULT_PAGE_CACHE),
    jsonReportPath: value("json", DEFAULT_JSON_REPORT),
    markdownReportPath: value("markdown", DEFAULT_MARKDOWN_REPORT),
  };
}

export function assertPrompt26ReadOnly(options: CliOptions): void {
  if (options.applyRequested) {
    throw new Error("Prompt 26 is qualification-only. --apply is forbidden.");
  }
}

function targetFromWine(wine: WineWithRelations): MarketPriceWineTarget {
  return {
    wineId: wine.id,
    slug: wine.slug,
    wineName: wine.name,
    wineryName: wine.winery?.name ?? "",
    vintage: wine.vintage,
    volumeMl: /\bmagnum\b/i.test(wine.name) ? 1500 : 750,
  };
}

function candidateKey(candidate: AgentMarketPriceCandidate): string {
  return `${candidate.wineId}:${candidate.sourceUrl.trim()}`;
}

export function boundAgentCandidates(
  candidates: AgentMarketPriceCandidate[],
  validWineIds: Set<number>,
): AgentMarketPriceCandidate[] {
  const seen = new Set<string>();
  const perWine = new Map<number, number>();
  const bounded: AgentMarketPriceCandidate[] = [];
  for (const candidate of candidates) {
    if (!validWineIds.has(candidate.wineId)) continue;
    const key = candidateKey(candidate);
    if (seen.has(key)) continue;
    const count = perWine.get(candidate.wineId) ?? 0;
    if (count >= MARKET_PRICE_MAX_CANDIDATES_PER_WINE) continue;
    try {
      const url = new URL(candidate.sourceUrl);
      if (!/^https?:$/.test(url.protocol)) continue;
    } catch {
      continue;
    }
    seen.add(key);
    perWine.set(candidate.wineId, count + 1);
    bounded.push(candidate);
  }
  return bounded;
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(resolve(path), "utf8")) as T;
}

async function writeJson(path: string, value: unknown): Promise<void> {
  const absolute = resolve(path);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function loadAgentSearchCache(
  path: string,
  generatedAt: string,
): Promise<AgentMarketPriceSearchCache> {
  let existing: AgentMarketPriceSearchCache | null = null;
  try {
    existing = await readJson<AgentMarketPriceSearchCache>(path);
  } catch {
    existing = null;
  }
  const artifactDirectory = resolve(dirname(path));
  let fragments: string[] = [];
  try {
    fragments = (await readdir(artifactDirectory)).filter((entry) =>
      /^p26-agent-cache-.+\.json$/i.test(entry),
    );
  } catch {
    fragments = [];
  }
  const candidates = [...(existing?.candidates ?? [])];
  for (const fragment of fragments.sort()) {
    const rows = await readJson<AgentMarketPriceCandidate[]>(
      join(artifactDirectory, fragment),
    );
    candidates.push(...rows);
  }
  const deduplicatedCandidates = [
    ...new Map(
      candidates.map((candidate) => [candidateKey(candidate), candidate]),
    ).values(),
  ];
  const cache: AgentMarketPriceSearchCache = {
    version: 1,
    source: "agent-cache",
    generatedAt,
    candidates: deduplicatedCandidates,
  };
  if (fragments.length > 0 || existing == null) {
    await writeJson(path, cache);
  }
  return cache;
}

async function fetchCandidatePages(
  candidates: AgentMarketPriceCandidate[],
  targets: Map<number, MarketPriceWineTarget>,
  generatedAt: string,
): Promise<MarketPricePageCache> {
  const pages: CachedMarketPricePage[] = [];
  const domainQueues = new Map<string, Promise<void>>();
  const fetchPolitely = async (sourceUrl: string) => {
    let domain = sourceUrl;
    try {
      domain = new URL(sourceUrl).hostname.toLowerCase();
    } catch {
      // The bounded candidate validator already removes malformed URLs.
    }
    const previous = domainQueues.get(domain) ?? Promise.resolve();
    let release = () => {};
    const gate = new Promise<void>((resolveGate) => {
      release = resolveGate;
    });
    const queued = previous.then(() => gate);
    domainQueues.set(domain, queued);
    await previous;
    try {
      return await fetchPageWithResolution(sourceUrl);
    } finally {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 200));
      release();
      if (domainQueues.get(domain) === queued) domainQueues.delete(domain);
    }
  };
  const candidatesByWine = new Map<number, AgentMarketPriceCandidate[]>();
  for (const candidate of candidates) {
    const rows = candidatesByWine.get(candidate.wineId) ?? [];
    rows.push(candidate);
    candidatesByWine.set(candidate.wineId, rows);
  }
  const wineBatches = [...candidatesByWine.entries()].sort(
    ([left], [right]) => left - right,
  );
  let nextBatch = 0;

  const processWineBatch = async (
    wineId: number,
    wineCandidates: AgentMarketPriceCandidate[],
  ) => {
    const target = targets.get(wineId);
    if (!target) return;
    const goodDomains = new Set<string>();
    for (const candidate of wineCandidates) {
      if (goodDomains.size >= MARKET_PRICE_TARGET_GOOD_SOURCES) break;
      try {
        const fetched = await fetchPolitely(candidate.sourceUrl);
        pages.push({
          candidate,
          finalUrl: fetched.finalUrl,
          fetchedAt: generatedAt,
          html: fetched.html,
          fetchError: null,
        });
        const observation = extractMarketPriceObservation({
          target,
          sourceUrl: fetched.finalUrl,
          html: fetched.html,
          observedAt: generatedAt,
        });
        if (observation.qualification === "QUALIFIED") {
          goodDomains.add(observation.sourceDomain);
        }
      } catch (error) {
        pages.push({
          candidate,
          finalUrl: candidate.sourceUrl,
          fetchedAt: generatedAt,
          html: "",
          fetchError: error instanceof Error ? error.message : String(error),
        });
      }
    }
  };

  const worker = async () => {
    while (nextBatch < wineBatches.length) {
      const batch = wineBatches[nextBatch];
      nextBatch += 1;
      if (batch) await processWineBatch(batch[0], batch[1]);
    }
  };
  await Promise.all(
    Array.from(
      { length: Math.min(FETCH_WINE_CONCURRENCY, wineBatches.length) },
      () => worker(),
    ),
  );
  pages.sort(
    (left, right) =>
      left.candidate.wineId - right.candidate.wineId ||
      left.candidate.sourceUrl.localeCompare(right.candidate.sourceUrl),
  );

  return {
    version: 1,
    source: "deterministic-fetch",
    generatedAt,
    pages,
  };
}

function classifyMonetization(
  wine: WineWithRelations,
  estimate: WineMarketPriceEstimate,
): MonetizationReason {
  const hasProfitshareOffer =
    resolveAffiliatePurchaseUrl({
      sourceUrl: wine.sourceUrl,
      affiliateLinks: wine.affiliateLinks,
      availability: wine.availability,
    }) != null;
  if (hasProfitshareOffer) return "PROFITSHARE_OFFER";

  const storedUrls = [
    wine.sourceUrl,
    ...wine.affiliateLinks.map((entry) => entry.url),
    ...wine.availability.map((entry) => entry.url),
  ].filter((url): url is string => Boolean(url?.trim()));
  const hasCleanRetailerCandidate = storedUrls.some(
    (url) => detectRetailerLabel(url) != null,
  );
  if (hasCleanRetailerCandidate) return "KNOWN_RETAILER_MATCHING_GAP";
  if (estimate.sourceCount > 0) return "NO_KNOWN_PROFITSHARE_OFFER";
  return "NO_MARKET_RESULT";
}

function zeroEstimateStatusCounts(): Prompt26DiscoveryReport["estimateStatusCounts"] {
  return {
    ESTIMATE_STRONG: 0,
    ESTIMATE_LIMITED: 0,
    SINGLE_SOURCE_ONLY: 0,
    HIGH_SPREAD_REVIEW: 0,
    NO_ESTIMATE: 0,
  };
}

function zeroSourceMix(): Prompt26DiscoveryReport["sourceMix"] {
  return {
    ROMANIAN_RETAILER: 0,
    SUPERMARKET: 0,
    PRODUCER_SHOP: 0,
    MARKETPLACE: 0,
    OTHER: 0,
  };
}

function priceBand(price: number): string {
  if (price < 30) return "<30";
  if (price < 50) return "30-50";
  if (price < 75) return "50-75";
  if (price < 100) return "75-100";
  if (price < 150) return "100-150";
  return "150+";
}

function buildReport(
  productionWineCount: number,
  catalog: WineWithRelations[],
  missing: WineWithRelations[],
  candidates: AgentMarketPriceCandidate[],
  pageCache: MarketPricePageCache,
  generatedAt: string,
): Prompt26DiscoveryReport {
  const targets = new Map(
    missing.map((wine) => [wine.id, targetFromWine(wine)]),
  );
  const observationsByWine = new Map<number, MarketPriceObservation[]>();

  for (const page of pageCache.pages) {
    if (page.fetchError || !page.html) continue;
    const target = targets.get(page.candidate.wineId);
    if (!target) continue;
    const observation = extractMarketPriceObservation({
      target,
      sourceUrl: page.finalUrl,
      html: page.html,
      observedAt: page.fetchedAt,
    });
    const list = observationsByWine.get(target.wineId) ?? [];
    list.push(observation);
    observationsByWine.set(target.wineId, list);
  }

  const reports: MissingPriceWineReport[] = missing.map((wine) => {
    const target = targets.get(wine.id)!;
    const observations = observationsByWine.get(wine.id) ?? [];
    const estimate = aggregateMarketPriceEstimate(
      target,
      observations,
      generatedAt,
    );
    const hasProfitshareOffer =
      resolveAffiliatePurchaseUrl({
        sourceUrl: wine.sourceUrl,
        affiliateLinks: wine.affiliateLinks,
        availability: wine.availability,
      }) != null;
    return {
      wineId: wine.id,
      slug: wine.slug,
      wineName: wine.name,
      wineryName: wine.winery?.name ?? "",
      vintage: wine.vintage,
      hasProfitshareOffer,
      monetizationReason: classifyMonetization(wine, estimate),
      sourceUrl: wine.sourceUrl,
      estimate,
      observations,
      valueSimulation: simulateValueScoreWithMarketEstimate(wine, estimate),
      budgetEligibility: marketPriceBudgetEligibility(estimate.status),
      publicSimulation: buildMarketPriceMonetizationView({
        hasProfitshareOffer,
        estimate,
      }),
    };
  });

  const allObservations = reports.flatMap((report) => report.observations);
  const estimateStatusCounts = zeroEstimateStatusCounts();
  const sourceMix = zeroSourceMix();
  const exclusionReasonCounts: Record<string, number> = {};
  const wineryCounts: Record<string, number> = {};
  const priceBands: Record<string, number> = {
    "<30": 0,
    "30-50": 0,
    "50-75": 0,
    "75-100": 0,
    "100-150": 0,
    "150+": 0,
  };
  const monetizationCounts: Record<MonetizationReason, number> = {
    PROFITSHARE_OFFER: 0,
    NO_KNOWN_PROFITSHARE_OFFER: 0,
    KNOWN_RETAILER_MATCHING_GAP: 0,
    NO_MARKET_RESULT: 0,
  };
  const budgetSimulation: Prompt26DiscoveryReport["budgetSimulation"] = {
    ELIGIBLE_LOWER_CONFIDENCE: 0,
    ELIGIBLE_CAUTIOUS: 0,
    INELIGIBLE: 0,
  };

  for (const report of reports) {
    estimateStatusCounts[report.estimate.status] += 1;
    wineryCounts[report.wineryName] =
      (wineryCounts[report.wineryName] ?? 0) + 1;
    monetizationCounts[report.monetizationReason] += 1;
    budgetSimulation[report.budgetEligibility] += 1;
    if (report.estimate.estimatedMarketPrice != null) {
      priceBands[priceBand(report.estimate.estimatedMarketPrice)] += 1;
    }
  }
  for (const observation of allObservations) {
    sourceMix[observation.sourceClass] += 1;
    if (observation.exclusionReason) {
      exclusionReasonCounts[observation.exclusionReason] =
        (exclusionReasonCounts[observation.exclusionReason] ?? 0) + 1;
    }
  }

  const valueDeltas = reports
    .map((report) => report.valueSimulation?.delta)
    .filter((delta): delta is number => delta != null);
  const searchedWineCount = new Set(candidates.map((row) => row.wineId)).size;

  return {
    prompt: 26,
    version: MARKET_PRICE_DISCOVERY_VERSION,
    generatedAt,
    readOnly: true,
    agentCacheSource: "agent-cache",
    productionWrites: 0,
    productionWineCount,
    verifiedWineCount: catalog.length,
    missingPriceCount: missing.length,
    profitshareMissingPriceCount: reports.filter(
      (report) => report.hasProfitshareOffer,
    ).length,
    missingPriceProfile: {
      vintagePresent: missing.filter((wine) => wine.vintage != null).length,
      affiliateLinkPresence: missing.filter(
        (wine) => wine.affiliateLinks.length > 0,
      ).length,
      availabilityRowPresence: missing.filter(
        (wine) => wine.availability.length > 0,
      ).length,
      sourceUrlPresence: missing.filter(
        (wine) => Boolean(wine.sourceUrl?.trim()),
      ).length,
    },
    searchedWineCount,
    candidateUrlCount: candidates.length,
    fetchedPageCount: pageCache.pages.filter((page) => !page.fetchError).length,
    failedFetchCount: pageCache.pages.filter((page) => page.fetchError).length,
    estimateStatusCounts,
    observationCounts: {
      total: allObservations.length,
      qualified: allObservations.filter(
        (observation) => observation.qualification === "QUALIFIED",
      ).length,
      referenceOnly: allObservations.filter(
        (observation) => observation.qualification === "REFERENCE_ONLY",
      ).length,
      excluded: allObservations.filter(
        (observation) => observation.qualification === "EXCLUDED",
      ).length,
      regular: allObservations.filter(
        (observation) => observation.priceType === "REGULAR",
      ).length,
      promotional: allObservations.filter(
        (observation) => observation.priceType === "PROMOTIONAL",
      ).length,
      outOfStock: allObservations.filter(
        (observation) =>
          observation.availabilitySignal === "OUT_OF_STOCK",
      ).length,
    },
    exclusionReasonCounts,
    sourceMix,
    priceBands,
    wineryCounts,
    monetizationCounts,
    valueSimulation: {
      eligibleWineCount: reports.filter(
        (report) => report.valueSimulation != null,
      ).length,
      averageDelta:
        valueDeltas.length === 0
          ? null
          : Math.round(
              (valueDeltas.reduce((sum, delta) => sum + delta, 0) /
                valueDeltas.length) *
                100,
            ) / 100,
      minDelta: valueDeltas.length > 0 ? Math.min(...valueDeltas) : null,
      maxDelta: valueDeltas.length > 0 ? Math.max(...valueDeltas) : null,
    },
    budgetSimulation,
    seoPriceIntentPagesImproved: reports.filter(
      (report) => report.estimate.estimatedMarketPrice != null,
    ).length,
    wines: reports,
  };
}

function reportWineLine(report: MissingPriceWineReport): string {
  const price =
    report.estimate.estimatedMarketPrice == null
      ? "fără estimare"
      : `~${report.estimate.estimatedMarketPrice} lei`;
  const range =
    report.estimate.minPriceRon == null
      ? "n/a"
      : `${report.estimate.minPriceRon}-${report.estimate.maxPriceRon} lei`;
  return `- ${report.wineryName} ${report.wineName}: ${price}, ${range}, ${report.estimate.sourceCount} surse, ${report.estimate.status}`;
}

function metricLines(values: Record<string, number>): string {
  return Object.entries(values)
    .map(([label, count]) => `- ${label}: ${count}`)
    .join("\n");
}

function buildMarkdown(report: Prompt26DiscoveryReport): string {
  const sections = (
    status: WineMarketPriceEstimate["status"],
    limit?: number,
  ) => {
    const rows = report.wines.filter(
      (wine) => wine.estimate.status === status,
    );
    return (limit == null ? rows : rows.slice(0, limit))
      .map(reportWineLine)
      .join("\n");
  };
  return `# Prompt 26: estimated market price discovery

Generated: ${report.generatedAt}

This report is read only. Production writes: 0.

## Baseline

- Production wines: ${report.productionWineCount}
- Verified wines: ${report.verifiedWineCount}
- Missing public prices: ${report.missingPriceCount}
- Missing-price wines with Profitshare: ${report.profitshareMissingPriceCount}
- Missing wines with vintage: ${report.missingPriceProfile.vintagePresent}
- Missing wines with affiliate-link rows: ${report.missingPriceProfile.affiliateLinkPresence}
- Missing wines with availability rows: ${report.missingPriceProfile.availabilityRowPresence}
- Missing wines with source URLs: ${report.missingPriceProfile.sourceUrlPresence}
- Wines searched through agent-cache: ${report.searchedWineCount}
- Candidate URLs: ${report.candidateUrlCount}
- Fetched pages: ${report.fetchedPageCount}
- Failed fetches: ${report.failedFetchCount}

## Qualification

- Strong: ${report.estimateStatusCounts.ESTIMATE_STRONG}
- Limited: ${report.estimateStatusCounts.ESTIMATE_LIMITED}
- Single source: ${report.estimateStatusCounts.SINGLE_SOURCE_ONLY}
- High spread review: ${report.estimateStatusCounts.HIGH_SPREAD_REVIEW}
- No estimate: ${report.estimateStatusCounts.NO_ESTIMATE}
- Qualified observations: ${report.observationCounts.qualified}
- Reference-only different vintage: ${report.observationCounts.referenceOnly}
- Excluded observations: ${report.observationCounts.excluded}
- Promotional observations: ${report.observationCounts.promotional}
- Out-of-stock observations: ${report.observationCounts.outOfStock}

## Source mix

${metricLines(report.sourceMix)}

## Exclusion reasons

${metricLines(report.exclusionReasonCounts) || "None."}

## Qualified estimate price bands

${metricLines(report.priceBands)}

## Missing-price wines by winery

${metricLines(report.wineryCounts)}

## Monetization diagnosis

${metricLines(report.monetizationCounts)}

## Strong estimates

${sections("ESTIMATE_STRONG") || "None."}

## Limited estimates

${sections("ESTIMATE_LIMITED") || "None."}

## High spread review

${sections("HIGH_SPREAD_REVIEW") || "None."}

## Single source examples

${sections("SINGLE_SOURCE_ONLY", 20) || "None."}

## Value and budget simulation

- Value-eligible in memory: ${report.valueSimulation.eligibleWineCount}
- Average simulated Value delta: ${report.valueSimulation.averageDelta ?? "n/a"}
- Strong estimate budget eligibility: ${report.budgetSimulation.ELIGIBLE_LOWER_CONFIDENCE}
- Limited estimate cautious eligibility: ${report.budgetSimulation.ELIGIBLE_CAUTIOUS}
- Hard-budget ineligible: ${report.budgetSimulation.INELIGIBLE}

No Value Score or recommendation behavior was changed.

## Public monetization invariant

Market source URLs are internal evidence only. They never become affiliate links,
availability CTAs, WineCard CTAs, wine-page CTAs or Sommelier purchase links.
Only existing URLs accepted by resolveAffiliatePurchaseUrl() remain retailer CTAs.

## Freshness recommendation

Expire estimates after ${MARKET_PRICE_ESTIMATE_FRESH_DAYS} days. Refresh monthly only for
wines without a monetizable current price or with an expired estimate.

## Prompt 27 apply plan

1. Persist immutable evidence in market_price_observations and derived results in
   wine_market_price_estimates. Do not reuse currentPrice, priceAvg or priceHistory.
2. Activate only qualified strong and explicitly accepted limited estimates in the
   public price resolver.
3. Introduce verified, estimated_strong and estimated_limited price confidence before
   considering any Value Score recalculation.
4. Permit strong estimates in hard budgets with lower confidence, treat limited
   estimates cautiously, and keep single-source observations ineligible.

Current catalog filters, top lists and recommendation budgets read priceAvg directly.
Dedicated market estimates therefore remain inert until an explicit confidence-aware
integration is approved.

Conflicted estimates should appear in an internal review queue with median, range,
source count, identity evidence, date and confidence. Clean deterministic cases do not
need mandatory manual approval, but HIGH_SPREAD_REVIEW always does.
`;
}

async function main(): Promise<void> {
  const options = parsePriceDiscoveryCli(process.argv.slice(2));
  assertPrompt26ReadOnly(options);
  const generatedAt = new Date().toISOString();
  const rows = await db.query.wines.findMany({
    with: { winery: true, region: true },
  });
  const fullCatalog = normalizeWineRows(rows as WineWithRelations[]);
  const catalog = fullCatalog.filter((wine) => wine.status === "verified");
  const missing = catalog.filter(
    (wine) => buildWinePriceViewModel(wine).status === "unavailable",
  );
  const targets = new Map(
    missing.map((wine) => [wine.id, targetFromWine(wine)]),
  );

  const searchCache = await loadAgentSearchCache(
    options.agentCachePath,
    generatedAt,
  );
  if (searchCache.candidates.length === 0) {
    console.warn(
      `Agent cache empty at ${options.agentCachePath}. Producing a zero-candidate baseline.`,
    );
  }
  if (
    searchCache.version !== 1 ||
    searchCache.source !== "agent-cache" ||
    !Array.isArray(searchCache.candidates)
  ) {
    throw new Error("Invalid agent-cache format.");
  }

  const candidates = boundAgentCandidates(
    searchCache.candidates,
    new Set(missing.map((wine) => wine.id)),
  );
  const pageCache = options.offline
    ? await readJson<MarketPricePageCache>(options.pageCachePath)
    : await fetchCandidatePages(candidates, targets, generatedAt);
  if (!options.offline) {
    await writeJson(options.pageCachePath, pageCache);
  }

  const report = buildReport(
    fullCatalog.length,
    catalog,
    missing,
    candidates,
    pageCache,
    generatedAt,
  );
  await writeJson(options.jsonReportPath, report);
  const markdownPath = resolve(options.markdownReportPath);
  await mkdir(dirname(markdownPath), { recursive: true });
  await writeFile(markdownPath, buildMarkdown(report), "utf8");
  console.log(
    JSON.stringify(
      {
        readOnly: true,
        productionWrites: 0,
        missingPriceCount: report.missingPriceCount,
        profitshareMissingPriceCount: report.profitshareMissingPriceCount,
        searchedWineCount: report.searchedWineCount,
        candidateUrlCount: report.candidateUrlCount,
        estimateStatusCounts: report.estimateStatusCounts,
        observationCounts: report.observationCounts,
        jsonReport: options.jsonReportPath,
        markdownReport: options.markdownReportPath,
      },
      null,
      2,
    ),
  );
}

const invokedScript = process.argv[1]?.replaceAll("\\", "/") ?? "";
if (invokedScript.endsWith("/scripts/discover-missing-prices.ts")) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
