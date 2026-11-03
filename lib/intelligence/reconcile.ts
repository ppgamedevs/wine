import type {
  ClaimConflict,
  ClaimValue,
  CompletenessReport,
  IntelligenceField,
  ReconciledClaim,
  WineClaim,
  WineClaimVerificationStatus,
  WineSourceClass,
} from "@/lib/intelligence/types";
import {
  ALL_INTELLIGENCE_FIELDS,
  INTELLIGENCE_FIELD_GROUPS,
  REQUIRED_FIELDS,
} from "@/lib/intelligence/types";
import { sourceHost } from "@/lib/intelligence/types";
import { OFFICIAL_SOURCE_CLASSES } from "@/lib/intelligence/claim-verification";

const SOURCE_RANK: Record<WineSourceClass, number> = {
  existing_record: 100,
  official_technical_sheet: 95,
  official_producer_page: 90,
  official_catalog: 85,
  producer_general: 60,
  specialist: 55,
  editorial: 45,
  education: 35,
  retailer: 30,
  unknown: 0,
};

const OFFICIAL = OFFICIAL_SOURCE_CLASSES;

function isUsableIdentity(claim: WineClaim): boolean {
  return (
    claim.identityMatchStatus === "EXACT_WINE_EXACT_VINTAGE" ||
    claim.identityMatchStatus === "EXACT_WINE_UNDATED_SOURCE" ||
    claim.identityMatchStatus === "LIKELY_WINE"
  );
}

function groupValues(claims: WineClaim[]): Map<string, WineClaim[]> {
  const groups = new Map<string, WineClaim[]>();
  for (const claim of claims) {
    const list = groups.get(claim.normalizedValue) ?? [];
    list.push(claim);
    groups.set(claim.normalizedValue, list);
  }
  return groups;
}

function conflictFor(
  field: IntelligenceField,
  groups: Map<string, WineClaim[]>,
): ClaimConflict | null {
  if (groups.size <= 1) return null;
  return {
    status: "conflict",
    field,
    values: [...groups.entries()].map(([value, claims]) => ({
      value,
      sources: claims.map((claim) => ({
        url: claim.sourceUrl,
        sourceClass: claim.sourceClass,
      })),
    })),
  };
}

function bestClaim(claims: WineClaim[]): WineClaim {
  return [...claims].sort((left, right) => {
    const rank = SOURCE_RANK[right.sourceClass] - SOURCE_RANK[left.sourceClass];
    if (rank !== 0) return rank;
    const confidence = right.confidence - left.confidence;
    if (confidence !== 0) return confidence;
    const url = left.sourceUrl.localeCompare(right.sourceUrl);
    if (url !== 0) return url;
    return left.claimHash.localeCompare(right.claimHash);
  })[0]!;
}

function independentOfficialHosts(claims: WineClaim[]): number {
  return new Set(
    claims
      .filter((claim) => OFFICIAL.has(claim.sourceClass))
      .map((claim) => sourceHost(claim.sourceUrl)),
  ).size;
}

function verificationFor(
  chosen: WineClaim,
  claims: WineClaim[],
): WineClaimVerificationStatus {
  if (OFFICIAL.has(chosen.sourceClass)) {
    if (independentOfficialHosts(claims) >= 2) return "corroborated";
    return "verified_official";
  }
  if (chosen.sourceClass === "retailer") return "attributed_retailer";
  if (chosen.sourceClass === "specialist") return "attributed_specialist";
  if (chosen.sourceClass === "editorial") return "attributed_editorial";
  if (chosen.sourceClass === "existing_record") return "unverified";
  return "unverified";
}

export function reconcileClaims(claims: WineClaim[]): ReconciledClaim[] {
  const byField = new Map<IntelligenceField, WineClaim[]>();
  for (const claim of claims) {
    if (!isUsableIdentity(claim)) continue;
    const list = byField.get(claim.field) ?? [];
    list.push(claim);
    byField.set(claim.field, list);
  }

  return ALL_INTELLIGENCE_FIELDS.map((field) => {
    const fieldClaims = byField.get(field) ?? [];
    if (fieldClaims.length === 0) {
      return {
        field,
        value: null,
        normalizedValue: null,
        unit: null,
        verificationStatus: "unverified",
        confidence: 0,
        sourceClass: null,
        sourceUrl: null,
        claims: [],
        conflict: null,
        selectedClaim: null,
      };
    }

    const groups = groupValues(fieldClaims);
    const conflict = conflictFor(field, groups);
    const officialClaims = fieldClaims.filter((claim) =>
      OFFICIAL.has(claim.sourceClass),
    );
    const officialConflict =
      officialClaims.length > 0 && groupValues(officialClaims).size > 1;
    const candidates = officialClaims.length > 0 ? officialClaims : fieldClaims;
    const chosen = bestClaim(candidates);
    // Official evidence wins over a retailer disagreement, but the
    // disagreement stays visible in `conflict`. Two official values that
    // disagree have no automatic winner.
    const chosenValue: ClaimValue | null = officialConflict
      ? null
      : conflict == null || officialClaims.length > 0
        ? chosen.value
        : null;

    return {
      field,
      value: chosenValue,
      normalizedValue: chosenValue == null ? null : chosen.normalizedValue,
      unit: chosenValue == null ? null : chosen.unit,
      verificationStatus:
        conflict != null
          ? "conflict"
          : verificationFor(chosen, candidates),
      confidence:
        conflict == null
          ? chosen.confidence
          : Math.max(...fieldClaims.map((claim) => claim.confidence)),
      sourceClass: chosenValue == null ? null : chosen.sourceClass,
      sourceUrl: chosenValue == null ? null : chosen.sourceUrl,
      claims: fieldClaims,
      conflict,
      selectedClaim: chosenValue == null ? null : chosen,
    };
  });
}

export function buildCompleteness(claims: WineClaim[]): CompletenessReport {
  const reconciled = reconcileClaims(claims);
  const byField = new Map(reconciled.map((item) => [item.field, item]));
  const fields = ALL_INTELLIGENCE_FIELDS.map((field) => {
    const item = byField.get(field)!;
    const present = item.value != null;
    const verified =
      present &&
      (item.verificationStatus === "verified_official" ||
        item.verificationStatus === "corroborated");
    return {
      field,
      required: REQUIRED_FIELDS.includes(field),
      present,
      verified,
      value: item.value,
      verificationStatus: item.verificationStatus,
    };
  });

  const byGroup: Record<string, { present: number; total: number; percent: number }> = {};
  for (const [group, groupFields] of Object.entries(INTELLIGENCE_FIELD_GROUPS)) {
    const rows = fields.filter((field) => groupFields.includes(field.field));
    const present = rows.filter((field) => field.present).length;
    byGroup[group] = {
      present,
      total: rows.length,
      percent: rows.length === 0 ? 0 : Math.round((present / rows.length) * 100),
    };
  }

  const required = fields.filter((field) => field.required);
  const presentRequired = required.filter((field) => field.present).length;
  return {
    wineId: claims[0]?.wineId ?? 0,
    scorePercent:
      required.length === 0
        ? 0
        : Math.round((presentRequired / required.length) * 100),
    presentCount: fields.filter((field) => field.present).length,
    requiredCount: required.length,
    missingFields: required
      .filter((field) => !field.present)
      .map((field) => field.field),
    unverifiedFields: fields
      .filter((field) => field.present && !field.verified)
      .map((field) => field.field),
    fields,
    byGroup,
  };
}

export function preferredValue(
  claims: WineClaim[],
  field: IntelligenceField,
): ClaimValue | null {
  return reconcileClaims(claims).find((item) => item.field === field)?.value ?? null;
}
