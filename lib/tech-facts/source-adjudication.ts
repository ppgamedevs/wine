/**
 * Prompt 17 read-only adjudication primitives.
 *
 * These structures separate identity, source cleanup, evidence attachment, and
 * canonical value corrections. No function in this module writes production.
 */
import { techValuesEqual } from "@/lib/tech-facts/types";
import { classifySourceUrl, isOfficialProducerSource } from "@/lib/source-trust";

export type SourceAdjudicationIssueType =
  | "SOURCE_BLOCKED"
  | "PRODUCT_AMBIGUITY"
  | "WRONG_PRODUCT"
  | "WRONG_VINTAGE"
  | "OFFICIAL_VALUE_CONFLICT"
  | "DEAD_SOURCE"
  | "NO_MATCH";

export type SourceAdjudicationResolution =
  | "RESOLVED_EXACT"
  | "RESOLVED_CONFLICT_DB_WRONG"
  | "RESOLVED_CONFLICT_SOURCE_STALE"
  | "RESOLVED_SOURCE_REPLACEMENT"
  | "REMAINS_AMBIGUOUS"
  | "REMAINS_BLOCKED"
  | "NO_OFFICIAL_SOURCE";

export type SourceAdjudicationAction =
  | "KEEP_CURRENT"
  | "ATTACH_NEW_EVIDENCE"
  | "CORRECT_CANONICAL_VALUE"
  | "CLEAR_INVALID_NO_REPLACEMENT"
  | "CLEAR_DEAD_NO_REPLACEMENT"
  | "REPLACE_WITH_EXACT_CURRENT_URL"
  | "PRODUCT_REMOVED_BUT_IDENTITY_VALID"
  | "HUMAN_REVIEW";

export type SourceReasoningCode =
  | "EXACT_PRODUCT_NAME"
  | "EXACT_VINTAGE"
  | "EXACT_PRODUCT_ID"
  | "EXACT_SKU"
  | "EXACT_LINE"
  | "EXACT_DEEP_LINK"
  | "EXACT_IMAGE_IDENTITY"
  | "EXACT_GRAPE_COMPOSITION"
  | "EXACT_BOTTLE_IDENTITY"
  | "EXPLICIT_TECHNICAL_VALUE"
  | "INDEPENDENT_OFFICIAL_CORROBORATION"
  | "CANONICAL_URL_ALIAS"
  | "SOURCE_ROLLED_FORWARD"
  | "SOURCE_FETCH_TRANSIENT"
  | "SOURCE_FETCH_STABLE"
  | "SOURCE_DEAD"
  | "WRONG_DOCUMENT"
  | "GENERIC_SOURCE"
  | "MISSING_LINE_EVIDENCE"
  | "IDENTITY_COLLISION"
  | "NO_CURRENT_OFFICIAL_MATCH"
  | "RETAILER_EXCLUDED"
  | "UNRESOLVED_OFFICIAL_CONFLICT";

export interface AdjudicationIdentity {
  name: string | null;
  vintage: number | null;
  productId: number | null;
  sku: string | null;
  line: string | null;
  color: string | null;
  grapes: string[];
  volumeMl: number | null;
  deepLink: string | null;
  imageUrl: string | null;
}

export interface SourceAdjudicationRecord {
  wineId: number;
  slug: string;
  winery: string;
  issueType: SourceAdjudicationIssueType;
  storedIdentity: AdjudicationIdentity;
  sourceIdentity: AdjudicationIdentity | null;
  candidateIdentities: AdjudicationIdentity[];
  storedTechnicalValue?: string | number | null;
  officialTechnicalValue?: string | number | null;
  sourceUrls: string[];
  identityEvidence: string[];
  conflictEvidence: string[];
  recommendedAction: SourceAdjudicationAction;
  resolution: SourceAdjudicationResolution;
  reasoningCodes: SourceReasoningCode[];
  observedAt: string;
}

export type Prompt18SourceStability =
  | "STABLE"
  | "TEMPORARILY_BLOCKED"
  | "DEAD_AFTER_DISCOVERY"
  | "CHANGED"
  | "AMBIGUOUS";

export type SourceQualificationStability =
  | "STABLE_QUALIFIED"
  | "TRANSIENTLY_QUALIFIED"
  | "NOT_QUALIFIED";

export interface SourceRepeatObservation {
  ok: boolean;
  httpStatus: number | null;
  failureClass: string | null;
  canonicalUrl: string;
  identityFingerprint: string | null;
  factFingerprint: string | null;
}

export interface SourceStabilityResult {
  stability: Prompt18SourceStability;
  qualification: SourceQualificationStability;
  available: number;
  attempts: number;
  reasons: string[];
}

const TRACKING_QUERY = /^(?:utm_.+|fbclid|gclid|mc_cid|mc_eid)$/i;

export function canonicalizeOfficialUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl.trim());
    url.protocol = "https:";
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (TRACKING_QUERY.test(key)) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    url.pathname = url.pathname.replace(/\/{2,}/g, "/").replace(/\/+$/, "") || "/";
    return url.toString();
  } catch {
    return rawUrl.trim().replace(/#.*$/, "").replace(/\/+$/, "");
  }
}

export function independentOfficialSourceCount(urls: string[]): number {
  return new Set(urls.map(canonicalizeOfficialUrl)).size;
}

export function classifyRepeatedSource(
  observations: SourceRepeatObservation[],
  input?: { exactIdentity?: boolean; exactCatalogBlock?: boolean },
): SourceStabilityResult {
  const attempts = observations.length;
  const availableRows = observations.filter((row) => row.ok);
  const available = availableRows.length;
  const reasons = [`available=${available}/${attempts}`];

  if (attempts === 0) {
    return {
      stability: "AMBIGUOUS",
      qualification: "NOT_QUALIFIED",
      available,
      attempts,
      reasons: [...reasons, "No repeat observations"],
    };
  }

  const successfulFingerprints = new Set(
    availableRows.map((row) => `${row.identityFingerprint ?? ""}:${row.factFingerprint ?? ""}`),
  );
  if (successfulFingerprints.size > 1) {
    return {
      stability: "CHANGED",
      qualification: "NOT_QUALIFIED",
      available,
      attempts,
      reasons: [...reasons, "Identity or fact changed across successful observations"],
    };
  }

  const exactIdentity = Boolean(input?.exactIdentity || input?.exactCatalogBlock);
  if (available === attempts && exactIdentity) {
    return {
      stability: "STABLE",
      qualification: "STABLE_QUALIFIED",
      available,
      attempts,
      reasons: [
        ...reasons,
        input?.exactCatalogBlock
          ? "Repeated exact official catalog block"
          : "Repeated exact official source",
      ],
    };
  }

  if (available > 0) {
    return {
      stability: "TEMPORARILY_BLOCKED",
      qualification: exactIdentity ? "TRANSIENTLY_QUALIFIED" : "NOT_QUALIFIED",
      available,
      attempts,
      reasons: [
        ...reasons,
        exactIdentity
          ? "Exact source was not reproducibly available"
          : "Successful fetch lacked exact positive identity",
      ],
    };
  }

  const allDead = observations.every(
    (row) => row.httpStatus === 404 || row.httpStatus === 410 || row.failureClass === "DEAD_404",
  );
  return {
    stability: allDead ? "DEAD_AFTER_DISCOVERY" : "TEMPORARILY_BLOCKED",
    qualification: "NOT_QUALIFIED",
    available,
    attempts,
    reasons: [
      ...reasons,
      allDead ? "Every observation was 404 or 410" : "Failures are blocked or transient, not dead",
    ],
  };
}

export type OfficialConflictOutcome =
  | "DB_WRONG_CONFIRMED"
  | "SOURCE_STALE_OR_WRONG"
  | "UNRESOLVED";

export interface OfficialConflictDecision {
  outcome: OfficialConflictOutcome;
  reasons: string[];
}

export function adjudicateOfficialConflict(input: {
  exactProduct: boolean;
  dbVintage: number | null;
  sourceVintage: number | null;
  explicitFact: boolean;
  stablePrimarySource: boolean;
  officialSourceUrls: string[];
  corroboratingValues: Array<string | number>;
  officialValue: string | number;
  competingOfficialValue?: string | number | null;
  sourceRolledForward?: boolean;
}): OfficialConflictDecision {
  if (
    input.sourceRolledForward ||
    (input.dbVintage != null &&
      input.sourceVintage != null &&
      input.dbVintage !== input.sourceVintage)
  ) {
    return {
      outcome: "SOURCE_STALE_OR_WRONG",
      reasons: ["Official source does not represent the DB vintage"],
    };
  }
  if (
    !input.exactProduct ||
    (input.dbVintage != null && input.sourceVintage == null) ||
    !input.explicitFact
  ) {
    return {
      outcome: "UNRESOLVED",
      reasons: ["Positive exact product, vintage, and explicit fact evidence is incomplete"],
    };
  }
  if (
    input.competingOfficialValue != null &&
    !techValuesEqual("sweetness", input.competingOfficialValue, input.officialValue) &&
    String(input.competingOfficialValue) !== String(input.officialValue)
  ) {
    return {
      outcome: "UNRESOLVED",
      reasons: ["Competing official source remains unresolved"],
    };
  }

  const canonicalSources = independentOfficialSourceCount(
    input.officialSourceUrls.filter((url) =>
      isOfficialProducerSource(classifySourceUrl(url)),
    ),
  );
  const corroborated = input.corroboratingValues.some(
    (value) =>
      String(value).toLowerCase() === String(input.officialValue).toLowerCase(),
  );
  if (!input.stablePrimarySource && !(canonicalSources >= 2 && corroborated)) {
    return {
      outcome: "UNRESOLVED",
      reasons: ["Exact source is transient and lacks independent official corroboration"],
    };
  }
  return {
    outcome: "DB_WRONG_CONFIRMED",
    reasons: [
      "Exact product and vintage",
      "Explicit official fact",
      input.stablePrimarySource
        ? "Stable primary official source"
        : "Independent official corroboration",
    ],
  };
}

export interface BallaIdentityAssignment {
  wineId: number;
  slug: string;
  productId: number | null;
  resolution: "RESOLVED_EXACT" | "REMAINS_AMBIGUOUS" | "NO_MATCH" | "IDENTITY_COLLISION";
  positiveEvidence: SourceReasoningCode[];
}

export function enforceOneToOneOfficialIdentity(
  assignments: BallaIdentityAssignment[],
): BallaIdentityAssignment[] {
  const owners = new Map<number, number[]>();
  for (const row of assignments) {
    if (row.productId == null || row.resolution !== "RESOLVED_EXACT") continue;
    const current = owners.get(row.productId) ?? [];
    current.push(row.wineId);
    owners.set(row.productId, current);
  }
  return assignments.map((row) => {
    if (
      row.productId == null ||
      row.resolution !== "RESOLVED_EXACT" ||
      (owners.get(row.productId)?.length ?? 0) < 2
    ) {
      return row;
    }
    return {
      ...row,
      resolution: "IDENTITY_COLLISION",
      positiveEvidence: [...new Set([...row.positiveEvidence, "IDENTITY_COLLISION" as const])],
    };
  });
}

export interface Prompt18SourceCleanupEntry {
  wineId: number;
  slug: string;
  field: "producerPageUrl" | "tastingSheetUrl";
  oldUrl: string;
  proposedNewUrl: string | null;
  action:
    | "CLEAR_PRODUCER_PAGE"
    | "REPLACE_PRODUCER_PAGE"
    | "CLEAR_TASTING_SHEET"
    | "REPLACE_TASTING_SHEET"
    | "HUMAN_REVIEW";
  proof: string[];
  risk: "LOW" | "MEDIUM" | "HIGH";
}

export interface Prompt18EvidenceEntry {
  wineId: number;
  slug: string;
  winery: string;
  field: "alcohol" | "acidity" | "sugar" | "sweetness" | "vintage";
  storedValue: string | number;
  sourceClaim: string | number;
  sourceUrl: string;
  sourceHash: string | null;
  qualification: "QUALIFIED_MATCH_EXISTING";
  stability: Prompt18SourceStability;
}

export interface Prompt18CorrectionEntry {
  wineId: number;
  slug: string;
  winery: string;
  field: "alcohol" | "acidity" | "sugar" | "sweetness" | "vintage";
  oldValue: string | number;
  newValue: string | number;
  sourceUrls: string[];
  identityProof: string[];
  conflictResolution: "DB_WRONG_CONFIRMED";
  impactPreview: {
    publicDisplay: string;
    jsonLd: string;
    derivedCopy: string;
    valueScoreDelta: number | null;
    pairingImpact: string;
  };
}

export interface PersistedEvidenceIdentity {
  wineId: number;
  field: string;
  value: string | number | string[];
  sourceUrl: string | null;
  sourceHash: string | null;
}

function normalizedEvidenceValue(value: string | number | string[]): string {
  return Array.isArray(value)
    ? value.map(String).join("|").toLowerCase()
    : String(value).toLowerCase();
}

function evidenceIdentity(input: PersistedEvidenceIdentity): string {
  return [
    input.wineId,
    input.field,
    normalizedEvidenceValue(input.value),
    input.sourceUrl ? canonicalizeOfficialUrl(input.sourceUrl) : "",
  ].join(":");
}

export function dedupePrompt18Evidence(
  candidates: Prompt18EvidenceEntry[],
  persisted: PersistedEvidenceIdentity[],
): Prompt18EvidenceEntry[] {
  const hashes = new Set(
    persisted
      .filter((row) => row.sourceHash)
      .map((row) => `${row.wineId}:${row.field}:${row.sourceHash}`),
  );
  const identities = new Set(persisted.map(evidenceIdentity));
  const emitted = new Set<string>();
  return candidates.filter((candidate) => {
    if (candidate.stability !== "STABLE") return false;
    if (
      candidate.sourceHash &&
      hashes.has(`${candidate.wineId}:${candidate.field}:${candidate.sourceHash}`)
    ) {
      return false;
    }
    const key = evidenceIdentity({
      wineId: candidate.wineId,
      field: candidate.field,
      value: candidate.sourceClaim,
      sourceUrl: candidate.sourceUrl,
      sourceHash: candidate.sourceHash,
    });
    if (identities.has(key) || emitted.has(key)) return false;
    emitted.add(key);
    return true;
  });
}

export function confirmedCorrectionsOnly(
  candidates: Array<Prompt18CorrectionEntry & { decision: OfficialConflictOutcome }>,
): Prompt18CorrectionEntry[] {
  return candidates
    .filter((row) => row.decision === "DB_WRONG_CONFIRMED")
    .map((row) => {
      const { decision, ...entry } = row;
      void decision;
      return entry;
    });
}

export function isExactSourceReplacement(input: {
  oldIdentityQuality: number;
  newIdentityQuality: number;
  newUrl: string | null;
  exactProduct: boolean;
  genericHomepage: boolean;
}): boolean {
  return Boolean(
    input.newUrl &&
      input.exactProduct &&
      !input.genericHomepage &&
      input.newIdentityQuality > input.oldIdentityQuality,
  );
}
