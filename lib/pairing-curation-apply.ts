/**
 * Admin-only approval write. foodPairings only. No score columns.
 */
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  assertCurationAdmin,
  assertShadowUnchanged,
  buildCurationWritePatch,
  draftMatchesExistingPairing,
  toApprovedFoodPairings,
  lockDraftBasis,
  validatePairingDrafts,
  type PairingDraft,
} from "@/lib/pairing-curation";
import { wines } from "@/lib/schema";
import type { FoodCategoryId } from "@/lib/food-taxonomy";
import { normalizeWineRows } from "@/lib/normalize-wine";
import type { FoodPairing } from "@/lib/schema";
import type { WineWithRelations } from "@/types";

export async function approveCuratedPairingsForWine(input: {
  wineId: number;
  drafts: PairingDraft[];
  adminAuthenticated: boolean;
}): Promise<{
  slug: string;
  wineName: string;
  approvedCount: number;
  pairings: FoodPairing[];
}> {
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

  const incoming = input.drafts.map((draft) =>
    lockDraftBasis(wine, {
      ...draft,
      category: draft.category as FoodCategoryId,
      provenanceLocked: draft.provenanceLocked ?? true,
    }),
  );
  const drafts = incoming.filter(
    (draft) => !draftMatchesExistingPairing(draft, wine.foodPairings),
  );
  if (drafts.length === 0) {
    throw new Error("Toate asocierile selectate sunt deja aprobate.");
  }
  const issues = validatePairingDrafts(wine, drafts);
  if (issues.some((issue) => issue.level === "error")) {
    throw new Error(issues.filter((issue) => issue.level === "error")[0]?.message);
  }

  const nextPairings = toApprovedFoodPairings(drafts, wine.foodPairings);
  const patch = buildCurationWritePatch(nextPairings);
  await db.update(wines).set(patch).where(eq(wines.id, wine.id));
  return {
    slug: wine.slug,
    wineName: wine.name,
    approvedCount: drafts.length,
    pairings: nextPairings,
  };
}
