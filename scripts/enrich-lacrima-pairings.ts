import "../lib/load-env";
import { eq, inArray } from "drizzle-orm";
import { db } from "../lib/db";
import { wines, type EditorialDessertPairingNote, type EditorialFoodPairingNote } from "../lib/schema";
import { EditorialFactCheckError } from "../lib/editorial-fact-guard";
import {
  applyDessertPairingsToWine,
  generateDessertPairingsForWine,
  generateFullEditorialForWine,
  loadWineForEditorial,
} from "../lib/regenerate-wine-editorial";
import {
  applyEditorialAndScoresToWine,
  mergeEditorialScoresForWine,
} from "../lib/wine-enrichment";

const LACRIMA_SLUGS = [
  "murfatlar-lacrima-lui-ovidiu-rosu",
  "murfatlar-lacrima-lui-ovidiu-roze",
  "murfatlar-lacrima-lui-ovidiu-alb",
];

/** Pairing-uri din asocierea culinară a producătorului (fără inventii). */
const PRODUCER_FOOD_NOTES: Record<string, EditorialFoodPairingNote[]> = {
  "murfatlar-lacrima-lui-ovidiu-rosu": [
    {
      dish: "Patiserie cu crema de vanilie",
      note: "Producatorul recomanda asocierea cu produse de patiserie cu crema de vanilie, dupa masa sau ca aperitiv.",
    },
    {
      dish: "Deserturi dulci",
      note: "Potrivit fisei Murfatlar, se serveste alaturi de deserturi dulci, ca vin de final de masa.",
    },
  ],
  "murfatlar-lacrima-lui-ovidiu-roze": [
    {
      dish: "Deserturi pe baza de fructe",
      note: "Producatorul recomanda deserturi pe baza de fructe sau ciocolata, ca aperitiv sau dupa masa.",
    },
    {
      dish: "Branzeturi sarate",
      note: "Fisa Murfatlar mentioneaza asocierea cu branzeturi sarate, limba rece cu masline sau ciuperci la cuptor.",
    },
    {
      dish: "Ciocolata",
      note: "Recomandare oficiala a producatorului pentru deserturi pe baza de ciocolata.",
    },
  ],
  "murfatlar-lacrima-lui-ovidiu-alb": [
    {
      dish: "Ficat de gasca",
      note: "Producatorul recomanda asocierea cu mancaturi pe baza de ficat de gasca.",
    },
    {
      dish: "Placinta dobrogeana",
      note: "Fisa Murfatlar mentioneaza placinta dobrogeana printre asociatiile culinare.",
    },
    {
      dish: "Branzeturi fine",
      note: "Recomandare oficiala pentru legume si branzeturi fine, sau deserturi in foietaj.",
    },
  ],
};

async function main() {
  const rows = await db.query.wines.findMany({
    where: inArray(wines.slug, LACRIMA_SLUGS),
    columns: { id: true, slug: true },
  });

  for (const row of rows) {
    console.log(`\n=== ${row.slug} ===`);
    const wine = await loadWineForEditorial(row.id);
    if (!wine) {
      throw new Error(`Vin negasit: ${row.slug}`);
    }

    try {
      const editorial = await generateFullEditorialForWine(wine);
      console.log(
        JSON.stringify({
          step: "full-editorial",
          food: editorial.foodPairingNotes?.length ?? 0,
          dessert: editorial.dessertPairings?.length ?? 0,
        }),
      );
      const merged = mergeEditorialScoresForWine(wine, editorial);
      await applyEditorialAndScoresToWine(row.id, editorial, merged);
    } catch (error) {
      if (error instanceof EditorialFactCheckError) {
        console.warn(`[editorial] fact-guard: ${error.violations.join("; ")}`);
      } else {
        throw error;
      }
    }

    const afterEditorial = await loadWineForEditorial(row.id);
    if (!afterEditorial) continue;

    let dessert = afterEditorial.dessertPairings ?? [];
    if (dessert.length === 0) {
      console.log("[dessert] dedicated generation...");
      const generated = await generateDessertPairingsForWine(afterEditorial);
      dessert = generated.dessertPairings;
      await applyDessertPairingsToWine(afterEditorial, dessert);
      console.log(
        JSON.stringify({
          step: "dessert",
          count: dessert.length,
          sample: dessert[0]?.dish ?? null,
        }),
      );
    }

    const foodNotes = PRODUCER_FOOD_NOTES[row.slug] ?? [];
    const currentFood = afterEditorial.foodPairingNotes ?? [];
    if (currentFood.length === 0 && foodNotes.length > 0) {
      await db
        .update(wines)
        .set({ foodPairingNotes: foodNotes })
        .where(eq(wines.id, row.id));
      console.log(
        JSON.stringify({
          step: "producer-food-notes",
          count: foodNotes.length,
        }),
      );
    }
  }

  const check = await db.query.wines.findMany({
    where: inArray(wines.slug, [
      ...LACRIMA_SLUGS,
      "murfatlar-sable-noble-alb",
    ]),
    columns: {
      slug: true,
      name: true,
      alcohol: true,
      priceAvg: true,
      valueScore: true,
      giftScore: true,
      foodMatchScore: true,
      foodPairingNotes: true,
      dessertPairings: true,
      descriptionEditorial: true,
      tasteProfile: true,
      thingsYouShouldKnow: true,
      recommendedOccasions: true,
      affiliateLinks: true,
      status: true,
    },
  });

  console.log("\n=== final ===");
  for (const r of check) {
    console.log(
      JSON.stringify({
        slug: r.slug,
        alcohol: r.alcohol,
        priceAvg: r.priceAvg,
        valueScore: r.valueScore,
        giftScore: r.giftScore,
        foodMatchScore: r.foodMatchScore,
        food: (r.foodPairingNotes ?? []).length,
        dessert: (r.dessertPairings ?? []).length,
        occasions: (r.recommendedOccasions ?? []).length,
        things: (r.thingsYouShouldKnow ?? []).length,
        hasEditorial: Boolean(r.descriptionEditorial?.trim()),
        hasTaste: Boolean(r.tasteProfile?.trim()),
        affiliate: (r.affiliateLinks ?? []).length,
        status: r.status,
      }),
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
