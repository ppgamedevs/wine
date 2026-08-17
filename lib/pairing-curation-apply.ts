/**
 * Admin-only approval write. foodPairings only. No score columns.
 */
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  assertCurationAdmin,
  assertShadowUnchanged,
  buildCurationWritePatch,
  prepareApprovalDrafts,
  toApprovedFoodPairings,
  lockDraftBasis,
  validatePairingDrafts,
  PairingCurationError,
  type PairingDraft,
} from "@/lib/pairing-curation";
import { wines } from "@/lib/schema";
import type { FoodCategoryId } from "@/lib/food-taxonomy";
import { normalizeWineRows } from "@/lib/normalize-wine";
import type { FoodPairing } from "@/lib/schema";
import type { WineWithRelations } from "@/types";
import {
  curationEventFromApproval,
  recordCurationEvents,
} from "@/lib/pairing/curation-events";
import { mapDishToCanonical } from "@/lib/pairing/dish-canonicalize";

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
  const drafts = prepareApprovalDrafts(incoming, wine.foodPairings);
  const issues = validatePairingDrafts(wine, drafts);
  const firstError = issues.find((issue) => issue.level === "error");
  if (firstError) {
    throw new PairingCurationError(firstError.message, {
      dish: firstError.dish,
      code: firstError.code,
    });
  }

  const nextPairings = toApprovedFoodPairings(drafts, wine.foodPairings);
  const patch = buildCurationWritePatch(nextPairings);
  await db.update(wines).set(patch).where(eq(wines.id, wine.id));
  await recordCurationEvents(
    drafts.map((draft) => {
      const mapped = mapDishToCanonical(draft.dish);
      return curationEventFromApproval({
        wineId: wine.id,
        wineSlug: wine.slug,
        proposedDish: draft.originalDish ?? draft.dish,
        proposedRationale: draft.originalRationale ?? draft.rationale,
        proposedStrength: draft.strength,
        proposedBasis: draft.basis,
        finalDish: draft.dish,
        finalRationale: draft.rationale,
        finalStrength: draft.strength,
        finalBasis: draft.basis,
        proposedDishId: draft.dishId ?? mapped.dishId,
        finalDishId: draft.dishId ?? mapped.dishId,
      });
    }),
  );
  return {
    slug: wine.slug,
    wineName: wine.name,
    approvedCount: drafts.length,
    pairings: nextPairings,
  };
}
