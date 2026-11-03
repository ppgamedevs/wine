import type {
  WineClaim,
  WineClaimVerificationStatus,
  WineSourceClass,
} from "@/lib/intelligence/types";
import { sourceHost } from "@/lib/intelligence/types";

/** Automatic publication is only allowed for an exact bottle identity. */
export const AUTOMATIC_IDENTITY_MATCHES = new Set([
  "EXACT_WINE_EXACT_VINTAGE",
  "EXACT_WINE_UNDATED_SOURCE",
]);

export const OFFICIAL_SOURCE_CLASSES = new Set<WineSourceClass>([
  "official_technical_sheet",
  "official_producer_page",
  "official_catalog",
  "producer_general",
]);

export const VERIFICATION_TRUST: Record<WineClaimVerificationStatus, number> = {
  verified_official: 6,
  corroborated: 5,
  attributed_specialist: 4,
  attributed_editorial: 3,
  attributed_retailer: 2,
  unverified: 1,
  conflict: 0,
  identity_mismatch: -1,
};

export function isRejectedIdentity(claim: WineClaim): boolean {
  return !AUTOMATIC_IDENTITY_MATCHES.has(claim.identityMatchStatus);
}

export function rejectionReason(claim: WineClaim): string | null {
  if (!AUTOMATIC_IDENTITY_MATCHES.has(claim.identityMatchStatus)) {
    if (claim.identityMatchStatus === "LIKELY_WINE") return "manual_review_LIKELY_WINE";
    if (claim.identityMatchStatus === "PRODUCT_MISMATCH") return "rejected_PRODUCT_MISMATCH";
    return `identity_${claim.identityMatchStatus}`;
  }
  if (!/^https?:\/\//i.test(claim.sourceUrl)) return "missing_http_source";
  if (!claim.excerpt.trim()) return "missing_excerpt";
  return null;
}

/**
 * Verification is a property of one source claim. It must never be copied from
 * the reconciled field winner, because the winner can come from another source.
 */
export function verificationForClaim(
  claim: WineClaim,
  fieldClaims: WineClaim[],
): WineClaimVerificationStatus {
  if (rejectionReason(claim) != null) return "unverified";

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
