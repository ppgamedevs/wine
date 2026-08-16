/**
 * Admin-only approval write. foodPairings only. No score columns.
 */
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  assertCurationAdmin,
  assertShadowUnchanged,
  buildCurationWritePatch,
  toApprovedFoodPairings,
  validatePairingDrafts,
  type PairingDraft,
} from "@/lib/pairing-curation";
import { wines } from "@/lib/schema";
import type { FoodCategoryId } from "@/lib/food-taxonomy";
import { normalizeWineRows } from "@/lib/normalize-wine";
import type { WineWithRelations } from "@/types";

export async function approveCuratedPairingsForWine(input: {
  wineId: number;
  drafts: PairingDraft[];
  adminAuthenticated: boolean;
}): Promise<{ slug: string; approvedCount: number }> {
  assertCurationAdmin(input.adminAuthenticated);
  assertShadowUnchanged();

  const rows = await db.query.wines.findMany({
    with: { winery: true, region: true },
    where: eq(wines.id, input.wineId),
  });
  const wine = normalizeWineRows(rows as WineWithRelations[])[0];
  if (!wine || wine.status !== "verified") {
    throw new Error("Vinul nu este disponibil pentru curatare.");
  }

  const drafts = input.drafts.map((draft) => ({
    ...draft,
    category: draft.category as FoodCategoryId,
  }));
  const issues = validatePairingDrafts(wine, drafts);
  if (issues.some((issue) => issue.level === "error")) {
    throw new Error(issues.filter((issue) => issue.level === "error")[0]?.message);
  }

  const nextPairings = toApprovedFoodPairings(drafts, wine.foodPairings);
  const patch = buildCurationWritePatch(nextPairings);
  await db.update(wines).set(patch).where(eq(wines.id, wine.id));
  return { slug: wine.slug, approvedCount: drafts.length };
}
