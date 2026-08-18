import { eq } from "drizzle-orm";
import { db, libsqlClient } from "@/lib/db";
import { isOfficialProducerSource } from "@/lib/source-trust";
import {
  wineFactEvidence,
  wineries as wineriesTable,
  wines,
} from "@/lib/schema";
import { resetFetchCache } from "@/lib/tech-facts/fetch-source";
import {
  persistWineFactEvidenceStrict,
  type EvidenceInsertFn,
} from "@/lib/tech-facts/persist";
import { isPrompt14Eligible } from "@/lib/tech-facts/qualify";
import { officialExact } from "@/lib/tech-facts/reconcile";
import {
  runReadOnlyCatalogRecovery,
  type QualifiedTechField,
} from "@/lib/tech-facts/run-recovery";
import {
  techValuesEqual,
  type FieldRecoveryResult,
  type TechFactClaim,
} from "@/lib/tech-facts/types";

export const PROMPT_14_WINERIES = [
  "cramele-recas",
  "balla-geza",
  "crama-gabai",
  "budureasca",
] as const;

export type Prompt14Winery = (typeof PROMPT_14_WINERIES)[number];

export const PROMPT_14_EXPECTED_FIELDS: Record<
  Prompt14Winery,
  Record<QualifiedTechField, number>
> = {
  "cramele-recas": {
    alcohol: 54,
    acidity: 54,
    sugar: 0,
    sweetness: 54,
    vintage: 55,
  },
  "balla-geza": {
    alcohol: 35,
    acidity: 0,
    sugar: 0,
    sweetness: 34,
    vintage: 36,
  },
  "crama-gabai": {
    alcohol: 11,
    acidity: 0,
    sugar: 0,
    sweetness: 11,
    vintage: 11,
  },
  budureasca: {
    alcohol: 1,
    acidity: 0,
    sugar: 0,
    sweetness: 1,
    vintage: 1,
  },
};

const FIELD_NAMES: QualifiedTechField[] = [
  "alcohol",
  "acidity",
  "sugar",
  "sweetness",
  "vintage",
];

interface PlannedEvidence {
  wineId: number;
  slug: string;
  winerySlug: Prompt14Winery;
  field: QualifiedTechField;
  stored: string | number;
  candidate: string | number;
  qualification: "QUALIFIED_EXACT" | "QUALIFIED_CORROBORATED";
  claims: TechFactClaim[];
}

export interface EvidenceBackfillOptions {
  apply?: boolean;
  winerySlug?: string;
  wineSlug?: string;
}

export interface EvidenceBackfillRow {
  slug: string;
  winery: string;
  field: QualifiedTechField;
  qualification: string;
  fieldMatch: boolean;
  proposedEvidenceRows: number;
  duplicates: number;
  newEvidenceRows: number;
  actualInserted: number;
  skipReasons: string[];
}

export interface EvidenceBackfillReport {
  dryRun: boolean;
  schemaReady: boolean;
  selectedWinery: string | null;
  selectedWine: string | null;
  qualification: {
    expected: Record<QualifiedTechField, number>;
    current: Record<QualifiedTechField, number>;
    drift: Record<QualifiedTechField, number>;
    materiallyDifferent: boolean;
  };
  totals: {
    wines: number;
    qualifiedFieldMatches: number;
    evidenceRowsProposed: number;
    alreadyPresent: number;
    newEvidenceRows: number;
    actualInserted: number;
    skippedClaims: number;
    currentValueMismatches: number;
    missingHashes: number;
    sourceIdentityFailures: number;
  };
  rows: EvidenceBackfillRow[];
  sourceDistribution: Array<{
    winery: string;
    field: string;
    sourceType: string;
    qualification: string;
    rows: number;
  }>;
}

function emptyCounts(): Record<QualifiedTechField, number> {
  return { alcohol: 0, acidity: 0, sugar: 0, sweetness: 0, vintage: 0 };
}

function scalar(value: TechFactClaim["value"]): string | number | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function claimValidationReasons(
  field: FieldRecoveryResult,
  claim: TechFactClaim,
): string[] {
  const reasons: string[] = [];
  const value = scalar(claim.value);
  if (!officialExact(claim)) reasons.push("not_official_exact");
  if (claim.extractionMethod === "legacy_producer_fact") {
    reasons.push("legacy_only");
  }
  if (!claim.claimIdentityHash?.trim() || claim.claimIdentityHash.length !== 64) {
    reasons.push("missing_hash");
  }
  if (!claim.sourceUrl?.trim()) reasons.push("missing_source_url");
  if (!claim.excerpt?.trim() || claim.excerpt.startsWith("legacy ")) {
    reasons.push("missing_real_excerpt");
  }
  if (!claim.sourceWineName?.trim()) reasons.push("source_identity_missing");
  if (claim.sourceVintage == null) reasons.push("source_vintage_missing");
  if (!isOfficialProducerSource(claim.sourceType)) {
    reasons.push("disallowed_source_type");
  }
  if (
    value == null ||
    field.candidate == null ||
    !techValuesEqual(field.field, value, field.candidate)
  ) {
    reasons.push("claim_value_mismatch");
  }
  return reasons;
}

export function selectPrompt14EvidenceClaims(
  field: FieldRecoveryResult,
): TechFactClaim[] {
  if (!isPrompt14Eligible(field.qualification)) return [];
  if (field.action !== "EVIDENCE_ATTACH") return [];
  if (field.stored == null || field.candidate == null) return [];
  if (!techValuesEqual(field.field, field.stored, field.candidate)) return [];

  const seen = new Set<string>();
  return field.claims.filter((claim) => {
    if (claim.field !== field.field) return false;
    if (claimValidationReasons(field, claim).length > 0) return false;
    const key = claim.claimIdentityHash;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function evidenceSchemaReady(): Promise<boolean> {
  const result = await libsqlClient.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'wine_fact_evidence'",
  );
  return result.rows.length === 1;
}

async function existingEvidenceKeys(): Promise<Set<string>> {
  if (!(await evidenceSchemaReady())) return new Set();
  const rows = await db
    .select({
      wineId: wineFactEvidence.wineId,
      field: wineFactEvidence.field,
      sourceHash: wineFactEvidence.sourceHash,
    })
    .from(wineFactEvidence);
  return new Set(
    rows
      .filter(
        (row): row is typeof row & { sourceHash: string } =>
          Boolean(row.sourceHash),
      )
      .map((row) => `${row.wineId}|${row.field}|${row.sourceHash}`),
  );
}

function evidenceKey(
  wineId: number,
  field: string,
  sourceHash: string,
): string {
  return `${wineId}|${field}|${sourceHash}`;
}

function currentFieldValue(
  row: typeof wines.$inferSelect,
  field: QualifiedTechField,
): string | number | null {
  if (field === "alcohol") return row.alcohol;
  if (field === "acidity") return row.acidity;
  if (field === "sugar") return row.sugar;
  if (field === "sweetness") return row.sweetness;
  return row.vintage;
}

function selectedExpectedCounts(
  winerySlug?: string,
  wineSlug?: string,
  current?: Record<QualifiedTechField, number>,
): Record<QualifiedTechField, number> {
  if (wineSlug && current) return { ...current };
  if (winerySlug && PROMPT_14_WINERIES.includes(winerySlug as Prompt14Winery)) {
    return { ...PROMPT_14_EXPECTED_FIELDS[winerySlug as Prompt14Winery] };
  }
  const result = emptyCounts();
  for (const winery of PROMPT_14_WINERIES) {
    for (const field of FIELD_NAMES) {
      result[field] += PROMPT_14_EXPECTED_FIELDS[winery][field];
    }
  }
  return result;
}

function planSignature(plans: PlannedEvidence[]): string[] {
  return plans
    .flatMap((plan) =>
      plan.claims.map(
        (claim) =>
          `${plan.wineId}|${plan.field}|${claim.claimIdentityHash}|${String(claim.value)}`,
      ),
    )
    .sort();
}

async function recoverAndPlan(options: EvidenceBackfillOptions): Promise<{
  winesCount: number;
  plans: PlannedEvidence[];
  current: Record<QualifiedTechField, number>;
  skippedClaims: number;
  missingHashes: number;
  sourceIdentityFailures: number;
}> {
  resetFetchCache();
  const recovery = await runReadOnlyCatalogRecovery({
    winerySlug: options.winerySlug,
    wineSlug: options.wineSlug,
  });
  const plans: PlannedEvidence[] = [];
  const current = emptyCounts();
  let skippedClaims = 0;
  let missingHashes = 0;
  let sourceIdentityFailures = 0;

  for (const result of recovery.recoveries) {
    if (
      !PROMPT_14_WINERIES.includes(
        (result.winerySlug ?? "") as Prompt14Winery,
      )
    ) {
      continue;
    }
    const winerySlug = result.winerySlug as Prompt14Winery;
    for (const field of result.fields) {
      if (!FIELD_NAMES.includes(field.field as QualifiedTechField)) continue;
      const fieldName = field.field as QualifiedTechField;
      if (
        fieldName === "sugar" ||
        (fieldName === "acidity" && winerySlug !== "cramele-recas")
      ) {
        if (isPrompt14Eligible(field.qualification)) skippedClaims += 1;
        continue;
      }
      if (
        !isPrompt14Eligible(field.qualification) ||
        field.action !== "EVIDENCE_ATTACH" ||
        field.stored == null ||
        field.candidate == null ||
        !techValuesEqual(fieldName, field.stored, field.candidate)
      ) {
        continue;
      }
      current[fieldName] += 1;
      const claims = selectPrompt14EvidenceClaims(field);
      for (const claim of field.claims) {
        const reasons = claimValidationReasons(field, claim);
        if (reasons.includes("missing_hash")) missingHashes += 1;
        if (
          reasons.includes("source_identity_missing") ||
          reasons.includes("source_vintage_missing")
        ) {
          sourceIdentityFailures += 1;
        }
      }
      skippedClaims += Math.max(0, field.claims.length - claims.length);
      if (claims.length === 0) continue;
      plans.push({
        wineId: result.wineId,
        slug: result.slug,
        winerySlug,
        field: fieldName,
        stored: field.stored,
        candidate: field.candidate,
        qualification: field.qualification as
          | "QUALIFIED_EXACT"
          | "QUALIFIED_CORROBORATED",
        claims,
      });
    }
  }
  return {
    winesCount: recovery.wines.length,
    plans,
    current,
    skippedClaims,
    missingHashes,
    sourceIdentityFailures,
  };
}

async function assertBudureascaReplayStable(
  firstPlans: PlannedEvidence[],
): Promise<void> {
  const second = await recoverAndPlan({ winerySlug: "budureasca" });
  const first = planSignature(
    firstPlans.filter((plan) => plan.winerySlug === "budureasca"),
  );
  const replay = planSignature(second.plans);
  if (JSON.stringify(first) !== JSON.stringify(replay)) {
    throw new Error(
      "Budureasca second live replay changed qualification. No evidence was written.",
    );
  }
}

export async function runTechEvidenceBackfill(
  options: EvidenceBackfillOptions = {},
): Promise<EvidenceBackfillReport> {
  if (
    options.winerySlug &&
    !PROMPT_14_WINERIES.includes(options.winerySlug as Prompt14Winery)
  ) {
    throw new Error(
      `Prompt 14 does not permit backfill for ${options.winerySlug}.`,
    );
  }

  const planned = await recoverAndPlan(options);
  if (
    options.apply &&
    (!options.winerySlug || options.winerySlug === "budureasca")
  ) {
    await assertBudureascaReplayStable(planned.plans);
  }

  const expected = selectedExpectedCounts(
    options.winerySlug,
    options.wineSlug,
    planned.current,
  );
  const drift = emptyCounts();
  for (const field of FIELD_NAMES) {
    drift[field] = planned.current[field] - expected[field];
  }
  const materiallyDifferent = FIELD_NAMES.some(
    (field) => drift[field] !== 0,
  );
  if (options.apply && materiallyDifferent) {
    throw new Error(
      `Qualification drift blocks apply: ${JSON.stringify(drift)}`,
    );
  }

  const schemaReady = await evidenceSchemaReady();
  if (options.apply && !schemaReady) {
    throw new Error(
      "wine_fact_evidence schema is not ready. Apply Batch A first.",
    );
  }
  const existing = await existingEvidenceKeys();
  const rows: EvidenceBackfillRow[] = [];
  let actualInserted = 0;
  let currentValueMismatches = 0;

  const plansByWine = new Map<number, PlannedEvidence[]>();
  for (const plan of planned.plans) {
    const values = plansByWine.get(plan.wineId) ?? [];
    values.push(plan);
    plansByWine.set(plan.wineId, values);
  }

  for (const winePlans of plansByWine.values()) {
    const first = winePlans[0]!;
    const rowReports = winePlans.map((plan) => {
      const duplicates = plan.claims.filter((claim) =>
        existing.has(
          evidenceKey(plan.wineId, plan.field, claim.claimIdentityHash),
        ),
      ).length;
      return {
        slug: plan.slug,
        winery: plan.winerySlug,
        field: plan.field,
        qualification: plan.qualification,
        fieldMatch: true,
        proposedEvidenceRows: plan.claims.length,
        duplicates,
        newEvidenceRows: plan.claims.length - duplicates,
        actualInserted: 0,
        skipReasons: [] as string[],
      };
    });

    if (options.apply && rowReports.some((row) => row.newEvidenceRows > 0)) {
      const insertedForWine = await db.transaction(async (tx) => {
        const beforeRows = await tx
          .select()
          .from(wines)
          .where(eq(wines.id, first.wineId))
          .limit(1);
        const before = beforeRows[0];
        if (!before) throw new Error(`Wine ${first.wineId} disappeared.`);

        for (const plan of winePlans) {
          const currentValue = currentFieldValue(before, plan.field);
          if (
            currentValue == null ||
            !techValuesEqual(plan.field, currentValue, plan.stored) ||
            !techValuesEqual(plan.field, currentValue, plan.candidate)
          ) {
            currentValueMismatches += 1;
            throw new Error(
              `Current value drift for ${plan.slug} ${plan.field}.`,
            );
          }
        }

        const beforeSerialized = JSON.stringify(before);
        let inserted = 0;
        for (const plan of winePlans) {
          const newClaims = plan.claims.filter(
            (claim) =>
              !existing.has(
                evidenceKey(
                  plan.wineId,
                  plan.field,
                  claim.claimIdentityHash,
                ),
              ),
          );
          if (newClaims.length === 0) continue;
          const insertFn: EvidenceInsertFn = async (values) => {
            const returned = await tx
              .insert(wineFactEvidence)
              .values(values)
              .onConflictDoNothing({
                target: [
                  wineFactEvidence.wineId,
                  wineFactEvidence.field,
                  wineFactEvidence.sourceHash,
                ],
              })
              .returning({ id: wineFactEvidence.id });
            return returned.length;
          };
          const count = await persistWineFactEvidenceStrict(
            plan.wineId,
            newClaims,
            insertFn,
          );
          inserted += count;
          const report = rowReports.find(
            (row) => row.field === plan.field,
          );
          if (report) report.actualInserted += count;
        }

        const afterRows = await tx
          .select()
          .from(wines)
          .where(eq(wines.id, first.wineId))
          .limit(1);
        if (JSON.stringify(afterRows[0]) !== beforeSerialized) {
          throw new Error(
            `Forbidden wine-row mutation detected for ${first.slug}.`,
          );
        }
        return inserted;
      });
      actualInserted += insertedForWine;
    }
    rows.push(...rowReports);
  }

  const distribution = new Map<string, number>();
  for (const plan of planned.plans) {
    for (const claim of plan.claims) {
      const key = [
        plan.winerySlug,
        plan.field,
        claim.sourceType,
        plan.qualification,
      ].join("|");
      distribution.set(key, (distribution.get(key) ?? 0) + 1);
    }
  }

  return {
    dryRun: !options.apply,
    schemaReady,
    selectedWinery: options.winerySlug ?? null,
    selectedWine: options.wineSlug ?? null,
    qualification: {
      expected,
      current: planned.current,
      drift,
      materiallyDifferent,
    },
    totals: {
      wines: planned.winesCount,
      qualifiedFieldMatches: planned.plans.length,
      evidenceRowsProposed: rows.reduce(
        (sum, row) => sum + row.proposedEvidenceRows,
        0,
      ),
      alreadyPresent: rows.reduce((sum, row) => sum + row.duplicates, 0),
      newEvidenceRows: rows.reduce(
        (sum, row) => sum + row.newEvidenceRows,
        0,
      ),
      actualInserted,
      skippedClaims: planned.skippedClaims,
      currentValueMismatches,
      missingHashes: planned.missingHashes,
      sourceIdentityFailures: planned.sourceIdentityFailures,
    },
    rows,
    sourceDistribution: [...distribution.entries()].map(([key, count]) => {
      const [winery, field, sourceType, qualification] = key.split("|");
      return {
        winery: winery!,
        field: field!,
        sourceType: sourceType!,
        qualification: qualification!,
        rows: count,
      };
    }),
  };
}

export interface PersistedEvidenceAudit {
  rows: number;
  duplicates: number;
  nullHashes: number;
  missingUrls: number;
  missingExcerpts: number;
  missingIdentity: number;
  missingVintage: number;
  retailerEvidence: number;
  invalidDocuments: number;
  legacyEvidence: number;
  revalidation: {
    MATCH: number;
    CONFLICT: number;
    STALE_SOURCE: number;
    SOURCE_UNAVAILABLE: number;
  };
  distribution: Array<{
    winery: string;
    field: string;
    sourceType: string;
    rows: number;
  }>;
}

export async function auditPersistedWineFactEvidence(): Promise<PersistedEvidenceAudit> {
  if (!(await evidenceSchemaReady())) {
    return {
      rows: 0,
      duplicates: 0,
      nullHashes: 0,
      missingUrls: 0,
      missingExcerpts: 0,
      missingIdentity: 0,
      missingVintage: 0,
      retailerEvidence: 0,
      invalidDocuments: 0,
      legacyEvidence: 0,
      revalidation: {
        MATCH: 0,
        CONFLICT: 0,
        STALE_SOURCE: 0,
        SOURCE_UNAVAILABLE: 0,
      },
      distribution: [],
    };
  }

  const evidence = await db
    .select({
      evidence: wineFactEvidence,
      wine: wines,
      winerySlug: wineriesTable.slug,
    })
    .from(wineFactEvidence)
    .innerJoin(wines, eq(wines.id, wineFactEvidence.wineId))
    .leftJoin(wineriesTable, eq(wineriesTable.id, wines.wineryId));
  const duplicateRows = await libsqlClient.execute(`
    SELECT COUNT(*) AS count
    FROM (
      SELECT wine_id, field, source_hash
      FROM wine_fact_evidence
      GROUP BY wine_id, field, source_hash
      HAVING COUNT(*) > 1
    )
  `);
  const audit: PersistedEvidenceAudit = {
    rows: evidence.length,
    duplicates: Number(duplicateRows.rows[0]?.count ?? 0),
    nullHashes: 0,
    missingUrls: 0,
    missingExcerpts: 0,
    missingIdentity: 0,
    missingVintage: 0,
    retailerEvidence: 0,
    invalidDocuments: 0,
    legacyEvidence: 0,
    revalidation: {
      MATCH: 0,
      CONFLICT: 0,
      STALE_SOURCE: 0,
      SOURCE_UNAVAILABLE: 0,
    },
    distribution: [],
  };
  const distribution = new Map<string, number>();

  for (const row of evidence) {
    const claim = row.evidence;
    if (!claim.sourceHash?.trim()) audit.nullHashes += 1;
    if (!claim.sourceUrl?.trim()) audit.missingUrls += 1;
    if (!claim.excerpt?.trim()) audit.missingExcerpts += 1;
    if (!claim.sourceWineName?.trim()) audit.missingIdentity += 1;
    if (row.wine.vintage != null && claim.sourceVintage == null) {
      audit.missingVintage += 1;
    }
    if (
      claim.sourceType === "retailer" ||
      claim.sourceType === "marketplace" ||
      claim.sourceType === "unknown"
    ) {
      audit.retailerEvidence += 1;
    }
    if (
      /privacy|confidentialitate|cookie|terms|termeni|gdpr|policy/i.test(
        claim.sourceUrl ?? "",
      )
    ) {
      audit.invalidDocuments += 1;
    }
    if (claim.extractionMethod === "legacy_producer_fact") {
      audit.legacyEvidence += 1;
    }

    const field = claim.field as QualifiedTechField;
    const current = FIELD_NAMES.includes(field)
      ? currentFieldValue(row.wine, field)
      : null;
    const value = Array.isArray(claim.valueJson)
      ? (claim.valueJson[0] ?? null)
      : claim.valueJson;
    if (!claim.sourceUrl) {
      audit.revalidation.SOURCE_UNAVAILABLE += 1;
    } else if (
      current != null &&
      value != null &&
      techValuesEqual(field, current, value)
    ) {
      audit.revalidation.MATCH += 1;
    } else {
      audit.revalidation.CONFLICT += 1;
    }

    const key = `${row.winerySlug ?? "unknown"}|${claim.field}|${claim.sourceType}`;
    distribution.set(key, (distribution.get(key) ?? 0) + 1);
  }
  audit.distribution = [...distribution.entries()].map(([key, rows]) => {
    const [winery, field, sourceType] = key.split("|");
    return { winery: winery!, field: field!, sourceType: sourceType!, rows };
  });
  return audit;
}

