/**
 * Prompt 14 eligibility. QUALIFIED_* only when source identity is independently proven.
 */
import { isOfficialProducerSource } from "@/lib/source-trust";
import { officialExact } from "@/lib/tech-facts/reconcile";
import type { FieldRecoveryResult, ProvenanceQualification, TechFactClaim } from "@/lib/tech-facts/types";

function reasonsFor(claim: TechFactClaim, result: FieldRecoveryResult): string[] {
  return [
    `sourceType=${claim.sourceType}`,
    `sourceWineName=${claim.sourceWineName ?? "missing"}`,
    `sourceVintage=${claim.sourceVintage ?? "missing"}`,
    `identity=${claim.identityMatchClass}`,
    `nameClass=${claim.sourceNameClass ?? "n/a"}`,
    `vintageClass=${claim.sourceVintageClass ?? "n/a"}`,
    `excerpt=${claim.excerpt.slice(0, 80)}`,
    `stored=${String(result.stored)}`,
    `candidate=${String(result.candidate)}`,
  ];
}

export function qualifyField(result: FieldRecoveryResult): FieldRecoveryResult {
  const live = result.claims.filter(
    (claim) => claim.extractionMethod !== "legacy_producer_fact",
  );
  const legacy = result.claims.filter(
    (claim) => claim.extractionMethod === "legacy_producer_fact",
  );

  if (result.candidateClass === "SOURCE_CONFLICT" || result.storedClass === "OFFICIAL_CONFLICT") {
    if (result.stored != null && result.candidate != null && result.storedClass === "OFFICIAL_CONFLICT") {
      return {
        ...result,
        qualification: "HUMAN_REVIEW_VALUE_CONFLICT",
        qualificationReasons: ["Stored value conflicts with official source. Do not auto-fix."],
        safeAutomatic: false,
        action: "HUMAN_REVIEW",
      };
    }
    return {
      ...result,
      qualification: "SOURCE_CONFLICT",
      qualificationReasons: ["Two official sources disagree."],
      safeAutomatic: false,
    };
  }

  const exact = live.filter(
    (claim) =>
      officialExact(claim) &&
      claim.sourceNameClass === "SOURCE_NAME_EXACT" &&
      (claim.sourceVintageClass === "SOURCE_VINTAGE_EXPLICIT" ||
        claim.identityMatchClass === "EXACT_WINE_EXACT_VINTAGE"),
  );

  if (exact.length >= 2 && result.candidateClass === "SAFE_CORROBORATED") {
    return {
      ...result,
      qualification: "QUALIFIED_CORROBORATED",
      qualificationReasons: reasonsFor(exact[0]!, result),
    };
  }

  if (exact.length >= 1 && (result.candidateClass === "SAFE_EXACT" || result.candidateClass === "SAFE_CORROBORATED")) {
    const qualification: ProvenanceQualification =
      result.stored != null && result.action === "HUMAN_REVIEW"
        ? "HUMAN_REVIEW_VALUE_CONFLICT"
        : "QUALIFIED_EXACT";
    return {
      ...result,
      qualification,
      qualificationReasons: reasonsFor(exact[0]!, result),
      safeAutomatic: qualification === "QUALIFIED_EXACT",
    };
  }

  if (result.candidateClass === "DIFFERENT_VINTAGE") {
    return { ...result, qualification: "DIFFERENT_VINTAGE", qualificationReasons: ["Source vintage differs from DB."] };
  }
  if (result.candidateClass === "PRODUCT_CONFLICT") {
    return { ...result, qualification: "AMBIGUOUS_PRODUCT", qualificationReasons: ["Product identity mismatch."] };
  }
  if (result.candidateClass === "RETAILER_ONLY") {
    return { ...result, qualification: "RETAILER_ONLY", qualificationReasons: ["Retailer/marketplace only."] };
  }
  if (live.some((claim) => claim.identityMatchClass === "SOURCE_IDENTITY_INCOMPLETE")) {
    return { ...result, qualification: "SOURCE_IDENTITY_MISSING", qualificationReasons: ["Source did not identify the product."] };
  }
  if (live.some((claim) => claim.sourceVintageClass === "SOURCE_VINTAGE_MISSING" || claim.identityMatchClass === "EXACT_WINE_UNDATED_SOURCE")) {
    return { ...result, qualification: "SOURCE_VINTAGE_MISSING", qualificationReasons: ["Vintage wine with undated official source."] };
  }
  if (legacy.length > 0 && exact.length === 0) {
    return {
      ...result,
      qualification: "LEGACY_ONLY",
      qualificationReasons: ["producerContent.facts was not replayed from the live source."],
      action: result.action === "EVIDENCE_ATTACH" ? "NONE" : result.action,
      safeAutomatic: false,
    };
  }
  if (result.stored != null && live.length === 0) {
    return {
      ...result,
      qualification: "UNVERIFIABLE_STORED_FACT",
      qualificationReasons: ["Stored value has no replayable official excerpt."],
    };
  }
  return {
    ...result,
    qualification: "UNVERIFIABLE_STORED_FACT",
    qualificationReasons: ["No qualified official source."],
    safeAutomatic: false,
  };
}

export function isPrompt14Eligible(qualification: ProvenanceQualification | undefined): boolean {
  return qualification === "QUALIFIED_EXACT" || qualification === "QUALIFIED_CORROBORATED";
}

export { isOfficialProducerSource };
