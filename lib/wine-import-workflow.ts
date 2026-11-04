import type {
  PublicQualityScore,
  PublicValueScore,
} from "@/lib/public-quality-score";

export type ImportWorkflowStepId =
  | "import_candidate"
  | "validate_identity"
  | "collect_sources"
  | "extract_evidence"
  | "reconcile_conflicts"
  | "generate_editorial"
  | "compute_quality"
  | "compute_value"
  | "quality_gates"
  | "publish_or_review";

export type WorkflowStepStatus = "passed" | "pending" | "blocked";

export interface ImportWorkflowStep {
  id: ImportWorkflowStepId;
  order: number;
  label: string;
  status: WorkflowStepStatus;
  retryable: boolean;
  idempotencyKey: string;
  details: Record<string, unknown>;
}

export interface ImportWorkflowInput {
  candidate: {
    slug: string;
    sourceUrl: string;
    variantKey: string;
    bottleSizeMl: number;
    vintage: number | null;
    producer: string;
    name: string;
  };
  identity: {
    exactProduct: boolean;
    conflicts: string[];
  };
  sources: Array<{ kind: string; url: string; authorized: boolean }>;
  evidence: {
    structuredClaims: number;
    tastingNotes: boolean;
    technicalFields: number;
  };
  conflicts: Array<{ field: string; resolution: string }>;
  editorial: {
    description: string;
    grounded: boolean;
  };
  quality: PublicQualityScore;
  value: PublicValueScore;
  catalogGates: {
    identityComplete: boolean;
    sourceCount: number;
    criticalIssues: string[];
  };
  currentStatus: "user_submitted" | "verified" | "rejected";
}

export interface ImportWorkflowResult {
  idempotencyKey: string;
  steps: ImportWorkflowStep[];
  recommendation: "publish" | "manual_review" | "blocked";
  blockedReason: string | null;
  summary: {
    qualityScore: number | null;
    qualityStatus: PublicQualityScore["status"];
    valueScore: number | null;
    valueStatus: PublicValueScore["status"];
    sourceCount: number;
    claimCount: number;
    conflictCount: number;
  };
}

const ORDER: ImportWorkflowStepId[] = [
  "import_candidate",
  "validate_identity",
  "collect_sources",
  "extract_evidence",
  "reconcile_conflicts",
  "generate_editorial",
  "compute_quality",
  "compute_value",
  "quality_gates",
  "publish_or_review",
];

function step(
  id: ImportWorkflowStepId,
  status: WorkflowStepStatus,
  idempotencyKey: string,
  details: Record<string, unknown>,
  retryable = true,
): ImportWorkflowStep {
  return {
    id,
    order: ORDER.indexOf(id) + 1,
    label: id.replaceAll("_", " "),
    status,
    retryable,
    idempotencyKey,
    details,
  };
}

/**
 * Pure, deterministic import-to-publication audit. It does not write data.
 * Each caller can persist the returned step details into its run ledger and
 * retry a failed step with the same idempotency key.
 */
export function evaluateImportWorkflow(
  input: ImportWorkflowInput,
): ImportWorkflowResult {
  const key = [
    input.candidate.producer,
    input.candidate.variantKey,
    input.candidate.bottleSizeMl,
    input.candidate.vintage ?? "nv",
    input.candidate.sourceUrl,
  ].join("|");

  const sourceCount = input.sources.filter((source) => source.authorized).length;
  const blocked =
    !input.identity.exactProduct ||
    input.identity.conflicts.length > 0 ||
    input.conflicts.some((conflict) => !conflict.resolution.trim()) ||
    input.catalogGates.criticalIssues.length > 0;
  const qualityReady = input.quality.status === "known";
  const valueReady = input.value.status === "known";
  const manualReview =
    input.currentStatus !== "verified" ||
    !qualityReady ||
    sourceCount < 1 ||
    input.evidence.structuredClaims < 1 ||
    !input.editorial.grounded;

  const steps: ImportWorkflowStep[] = [
    step("import_candidate", "passed", key, {
      slug: input.candidate.slug,
      name: input.candidate.name,
    }),
    step(
      "validate_identity",
      input.identity.exactProduct && input.identity.conflicts.length === 0
        ? "passed"
        : "blocked",
      `${key}|identity`,
      {
        exactProduct: input.identity.exactProduct,
        conflicts: input.identity.conflicts,
      },
      false,
    ),
    step(
      "collect_sources",
      sourceCount > 0 ? "passed" : "blocked",
      `${key}|sources`,
      { authorizedSources: sourceCount, totalSources: input.sources.length },
    ),
    step(
      "extract_evidence",
      input.evidence.structuredClaims > 0 && input.evidence.tastingNotes
        ? "passed"
        : "pending",
      `${key}|evidence`,
      input.evidence,
    ),
    step(
      "reconcile_conflicts",
      input.conflicts.length === 0 ? "passed" : "blocked",
      `${key}|conflicts`,
      { conflicts: input.conflicts },
    ),
    step(
      "generate_editorial",
      input.editorial.grounded && input.editorial.description.trim().length > 80
        ? "passed"
        : "pending",
      `${key}|editorial`,
      { grounded: input.editorial.grounded },
    ),
    step(
      "compute_quality",
      qualityReady ? "passed" : "pending",
      `${key}|quality`,
      {
        status: input.quality.status,
        score: input.quality.score,
        confidence: input.quality.confidence,
        missing: input.quality.missing,
      },
    ),
    step(
      "compute_value",
      valueReady ? "passed" : "pending",
      `${key}|value`,
      {
        status: input.value.status,
        score: input.value.score,
        reason: input.value.reason,
      },
    ),
    step(
      "quality_gates",
      input.catalogGates.identityComplete &&
        input.catalogGates.criticalIssues.length === 0
        ? "passed"
        : "blocked",
      `${key}|gates`,
      input.catalogGates,
      false,
    ),
    step(
      "publish_or_review",
      blocked ? "blocked" : manualReview ? "pending" : "passed",
      `${key}|publish`,
      {
        recommendation: blocked
          ? "blocked"
          : manualReview
            ? "manual_review"
            : "publish",
        currentStatus: input.currentStatus,
        valueReady,
      },
    ),
  ];

  return {
    idempotencyKey: key,
    steps,
    recommendation: blocked ? "blocked" : manualReview ? "manual_review" : "publish",
    blockedReason: blocked
      ? input.identity.conflicts[0] ??
        input.conflicts[0]?.field ??
        input.catalogGates.criticalIssues[0] ??
        "identity or source gate blocked"
      : null,
    summary: {
      qualityScore: input.quality.score,
      qualityStatus: input.quality.status,
      valueScore: input.value.score,
      valueStatus: input.value.status,
      sourceCount,
      claimCount: input.evidence.structuredClaims,
      conflictCount: input.conflicts.length,
    },
  };
}
