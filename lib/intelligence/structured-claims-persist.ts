import { db } from "@/lib/db";
import { wineClaimEvidence } from "@/lib/schema";
import type { StructuredClaimPlanLike } from "@/lib/intelligence/structured-claims-backfill";

type PersistDatabase = typeof db;

/**
 * Insert-only structured-claim persistence. Existing `(wine, field, sourceHash)`
 * rows are left untouched; a repeated plan therefore writes zero rows.
 */
export async function applyStructuredClaims(
  plan: StructuredClaimPlanLike,
  database: PersistDatabase = db,
): Promise<{ inserted: number; skippedExisting: number }> {
  let inserted = 0;
  await database.transaction(async (tx) => {
    for (const write of plan.writes) {
      const rows = await tx
        .insert(wineClaimEvidence)
        .values({
          wineId: write.wineId,
          canonicalIdentityKey: write.canonicalIdentityKey,
          field: write.field,
          valueJson: write.valueJson,
          normalizedValue: write.normalizedValue,
          unit: write.unit,
          sourceUrl: write.sourceUrl,
          sourceTitle: write.sourceTitle,
          sourceClass: write.sourceClass,
          excerpt: write.excerpt,
          observedAt: write.observedAt,
          extractionMethod: write.extractionMethod,
          identityMatchStatus: write.identityMatchStatus,
          verificationStatus: write.verificationStatus as never,
          confidence: write.confidence,
          conflictJson: null,
          sourceHash: write.sourceHash,
          claimHash: write.claimHash,
          updatedAt: new Date().toISOString(),
        })
        .onConflictDoNothing({
          target: [
            wineClaimEvidence.wineId,
            wineClaimEvidence.field,
            wineClaimEvidence.sourceHash,
          ],
        })
        .returning({ id: wineClaimEvidence.id });
      inserted += rows.length;
    }
  });
  return { inserted, skippedExisting: plan.writes.length - inserted };
}
