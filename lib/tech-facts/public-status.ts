/**
 * Future public display helper. Do not hide current public values in Prompt 12.
 */
import type { FieldRecoveryResult } from "@/lib/tech-facts/types";

export type TechPublicStatus = "verified" | "provisional" | "unknown" | "conflict";

export interface TechPublicFieldView {
  field: string;
  value: string | number | null;
  status: TechPublicStatus;
  labelRo: string;
}

const STATUS_LABEL: Record<TechPublicStatus, string> = {
  verified: "verificat din fisa producatorului",
  provisional: "sursa producator, vintage nedeclarat",
  unknown: "valoare neconfirmata",
  conflict: "necesita revizuire",
};

export function publicStatusForField(result: FieldRecoveryResult): TechPublicStatus {
  if (
    result.candidateClass === "SOURCE_CONFLICT" ||
    result.storedClass === "OFFICIAL_CONFLICT"
  ) {
    return "conflict";
  }
  if (result.storedClass === "VERIFIED_MATCH" || result.candidateClass === "SAFE_EXACT" || result.candidateClass === "SAFE_CORROBORATED") {
    return "verified";
  }
  if (result.candidateClass === "PROVISIONAL_UNDATED") return "provisional";
  if (result.stored != null) return "unknown";
  return "unknown";
}

export function publicTechFieldView(result: FieldRecoveryResult): TechPublicFieldView {
  const status = publicStatusForField(result);
  return {
    field: result.field,
    value: result.stored ?? result.candidate,
    status,
    labelRo: STATUS_LABEL[status],
  };
}
