import "server-only";
import { inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { wineClaimEvidence } from "@/lib/schema";
import type { ComparisonClaim } from "@/lib/sommelier-comparison";

/**
 * Load only verified or supported structured claims for comparison context.
 * A missing table or an unreadable schema fails closed to an empty list; the
 * comparison engine then reports the gap instead of inventing evidence.
 */
export async function loadComparisonClaims(
  wineIds: number[],
): Promise<ComparisonClaim[]> {
  const ids = [...new Set(wineIds.filter((id) => Number.isInteger(id)))].slice(
    0,
    200,
  );
  if (ids.length === 0) return [];

  try {
    const rows = await db
      .select({
        wineId: wineClaimEvidence.wineId,
        field: wineClaimEvidence.field,
        value: wineClaimEvidence.valueJson,
        sourceUrl: wineClaimEvidence.sourceUrl,
        sourceTitle: wineClaimEvidence.sourceTitle,
        confidence: wineClaimEvidence.confidence,
        verificationStatus: wineClaimEvidence.verificationStatus,
      })
      .from(wineClaimEvidence)
      .where(inArray(wineClaimEvidence.wineId, ids))
      .limit(240);

    return rows
      .filter((row) =>
        ["verified_official", "corroborated"].includes(row.verificationStatus),
      )
      .map((row) => ({
        wineId: row.wineId,
        field: row.field,
        value: row.value,
        sourceUrl: row.sourceUrl,
        sourceTitle: row.sourceTitle,
        confidence: row.confidence,
      }));
  } catch (error) {
    console.warn("Comparison claim evidence unavailable", error);
    return [];
  }
}
