import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  wineAiInterpretations,
  wineClaimEvidence,
  wineEnrichmentRuns,
} from "@/lib/schema";
import type { TechFactClaim, TechFactField } from "@/lib/tech-facts/types";
import { persistWineFactEvidenceFailSoft } from "@/lib/tech-facts/persist";
import type {
  AiInterpretation,
  CompletenessReport,
  IntelligenceReport,
  ReconciledClaim,
  WineClaim,
} from "@/lib/intelligence/types";

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

function toTechClaim(claim: ReconciledClaim): TechFactClaim | null {
  const field = technicalField(claim);
  if (!field || claim.value == null) return null;
  const source = claim.claims[0];
  if (!source) return null;
  return {
    field,
    value: claim.value as string | number | string[],
    unit: claim.unit,
    sourceUrl: claim.sourceUrl,
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
    confidence: claim.confidence,
    observedAt: source.observedAt,
    sourceHash: source.sourceHash,
    claimIdentityHash: source.claimHash,
  };
}

export async function persistIntelligenceReport(
  report: IntelligenceReport,
): Promise<{ claims: number; technical: number; ai: number; run: number }> {
  let claimCount = 0;
  for (const claim of report.claims) {
    const reconciledField = report.reconciled.find(
      (item) => item.field === claim.field,
    );
    const conflictJson = reconciledField?.conflict ?? null;
    await db
      .insert(wineClaimEvidence)
      .values({
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
        verificationStatus: reconciledField?.verificationStatus ?? "unverified",
        confidence: claim.confidence,
        conflictJson: conflictJson
          ? (conflictJson as unknown as Record<string, unknown>)
          : null,
        sourceHash: claim.sourceHash,
        claimHash: claim.claimHash,
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: [
          wineClaimEvidence.wineId,
          wineClaimEvidence.field,
          wineClaimEvidence.sourceHash,
        ],
        set: {
          valueJson: claim.value,
          normalizedValue: claim.normalizedValue,
          verificationStatus: reconciledField?.verificationStatus ?? "unverified",
          conflictJson: conflictJson
            ? (conflictJson as unknown as Record<string, unknown>)
            : null,
          confidence: claim.confidence,
          updatedAt: new Date().toISOString(),
        },
      });
    claimCount += 1;
  }

  const techClaims = report.reconciled
    .map(toTechClaim)
    .filter((claim): claim is TechFactClaim => claim != null);
  const technical = await persistWineFactEvidenceFailSoft(
    report.wineId,
    techClaims,
  );

  let aiCount = 0;
  if (report.aiInterpretation) {
    await db
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

  await db
    .insert(wineEnrichmentRuns)
    .values({
      wineId: report.wineId,
      fingerprint: report.fingerprint,
      status: report.errors.length > 0 ? "PARTIAL" : "COMPLETED",
      dryRun: report.dryRun,
      sourceCount: report.sources.length,
      requestCount: report.requestCount,
      claimCount: report.claims.length,
      conflictCount: report.reconciled.filter((item) => item.conflict).length,
      aiRequestCount: report.aiEstimate.requestCount,
      aiInputTokens: report.aiEstimate.inputTokens,
      aiOutputTokens: report.aiEstimate.outputTokens,
      estimatedCostUsd: report.aiEstimate.estimatedCostUsd,
      completenessJson: report.completeness as unknown as Record<string, unknown>,
      errorJson: report.errors.map((error) => ({ error })),
      startedAt: report.generatedAt,
      finishedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: [wineEnrichmentRuns.wineId, wineEnrichmentRuns.fingerprint],
      set: {
        status: report.errors.length > 0 ? "PARTIAL" : "COMPLETED",
        requestCount: report.requestCount,
        claimCount: report.claims.length,
        conflictCount: report.reconciled.filter((item) => item.conflict).length,
        completenessJson: report.completeness as unknown as Record<string, unknown>,
        errorJson: report.errors.map((error) => ({ error })),
        finishedAt: new Date().toISOString(),
      },
    });

  return { claims: claimCount, technical, ai: aiCount, run: 1 };
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
