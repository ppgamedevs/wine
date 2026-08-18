/**
 * Field-level technical evidence. Claims, not canonical wine columns.
 */
import type { WineSourceType } from "@/lib/source-trust";

export const TECH_FACT_FIELDS = [
  "alcohol",
  "acidity",
  "sugar",
  "sweetness",
  "vintage",
  "grape_varieties",
  "wine_type",
  "serving_temperature",
] as const;

export type TechFactField = (typeof TECH_FACT_FIELDS)[number];

export type TechExtractionMethod = "deterministic" | "constrained_llm" | "manual";

export type IdentityMatchClass =
  | "EXACT_WINE_EXACT_VINTAGE"
  | "EXACT_WINE_UNDATED_SOURCE"
  | "EXACT_WINE_DIFFERENT_VINTAGE"
  | "LIKELY_WINE"
  | "CATALOG_LEVEL"
  | "PRODUCT_MISMATCH";

export type FieldCandidateClass =
  | "SAFE_EXACT"
  | "SAFE_CORROBORATED"
  | "PROVISIONAL_UNDATED"
  | "DIFFERENT_VINTAGE"
  | "SOURCE_CONFLICT"
  | "PRODUCT_CONFLICT"
  | "UNIT_AMBIGUOUS"
  | "RETAILER_ONLY"
  | "NOT_FOUND";

export type StoredFieldClass =
  | "VERIFIED_MATCH"
  | "UNSOURCED_STORED"
  | "OFFICIAL_CONFLICT"
  | "DIFFERENT_VINTAGE_SOURCE"
  | "NO_RECOVERABLE_SOURCE";

export type WineTechRecoveryClass =
  | "FULLY_RECOVERABLE"
  | "PARTIALLY_RECOVERABLE"
  | "NO_TECH_SOURCE"
  | "HUMAN_REVIEW"
  | "SOURCE_CONFLICT";

export type PdfDocumentClass =
  | "WINE_TASTING_SHEET"
  | "WINE_TECHNICAL_SHEET"
  | "PRIVACY_POLICY"
  | "TERMS"
  | "CATALOG_GENERIC"
  | "MARKETING_BROCHURE"
  | "UNKNOWN_DOCUMENT";

export const TECH_CONFLICT_CODES = {
  TECH_ALCOHOL_CONFLICT: "TECH_ALCOHOL_CONFLICT",
  TECH_ACIDITY_CONFLICT: "TECH_ACIDITY_CONFLICT",
  TECH_SUGAR_CONFLICT: "TECH_SUGAR_CONFLICT",
  TECH_SWEETNESS_CONFLICT: "TECH_SWEETNESS_CONFLICT",
  TECH_VINTAGE_SOURCE_MISMATCH: "TECH_VINTAGE_SOURCE_MISMATCH",
  TECH_PRODUCT_IDENTITY_MISMATCH: "TECH_PRODUCT_IDENTITY_MISMATCH",
  TECH_UNIT_AMBIGUOUS: "TECH_UNIT_AMBIGUOUS",
  TECH_WRONG_PDF_DOCUMENT: "TECH_WRONG_PDF_DOCUMENT",
  TECH_EXISTING_VALUE_UNSOURCED: "TECH_EXISTING_VALUE_UNSOURCED",
  TECH_FIELD_PROVENANCE_MISSING: "TECH_FIELD_PROVENANCE_MISSING",
  TECH_SOURCE_STALE_OR_UNDATED: "TECH_SOURCE_STALE_OR_UNDATED",
  TECH_VALUE_OUT_OF_RANGE: "TECH_VALUE_OUT_OF_RANGE",
} as const;

export type TechConflictCode =
  (typeof TECH_CONFLICT_CODES)[keyof typeof TECH_CONFLICT_CODES];

export interface TechFactClaim {
  field: TechFactField;
  value: string | number | string[];
  unit: string | null;
  sourceUrl: string | null;
  sourceType: WineSourceType;
  sourceWineName: string | null;
  sourceVintage: number | null;
  sourceDocumentTitle: string | null;
  excerpt: string;
  extractionMethod: TechExtractionMethod;
  identityMatchClass: IdentityMatchClass;
  confidence: number;
  observedAt: string;
  sourceHash: string;
}

export interface FieldRecoveryResult {
  field: TechFactField;
  stored: string | number | null;
  candidate: string | number | null;
  candidateClass: FieldCandidateClass;
  storedClass: StoredFieldClass;
  action: "VALUE_WRITE" | "EVIDENCE_ATTACH" | "NONE" | "HUMAN_REVIEW";
  safeAutomatic: boolean;
  claims: TechFactClaim[];
  conflictCode?: TechConflictCode;
}

export function techValuesEqual(
  field: TechFactField,
  left: string | number | null,
  right: string | number | null,
): boolean {
  if (left == null || right == null) return false;
  if (typeof left === "string" || typeof right === "string") {
    return String(left).trim().toLowerCase() === String(right).trim().toLowerCase();
  }
  const delta = Math.abs(left - right);
  if (field === "alcohol") return delta < 0.05;
  if (field === "acidity" || field === "sugar") return delta < 0.05;
  if (field === "vintage") return left === right;
  return delta < 0.05;
}
