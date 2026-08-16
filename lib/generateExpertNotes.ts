import "./load-env";
import { generateObject } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getSommelierModel } from "@/lib/ai/model";
import {
  buildExpertNotesUserPrompt,
  EXPERT_NOTES_SYSTEM_PROMPT,
} from "@/lib/ai/prompts";
import { db } from "@/lib/db";
import { sanitizeExpertNotesForDownstream } from "@/lib/editorial-claim-validator";
import { wines, type ExpertNotes } from "@/lib/schema";

const expertNotesSchema = z.object({
  history: z.string().default(""),
  terroirSecrets: z.string().default(""),
  vintageQuirks: z.string().default(""),
  pairingScience: z.string().default(""),
  commonMistakes: z.string().default(""),
  agingPotential: z.string().default(""),
  valueInsight: z.string().default(""),
  thingsYouShouldKnow: z.array(z.string()).max(5).default([]),
});

function getModel() {
  return getSommelierModel();
}

async function generateNotesForWine(
  wine: Awaited<ReturnType<typeof loadWines>>[number],
): Promise<ExpertNotes> {
  const grapeVarieties = wine.grapeVarieties
    .map((g) => g.name)
    .join(", ");
  const foodPairings = wine.foodPairings.map((p) => p.dish).join(", ");

  const { object } = await generateObject({
    model: getModel(),
    schema: expertNotesSchema,
    system: EXPERT_NOTES_SYSTEM_PROMPT,
    prompt: buildExpertNotesUserPrompt({
      name: wine.name,
      vintage: wine.vintage,
      type: wine.type,
      sweetness: wine.sweetness,
      wineryName: wine.winery?.name ?? null,
      regionName: wine.region?.name ?? null,
      grapeVarieties,
      tastingNotes: wine.tastingNotes,
      foodPairings,
      valueScore: wine.valueScore,
      giftScore: wine.giftScore,
      foodMatchScore: wine.foodMatchScore,
      priceAvg: wine.priceAvg,
      alcohol: wine.alcohol,
      acidity: wine.acidity,
    }),
    temperature: 0.5,
  });

  return (
    sanitizeExpertNotesForDownstream(object, {
      type: wine.type,
      sweetness: wine.sweetness,
      grapeVarieties: wine.grapeVarieties,
      regionName: wine.region?.name ?? null,
      wineryName: wine.winery?.name ?? null,
      vintage: wine.vintage,
      tastingNotes: wine.tastingNotes,
      producerContent: wine.producerContent,
      producerPageUrl: wine.producerPageUrl,
      tastingSheetUrl: wine.tastingSheetUrl,
      alcohol: wine.alcohol,
      acidity: wine.acidity,
      sugar: wine.sugar,
      foodPairings: wine.foodPairings,
      medals: wine.medals,
    }) ?? {
      history: "",
      terroirSecrets: "",
      vintageQuirks: "",
      pairingScience: "",
      commonMistakes: "",
      agingPotential: "",
      valueInsight: "",
      thingsYouShouldKnow: [],
    }
  );
}

async function loadWines() {
  return db.query.wines.findMany({
    with: { winery: true, region: true },
  });
}

async function main() {
  const allWines = await loadWines();
  console.log(`Generating expert_notes for ${allWines.length} wines...`);

  if (allWines.length === 0) {
    console.log(
      "Baza de date este goala. Ruleaza mai intai: npm run db:seed",
    );
    return;
  }

  let done = 0;
  for (const wine of allWines) {
    if (wine.expertNotes) {
      console.log(`Skip ${wine.slug} (already has expert_notes)`);
      continue;
    }

    try {
      console.log(`Generating: ${wine.name}...`);
      const notes = await generateNotesForWine(wine);
      await db
        .update(wines)
        .set({ expertNotes: notes })
        .where(eq(wines.id, wine.id));
      done += 1;
      await sleep(1200);
    } catch (error) {
      console.error(`Failed for ${wine.slug}:`, error);
    }
  }

  console.log(`Done. Generated expert_notes for ${done} wines.`);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error("generateExpertNotes failed:", error);
  process.exit(1);
});
