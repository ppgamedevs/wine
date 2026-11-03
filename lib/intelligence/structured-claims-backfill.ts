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

/**
 * Automatic backfill is only safe for an exact bottle identity. LIKELY_WINE is
 * intentionally excluded: it must be reviewed by a human before publication.
 */
const AUTOMATIC_IDENTITY_MATCHES = new Set([
  "EXACT_WINE_EXACT_VINTAGE",
  "EXACT_WINE_UNDATED_SOURCE",
]);

const OFFICIAL_SOURCE_CLASSES = new Set([
  "official_technical_sheet",
  "official_producer_page",
  "official_catalog",
  "producer_general",
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

function sourceHost(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Verification belongs to the individual source claim, not to the reconciled
 * field. A retailer claim stays attributed even when another source supplied the
 * preferred reconciled value.
 */
export function verificationForStructuredClaim(
  claim: WineClaim,
  fieldClaims: WineClaim[],
): string {
  if (!AUTOMATIC_IDENTITY_MATCHES.has(claim.identityMatchStatus)) {
    return "unverified";
  }
  if (!claim.excerpt.trim()) return "unverified";

  if (OFFICIAL_SOURCE_CLASSES.has(claim.sourceClass)) {
    const corroboratingHosts = new Set(
      fieldClaims
        .filter(
          (candidate) =>
            candidate !== claim &&
            OFFICIAL_SOURCE_CLASSES.has(candidate.sourceClass) &&
            AUTOMATIC_IDENTITY_MATCHES.has(candidate.identityMatchStatus) &&
            candidate.excerpt.trim().length > 0 &&
            candidate.normalizedValue === claim.normalizedValue &&
            sourceHost(candidate.sourceUrl) !== sourceHost(claim.sourceUrl),
        )
        .map((candidate) => sourceHost(candidate.sourceUrl)),
    );
    return corroboratingHosts.size > 0 ? "corroborated" : "verified_official";
  }
  if (claim.sourceClass === "specialist") return "attributed_specialist";
  if (claim.sourceClass === "editorial") return "attributed_editorial";
  if (claim.sourceClass === "retailer") return "attributed_retailer";
  return "unverified";
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
  const claimsByField = new Map<string, WineClaim[]>();
  for (const claim of report.claims) {
    const bucket = claimsByField.get(claim.field) ?? [];
    bucket.push(claim);
    claimsByField.set(claim.field, bucket);
  }
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
    if (!AUTOMATIC_IDENTITY_MATCHES.has(claim.identityMatchStatus)) {
      skipped.push({
        field: claim.field,
        reason:
          claim.identityMatchStatus === "LIKELY_WINE"
            ? "manual_review_LIKELY_WINE"
            : `identity_${claim.identityMatchStatus}`,
        sourceUrl: claim.sourceUrl,
      });
      continue;
    }
    if (!claim.excerpt.trim()) {
      skipped.push({
        field: claim.field,
        reason: "missing_excerpt",
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
      verificationStatus: verificationForStructuredClaim(
        claim,
        claimsByField.get(claim.field) ?? [],
      ),
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
