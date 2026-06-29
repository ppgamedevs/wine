import "server-only";
import { generateObject } from "ai";
import { eq } from "drizzle-orm";
import { getSommelierModel } from "@/lib/ai/model";
import {
  buildEditorialUserPrompt,
  buildRegenerateEditorialUserPrompt,
  EDITORIAL_SYSTEM_PROMPT,
  REGENERATE_EDITORIAL_PROMPT,
} from "@/lib/ai/prompts";
import {
  wineEditorialContentSchema,
  wineEditorialSchema,
  type WineEditorialContentOutput,
  type WineEditorialOutput,
} from "@/lib/ai/schemas";
import { db } from "@/lib/db";
import { wines } from "@/lib/schema";

type WineWithRelations = NonNullable<
  Awaited<ReturnType<typeof loadWineForEditorial>>
>;

async function loadWineForEditorial(wineId: number) {
  return db.query.wines.findFirst({
    where: eq(wines.id, wineId),
    with: { winery: true, region: true },
  });
}

function formatGrapeVarieties(
  grapeVarieties: { name: string }[],
): string {
  return grapeVarieties.map((grape) => grape.name).join(", ");
}

function formatFoodPairings(
  foodPairings: { dish: string; note?: string | null }[],
): string {
  return foodPairings
    .map((pairing) =>
      pairing.note ? `${pairing.dish} (${pairing.note})` : pairing.dish,
    )
    .join("; ");
}

function buildWineEditorialContext(wine: WineWithRelations) {
  return {
    name: wine.name,
    vintage: wine.vintage,
    type: wine.type,
    sweetness: wine.sweetness,
    wineryName: wine.winery?.name ?? null,
    regionName: wine.region?.name ?? null,
    grapeVarieties: formatGrapeVarieties(wine.grapeVarieties),
    tastingNotes: wine.tastingNotes,
    foodPairings: formatFoodPairings(wine.foodPairings),
    priceAvg: wine.priceAvg,
    alcohol: wine.alcohol,
    sugar: wine.sugar,
    acidity: wine.acidity,
    beginnerFriendly: wine.beginnerFriendly,
    cellarPotential: wine.cellarPotential,
    overpricedRisk: wine.overpricedRisk,
    ratingAvg: wine.ratingAvg,
    ratingCount: wine.ratingCount,
  };
}

export function hasMinimumFactualDataForEditorial(
  wine: WineWithRelations,
): boolean {
  if (!wine.name?.trim()) return false;

  const hasProducer = Boolean(wine.winery?.name?.trim());
  const hasRegion = Boolean(wine.region?.name?.trim());
  const hasPrice = wine.priceAvg != null && wine.priceAvg > 0;
  const hasGrapes = wine.grapeVarieties.length > 0;
  const hasTastingNotes = Boolean(wine.tastingNotes?.trim());

  return hasProducer || hasRegion || hasPrice || hasGrapes || hasTastingNotes;
}

async function generateEditorialObject(wine: WineWithRelations) {
  const context = buildWineEditorialContext(wine);

  return generateObject({
    model: getSommelierModel(),
    schema: wineEditorialSchema,
    system: EDITORIAL_SYSTEM_PROMPT,
    prompt: buildEditorialUserPrompt(context),
    temperature: 0.55,
  });
}

async function regenerateEditorialObject(wine: WineWithRelations) {
  const context = buildWineEditorialContext(wine);

  return generateObject({
    model: getSommelierModel(),
    schema: wineEditorialContentSchema,
    system: REGENERATE_EDITORIAL_PROMPT,
    prompt: buildRegenerateEditorialUserPrompt({
      ...context,
      valueScore: wine.valueScore,
      giftScore: wine.giftScore,
      foodMatchScore: wine.foodMatchScore,
      descriptionEditorial: wine.descriptionEditorial,
      tasteProfile: wine.tasteProfile,
    }),
    temperature: 0.5,
  });
}

export async function generateFullEditorialForWine(
  wine: WineWithRelations,
): Promise<WineEditorialOutput> {
  const { object } = await generateEditorialObject(wine);
  return object;
}

export async function regenerateWineEditorialContent(
  wineId: number,
): Promise<{
  slug: string;
  editorial: WineEditorialContentOutput;
}> {
  const wine = await loadWineForEditorial(wineId);

  if (!wine) {
    throw new Error("Vin negasit.");
  }

  if (!hasMinimumFactualDataForEditorial(wine)) {
    throw new Error(
      "Date factuale insuficiente. Adauga producator, regiune, pret sau soiuri.",
    );
  }

  const { object: editorial } = await regenerateEditorialObject(wine);

  await db
    .update(wines)
    .set({
      descriptionEditorial: editorial.descriptionEditorial,
      valueExplanation: editorial.valueExplanation,
      thingsYouShouldKnow: editorial.thingsYouShouldKnow,
      tasteProfile: editorial.tasteProfile,
      foodPairingNotes: editorial.foodPairingNotes,
      recommendedOccasions: editorial.recommendedOccasions,
    })
    .where(eq(wines.id, wine.id));

  return { slug: wine.slug, editorial };
}

export async function applyFullEditorialToWine(
  wineId: number,
  editorial: WineEditorialOutput,
): Promise<void> {
  await db
    .update(wines)
    .set({
      descriptionEditorial: editorial.descriptionEditorial,
      valueExplanation: editorial.valueExplanation,
      thingsYouShouldKnow: editorial.thingsYouShouldKnow,
      tasteProfile: editorial.tasteProfile,
      foodPairingNotes: editorial.foodPairingNotes,
      recommendedOccasions: editorial.recommendedOccasions,
      valueScore: editorial.valueScore,
      giftScore: editorial.giftScore,
      foodMatchScore: editorial.foodMatchScore,
    })
    .where(eq(wines.id, wineId));
}

export { loadWineForEditorial };
