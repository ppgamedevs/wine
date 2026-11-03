import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  wineAiInterpretations,
  wineClaimEvidence,
  wineEnrichmentRuns,
} from "@/lib/schema";
import type { TechFactClaim, TechFactField } from "@/lib/tech-facts/types";
import { persistWineFactEvidenceFailSoft } from "@/lib/tech-facts/persist";
import {
  rejectionReason,
  VERIFICATION_TRUST,
  verificationForClaim,
} from "@/lib/intelligence/claim-verification";
import type {
  AiInterpretation,
  CompletenessReport,
  IntelligenceReport,
  ReconciledClaim,
  WineClaim,
} from "@/lib/intelligence/types";

type PersistDatabase = typeof db;

const TECHNICAL_FIELDS = new Set<TechFactField>([
  "alcohol",
  "sweetness",
  "vintage",
  "grape_varieties",
  "wine_type",
  "serving_temperature",
]);

function technicalField(claim: ReconciledClaim): TechFactField | null {
  if (TECHNICAL_FIELDS.has(claim.field as TechFactField)) {
    return claim.field as TechFactField;
  }
  if (claim.field === "wine_color") return "wine_type";
  return null;
}

function sourceTypeFor(claim: WineClaim): TechFactClaim["sourceType"] {
  if (claim.sourceClass === "official_technical_sheet") return "tasting_sheet";
  if (claim.sourceClass === "official_producer_page") return "producer_page";
  if (claim.sourceClass === "official_catalog") return "producer_catalog";
  if (claim.sourceClass === "retailer") return "retailer";
  return "unknown";
}

/**
 * The technical mirror must use the exact claim that supplied the reconciled
 * value. `claims[0]` is not safe: official/reconciled reconciliation can select a
 * different source from a different row.
 */
export function toTechClaim(claim: ReconciledClaim): TechFactClaim | null {
  const field = technicalField(claim);
  if (!field || claim.value == null) return null;
  const source =
    claim.selectedClaim ??
    claim.claims.find(
      (candidate) =>
        candidate.normalizedValue === claim.normalizedValue &&
        candidate.sourceUrl === claim.sourceUrl,
    );
  if (!source) return null;
  if (rejectionReason(source) != null) return null;
  if (
    claim.normalizedValue != null &&
    source.normalizedValue !== claim.normalizedValue
  ) {
    return null;
  }

  return {
    field,
    value: source.value as string | number | string[],
    unit: source.unit,
    sourceUrl: source.sourceUrl,
    sourceType: sourceTypeFor(source),
    sourceWineName: source.sourceTitle,
    sourceVintage: source.identity.vintage,
    sourceDocumentTitle: source.sourceTitle,
    excerpt: source.excerpt,
    extractionMethod: "deterministic",
    identityMatchClass:
      source.identityMatchStatus as TechFactClaim["identityMatchClass"],
    sourceNameClass: "SOURCE_NAME_EXACT",
    sourceVintageClass:
      source.identity.vintage != null
        ? "SOURCE_VINTAGE_EXPLICIT"
        : "SOURCE_VINTAGE_MISSING",
    confidence: source.confidence,
    observedAt: source.observedAt,
    sourceHash: source.sourceHash,
    claimIdentityHash: source.claimHash,
  };
}

function conflictForField(
  report: IntelligenceReport,
  field: string,
): Record<string, unknown> | null {
  const conflict = report.reconciled.find((item) => item.field === field)?.conflict;
  return conflict ? (conflict as unknown as Record<string, unknown>) : null;
}

function diagnostic(
  claim: WineClaim,
  reason: string,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    rejectedClaim: {
      field: claim.field,
      sourceUrl: claim.sourceUrl,
      sourceClass: claim.sourceClass,
      identityMatchStatus: claim.identityMatchStatus,
      claimHash: claim.claimHash,
      reason,
      ...extra,
    },
  };
}

export interface PersistIntelligenceOptions {
  database?: PersistDatabase;
  suspendTechnicalMirror?: boolean;
}

export async function persistIntelligenceReport(
  report: IntelligenceReport,
  options: PersistIntelligenceOptions = {},
): Promise<{
  claims: number;
  technical: number;
  ai: number;
  run: number;
  rejected: number;
  skipped: number;
}> {
  const database = options.database ?? db;
  const claimsByField = new Map<string, WineClaim[]>();
  for (const claim of report.claims) {
    const bucket = claimsByField.get(claim.field) ?? [];
    bucket.push(claim);
    claimsByField.set(claim.field, bucket);
  }

  let claimCount = 0;
  let skipped = 0;
  const diagnostics: Record<string, unknown>[] = report.errors.map((error) => ({
    error,
  }));

  await database.transaction(async (tx) => {
    for (const claim of report.claims) {
      const reason = rejectionReason(claim);
      if (reason != null) {
        diagnostics.push(diagnostic(claim, reason));
        continue;
      }

      const verification = verificationForClaim(
        claim,
        claimsByField.get(claim.field) ?? [],
      );
      const conflictJson = conflictForField(report, claim.field);
      const existing = await tx
        .select({
          id: wineClaimEvidence.id,
          valueJson: wineClaimEvidence.valueJson,
          normalizedValue: wineClaimEvidence.normalizedValue,
          verificationStatus: wineClaimEvidence.verificationStatus,
          confidence: wineClaimEvidence.confidence,
        })
        .from(wineClaimEvidence)
        .where(
          and(
            eq(wineClaimEvidence.wineId, claim.wineId),
            eq(wineClaimEvidence.field, claim.field),
            eq(wineClaimEvidence.sourceHash, claim.sourceHash),
          ),
        )
        .limit(1);

      const current = existing[0];
      if (current) {
        const currentTrust =
          VERIFICATION_TRUST[
            current.verificationStatus as keyof typeof VERIFICATION_TRUST
          ] ?? 0;
        const nextTrust = VERIFICATION_TRUST[verification];
        if (current.normalizedValue !== claim.normalizedValue) {
          skipped += 1;
          diagnostics.push(
            diagnostic(claim, "existing_different_value", {
              existingNormalizedValue: current.normalizedValue,
            }),
          );
          continue;
        }
        if (nextTrust <= currentTrust) {
          skipped += 1;
          continue;
        }
        await tx
          .update(wineClaimEvidence)
          .set({
            valueJson: claim.value,
            verificationStatus: verification,
            conflictJson,
            confidence: claim.confidence,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(wineClaimEvidence.id, current.id));
        claimCount += 1;
        continue;
      }

      await tx.insert(wineClaimEvidence).values({
        wineId: claim.wineId,
        canonicalIdentityKey: claim.canonicalIdentityKey,
        field: claim.field,
        valueJson: claim.value,
        normalizedValue: claim.normalizedValue,
        unit: claim.unit,
        sourceUrl: claim.sourceUrl,
        sourceTitle: claim.sourceTitle,
        sourceClass: claim.sourceClass,
        excerpt: claim.excerpt,
        observedAt: claim.observedAt,
        extractionMethod: claim.extractionMethod,
        identityMatchStatus: claim.identityMatchStatus,
        verificationStatus: verification,
        confidence: claim.confidence,
        conflictJson,
        sourceHash: claim.sourceHash,
        claimHash: claim.claimHash,
        updatedAt: new Date().toISOString(),
      });
      claimCount += 1;
    }
  });

  const rejected = diagnostics.filter((item) => "rejectedClaim" in item).length;
  const runStatus = report.errors.length > 0 || rejected > 0 ? "PARTIAL" : "COMPLETED";
  const techClaims = report.reconciled
    .map(toTechClaim)
    .filter((claim): claim is TechFactClaim => claim != null);
  const technical =
    options.suspendTechnicalMirror || techClaims.length === 0
      ? 0
      : await persistWineFactEvidenceFailSoft(report.wineId, techClaims);

  let aiCount = 0;
  if (report.aiInterpretation) {
    await database
      .insert(wineAiInterpretations)
      .values({
        wineId: report.wineId,
        runId: report.runId,
        model: report.aiInterpretation.model,
        text: report.aiInterpretation.text,
        supportedClaimHashes: report.aiInterpretation.supportedClaimHashes,
        inputTokens: report.aiInterpretation.inputTokens,
        outputTokens: report.aiInterpretation.outputTokens,
        estimatedCostUsd: report.aiInterpretation.estimatedCostUsd,
      })
      .onConflictDoUpdate({
        target: [wineAiInterpretations.wineId, wineAiInterpretations.runId],
        set: {
          text: report.aiInterpretation.text,
          inputTokens: report.aiInterpretation.inputTokens,
          outputTokens: report.aiInterpretation.outputTokens,
          estimatedCostUsd: report.aiInterpretation.estimatedCostUsd,
        },
      });
    aiCount = 1;
  }

  await database
    .insert(wineEnrichmentRuns)
    .values({
      wineId: report.wineId,
      fingerprint: report.fingerprint,
      status: runStatus,
      dryRun: report.dryRun,
      sourceCount: report.sources.length,
      requestCount: report.requestCount,
      claimCount,
      conflictCount: report.reconciled.filter((item) => item.conflict).length,
      aiRequestCount: report.aiEstimate.requestCount,
      aiInputTokens: report.aiEstimate.inputTokens,
      aiOutputTokens: report.aiEstimate.outputTokens,
      estimatedCostUsd: report.aiEstimate.estimatedCostUsd,
      completenessJson: report.completeness as unknown as Record<string, unknown>,
      errorJson: diagnostics,
      startedAt: report.generatedAt,
      finishedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: [wineEnrichmentRuns.wineId, wineEnrichmentRuns.fingerprint],
      set: {
        status: runStatus,
        requestCount: report.requestCount,
        claimCount,
        conflictCount: report.reconciled.filter((item) => item.conflict).length,
        completenessJson: report.completeness as unknown as Record<string, unknown>,
        errorJson: diagnostics,
        finishedAt: new Date().toISOString(),
      },
    });

  return {
    claims: claimCount,
    technical,
    ai: aiCount,
    run: 1,
    rejected,
    skipped,
  };
}

export async function loadStoredClaims(
  wineId: number,
): Promise<Array<{ id: number; field: string; normalizedValue: string }>> {
  const rows = await db
    .select({
      id: wineClaimEvidence.id,
      field: wineClaimEvidence.field,
      normalizedValue: wineClaimEvidence.normalizedValue,
    })
    .from(wineClaimEvidence)
    .where(eq(wineClaimEvidence.wineId, wineId));
  return rows;
}

export type { AiInterpretation, CompletenessReport };
