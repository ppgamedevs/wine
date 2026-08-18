/**
 * Field-level reconciliation. Official conflicts stay conflicts.
 */
import {
  isOfficialProducerSource,
  sourceRank,
  type WineSourceType,
} from "@/lib/source-trust";
import type {
  FieldCandidateClass,
  FieldRecoveryResult,
  StoredFieldClass,
  TechConflictCode,
  TechFactClaim,
  TechFactField,
  WineTechRecoveryClass,
} from "@/lib/tech-facts/types";
import { TECH_CONFLICT_CODES, techValuesEqual } from "@/lib/tech-facts/types";

const NUMERIC_FIELDS: TechFactField[] = ["alcohol", "acidity", "sugar"];

function isRetailish(type: WineSourceType): boolean {
  return type === "retailer" || type === "marketplace" || type === "unknown";
}

function officialExact(claim: TechFactClaim): boolean {
  return (
    isOfficialProducerSource(claim.sourceType) &&
    claim.identityMatchClass === "EXACT_WINE_EXACT_VINTAGE" &&
    claim.extractionMethod !== "constrained_llm"
  );
}

function officialUndated(claim: TechFactClaim): boolean {
  return (
    isOfficialProducerSource(claim.sourceType) &&
    claim.identityMatchClass === "EXACT_WINE_UNDATED_SOURCE"
  );
}

function claimNumericAmbiguous(claim: TechFactClaim): boolean {
  return claim.field === "acidity" && (claim.unit == null || claim.confidence < 0.5);
}

export function isSafeAutomaticClaim(
  claim: TechFactClaim,
  wineHasVintage: boolean,
  isNonVintageWine: boolean,
): boolean {
  if (claim.identityMatchClass === "PRODUCT_MISMATCH") return false;
  if (claim.identityMatchClass === "CATALOG_LEVEL") return false;
  if (claim.identityMatchClass === "EXACT_WINE_DIFFERENT_VINTAGE") return false;
  if (claimNumericAmbiguous(claim)) return false;
  if (isRetailish(claim.sourceType)) return false;
  if (!isOfficialProducerSource(claim.sourceType)) return false;
  if (wineHasVintage && claim.identityMatchClass === "EXACT_WINE_UNDATED_SOURCE") {
    return false;
  }
  if (
    !wineHasVintage &&
    isNonVintageWine &&
    officialUndated(claim) &&
    claim.identityMatchClass === "EXACT_WINE_UNDATED_SOURCE"
  ) {
    return true;
  }
  return officialExact(claim);
}

function conflictCodeFor(field: TechFactField): TechConflictCode {
  if (field === "alcohol") return TECH_CONFLICT_CODES.TECH_ALCOHOL_CONFLICT;
  if (field === "acidity") return TECH_CONFLICT_CODES.TECH_ACIDITY_CONFLICT;
  if (field === "sugar") return TECH_CONFLICT_CODES.TECH_SUGAR_CONFLICT;
  if (field === "sweetness") return TECH_CONFLICT_CODES.TECH_SWEETNESS_CONFLICT;
  return TECH_CONFLICT_CODES.TECH_VINTAGE_SOURCE_MISMATCH;
}

export function reconcileField(input: {
  field: TechFactField;
  stored: string | number | null;
  claims: TechFactClaim[];
  wineHasVintage: boolean;
  isNonVintageWine: boolean;
}): FieldRecoveryResult {
  const claims = input.claims.filter((claim) => claim.field === input.field);
  const official = claims.filter((claim) => isOfficialProducerSource(claim.sourceType));
  const exactOfficial = official.filter(
    (claim) =>
      claim.identityMatchClass === "EXACT_WINE_EXACT_VINTAGE" ||
      (!input.wineHasVintage &&
        input.isNonVintageWine &&
        claim.identityMatchClass === "EXACT_WINE_UNDATED_SOURCE"),
  );
  const undated = official.filter(
    (claim) => claim.identityMatchClass === "EXACT_WINE_UNDATED_SOURCE",
  );
  const differentVintage = claims.filter(
    (claim) => claim.identityMatchClass === "EXACT_WINE_DIFFERENT_VINTAGE",
  );
  const productConflict = claims.filter(
    (claim) => claim.identityMatchClass === "PRODUCT_MISMATCH",
  );
  const ambiguous = claims.filter(claimNumericAmbiguous);
  const retailerOnly =
    claims.length > 0 &&
    claims.every((claim) => isRetailish(claim.sourceType));

  if (productConflict.length > 0 && exactOfficial.length === 0) {
    return result(input, claims, "PRODUCT_CONFLICT", storedClass(input, null), null, "HUMAN_REVIEW", false, TECH_CONFLICT_CODES.TECH_PRODUCT_IDENTITY_MISMATCH);
  }
  if (ambiguous.length > 0 && exactOfficial.length === 0) {
    return result(input, claims, "UNIT_AMBIGUOUS", storedClass(input, null), null, "HUMAN_REVIEW", false, TECH_CONFLICT_CODES.TECH_UNIT_AMBIGUOUS);
  }
  if (differentVintage.length > 0 && exactOfficial.length === 0) {
    return result(
      input,
      claims,
      "DIFFERENT_VINTAGE",
      input.stored != null ? "DIFFERENT_VINTAGE_SOURCE" : "NO_RECOVERABLE_SOURCE",
      null,
      "HUMAN_REVIEW",
      false,
      TECH_CONFLICT_CODES.TECH_VINTAGE_SOURCE_MISMATCH,
    );
  }

  const exactValues = uniqueValues(input.field, exactOfficial);
  if (exactValues.length > 1) {
    return result(
      input,
      claims,
      "SOURCE_CONFLICT",
      input.stored != null ? "OFFICIAL_CONFLICT" : "NO_RECOVERABLE_SOURCE",
      null,
      "HUMAN_REVIEW",
      false,
      conflictCodeFor(input.field),
    );
  }

  if (exactValues.length === 1) {
    const candidate = exactValues[0] ?? null;
    const corroborated = exactOfficial.length >= 2;
    const candidateClass: FieldCandidateClass = corroborated
      ? "SAFE_CORROBORATED"
      : "SAFE_EXACT";
    const match = techValuesEqual(input.field, input.stored, candidate);
    return {
      field: input.field,
      stored: input.stored,
      candidate,
      candidateClass,
      storedClass: match
        ? "VERIFIED_MATCH"
        : input.stored != null
          ? "OFFICIAL_CONFLICT"
          : "NO_RECOVERABLE_SOURCE",
      action: match
        ? "EVIDENCE_ATTACH"
        : input.stored != null
          ? "HUMAN_REVIEW"
          : "VALUE_WRITE",
      safeAutomatic: input.stored == null || match,
      claims,
      conflictCode: match || input.stored == null ? undefined : conflictCodeFor(input.field),
    };
  }

  if (input.wineHasVintage && undated.length > 0) {
    const undatedValues = uniqueValues(input.field, undated);
    return result(
      input,
      claims,
      "PROVISIONAL_UNDATED",
      input.stored != null ? "UNSOURCED_STORED" : "NO_RECOVERABLE_SOURCE",
      undatedValues.length === 1 ? undatedValues[0] ?? null : null,
      "NONE",
      false,
      TECH_CONFLICT_CODES.TECH_SOURCE_STALE_OR_UNDATED,
    );
  }

  if (retailerOnly) {
    return result(
      input,
      claims,
      "RETAILER_ONLY",
      input.stored != null ? "UNSOURCED_STORED" : "NO_RECOVERABLE_SOURCE",
      null,
      "NONE",
      false,
    );
  }

  if (claims.length === 0) {
    return result(
      input,
      claims,
      "NOT_FOUND",
      input.stored != null ? "UNSOURCED_STORED" : "NO_RECOVERABLE_SOURCE",
      null,
      "NONE",
      false,
      input.stored != null ? TECH_CONFLICT_CODES.TECH_EXISTING_VALUE_UNSOURCED : undefined,
    );
  }

  const ranked = [...official, ...claims].sort(
    (left, right) => sourceRank(right.sourceType) - sourceRank(left.sourceType),
  );
  return result(
    input,
    claims,
    "NOT_FOUND",
    input.stored != null ? "UNSOURCED_STORED" : "NO_RECOVERABLE_SOURCE",
    ranked[0] ? asScalar(ranked[0].value) : null,
    "NONE",
    false,
  );
}

function uniqueValues(
  field: TechFactField,
  claims: TechFactClaim[],
): Array<string | number> {
  const values: Array<string | number> = [];
  for (const claim of claims) {
    const value = asScalar(claim.value);
    if (value == null) continue;
    if (!values.some((existing) => techValuesEqual(field, existing, value))) {
      values.push(value);
    }
  }
  return values;
}

function asScalar(value: string | number | string[]): string | number | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function storedClass(
  input: { stored: string | number | null },
  candidate: string | number | null,
): StoredFieldClass {
  if (input.stored == null) return "NO_RECOVERABLE_SOURCE";
  if (candidate != null) return "VERIFIED_MATCH";
  return "UNSOURCED_STORED";
}

function result(
  input: {
    field: TechFactField;
    stored: string | number | null;
  },
  claims: TechFactClaim[],
  candidateClass: FieldCandidateClass,
  storedClassValue: StoredFieldClass,
  candidate: string | number | null,
  action: FieldRecoveryResult["action"],
  safeAutomatic: boolean,
  conflictCode?: TechConflictCode,
): FieldRecoveryResult {
  return {
    field: input.field,
    stored: input.stored,
    candidate,
    candidateClass,
    storedClass: storedClassValue,
    action,
    safeAutomatic,
    claims,
    conflictCode,
  };
}

export function classifyWineRecovery(
  fields: FieldRecoveryResult[],
): WineTechRecoveryClass {
  const core = fields.filter((field) =>
    ["alcohol", "acidity", "sugar", "sweetness"].includes(field.field),
  );
  if (core.some((field) => field.candidateClass === "SOURCE_CONFLICT")) {
    return "SOURCE_CONFLICT";
  }
  if (
    core.some(
      (field) =>
        field.action === "HUMAN_REVIEW" ||
        field.candidateClass === "PRODUCT_CONFLICT" ||
        field.candidateClass === "UNIT_AMBIGUOUS",
    )
  ) {
    return "HUMAN_REVIEW";
  }
  const recovered = core.filter((field) => field.safeAutomatic && field.candidate != null);
  if (recovered.length === core.length) return "FULLY_RECOVERABLE";
  if (recovered.length > 0) return "PARTIALLY_RECOVERABLE";
  if (core.every((field) => field.candidateClass === "NOT_FOUND")) return "NO_TECH_SOURCE";
  return "PARTIALLY_RECOVERABLE";
}

export function safeAutomaticValue(
  field: FieldRecoveryResult,
): string | number | null {
  if (!field.safeAutomatic) return null;
  if (field.candidateClass !== "SAFE_EXACT" && field.candidateClass !== "SAFE_CORROBORATED") {
    return null;
  }
  return field.candidate;
}

export { NUMERIC_FIELDS };
