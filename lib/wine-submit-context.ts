import {
  AFFILIATE_SOURCE_BADGE,
  COMMUNITY_SOURCE_BADGE,
  type WineSubmissionStatus,
  type WineSubmitType,
} from "@/lib/schema";

export interface WineSubmitContext {
  submitType: WineSubmitType;
  initialStatus: WineSubmissionStatus;
  sourceBadge: string;
  /** Normalized URL stored in DB (`trusted` stripped when present). */
  sourceUrl: string;
}

function normalizeStoredSourceUrl(url: URL): string {
  url.hash = "";
  let normalized = url.toString();
  if (normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

export function isAffiliateSourceUrl(rawUrl: string): boolean {
  const lower = rawUrl.toLowerCase();
  if (lower.includes("profitshare.ro")) return true;

  try {
    const withProtocol = rawUrl.trim().startsWith("http")
      ? rawUrl.trim()
      : `https://${rawUrl.trim()}`;
    return new URL(withProtocol).searchParams.get("trusted") === "true";
  } catch {
    return false;
  }
}

/**
 * Affiliate (Profitshare / ?trusted=true): verified catalog entry, light trust path.
 * Community: user_submitted, requires admin approval.
 */
export function resolveWineSubmitContext(rawUrl: string): WineSubmitContext {
  const withProtocol = rawUrl.trim().startsWith("http")
    ? rawUrl.trim()
    : `https://${rawUrl.trim()}`;
  const url = new URL(withProtocol);

  const isTrustedParam = url.searchParams.get("trusted") === "true";
  const isProfitshare = url.href.toLowerCase().includes("profitshare.ro");
  const submitType: WineSubmitType =
    isProfitshare || isTrustedParam ? "affiliate" : "community";

  if (isTrustedParam) {
    url.searchParams.delete("trusted");
  }

  const sourceUrl = normalizeStoredSourceUrl(url);

  if (submitType === "affiliate") {
    return {
      submitType,
      initialStatus: "verified",
      sourceBadge: AFFILIATE_SOURCE_BADGE,
      sourceUrl,
    };
  }

  return {
    submitType,
    initialStatus: "user_submitted",
    sourceBadge: COMMUNITY_SOURCE_BADGE,
    sourceUrl,
  };
}
