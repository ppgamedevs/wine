/**
 * Persist accepted technical evidence with the value. Fail-soft if table missing.
 * Never used by Prompt 12 recovery scripts.
 */
import { db } from "@/lib/db";
import { wineFactEvidence } from "@/lib/schema";
import type { TechFactClaim } from "@/lib/tech-facts/types";

export async function persistWineFactEvidence(
  wineId: number,
  claims: TechFactClaim[],
): Promise<number> {
  if (claims.length === 0) return 0;
  try {
    await db.insert(wineFactEvidence).values(
      claims.map((claim) => ({
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
        sourceHash: claim.sourceHash,
      })),
    );
    return claims.length;
  } catch {
    return 0;
  }
}
