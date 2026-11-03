import type { CompletenessReport, WineClaim } from "@/lib/intelligence/types";

export interface ReleaseGateCheck {
  id: string;
  label: string;
  status: "PASS" | "FAIL";
  detail: string;
}

export interface ReleaseGateReport {
  generatedAt: string;
  checks: ReleaseGateCheck[];
  passed: boolean;
}

export interface QualityReleaseInput {
  targetVariantKey: string | null;
  expectedVariantKey: string;
  claims: WineClaim[];
  completeness: CompletenessReport;
  jsonLd: string;
  roUnavailableLabel: string;
  enUnavailableLabel: string;
  hasQualifiedProfitshareOffer: boolean;
}

export function runQualityReleaseGate(
  input: QualityReleaseInput,
  now = new Date(),
): ReleaseGateReport {
  const checks: ReleaseGateCheck[] = [];
  const add = (
    id: string,
    label: string,
    passed: boolean,
    detail: string,
  ) => checks.push({ id, label, status: passed ? "PASS" : "FAIL", detail });

  add(
    "exact-product-identity",
    "Exact product identity",
    input.targetVariantKey === input.expectedVariantKey,
    `expected ${input.expectedVariantKey}, got ${input.targetVariantKey ?? "none"}`,
  );

  const sourceBacked = input.claims.every(
    (claim) =>
      Boolean(claim.sourceUrl) &&
      Boolean(claim.excerpt.trim()) &&
      claim.identityMatchStatus !== "PRODUCT_MISMATCH",
  );
  add(
    "source-backed-facts",
    "Every claim has source, excerpt and non-conflicting identity",
    sourceBacked && input.claims.length > 0,
    `${input.claims.length} claims checked`,
  );

  add(
    "public-completeness",
    "Public factual completeness",
    input.completeness.scorePercent >= 90,
    `${input.completeness.scorePercent}%`,
  );

  const noPriceClaims = input.claims.every(
    (claim) => claim.field !== ("price" as WineClaim["field"]),
  );
  const noOffersWithoutAffiliate =
    input.hasQualifiedProfitshareOffer || !/"offers"\s*:/.test(input.jsonLd);
  add(
    "profitshare-only-pricing",
    "Profitshare-only public pricing",
    noPriceClaims && noOffersWithoutAffiliate,
    input.hasQualifiedProfitshareOffer
      ? "qualified affiliate offer present"
      : "no qualified offer and JSON-LD contains no offers",
  );

  const normalizedRo = input.roUnavailableLabel
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  add(
    "ro-en-rendering",
    "RO/EN unavailable labels",
    normalizedRo === "pret indisponibil" &&
      input.enUnavailableLabel === "Price unavailable",
    `${input.roUnavailableLabel} / ${input.enUnavailableLabel}`,
  );

  add(
    "seo-structured-data",
    "Structured data does not leak unavailable prices",
    !/"price"\s*:/.test(input.jsonLd) || input.hasQualifiedProfitshareOffer,
    "checked price keys in Product JSON-LD",
  );

  return {
    generatedAt: now.toISOString(),
    checks,
    passed: checks.every((check) => check.status === "PASS"),
  };
}
