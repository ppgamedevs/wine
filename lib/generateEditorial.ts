import "./load-env";
import { generateObject } from "ai";
import { eq } from "drizzle-orm";
import { getSommelierModel } from "@/lib/ai/model";
import {
  buildEditorialUserPrompt,
  EDITORIAL_SYSTEM_PROMPT,
} from "@/lib/ai/prompts";
import { wineEditorialSchema } from "@/lib/ai/schemas";
import { db } from "@/lib/db";
import { wines } from "@/lib/schema";

type WineRow = Awaited<ReturnType<typeof loadWines>>[number];

function parseArgs() {
  const args = process.argv.slice(2);
  const slugArg = args.find((a) => a.startsWith("--slug="));
  const slug = slugArg?.slice("--slug=".length);
  const force = args.includes("--force");
  return { slug, force };
}

async function loadWines(slug?: string) {
  if (slug) {
    const wine = await db.query.wines.findFirst({
      where: eq(wines.slug, slug),
      with: { winery: true, region: true },
    });
    return wine ? [wine] : [];
  }
  return db.query.wines.findMany({
    with: { winery: true, region: true },
  });
}

function hasEditorial(wine: WineRow): boolean {
  return Boolean(
    wine.descriptionEditorial?.trim() ||
      wine.valueExplanation?.trim() ||
      wine.thingsYouShouldKnow.length > 0,
  );
}

async function generateEditorialForWine(wine: WineRow) {
  const grapeVarieties = wine.grapeVarieties.map((g) => g.name).join(", ");
  const foodPairings = wine.foodPairings
    .map((p) => (p.note ? `${p.dish} (${p.note})` : p.dish))
    .join("; ");

  const { object } = await generateObject({
    model: getSommelierModel(),
    schema: wineEditorialSchema,
    system: EDITORIAL_SYSTEM_PROMPT,
    prompt: buildEditorialUserPrompt({
      name: wine.name,
      vintage: wine.vintage,
      type: wine.type,
      sweetness: wine.sweetness,
      wineryName: wine.winery?.name ?? null,
      regionName: wine.region?.name ?? null,
      grapeVarieties,
      tastingNotes: wine.tastingNotes,
      foodPairings,
      priceAvg: wine.priceAvg,
      alcohol: wine.alcohol,
      sugar: wine.sugar,
      acidity: wine.acidity,
      beginnerFriendly: wine.beginnerFriendly,
      cellarPotential: wine.cellarPotential,
      overpricedRisk: wine.overpricedRisk,
      ratingAvg: wine.ratingAvg,
      ratingCount: wine.ratingCount,
    }),
    temperature: 0.55,
  });

  return object;
}

async function main() {
  const { slug, force } = parseArgs();
  const targetWines = await loadWines(slug);

  if (slug && targetWines.length === 0) {
    console.error(`Vin negasit: ${slug}`);
    process.exit(1);
  }

  console.log(
    `Generating editorial content for ${targetWines.length} wine(s)...`,
  );

  if (targetWines.length === 0) {
    console.log("Baza de date este goala. Ruleaza mai intai: npm run db:seed");
    return;
  }

  let done = 0;
  for (const wine of targetWines) {
    if (!force && hasEditorial(wine)) {
      console.log(`Skip ${wine.slug} (already has editorial)`);
      continue;
    }

    try {
      console.log(`Generating: ${wine.name}...`);
      const editorial = await generateEditorialForWine(wine);

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
        .where(eq(wines.id, wine.id));

      done += 1;
      console.log(
        `  OK ${wine.slug} | Value ${editorial.valueScore} Gift ${editorial.giftScore} Food ${editorial.foodMatchScore}`,
      );
      await sleep(1500);
    } catch (error) {
      console.error(`Failed for ${wine.slug}:`, error);
    }
  }

  console.log(`Done. Generated editorial for ${done} wine(s).`);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error("generateEditorial failed:", error);
  process.exit(1);
});
