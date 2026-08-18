/**
 * Persist accepted technical evidence. Prompt 13 never runs production backfill.
 */
import { db } from "@/lib/db";
import { wineFactEvidence } from "@/lib/schema";
import type { TechFactClaim } from "@/lib/tech-facts/types";

function rowsFor(wineId: number, claims: TechFactClaim[]) {
  return claims.map((claim) => ({
    wineId,
    field: claim.field,
    valueJson: claim.value,
    unit: claim.unit,
    sourceUrl: claim.sourceUrl,
    sourceType: claim.sourceType,
    sourceWineName: claim.sourceWineName,
    sourceVintage: claim.sourceVintage,
    sourceDocumentTitle: claim.sourceDocumentTitle,
    excerpt: claim.excerpt,
    extractionMethod: claim.extractionMethod,
    identityMatchClass: claim.identityMatchClass,
    confidence: claim.confidence,
    observedAt: claim.observedAt,
    sourceHash: claim.claimIdentityHash,
  }));
}

export type WineFactEvidenceRow = ReturnType<typeof rowsFor>[number];

export type EvidenceInsertFn = (rows: WineFactEvidenceRow[]) => Promise<void>;

async function defaultInsert(rows: WineFactEvidenceRow[]): Promise<void> {
  await db
    .insert(wineFactEvidence)
    .values(rows)
    .onConflictDoNothing({
      target: [
        wineFactEvidence.wineId,
        wineFactEvidence.field,
        wineFactEvidence.sourceHash,
      ],
    });
}

export async function persistWineFactEvidenceFailSoft(
  wineId: number,
  claims: TechFactClaim[],
  insertFn: EvidenceInsertFn = defaultInsert,
): Promise<number> {
  if (claims.length === 0) return 0;
  try {
    return await persistWineFactEvidenceStrict(wineId, claims, insertFn);
  } catch {
    return 0;
  }
}

/** @deprecated Use persistWineFactEvidenceFailSoft for import resilience. */
export async function persistWineFactEvidence(
  wineId: number,
  claims: TechFactClaim[],
): Promise<number> {
  return persistWineFactEvidenceFailSoft(wineId, claims);
}

export async function persistWineFactEvidenceStrict(
  wineId: number,
  claims: TechFactClaim[],
  insertFn: EvidenceInsertFn = defaultInsert,
): Promise<number> {
  if (claims.length === 0) return 0;
  const values = rowsFor(wineId, claims);
  await insertFn(values);
  return values.length;
}
