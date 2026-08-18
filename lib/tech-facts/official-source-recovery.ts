/**
 * Prompt 16 official-source qualification model.
 *
 * This module is deliberately pure. It classifies discovery results and never
 * writes wine rows, source URLs, evidence, scores, pairings, or editorial data.
 */
import { classifySourceName, type SourceWineIdentity } from "@/lib/tech-facts/source-identity";
import { techValuesEqual, type PdfDocumentClass, type TechFactClaim } from "@/lib/tech-facts/types";
import type { SourceFetchAttempt, FetchedSource } from "@/lib/tech-facts/fetch-source";
import type { RecoverableWine, WineTechRecovery } from "@/lib/tech-facts/recover";
import { classifySourceUrl, isOfficialProducerSource } from "@/lib/source-trust";

export type OfficialSourcePurpose =
  | "producer_page"
  | "tasting_sheet"
  | "technical_document";

export type OfficialSourceDiscoveryMethod =
  | "stored_producer_page"
  | "stored_tasting_sheet"
  | "stored_producer_content"
  | "product_page_link"
  | "official_catalog"
  | "official_sitemap"
  | "official_media_api"
  | "producer_specific_parser";

export type OfficialSourceIdentityStatus =
  | "VALID_EXACT_VINTAGE"
  | "VALID_EXACT_PRODUCT_UNDATED"
  | "VALID_NON_VINTAGE_PRODUCT"
  | "VALID_EXACT_CATALOG_BLOCK"
  | "WRONG_PRODUCT"
  | "WRONG_VINTAGE"
  | "AMBIGUOUS_PRODUCT"
  | "GENERIC_CATALOG"
  | "GENERIC_WINERY_PAGE"
  | "NO_OFFICIAL_SOURCE_FOUND";

export type OfficialSourceDocumentStatus =
  | "VALID_PRODUCT_PAGE"
  | "VALID_TECHNICAL_DOCUMENT"
  | "WRONG_DOCUMENT"
  | "GENERIC_DOCUMENT"
  | "UNKNOWN_DOCUMENT";

export type OfficialSourceHealthStatus =
  | OfficialSourceIdentityStatus
  | "WRONG_DOCUMENT"
  | "DEAD_404"
  | "FETCH_BLOCKED"
  | "SERVER_ERROR"
  | "TEMP_ERROR"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "REDIRECTED_DIFFERENT_PRODUCT"
  | "INVALID_CONTENT_TYPE";

export type TechnicalRecoveryClassification =
  | "QUALIFIED_MATCH_EXISTING"
  | "SAFE_NEW_VALUE"
  | "OFFICIAL_CONFLICT"
  | "PROVISIONAL_UNDATED"
  | "DIFFERENT_VINTAGE"
  | "AMBIGUOUS_PRODUCT"
  | "UNIT_AMBIGUOUS"
  | "NOT_FOUND";

export type SourceCleanupAction =
  | "NO_CHANGE"
  | "CLEAR_PRODUCER_PAGE"
  | "REPLACE_PRODUCER_PAGE"
  | "CLEAR_TASTING_SHEET"
  | "REPLACE_TASTING_SHEET"
  | "HUMAN_REVIEW";

export type SourceDriftStatus =
  | "UNCHANGED"
  | "NON_MATERIAL_PAGE_CHANGE"
  | "VALUE_CHANGED"
  | "VINTAGE_ROLLED_FORWARD"
  | "PRODUCT_CHANGED"
  | "IDENTITY_CHANGED";

export interface OfficialTechnicalClaimCandidate {
  field: "alcohol" | "acidity" | "sugar" | "sweetness" | "vintage";
  value: string | number;
  unit: string | null;
  excerpt: string;
  sourceVintage: number | null;
  classification: TechnicalRecoveryClassification;
  reasons: string[];
}

export interface OfficialWineSourceCandidate {
  wineId: number;
  slug: string;
  winery: string | null;
  purpose: OfficialSourcePurpose;
  url: string;
  discoveryMethod: OfficialSourceDiscoveryMethod;
  httpStatus: number | null;
  contentType: string | null;
  redirectedFrom: string | null;
  finalUrl: string | null;
  sourceTitle: string | null;
  sourceWineName: string | null;
  sourceVintage: number | null;
  sourceSku: string | null;
  sourceProductId: number | null;
  sourceLine: string | null;
  sourceColor: string | null;
  sourceSweetness: string | null;
  sourceGrapes: string[];
  sourceBottleSize: number | null;
  identityStatus: OfficialSourceIdentityStatus;
  documentStatus: OfficialSourceDocumentStatus;
  healthStatus: OfficialSourceHealthStatus;
  technicalClaims: OfficialTechnicalClaimCandidate[];
  confidence: number;
  reasons: string[];
  proposedAction: SourceCleanupAction;
  replacementUrl: string | null;
}

export interface StoredSourceDescriptor {
  url: string;
  purpose: OfficialSourcePurpose;
  discoveryMethod: OfficialSourceDiscoveryMethod;
}

const GENERIC_PATH = /^\/?(?:|vinuri|catalog|magazin|shop|produse)\/?$/i;

function normalizedWords(value: string): Set<string> {
  return new Set(
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean),
  );
}

function hasSweetnessConflict(dbName: string, sourceName: string): boolean {
  const levels = ["demidulce", "demisec", "dulce", "sec"];
  const left = normalizedWords(dbName);
  const right = normalizedWords(sourceName);
  const leftLevel = levels.find((level) => left.has(level));
  const rightLevel = levels.find((level) => right.has(level));
  return Boolean(leftLevel && rightLevel && leftLevel !== rightLevel);
}

function isGenericFinalUrl(url: string | null): boolean {
  if (!url) return false;
  try {
    return GENERIC_PATH.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

export function storedSourceDescriptors(wine: RecoverableWine): StoredSourceDescriptor[] {
  const rows: StoredSourceDescriptor[] = [];
  const seen = new Set<string>();
  const push = (url: string | null | undefined, purpose: OfficialSourcePurpose, discoveryMethod: OfficialSourceDiscoveryMethod) => {
    const value = url?.trim();
    if (!value || seen.has(value)) return;
    seen.add(value);
    rows.push({ url: value, purpose, discoveryMethod });
  };
  push(wine.tastingSheetUrl, "tasting_sheet", "stored_tasting_sheet");
  push(wine.producerPageUrl, "producer_page", "stored_producer_page");
  for (const url of wine.producerContent?.sourceUrls ?? []) {
    const sourceType = classifySourceUrl(url, { isPdf: /\.pdf(?:[?#]|$)/i.test(url) });
    if (!isOfficialProducerSource(sourceType) && sourceType !== "producer_general") continue;
    push(url, /\.pdf(?:[?#]|$)/i.test(url) ? "technical_document" : "producer_page", "stored_producer_content");
  }
  return rows;
}

export function classifyOfficialIdentity(input: {
  wine: Pick<RecoverableWine, "name" | "vintage">;
  identity: SourceWineIdentity | null;
  exactCatalogBlock?: boolean;
  ambiguous?: boolean;
  finalUrl?: string | null;
}): { status: OfficialSourceIdentityStatus; reasons: string[]; confidence: number } {
  if (input.ambiguous) {
    return { status: "AMBIGUOUS_PRODUCT", reasons: ["Multiple official product blocks remain plausible"], confidence: 0 };
  }
  const sourceName = input.identity?.sourceWineName ?? null;
  if (!sourceName) {
    const generic = isGenericFinalUrl(input.finalUrl ?? null);
    return {
      status: generic ? "GENERIC_WINERY_PAGE" : "NO_OFFICIAL_SOURCE_FOUND",
      reasons: [generic ? "Redirect or source resolves to a generic producer page" : "No independent source product name"],
      confidence: 0,
    };
  }
  if (hasSweetnessConflict(input.wine.name, sourceName)) {
    return {
      status: "WRONG_PRODUCT",
      reasons: [`Sweetness identity differs: DB "${input.wine.name}", source "${sourceName}"`],
      confidence: 0,
    };
  }
  const nameClass = classifySourceName(input.wine.name, sourceName);
  if (nameClass === "SOURCE_NAME_CONFLICT") {
    return {
      status: "WRONG_PRODUCT",
      reasons: [`Source product name does not match DB wine: "${sourceName}"`],
      confidence: 0,
    };
  }
  const sourceVintage = input.identity?.sourceVintage ?? null;
  if (input.wine.vintage != null && sourceVintage != null && input.wine.vintage !== sourceVintage) {
    return {
      status: "WRONG_VINTAGE",
      reasons: [`DB vintage ${input.wine.vintage} differs from source vintage ${sourceVintage}`],
      confidence: 0,
    };
  }
  if (input.exactCatalogBlock) {
    return {
      status: "VALID_EXACT_CATALOG_BLOCK",
      reasons: ["Exact isolated official catalog block"],
      confidence: sourceVintage == null ? 0.85 : 0.98,
    };
  }
  if (input.wine.vintage == null) {
    return {
      status: "VALID_NON_VINTAGE_PRODUCT",
      reasons: ["Exact official product identity for a non-vintage catalog row"],
      confidence: 0.95,
    };
  }
  if (sourceVintage == null) {
    return {
      status: "VALID_EXACT_PRODUCT_UNDATED",
      reasons: ["Exact official product identity, but source has no explicit vintage"],
      confidence: 0.75,
    };
  }
  return {
    status: "VALID_EXACT_VINTAGE",
    reasons: ["Exact official product and vintage"],
    confidence: 1,
  };
}

export function classifyDocumentStatus(
  purpose: OfficialSourcePurpose,
  pdfClass: PdfDocumentClass | null,
): OfficialSourceDocumentStatus {
  if (purpose === "producer_page" && pdfClass == null) return "VALID_PRODUCT_PAGE";
  if (pdfClass === "WINE_TASTING_SHEET" || pdfClass === "WINE_TECHNICAL_SHEET") {
    return "VALID_TECHNICAL_DOCUMENT";
  }
  if (pdfClass === "PRIVACY_POLICY" || pdfClass === "TERMS") return "WRONG_DOCUMENT";
  if (pdfClass === "CATALOG_GENERIC" || pdfClass === "MARKETING_BROCHURE") {
    return "GENERIC_DOCUMENT";
  }
  return "UNKNOWN_DOCUMENT";
}

export function classifyTechnicalClaim(
  wine: RecoverableWine,
  claim: TechFactClaim,
  identityStatus: OfficialSourceIdentityStatus,
): OfficialTechnicalClaimCandidate | null {
  if (!["alcohol", "acidity", "sugar", "sweetness", "vintage"].includes(claim.field)) return null;
  const field = claim.field as OfficialTechnicalClaimCandidate["field"];
  const value = Array.isArray(claim.value) ? claim.value[0] : claim.value;
  if (value == null) return null;
  const stored = field === "vintage" ? wine.vintage : wine[field];
  const reasons: string[] = [];
  let classification: TechnicalRecoveryClassification;

  if (identityStatus === "WRONG_VINTAGE") classification = "DIFFERENT_VINTAGE";
  else if (identityStatus === "AMBIGUOUS_PRODUCT") classification = "AMBIGUOUS_PRODUCT";
  else if (
    identityStatus === "WRONG_PRODUCT" ||
    identityStatus === "GENERIC_CATALOG" ||
    identityStatus === "GENERIC_WINERY_PAGE" ||
    identityStatus === "NO_OFFICIAL_SOURCE_FOUND"
  ) {
    classification = "AMBIGUOUS_PRODUCT";
  } else if (
    (field === "acidity" || field === "sugar") &&
    claim.unit !== "g/L"
  ) {
    classification = "UNIT_AMBIGUOUS";
  } else if (
    wine.vintage != null &&
    (claim.sourceVintage == null || identityStatus === "VALID_EXACT_PRODUCT_UNDATED")
  ) {
    classification = "PROVISIONAL_UNDATED";
  } else if (stored == null) {
    classification = "SAFE_NEW_VALUE";
  } else if (techValuesEqual(field, stored, value)) {
    classification = "QUALIFIED_MATCH_EXISTING";
  } else {
    classification = "OFFICIAL_CONFLICT";
  }
  reasons.push(`identity=${identityStatus}`);
  if (claim.unit) reasons.push(`unit=${claim.unit}`);
  return {
    field,
    value,
    unit: claim.unit,
    excerpt: claim.excerpt,
    sourceVintage: claim.sourceVintage,
    classification,
    reasons,
  };
}

function cleanupAction(
  purpose: OfficialSourcePurpose,
  healthStatus: OfficialSourceHealthStatus,
): SourceCleanupAction {
  const invalid = new Set<OfficialSourceHealthStatus>([
    "WRONG_PRODUCT",
    "WRONG_VINTAGE",
    "WRONG_DOCUMENT",
    "DEAD_404",
    "REDIRECTED_DIFFERENT_PRODUCT",
    "INVALID_CONTENT_TYPE",
  ]);
  if (!invalid.has(healthStatus)) {
    if (
      healthStatus === "FETCH_BLOCKED" ||
      healthStatus === "SERVER_ERROR" ||
      healthStatus === "TEMP_ERROR" ||
      healthStatus === "NETWORK_ERROR" ||
      healthStatus === "TIMEOUT" ||
      healthStatus === "AMBIGUOUS_PRODUCT"
    ) {
      return "HUMAN_REVIEW";
    }
    return "NO_CHANGE";
  }
  return purpose === "producer_page" ? "CLEAR_PRODUCER_PAGE" : "CLEAR_TASTING_SHEET";
}

export function buildOfficialWineSourceCandidate(input: {
  wine: RecoverableWine;
  descriptor: StoredSourceDescriptor;
  fetched: FetchedSource | null;
  attempt: SourceFetchAttempt | null;
  identity: SourceWineIdentity | null;
  pdfClass: PdfDocumentClass | null;
  recovery?: WineTechRecovery | null;
  sourceProductId?: number | null;
  exactCatalogBlock?: boolean;
}): OfficialWineSourceCandidate {
  const documentStatus = classifyDocumentStatus(input.descriptor.purpose, input.pdfClass);
  const identity = classifyOfficialIdentity({
    wine: input.wine,
    identity: input.identity,
    exactCatalogBlock: input.exactCatalogBlock,
    ambiguous: input.recovery?.ballaStatus === "AMBIGUOUS_MATCH",
    finalUrl: input.fetched?.finalUrl ?? input.attempt?.finalUrl,
  });
  let healthStatus: OfficialSourceHealthStatus = identity.status;
  const reasons = [...identity.reasons];

  if (
    documentStatus === "WRONG_DOCUMENT" ||
    documentStatus === "GENERIC_DOCUMENT" ||
    (input.descriptor.purpose !== "producer_page" && documentStatus === "UNKNOWN_DOCUMENT")
  ) {
    healthStatus = "WRONG_DOCUMENT";
    reasons.unshift(`document=${documentStatus}`);
  } else if (input.attempt && !input.attempt.ok && input.attempt.failureClass) {
    healthStatus =
      input.attempt.failureClass === "REJECTED_URL"
        ? "WRONG_DOCUMENT"
        : input.attempt.failureClass;
    reasons.unshift(input.attempt.reason ?? input.attempt.failureClass);
  } else if (
    input.fetched?.redirected &&
    (identity.status === "WRONG_PRODUCT" || identity.status === "WRONG_VINTAGE" || identity.status === "GENERIC_WINERY_PAGE")
  ) {
    healthStatus = "REDIRECTED_DIFFERENT_PRODUCT";
    reasons.unshift("Redirect target failed product identity");
  }

  const claims = (input.recovery?.claims ?? [])
    .filter((claim) => claim.sourceUrl === input.descriptor.url)
    .map((claim) => classifyTechnicalClaim(input.wine, claim, identity.status))
    .filter((claim): claim is OfficialTechnicalClaimCandidate => claim != null);

  return {
    wineId: input.wine.id,
    slug: input.wine.slug,
    winery: input.wine.winerySlug,
    purpose: input.descriptor.purpose,
    url: input.descriptor.url,
    discoveryMethod: input.descriptor.discoveryMethod,
    httpStatus: input.attempt?.httpStatus ?? input.fetched?.httpStatus ?? null,
    contentType: input.attempt?.contentType ?? input.fetched?.contentType ?? null,
    redirectedFrom: input.fetched?.redirected ? input.descriptor.url : null,
    finalUrl: input.fetched?.finalUrl ?? input.attempt?.finalUrl ?? null,
    sourceTitle: input.fetched?.title ?? null,
    sourceWineName: input.identity?.sourceWineName ?? null,
    sourceVintage: input.identity?.sourceVintage ?? null,
    sourceSku: input.identity?.sourceSku ?? null,
    sourceProductId: input.sourceProductId ?? null,
    sourceLine: input.identity?.sourceLine ?? input.recovery?.ballaMatch?.category ?? null,
    sourceColor: null,
    sourceSweetness: input.recovery?.ballaMatch?.sweetness ?? null,
    sourceGrapes: input.identity?.sourceGrapes ?? [],
    sourceBottleSize: input.identity?.sourceBottleSize ?? null,
    identityStatus: identity.status,
    documentStatus,
    healthStatus,
    technicalClaims: claims,
    confidence: healthStatus === identity.status ? identity.confidence : 0,
    reasons,
    proposedAction: input.descriptor.discoveryMethod.startsWith("stored_")
      ? cleanupAction(input.descriptor.purpose, healthStatus)
      : "NO_CHANGE",
    replacementUrl: null,
  };
}

export function classifySourceDrift(input: {
  persistedWineName: string | null;
  persistedVintage: number | null;
  persistedValue: string | number;
  currentWineName: string | null;
  currentVintage: number | null;
  currentValue: string | number | null;
  field: OfficialTechnicalClaimCandidate["field"];
}): SourceDriftStatus {
  if (
    input.persistedWineName &&
    input.currentWineName &&
    classifySourceName(input.persistedWineName, input.currentWineName) === "SOURCE_NAME_CONFLICT"
  ) {
    return "PRODUCT_CHANGED";
  }
  if (
    input.persistedVintage != null &&
    input.currentVintage != null &&
    input.persistedVintage !== input.currentVintage
  ) {
    return "VINTAGE_ROLLED_FORWARD";
  }
  if (
    input.currentValue != null &&
    !techValuesEqual(input.field, input.persistedValue, input.currentValue)
  ) {
    return "VALUE_CHANGED";
  }
  if (
    input.persistedWineName !== input.currentWineName ||
    input.persistedVintage !== input.currentVintage
  ) {
    return "NON_MATERIAL_PAGE_CHANGE";
  }
  return "UNCHANGED";
}
