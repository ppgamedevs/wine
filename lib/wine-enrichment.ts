import { eq } from "drizzle-orm";
import type { WineEditorialOutput } from "@/lib/ai/schemas";
import { db } from "@/lib/db";
import {
  extractProductFromUrl,
  inferImageSourceFromUrl,
} from "@/lib/price-extractor";
import {
  generateFullEditorialForWine,
  hasMinimumFactualDataForEditorial,
  loadWineForEditorial,
} from "@/lib/regenerate-wine-editorial";
import { wines } from "@/lib/schema";
import {
  calculateInitialScores,
  formatScoreProvenance,
  mergeAnalysisScores,
  type MergedAnalysisScores,
} from "@/lib/scoring";
import { buildWineImageAlt } from "@/lib/wine-images";
import type { WineType } from "@/types";

type WineForEditorial = NonNullable<Awaited<ReturnType<typeof loadWineForEditorial>>>;

function mapWineTypeToScoreCategory(type: WineType): string {
  const map: Record<WineType, string> = {
    red: "rosu",
    white: "alb",
    rose: "rose",
    sparkling: "spumant",
    dessert: "desert",
    orange: "orange",
  };
  return map[type];
}

function editorialScoresForMerge(editorial: WineEditorialOutput): {
  valueScore: number;
  giftScore: number;
  foodMatchScore: number;
} {
  return {
    valueScore: Math.min(10, Math.max(1, Math.round(editorial.valueScore / 10))),
    giftScore: Math.min(10, Math.max(1, Math.round(editorial.giftScore / 10))),
    foodMatchScore: Math.min(
      10,
      Math.max(1, Math.round(editorial.foodMatchScore / 10)),
    ),
  };
}

export function mergeEditorialScoresForWine(
  wine: WineForEditorial,
  editorial: WineEditorialOutput,
): MergedAnalysisScores {
  const category = mapWineTypeToScoreCategory(wine.type);
  const price = wine.currentPrice ?? wine.priceAvg ?? 50;
  const grapeVarieties = wine.grapeVarieties.map((grape) => grape.name);

  const ruleScores = calculateInitialScores({
    price: price > 0 ? price : 50,
    category,
    region: wine.region?.name,
    grapeVarieties,
  });

  return mergeAnalysisScores(
    ruleScores,
    price > 0 ? price : 50,
    editorialScoresForMerge(editorial),
  );
}

export async function applyEditorialAndScoresToWine(
  wineId: number,
  editorial: WineEditorialOutput,
  mergedScores: MergedAnalysisScores,
): Promise<void> {
  await db
    .update(wines)
    .set({
      descriptionEditorial: editorial.descriptionEditorial,
      valueExplanation: `${editorial.valueExplanation}\n\n${formatScoreProvenance(mergedScores)}`,
      thingsYouShouldKnow: editorial.thingsYouShouldKnow,
      tasteProfile: editorial.tasteProfile,
      foodPairingNotes: editorial.foodPairingNotes,
      recommendedOccasions: editorial.recommendedOccasions,
      valueScore: mergedScores.valueScore,
      giftScore: mergedScores.giftScore,
      foodMatchScore: mergedScores.foodMatchScore,
      overpricedRisk: mergedScores.overpricedRisk,
      beginnerFriendly: mergedScores.beginnerFriendly,
      cellarPotential: mergedScores.cellarPotential,
    })
    .where(eq(wines.id, wineId));
}

export async function generateAndApplyFullEditorial(
  wineId: number,
): Promise<void> {
  const wine = await loadWineForEditorial(wineId);
  if (!wine) {
    throw new Error("Vin negasit.");
  }

  if (!hasMinimumFactualDataForEditorial(wine)) {
    throw new Error(
      "Date factuale insuficiente pentru generarea editoriala.",
    );
  }

  const editorial = await generateFullEditorialForWine(wine);
  const mergedScores = mergeEditorialScoresForWine(wine, editorial);
  await applyEditorialAndScoresToWine(wineId, editorial, mergedScores);
}

export async function extractAndSaveWineImageIfMissing(
  wineId: number,
): Promise<boolean> {
  const wine = await db.query.wines.findFirst({
    where: eq(wines.id, wineId),
    columns: {
      id: true,
      slug: true,
      name: true,
      type: true,
      vintage: true,
      sourceUrl: true,
      imageUrl: true,
      imageSource: true,
    },
    with: {
      winery: { columns: { name: true } },
    },
  });

  if (!wine?.sourceUrl?.trim() || wine.imageUrl?.trim()) {
    return false;
  }

  if (wine.imageSource === "manual") {
    return false;
  }

  const extracted = await extractProductFromUrl(wine.sourceUrl, {
    allowLlm: true,
  });

  if (!extracted.imageUrl) {
    return false;
  }

  await db
    .update(wines)
    .set({
      imageUrl: extracted.imageUrl,
      imageSource: inferImageSourceFromUrl(extracted.finalUrl),
      imageAlt: buildWineImageAlt({
        name: wine.name,
        vintage: wine.vintage,
        type: wine.type,
        wineryName: wine.winery?.name,
      }),
    })
    .where(eq(wines.id, wineId));

  return true;
}
