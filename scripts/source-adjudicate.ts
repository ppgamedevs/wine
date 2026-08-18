/**
 * Prompt 17 focused, read-only source adjudication.
 *
 * This script never writes wines, source URLs, evidence, scores, pairings, or
 * editorial data. It refuses --apply.
 */
import "../lib/load-env";
import { eq } from "drizzle-orm";
import {
  adjudicateBallaIdentitySet,
  parseAllBallaGezaWinesFromCatalog,
} from "../lib/ballageza-producer";
import {
  BUDUREASCA_CATALOG_URL,
  parseBudureascaCatalogListing,
  parseBudureascaProductPage,
} from "../lib/budureasca-producer";
import { db } from "../lib/db";
import {
  GABAI_SHOP_URL,
  parseGabaiCatalogListing,
  parseGabaiProductPage,
} from "../lib/gabai-producer";
import { normalizeWineRows } from "../lib/normalize-wine";
import { generateRomanianPairingDrafts } from "../lib/pairing/generate-romanian-drafts";
import { calculateValueScore, valueScoreInputFromWine } from "../lib/scoring";
import { wineFactEvidence, wines } from "../lib/schema";
import {
  probeOfficialSource,
  probeOfficialSourceRepeated,
  type SourceProbeObservation,
} from "../lib/tech-facts/fetch-source";
import { loadVerifiedTechWines } from "../lib/tech-facts/catalog";
import {
  buildPrompt18EvidenceCandidates,
  simulatePublicCoverageWithManifest,
  tallyEvidenceByWineryAndField,
  type Prompt17PersistedEvidence,
} from "../lib/tech-facts/prompt17-report";
import {
  adjudicateOfficialConflict,
  canonicalizeOfficialUrl,
  classifyRepeatedSource,
  confirmedCorrectionsOnly,
  enforceOneToOneOfficialIdentity,
  type AdjudicationIdentity,
  type BallaIdentityAssignment,
  type OfficialConflictDecision,
  type Prompt18CorrectionEntry,
  type Prompt18SourceCleanupEntry,
  type Prompt18SourceStability,
  type SourceAdjudicationRecord,
  type SourceRepeatObservation,
} from "../lib/tech-facts/source-adjudication";
import type { RecoverableWine, WineTechRecovery } from "../lib/tech-facts/recover";
import { classifySourceName } from "../lib/tech-facts/source-identity";
import { refuseApply, runReadOnlyCatalogRecovery } from "../lib/tech-facts/run-recovery";
import { parseAvincisProducerFacts } from "../lib/wine-producer-enrichment";
import type { WineWithRelations } from "../types";

const TARGET_WINERIES = ["budureasca", "balla-geza", "avincis", "crama-gabai"] as const;
const PRIMA_URLS = [
  "https://budureasca.ro/vin-spumant/prima-stilla-rose/",
  "https://budureasca.ro/vin-rose/prima-stilla-rose/",
] as const;
const DARK_COUNT_URLS = [
  "https://budureasca.ro/vin-editii-speciale/dark-count-of-transylvania-cs-fn/",
  "https://budureasca.ro/dark-count-of-transylvania-cs-fn/",
  "https://budureasca.ro/vin-cabernet-sauvignon/dark-count-of-transylvania-cs-fn/",
] as const;
const AVINCIS_AMELIE_URL =
  "https://www.avincis.ro/cuvee-amelie-vin-avincis-62-ro.htm";
const AVINCIS_AMELIE_CURRENT_URL =
  "https://www.avincis.ro/cuvee-amelie-2024-magazin-online-v51-ro.htm";

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

function foldText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function identityFromWine(wine: RecoverableWine): AdjudicationIdentity {
  return {
    name: wine.name,
    vintage: wine.vintage,
    productId: null,
    sku: null,
    line: null,
    color: wine.type,
    grapes: wine.grapeVarieties.map((grape) => grape.name),
    volumeMl: null,
    deepLink: wine.producerPageUrl,
    imageUrl: null,
  };
}

function probeFingerprint(observation: SourceProbeObservation): {
  identity: string | null;
  fact: string | null;
} {
  if (!observation.ok || !observation.body) return { identity: null, fact: null };
  const url = observation.finalUrl ?? observation.url;
  if (url.includes("budureasca.ro")) {
    const product = parseBudureascaProductPage(observation.body, url);
    if (product) {
      return {
        identity: JSON.stringify([
          product.name,
          product.vintage,
          product.sku,
          product.line,
          product.color,
          product.volumeMl,
        ]),
        fact: JSON.stringify([product.alcohol, product.sweetness]),
      };
    }
    const listing = parseBudureascaCatalogListing(observation.body, url);
    return listing.length > 0
      ? {
          identity: JSON.stringify(listing.map((row) => [row.name, row.url]).sort()),
          fact: null,
        }
      : { identity: null, fact: null };
  }
  if (url.includes("ballageza.com")) {
    const records = parseAllBallaGezaWinesFromCatalog(observation.body);
    return records.length > 0
      ? {
          identity: JSON.stringify(
            records
              .map((row) => [row.productId, row.name, row.vintage, row.category])
              .sort((left, right) => Number(left[0]) - Number(right[0])),
          ),
          fact: JSON.stringify(
            records
              .map((row) => [row.productId, row.alcohol, row.acidity, row.sugar, row.sweetness])
              .sort((left, right) => Number(left[0]) - Number(right[0])),
          ),
        }
      : { identity: null, fact: null };
  }
  if (url.includes("avincis.ro")) {
    const facts = parseAvincisProducerFacts(observation.body, url);
    return facts
      ? {
          identity: JSON.stringify([
            facts.name,
            facts.vintage,
            facts.grapeVarieties.map((grape) => grape.name),
          ]),
          fact: JSON.stringify([facts.alcohol, facts.sweetness]),
        }
      : { identity: null, fact: null };
  }
  if (url.includes("cramagabai.ro")) {
    const product = parseGabaiProductPage(observation.body, url);
    return product
      ? {
          identity: JSON.stringify([
            product.name,
            product.vintage,
            product.sku,
            product.volumeMl,
          ]),
          fact: JSON.stringify([product.alcohol, product.sweetness]),
        }
      : { identity: null, fact: null };
  }
  return { identity: null, fact: null };
}

function repeatedClassification(
  rows: SourceProbeObservation[],
  exactIdentity: boolean,
  exactCatalogBlock = false,
) {
  const observations: SourceRepeatObservation[] = rows.map((row) => {
    const fingerprint = probeFingerprint(row);
    return {
      ok: row.ok,
      httpStatus: row.httpStatus,
      failureClass: row.failureClass,
      canonicalUrl: canonicalizeOfficialUrl(row.finalUrl ?? row.url),
      identityFingerprint: fingerprint.identity,
      factFingerprint: fingerprint.fact,
    };
  });
  return classifyRepeatedSource(observations, {
    exactIdentity:
      exactIdentity &&
      observations.filter((row) => row.ok).every((row) => row.identityFingerprint != null),
    exactCatalogBlock,
  });
}

async function main() {
  if (refuseApply("source:adjudicate")) process.exit(0);
  const noFetch = process.argv.includes("--no-fetch");
  const conflictsOnly = process.argv.includes("--conflicts-only");
  const requestedWinery = argValue("winery");
  const selectedWineries = TARGET_WINERIES.filter(
    (winery) => !requestedWinery || winery === requestedWinery,
  );
  if (requestedWinery && selectedWineries.length === 0) {
    throw new Error(`Prompt 17 is focused. Unsupported winery: ${requestedWinery}`);
  }
  const observedAt = new Date().toISOString();
  const allWines = await loadVerifiedTechWines({ includeAll: true });
  const verifiedWines = await loadVerifiedTechWines();
  const targetWines = allWines.filter((wine) =>
    selectedWineries.includes(wine.winerySlug as (typeof TARGET_WINERIES)[number]),
  );
  const persistedRows = await db.select().from(wineFactEvidence);
  const persistedEvidence: Prompt17PersistedEvidence[] = persistedRows.map((row) => ({
    wineId: row.wineId,
    field: row.field,
    value: row.valueJson,
    sourceUrl: row.sourceUrl,
    sourceHash: row.sourceHash,
    sourceType: row.sourceType,
    sourceWineName: row.sourceWineName,
    sourceVintage: row.sourceVintage,
    sourceDocumentTitle: row.sourceDocumentTitle,
    excerpt: row.excerpt,
    extractionMethod: row.extractionMethod,
    identityMatchClass: row.identityMatchClass,
    observedAt: row.observedAt,
  }));

  const recoveries: WineTechRecovery[] = [];
  const recoveryWines: RecoverableWine[] = [];
  if (!conflictsOnly) {
    for (const winerySlug of selectedWineries) {
      const run = await runReadOnlyCatalogRecovery({
        winerySlug,
        noFetch,
        includeAll: true,
      });
      recoveries.push(...run.recoveries);
      recoveryWines.push(...run.wines);
    }
  }

  const repeatedCache = new Map<string, SourceProbeObservation[]>();
  const repeat = async (url: string): Promise<SourceProbeObservation[]> => {
    const key = canonicalizeOfficialUrl(url);
    const existing = repeatedCache.get(key);
    if (existing) return existing;
    const rows = noFetch
      ? []
      : await probeOfficialSourceRepeated({ url, attempts: 3, spacingMs: 750 });
    repeatedCache.set(key, rows);
    return rows;
  };

  const stabilityByUrl = new Map<string, Prompt18SourceStability>();
  const preliminaryEvidence = buildPrompt18EvidenceCandidates({
    wines: recoveryWines,
    recoveries,
    persistedEvidence,
    stabilityByUrl,
  });
  const alreadyPersistedRows = new Set(preliminaryEvidence.alreadyPersisted);
  const evidenceUrls = new Set(
    preliminaryEvidence.qualifiedMatchesDiscovered
      .filter((row) => !alreadyPersistedRows.has(row))
      .map((row) => row.sourceUrl),
  );
  for (const url of evidenceUrls) {
    const classification = repeatedClassification(await repeat(url), true);
    stabilityByUrl.set(canonicalizeOfficialUrl(url), classification.stability);
  }

  const evidenceReport = buildPrompt18EvidenceCandidates({
    wines: recoveryWines,
    recoveries,
    persistedEvidence,
    stabilityByUrl,
  });
  const manifestB = evidenceReport.newAttachCandidates;
  const budureascaPrompt16Expected = { alcohol: 17, sweetness: 17, vintage: 18 };
  const budureascaEvidenceStability = (() => {
    if (!selectedWineries.includes("budureasca")) return null;
    const result = {
      expected: budureascaPrompt16Expected,
      stable: { alcohol: 0, sweetness: 0, vintage: 0 },
      transient: { alcohol: 0, sweetness: 0, vintage: 0 },
      alreadyPersisted: { alcohol: 0, sweetness: 0, vintage: 0 },
      notSafe: { ...budureascaPrompt16Expected },
    };
    const persisted = new Set(evidenceReport.alreadyPersisted);
    for (const row of evidenceReport.qualifiedMatchesDiscovered) {
      if (
        row.winery !== "budureasca" ||
        !["alcohol", "sweetness", "vintage"].includes(row.field)
      ) {
        continue;
      }
      const field = row.field as keyof typeof budureascaPrompt16Expected;
      if (persisted.has(row)) result.alreadyPersisted[field] += 1;
      else if (row.stability === "STABLE") result.stable[field] += 1;
      else if (row.stability === "TEMPORARILY_BLOCKED") result.transient[field] += 1;
    }
    for (const field of Object.keys(
      budureascaPrompt16Expected,
    ) as Array<keyof typeof budureascaPrompt16Expected>) {
      result.notSafe[field] = Math.max(
        0,
        result.expected[field] -
          result.stable[field] -
          result.transient[field] -
          result.alreadyPersisted[field],
      );
    }
    return result;
  })();
  const coverage = simulatePublicCoverageWithManifest({
    wines: verifiedWines,
    persistedEvidence,
    recoveries,
    manifest: manifestB,
  });

  const adjudications: SourceAdjudicationRecord[] = [];
  const manifestA: Prompt18SourceCleanupEntry[] = [];
  const correctionCandidates: Array<
    Prompt18CorrectionEntry & {
      decision: "DB_WRONG_CONFIRMED" | "SOURCE_STALE_OR_WRONG" | "UNRESOLVED";
    }
  > = [];

  const includesBudureasca = selectedWineries.includes("budureasca");
  const primaWine = includesBudureasca
    ? allWines.find((wine) => wine.slug.includes("prima-stilla-rose-sec-2016"))
    : undefined;
  const darkWine = includesBudureasca
    ? allWines.find((wine) =>
        wine.slug.includes("dark-count-cabernet-feteasca-neagra-demisec-2020"),
      )
    : undefined;
  const primaRows = includesBudureasca
    ? (
        await Promise.all(PRIMA_URLS.map(async (url) => ({ url, rows: await repeat(url) })))
      ).flatMap(({ url, rows }) =>
        rows
          .filter((row) => row.ok && row.body)
          .map((row) => ({
            url,
            probe: row,
            product: parseBudureascaProductPage(row.body!, row.finalUrl ?? url),
          })),
      )
    : [];
  const primaProduct = primaRows.find(
    (row) => row.product?.vintage === 2016 && /prima stilla/i.test(row.product.name),
  )?.product ?? null;
  const primaSourceUrl =
    primaRows.find((row) => row.product === primaProduct)?.url ?? PRIMA_URLS[0];
  const primaStability = repeatedClassification(
    includesBudureasca ? await repeat(primaSourceUrl) : [],
    Boolean(primaProduct),
  );
  const primaDecision: OfficialConflictDecision = primaWine && primaProduct?.alcohol != null
    ? adjudicateOfficialConflict({
        exactProduct: /prima stilla/i.test(primaProduct.name),
        dbVintage: primaWine.vintage,
        sourceVintage: primaProduct.vintage,
        explicitFact: true,
        stablePrimarySource: primaStability.stability === "STABLE",
        officialSourceUrls: [primaSourceUrl],
        corroboratingValues: [],
        officialValue: primaProduct.alcohol,
      })
    : {
        outcome: "UNRESOLVED",
        reasons: ["No reproducible exact 2016 official alcohol claim"],
      };
  if (primaWine) {
    adjudications.push({
      wineId: primaWine.id,
      slug: primaWine.slug,
      winery: "budureasca",
      issueType: "OFFICIAL_VALUE_CONFLICT",
      storedIdentity: identityFromWine(primaWine),
      sourceIdentity: primaProduct
        ? {
            name: primaProduct.name,
            vintage: primaProduct.vintage,
            productId: null,
            sku: primaProduct.sku,
            line: primaProduct.line,
            color: primaProduct.color,
            grapes: primaProduct.grapeVarieties.map((grape) => grape.name),
            volumeMl: primaProduct.volumeMl,
            deepLink: primaSourceUrl,
            imageUrl: primaProduct.imageUrl,
          }
        : null,
      candidateIdentities: [],
      storedTechnicalValue: primaWine.alcohol,
      officialTechnicalValue: primaProduct?.alcohol ?? null,
      sourceUrls: [...PRIMA_URLS],
      identityEvidence: primaProduct
        ? [
            `name=${primaProduct.name}`,
            `vintage=${primaProduct.vintage ?? "missing"}`,
            `sku=${primaProduct.sku ?? "missing"}`,
          ]
        : [],
      conflictEvidence: [
        `DB alcohol=${primaWine.alcohol ?? "missing"}`,
        `official alcohol=${primaProduct?.alcohol ?? "unavailable"}`,
      ],
      recommendedAction:
        primaDecision.outcome === "DB_WRONG_CONFIRMED"
          ? "CORRECT_CANONICAL_VALUE"
          : "HUMAN_REVIEW",
      resolution:
        primaDecision.outcome === "DB_WRONG_CONFIRMED"
          ? "RESOLVED_CONFLICT_DB_WRONG"
          : primaDecision.outcome === "SOURCE_STALE_OR_WRONG"
            ? "RESOLVED_CONFLICT_SOURCE_STALE"
            : "REMAINS_BLOCKED",
      reasoningCodes: [
        ...(primaProduct ? ["EXACT_PRODUCT_NAME" as const, "EXACT_VINTAGE" as const] : []),
        ...(primaProduct?.alcohol != null ? ["EXPLICIT_TECHNICAL_VALUE" as const] : []),
        ...(primaStability.stability === "STABLE"
          ? ["SOURCE_FETCH_STABLE" as const]
          : ["SOURCE_FETCH_TRANSIENT" as const]),
      ],
      observedAt,
    });
    if (
      primaDecision.outcome === "DB_WRONG_CONFIRMED" &&
      primaWine.alcohol != null &&
      primaProduct?.alcohol != null
    ) {
      correctionCandidates.push({
        wineId: primaWine.id,
        slug: primaWine.slug,
        winery: "budureasca",
        field: "alcohol",
        oldValue: primaWine.alcohol,
        newValue: primaProduct.alcohol,
        sourceUrls: [primaSourceUrl],
        identityProof: [
          `Exact official name: ${primaProduct.name}`,
          `Exact official vintage: ${primaProduct.vintage}`,
        ],
        conflictResolution: "DB_WRONG_CONFIRMED",
        impactPreview: {
          publicDisplay: `${primaWine.alcohol}% -> ${primaProduct.alcohol}%`,
          jsonLd: `alcoholContent ${primaWine.alcohol} -> ${primaProduct.alcohol}`,
          derivedCopy: "Alcohol-dependent factual copy changes",
          valueScoreDelta: null,
          pairingImpact: "Pending in-memory simulation",
        },
        decision: primaDecision.outcome,
      });
    }
  }

  const darkRows = includesBudureasca
    ? (
        await Promise.all(DARK_COUNT_URLS.map(async (url) => ({ url, rows: await repeat(url) })))
      ).flatMap(({ url, rows }) =>
        rows
          .filter((row) => row.ok && row.body)
          .map((row) => ({
            url,
            probe: row,
            product: parseBudureascaProductPage(row.body!, row.finalUrl ?? url),
          })),
      )
    : [];
  const darkProduct = darkRows.find(
    (row) =>
      row.product?.vintage === 2020 &&
      /dark count/i.test(row.product.name) &&
      /feteasc/i.test(row.product.name),
  )?.product ?? null;
  const darkSourceUrl =
    darkRows.find((row) => row.product === darkProduct)?.url ?? DARK_COUNT_URLS[0];
  const darkStability = repeatedClassification(
    includesBudureasca ? await repeat(darkSourceUrl) : [],
    Boolean(darkProduct),
  );
  let darkDecision: OfficialConflictDecision;
  if (darkWine && darkProduct?.sweetness === darkWine.sweetness) {
    darkDecision = {
      outcome: "SOURCE_STALE_OR_WRONG",
      reasons: [
        "Exact official product title explicitly says Demisec",
        "Prior sec extraction came from generic navigation/filter text",
      ],
    };
  } else if (darkWine && darkProduct?.sweetness) {
    darkDecision = adjudicateOfficialConflict({
      exactProduct: true,
      dbVintage: darkWine.vintage,
      sourceVintage: darkProduct.vintage,
      explicitFact: true,
      stablePrimarySource: darkStability.stability === "STABLE",
      officialSourceUrls: [darkSourceUrl],
      corroboratingValues: [],
      officialValue: darkProduct.sweetness,
    });
  } else {
    darkDecision = {
      outcome: "UNRESOLVED",
      reasons: ["No reproducible exact 2020 official sweetness claim"],
    };
  }
  if (darkWine) {
    adjudications.push({
      wineId: darkWine.id,
      slug: darkWine.slug,
      winery: "budureasca",
      issueType: "OFFICIAL_VALUE_CONFLICT",
      storedIdentity: identityFromWine(darkWine),
      sourceIdentity: darkProduct
        ? {
            name: darkProduct.name,
            vintage: darkProduct.vintage,
            productId: null,
            sku: darkProduct.sku,
            line: darkProduct.line,
            color: darkProduct.color,
            grapes: darkProduct.grapeVarieties.map((grape) => grape.name),
            volumeMl: darkProduct.volumeMl,
            deepLink: darkSourceUrl,
            imageUrl: darkProduct.imageUrl,
          }
        : null,
      candidateIdentities: [],
      storedTechnicalValue: darkWine.sweetness,
      officialTechnicalValue: darkProduct?.sweetness ?? null,
      sourceUrls: [...DARK_COUNT_URLS],
      identityEvidence: darkProduct
        ? [`name=${darkProduct.name}`, `vintage=${darkProduct.vintage ?? "missing"}`]
        : [],
      conflictEvidence: [
        `DB sweetness=${darkWine.sweetness ?? "missing"}`,
        `official title sweetness=${darkProduct?.sweetness ?? "unavailable"}`,
      ],
      recommendedAction:
        darkDecision.outcome === "DB_WRONG_CONFIRMED"
          ? "CORRECT_CANONICAL_VALUE"
          : "KEEP_CURRENT",
      resolution:
        darkDecision.outcome === "DB_WRONG_CONFIRMED"
          ? "RESOLVED_CONFLICT_DB_WRONG"
          : darkDecision.outcome === "SOURCE_STALE_OR_WRONG"
            ? "RESOLVED_CONFLICT_SOURCE_STALE"
            : "REMAINS_BLOCKED",
      reasoningCodes: [
        ...(darkProduct ? ["EXACT_PRODUCT_NAME" as const, "EXACT_VINTAGE" as const] : []),
        ...(darkProduct?.sweetness ? ["EXPLICIT_TECHNICAL_VALUE" as const] : []),
        ...(darkStability.stability === "STABLE"
          ? ["SOURCE_FETCH_STABLE" as const]
          : ["SOURCE_FETCH_TRANSIENT" as const]),
      ],
      observedAt,
    });
    if (
      darkDecision.outcome === "DB_WRONG_CONFIRMED" &&
      darkWine.sweetness &&
      darkProduct?.sweetness
    ) {
      correctionCandidates.push({
        wineId: darkWine.id,
        slug: darkWine.slug,
        winery: "budureasca",
        field: "sweetness",
        oldValue: darkWine.sweetness,
        newValue: darkProduct.sweetness,
        sourceUrls: [darkSourceUrl],
        identityProof: [
          `Exact official name: ${darkProduct.name}`,
          `Exact official vintage: ${darkProduct.vintage}`,
        ],
        conflictResolution: "DB_WRONG_CONFIRMED",
        impactPreview: {
          publicDisplay: `${darkWine.sweetness} -> ${darkProduct.sweetness}`,
          jsonLd: "Sweetness-dependent structured data changes",
          derivedCopy: "Sweetness-dependent factual copy changes",
          valueScoreDelta: null,
          pairingImpact: "Pending in-memory simulation",
        },
        decision: darkDecision.outcome,
      });
    }
  }

  let ballaReport: ReturnType<typeof adjudicateBallaIdentitySet> | null = null;
  let ballaCatalogFocus: Array<{
    productId: number;
    name: string;
    vintage: number | null;
    category: string | null;
  }> = [];
  if (selectedWineries.includes("balla-geza")) {
    const catalogRows = await repeat("https://www.ballageza.com/ro/catalog/vinuri");
    const catalogBody = catalogRows.find((row) => row.ok && row.body)?.body ?? "";
    const records = parseAllBallaGezaWinesFromCatalog(catalogBody);
    ballaCatalogFocus = records
      .filter((record) =>
        /chardonnay|feteasc|cabernet sauvignon|cuvee reserve|cadarissima/i.test(
          foldText(record.name),
        ),
      )
      .map((record) => ({
        productId: record.productId,
        name: record.name,
        vintage: record.vintage,
        category: record.category,
      }));
    const ballaWines = allWines.filter(
      (wine) =>
        wine.winerySlug === "balla-geza" &&
        /chardonnay-2022|feteasca-neagra-2022|cabernet-sauvignon-2021|cuvee-reserve-2020|cadarissima-2023/.test(
          wine.slug,
        ),
    );
    ballaReport = adjudicateBallaIdentitySet(
      ballaWines.map((wine) => ({
        wineId: wine.id,
        slug: wine.slug,
        name: wine.name,
        vintage: wine.vintage,
        producerPageUrl: wine.producerPageUrl,
        grapes: wine.grapeVarieties.map((grape) => grape.name),
      })),
      records,
    );
    const constrained = enforceOneToOneOfficialIdentity(
      ballaReport.assignments.map<BallaIdentityAssignment>((row) => ({
        wineId: row.wineId,
        slug: row.slug,
        productId: row.productId,
        resolution: row.status,
        positiveEvidence: row.positiveEvidence
          .filter((code) =>
            [
              "EXACT_PRODUCT_NAME",
              "EXACT_VINTAGE",
              "EXACT_LINE",
              "EXACT_DEEP_LINK",
            ].includes(code),
          )
          .map((code) => code as BallaIdentityAssignment["positiveEvidence"][number]),
      })),
    );
    for (const assignment of constrained) {
      const wine = ballaWines.find((row) => row.id === assignment.wineId);
      const record = records.find((row) => row.productId === assignment.productId);
      if (!wine) continue;
      adjudications.push({
        wineId: wine.id,
        slug: wine.slug,
        winery: "balla-geza",
        issueType: assignment.resolution === "NO_MATCH" ? "NO_MATCH" : "PRODUCT_AMBIGUITY",
        storedIdentity: identityFromWine(wine),
        sourceIdentity: record
          ? {
              name: record.name,
              vintage: record.vintage,
              productId: record.productId,
              sku: null,
              line: record.category,
              color: record.color,
              grapes: record.grapeVarieties.map((grape) => grape.name),
              volumeMl: record.volumeMl,
              deepLink: record.producerPageUrl,
              imageUrl: record.imageUrl,
            }
          : null,
        candidateIdentities: (ballaReport.assignments.find(
          (row) => row.wineId === wine.id,
        )?.candidates ?? [])
          .map((productId) => records.find((recordRow) => recordRow.productId === productId))
          .filter((row): row is NonNullable<typeof row> => row != null)
          .map((row) => ({
            name: row.name,
            vintage: row.vintage,
            productId: row.productId,
            sku: null,
            line: row.category,
            color: row.color,
            grapes: row.grapeVarieties.map((grape) => grape.name),
            volumeMl: row.volumeMl,
            deepLink: row.producerPageUrl,
            imageUrl: row.imageUrl,
          })),
        sourceUrls: record ? [record.producerPageUrl] : [],
        identityEvidence: assignment.positiveEvidence,
        conflictEvidence: [],
        recommendedAction:
          assignment.resolution === "RESOLVED_EXACT" ? "KEEP_CURRENT" : "HUMAN_REVIEW",
        resolution:
          assignment.resolution === "RESOLVED_EXACT"
            ? "RESOLVED_EXACT"
            : assignment.resolution === "NO_MATCH"
              ? "NO_OFFICIAL_SOURCE"
              : "REMAINS_AMBIGUOUS",
        reasoningCodes:
          assignment.resolution === "IDENTITY_COLLISION"
            ? ["IDENTITY_COLLISION"]
            : assignment.resolution === "RESOLVED_EXACT"
              ? ["EXACT_PRODUCT_ID", "EXACT_PRODUCT_NAME", "EXACT_VINTAGE"]
              : assignment.resolution === "NO_MATCH"
                ? ["NO_CURRENT_OFFICIAL_MATCH"]
                : ["MISSING_LINE_EVIDENCE"],
        observedAt,
      });
    }
  }

  let avincisAmelie: SourceAdjudicationRecord | null = null;
  if (selectedWineries.includes("avincis")) {
    const amelieWine = allWines.find((wine) => wine.slug.includes("cuvee-amelie"));
    if (amelieWine) {
      const exactRows = await repeat(AVINCIS_AMELIE_URL);
      const exactProbe = exactRows.find((row) => row.ok && row.body);
      const facts = exactProbe?.body
        ? parseAvincisProducerFacts(exactProbe.body, exactProbe.finalUrl ?? AVINCIS_AMELIE_URL)
        : null;
      const exactName = Boolean(
        facts?.name && foldText(facts.name).includes("cuvee amelie"),
      );
      avincisAmelie = {
        wineId: amelieWine.id,
        slug: amelieWine.slug,
        winery: "avincis",
        issueType: "PRODUCT_AMBIGUITY",
        storedIdentity: identityFromWine(amelieWine),
        sourceIdentity: facts
          ? {
              name: facts.name,
              vintage: facts.vintage,
              productId: null,
              sku: null,
              line: "Vinuri albe",
              color: facts.color,
              grapes: facts.grapeVarieties.map((grape) => grape.name),
              volumeMl: null,
              deepLink: AVINCIS_AMELIE_URL,
              imageUrl: facts.imageUrl,
            }
          : null,
        candidateIdentities: [],
        sourceUrls: [amelieWine.producerPageUrl ?? "", AVINCIS_AMELIE_URL].filter(Boolean),
        identityEvidence: facts?.name
          ? [`official heading=${facts.name}`, "official page category=Vinuri albe"]
          : [],
        conflictEvidence: ["Vila Dobrușa is a site collection/location label, not the product h1"],
        recommendedAction: exactName
          ? "REPLACE_WITH_EXACT_CURRENT_URL"
          : "HUMAN_REVIEW",
        resolution: exactName ? "RESOLVED_EXACT" : "REMAINS_AMBIGUOUS",
        reasoningCodes: exactName
          ? ["EXACT_PRODUCT_NAME", "EXACT_DEEP_LINK"]
          : ["GENERIC_SOURCE"],
        observedAt,
      };
      adjudications.push(avincisAmelie);
      if (
        exactName &&
        amelieWine.producerPageUrl &&
        canonicalizeOfficialUrl(amelieWine.producerPageUrl) !==
          canonicalizeOfficialUrl(AVINCIS_AMELIE_URL)
      ) {
        manifestA.push({
          wineId: amelieWine.id,
          slug: amelieWine.slug,
          field: "producerPageUrl",
          oldUrl: amelieWine.producerPageUrl,
          proposedNewUrl: AVINCIS_AMELIE_URL,
          action: "REPLACE_PRODUCER_PAGE",
          proof: ["Exact official Cuvée Amélie h1", "Exact official deep link"],
          risk: "LOW",
        });
      }
    }
    for (const wine of allWines.filter(
      (row) =>
        row.winerySlug === "avincis" &&
        row.tastingSheetUrl?.toLowerCase().includes("politica%20de%20confidentialitate.pdf"),
    )) {
      manifestA.push({
        wineId: wine.id,
        slug: wine.slug,
        field: "tastingSheetUrl",
        oldUrl: wine.tastingSheetUrl!,
        proposedNewUrl: null,
        action: "CLEAR_TASTING_SHEET",
        proof: ["Stored document is Avincis privacy policy", "No exact technical PDF replacement found"],
        risk: "LOW",
      });
    }
  }

  const gabaiResults: SourceAdjudicationRecord[] = [];
  if (selectedWineries.includes("crama-gabai")) {
    const deadWines = allWines.filter(
      (wine) =>
        wine.winerySlug === "crama-gabai" &&
        /sweet-pinot-rose|sauvignon-blanc|feteasca-alba|sweet-pinot-noir/.test(wine.slug),
    );
    const shopProbe = noFetch
      ? null
      : await probeOfficialSource({ url: GABAI_SHOP_URL, method: "GET" });
    const currentCatalog = shopProbe?.body
      ? parseGabaiCatalogListing(shopProbe.body, shopProbe.finalUrl ?? GABAI_SHOP_URL)
      : [];
    for (const wine of deadWines) {
      if (!wine.producerPageUrl) continue;
      const observations = await repeat(wine.producerPageUrl);
      const stability = repeatedClassification(observations, true);
      const exactMatches = currentCatalog.filter(
        (row) => classifySourceName(wine.name, row.name) === "SOURCE_NAME_EXACT",
      );
      const replacement = exactMatches.length === 1 ? exactMatches[0]!.url : null;
      const dead = stability.stability === "DEAD_AFTER_DISCOVERY";
      const record: SourceAdjudicationRecord = {
        wineId: wine.id,
        slug: wine.slug,
        winery: "crama-gabai",
        issueType: "DEAD_SOURCE",
        storedIdentity: identityFromWine(wine),
        sourceIdentity: null,
        candidateIdentities: [],
        sourceUrls: [wine.producerPageUrl],
        identityEvidence: ["Stored URL is an exact historical product slug"],
        conflictEvidence: [
          `repeat availability=${stability.available}/${stability.attempts}`,
          `current exact catalog matches=${exactMatches.length}`,
        ],
        recommendedAction: replacement
          ? "REPLACE_WITH_EXACT_CURRENT_URL"
          : dead
            ? "PRODUCT_REMOVED_BUT_IDENTITY_VALID"
            : "HUMAN_REVIEW",
        resolution: replacement
          ? "RESOLVED_SOURCE_REPLACEMENT"
          : dead
            ? "NO_OFFICIAL_SOURCE"
            : "REMAINS_BLOCKED",
        reasoningCodes: replacement
          ? ["EXACT_PRODUCT_NAME", "EXACT_DEEP_LINK"]
          : dead
            ? ["SOURCE_DEAD", "NO_CURRENT_OFFICIAL_MATCH"]
            : ["SOURCE_FETCH_TRANSIENT"],
        observedAt,
      };
      gabaiResults.push(record);
      adjudications.push(record);
      if (replacement) {
        manifestA.push({
          wineId: wine.id,
          slug: wine.slug,
          field: "producerPageUrl",
          oldUrl: wine.producerPageUrl,
          proposedNewUrl: replacement,
          action: "REPLACE_PRODUCER_PAGE",
          proof: ["Exact official current catalog name", "Exact official product deep link"],
          risk: "LOW",
        });
      } else if (dead) {
        manifestA.push({
          wineId: wine.id,
          slug: wine.slug,
          field: "producerPageUrl",
          oldUrl: wine.producerPageUrl,
          proposedNewUrl: null,
          action: "CLEAR_PRODUCER_PAGE",
          proof: ["Repeated 404 or 410", "No exact current official replacement"],
          risk: "LOW",
        });
      }
    }
  }

  const fullRows = await db.query.wines.findMany({
    where: eq(wines.status, "verified"),
    with: { winery: true, region: true },
  });
  const normalizedById = new Map(
    normalizeWineRows(fullRows as WineWithRelations[]).map((wine) => [wine.id, wine]),
  );
  for (const correction of correctionCandidates) {
    const wine = normalizedById.get(correction.wineId);
    if (!wine) continue;
    const patched = {
      ...wine,
      alcohol:
        correction.field === "alcohol"
          ? Number(correction.newValue)
          : wine.alcohol,
      sweetness:
        correction.field === "sweetness"
          ? (String(correction.newValue) as typeof wine.sweetness)
          : wine.sweetness,
    };
    const beforeScore = calculateValueScore(valueScoreInputFromWine(wine));
    const afterScore = calculateValueScore(valueScoreInputFromWine(patched));
    const beforeTop = generateRomanianPairingDrafts(wine)[0]?.dish ?? null;
    const afterTop = generateRomanianPairingDrafts(patched)[0]?.dish ?? null;
    correction.impactPreview.valueScoreDelta = afterScore - beforeScore;
    correction.impactPreview.pairingImpact =
      beforeTop === afterTop
        ? `Top generated pairing unchanged: ${beforeTop ?? "none"}`
        : `Top generated pairing: ${beforeTop ?? "none"} -> ${afterTop ?? "none"}`;
  }
  const manifestC = confirmedCorrectionsOnly(correctionCandidates);

  const budureascaRepresentative = selectedWineries.includes("budureasca") && !noFetch
    ? {
        catalogGet: repeatedClassification(await repeat(BUDUREASCA_CATALOG_URL), false),
        catalogHead: await probeOfficialSource({
          url: BUDUREASCA_CATALOG_URL,
          method: "HEAD",
        }),
        detailHead: await probeOfficialSource({
          url: PRIMA_URLS[0],
          method: "HEAD",
        }),
        prima: {
          urls: PRIMA_URLS.map((url) => ({
            url,
            classification: repeatedClassification(
              repeatedCache.get(canonicalizeOfficialUrl(url)) ?? [],
              true,
            ),
          })),
        },
        darkCount: {
          urls: DARK_COUNT_URLS.map((url) => ({
            url,
            classification: repeatedClassification(
              repeatedCache.get(canonicalizeOfficialUrl(url)) ?? [],
              true,
            ),
          })),
        },
      }
    : null;

  const actionCounts = manifestA.reduce<Record<string, number>>((result, row) => {
    result[row.action] = (result[row.action] ?? 0) + 1;
    return result;
  }, {});
  const evidenceStability = evidenceReport.qualifiedMatchesDiscovered.reduce<
    Record<string, number>
  >((result, row) => {
    result[row.stability] = (result[row.stability] ?? 0) + 1;
    return result;
  }, {});

  if (process.argv.includes("--manifests-only")) {
    console.log(
      JSON.stringify(
        {
          prompt: 17,
          readOnly: true,
          checkpoint: { startingCommit: "a6640e9", observedAt },
          conflictOutcomes: {
            primaStilla: primaDecision,
            darkCount: darkDecision,
          },
          budureascaPrompt16CandidateStability: budureascaEvidenceStability,
          balla: ballaReport?.assignments.filter((row) =>
            /chardonnay-2022$|feteasca-neagra-2022$|cabernet-sauvignon-2021(?:-kolna)?$|cuvee-reserve-2020|cadarissima-2023/.test(
              row.slug,
            ),
          ) ?? [],
          avincisCuveeAmelie: avincisAmelie,
          gabai: gabaiResults,
          manifests: {
            A: { counts: actionCounts, rows: manifestA },
            B: {
              counts: tallyEvidenceByWineryAndField(manifestB),
              rows: manifestB,
            },
            C: { count: manifestC.length, rows: manifestC },
          },
          evidenceDedupe: {
            qualifiedMatchesDiscovered:
              evidenceReport.qualifiedMatchesDiscovered.length,
            alreadyPersisted: evidenceReport.alreadyPersisted.length,
            unstableOrAmbiguous: evidenceReport.unstableOrAmbiguous.length,
            actualNewEvidenceRows: manifestB.length,
          },
          publicVerifiedCoverageSimulation: coverage,
          productionState: {
            evidenceRows: persistedRows.length,
            productionWrites: {
              technicalValues: 0,
              sourceUrls: 0,
              evidence: 0,
              scores: 0,
              pairings: 0,
              editorial: 0,
            },
          },
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(
    JSON.stringify(
      {
        prompt: 17,
        readOnly: true,
        checkpoint: {
          startingCommit: "a6640e9",
          observedAt,
        },
        filter: requestedWinery ?? "focused-blockers",
        scope: {
          targetWines: targetWines.length,
          recoveryWines: recoveryWines.length,
          broadCatalogAudit: false,
        },
        budureasca: {
          representativeRepeatability: budureascaRepresentative,
          evidenceStability,
          prompt16CandidateStability: budureascaEvidenceStability,
          primaStilla: {
            db: primaWine
              ? { slug: primaWine.slug, alcohol: primaWine.alcohol, vintage: primaWine.vintage }
              : null,
            official: primaProduct
              ? {
                  name: primaProduct.name,
                  vintage: primaProduct.vintage,
                  alcohol: primaProduct.alcohol,
                  url: primaSourceUrl,
                }
              : null,
            stability: primaStability,
            decision: primaDecision,
          },
          darkCount: {
            db: darkWine
              ? {
                  slug: darkWine.slug,
                  sweetness: darkWine.sweetness,
                  vintage: darkWine.vintage,
                }
              : null,
            official: darkProduct
              ? {
                  name: darkProduct.name,
                  vintage: darkProduct.vintage,
                  sweetness: darkProduct.sweetness,
                  url: darkSourceUrl,
                }
              : null,
            stability: darkStability,
            decision: darkDecision,
          },
        },
        balla: ballaReport
          ? { ...ballaReport, currentCatalogFocus: ballaCatalogFocus }
          : null,
        avincis: {
          cuveeAmelie: avincisAmelie,
          exactCurrentProductUrl: AVINCIS_AMELIE_CURRENT_URL,
          invalidPrivacySheets: manifestA.filter(
            (row) => row.action === "CLEAR_TASTING_SHEET",
          ),
        },
        gabai: gabaiResults,
        adjudications,
        manifests: {
          A: {
            counts: actionCounts,
            rows: manifestA,
          },
          B: {
            counts: tallyEvidenceByWineryAndField(manifestB),
            rows: manifestB,
          },
          C: {
            count: manifestC.length,
            rows: manifestC,
          },
        },
        evidenceDedupe: {
          qualifiedMatchesDiscovered:
            evidenceReport.qualifiedMatchesDiscovered.length,
          alreadyPersisted: evidenceReport.alreadyPersisted.length,
          unstableOrAmbiguous: evidenceReport.unstableOrAmbiguous.length,
          actualNewEvidenceRows: manifestB.length,
        },
        publicVerifiedCoverageSimulation: coverage,
        productionState: {
          evidenceRows: persistedRows.length,
          productionWrites: {
            technicalValues: 0,
            sourceUrls: 0,
            evidence: 0,
            scores: 0,
            pairings: 0,
            editorial: 0,
          },
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
