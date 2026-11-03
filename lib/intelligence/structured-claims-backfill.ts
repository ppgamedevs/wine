import type {
  IntelligenceReport,
  WineClaim,
  WineClaimField,
} from "@/lib/intelligence/types";

const BACKFILL_FIELDS: WineClaimField[] = [
  "visual_appearance",
  "aroma_descriptors",
  "taste_descriptors",
  "body",
  "acidity_perception",
  "tannin_perception",
  "finish",
  "serving_temperature",
  "food_pairing",
];

const ALLOWED_IDENTITY_MATCHES = new Set([
  "EXACT_WINE_EXACT_VINTAGE",
  "EXACT_WINE_UNDATED_SOURCE",
  "LIKELY_WINE",
]);

export interface ExistingStructuredClaim {
  id: number;
  wineId: number;
  field: string;
  sourceHash: string;
  claimHash: string;
  normalizedValue: string;
  verificationStatus: string;
}

export interface StructuredClaimWrite {
  wineId: number;
  canonicalIdentityKey: string;
  field: WineClaimField;
  valueJson: WineClaim["value"];
  normalizedValue: string;
  unit: string | null;
  sourceUrl: string;
  sourceTitle: string;
  sourceClass: WineClaim["sourceClass"];
  excerpt: string;
  observedAt: string;
  extractionMethod: WineClaim["extractionMethod"];
  identityMatchStatus: WineClaim["identityMatchStatus"];
  verificationStatus: string;
  confidence: number;
  sourceHash: string;
  claimHash: string;
}

export interface StructuredClaimPlanLike {
  writes: StructuredClaimWrite[];
}

export interface StructuredBackfillPlan extends StructuredClaimPlanLike {
  wineId: number;
  dryRun: boolean;
  candidates: number;
  writes: StructuredClaimWrite[];
  alreadyPresent: number;
  existingValueConflict: number;
  skipped: Array<{ field: string; reason: string; sourceUrl: string }>;
  fields: Record<string, number>;
}

function key(wineId: number, field: string, sourceHash: string): string {
  return `${wineId}\u0000${field}\u0000${sourceHash}`;
}

function officialOrAttributed(
  report: IntelligenceReport,
  field: WineClaimField,
): string {
  return (
    report.reconciled.find((item) => item.field === field)?.verificationStatus ??
    "unverified"
  );
}

/**
 * Build a reviewable, non-destructive plan. It never converts free text into a
 * claim: every write comes from an actual V2 source claim with a URL, excerpt
 * and identity match. Existing rows are never overwritten.
 */
export function planStructuredClaims(input: {
  report: IntelligenceReport;
  existing: ExistingStructuredClaim[];
  dryRun?: boolean;
}): StructuredBackfillPlan {
  const { report } = input;
  const existingByKey = new Map(
    input.existing.map((row) => [key(row.wineId, row.field, row.sourceHash), row]),
  );
  const conflictFields = new Set(
    report.reconciled
      .filter((item) => item.conflict != null)
      .map((item) => String(item.field)),
  );
  const writes: StructuredClaimWrite[] = [];
  const skipped: StructuredBackfillPlan["skipped"] = [];
  const fields: Record<string, number> = {};
  let alreadyPresent = 0;
  let existingValueConflict = 0;

  for (const claim of report.claims) {
    if (!BACKFILL_FIELDS.includes(claim.field)) continue;
    if (!/^https?:\/\//i.test(claim.sourceUrl)) {
      skipped.push({ field: claim.field, reason: "missing_http_source", sourceUrl: claim.sourceUrl });
      continue;
    }
    if (!ALLOWED_IDENTITY_MATCHES.has(claim.identityMatchStatus)) {
      skipped.push({
        field: claim.field,
        reason: `identity_${claim.identityMatchStatus}`,
        sourceUrl: claim.sourceUrl,
      });
      continue;
    }
    if (conflictFields.has(claim.field)) {
      skipped.push({ field: claim.field, reason: "reconciled_conflict", sourceUrl: claim.sourceUrl });
      continue;
    }
    const existing = existingByKey.get(key(claim.wineId, claim.field, claim.sourceHash));
    if (existing) {
      if (existing.claimHash === claim.claimHash || existing.normalizedValue === claim.normalizedValue) {
        alreadyPresent += 1;
      } else {
        existingValueConflict += 1;
        skipped.push({
          field: claim.field,
          reason: "existing_different_value",
          sourceUrl: claim.sourceUrl,
        });
      }
      continue;
    }
    writes.push({
      wineId: claim.wineId,
      canonicalIdentityKey: claim.canonicalIdentityKey,
      field: claim.field,
      valueJson: claim.value,
      normalizedValue: claim.normalizedValue,
      unit: claim.unit,
      sourceUrl: claim.sourceUrl,
      sourceTitle: claim.sourceTitle,
      sourceClass: claim.sourceClass,
      excerpt: claim.excerpt,
      observedAt: claim.observedAt,
      extractionMethod: claim.extractionMethod,
      identityMatchStatus: claim.identityMatchStatus,
      verificationStatus: officialOrAttributed(report, claim.field),
      confidence: claim.confidence,
      sourceHash: claim.sourceHash,
      claimHash: claim.claimHash,
    });
    fields[claim.field] = (fields[claim.field] ?? 0) + 1;
  }

  return {
    wineId: report.wineId,
    dryRun: input.dryRun ?? true,
    candidates: writes.length + alreadyPresent + existingValueConflict,
    writes,
    alreadyPresent,
    existingValueConflict,
    skipped,
    fields,
  };
}
