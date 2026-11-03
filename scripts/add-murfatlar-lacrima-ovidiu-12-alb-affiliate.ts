import "../lib/load-env";
import { eq, or } from "drizzle-orm";
import { db } from "../lib/db";
import {
  AFFILIATE_SOURCE_BADGE,
  regions,
  wineries,
  wines,
  type EditorialFoodPairingNote,
} from "../lib/schema";
import { EditorialFactCheckError } from "../lib/editorial-fact-guard";
import { updatePrice } from "../lib/price-tracker";
import {
  applyDessertPairingsToWine,
  generateDessertPairingsForWine,
  loadWineForEditorial,
} from "../lib/regenerate-wine-editorial";
import { calculateInitialScores } from "../lib/scoring";
import { generateAndApplyFullEditorial } from "../lib/wine-enrichment";
import { buildWineImageAlt } from "../lib/wine-images";
import { buildWineSlug } from "../lib/wine-url";

const PROFITSHARE_URL = "https://l.profitshare.ro/l/16559567";
const EMAG_URL =
  "https://www.emag.ro/lacrima-lui-ovidiu-12-ani-alb-licoros-murfatlar-0-75l-4560/pd/DQYMWB3BM/";
const PRODUCER_PAGE_URL = "https://murfatlar-vinul.ro/lacrima-lui-ovidiu-12/";
const IMAGE_URL =
  "https://murfatlar-vinul.ro/wp-content/uploads/2024/09/lacrima-12.png";
const NAME = "Lacrima lui Ovidiu 12 Alb";
const PRICE = 163;
const GRAPE_VARIETIES = [
  { name: "Chardonnay" },
  { name: "Pinot Gris" },
  { name: "Muscat Ottonel" },
];
const TASTING_NOTES =
  "Culoare: limpede, chihlimbar-auriu. Miros: foarte placut, buchet si stejar, fin, foarte apreciat olfactiv. Gust: foarte placut, lejer, cu un intreg spectru de arome foarte fine, cu postgust remanent. Intensitatea buchetului si dulceata fac ca acest vin sa ofere o experienta de degustare deosebita. Temperatura de servire: 6-7C.";
const CULINARY_PAIRINGS =
  "Se poate servi ca desert sau savura in orice moment, in o companie placuta.";
const PRODUCER_FOOD_NOTES: EditorialFoodPairingNote[] = [
  {
    dish: "Desert",
    note: "Producatorul recomanda servirea ca desert sau savurarea in orice moment, in o companie placuta.",
  },
];

async function main() {
  const slug = buildWineSlug({
    producer: "Murfatlar",
    name: NAME,
    vintage: null,
  });

  const existing = await db.query.wines.findFirst({
    where: or(
      eq(wines.slug, slug),
      eq(wines.sourceUrl, PROFITSHARE_URL),
      eq(wines.sourceUrl, EMAG_URL),
    ),
    columns: { id: true, slug: true, name: true },
  });
  if (existing) {
    console.log(
      JSON.stringify(
        {
          status: "existing",
          id: existing.id,
          slug: existing.slug,
          message: "Vinul exista deja.",
        },
        null,
        2,
      ),
    );
    return;
  }

  const winery = await db.query.wineries.findFirst({
    where: eq(wineries.slug, "murfatlar"),
    columns: { id: true, name: true },
  });
  if (!winery) {
    throw new Error("Crama Murfatlar nu exista in catalog.");
  }

  const region = await db.query.regions.findFirst({
    where: eq(regions.slug, "murfatlar"),
    columns: { id: true },
  });

  const checkedAt = new Date().toISOString();
  const initialScores = calculateInitialScores({
    price: PRICE,
    category: "white",
    region: "Murfatlar",
    grapeVarieties: GRAPE_VARIETIES.map((grape) => grape.name),
    sweetness: "dulce",
    wineryName: winery.name,
  });

  const [created] = await db
    .insert(wines)
    .values({
      slug,
      name: NAME,
      wineryId: winery.id,
      regionId: region?.id ?? null,
      type: "white",
      sweetness: "dulce",
      grapeVarieties: GRAPE_VARIETIES,
      priceAvg: PRICE,
      currentPrice: PRICE,
      lowestPrice30d: PRICE,
      valueScore: initialScores.valueScore,
      valueScoreVersion: 2,
      giftScore: initialScores.giftScore,
      foodMatchScore: initialScores.foodMatchScore,
      beginnerFriendly: initialScores.beginnerFriendly,
      cellarPotential: initialScores.cellarPotential,
      overpricedRisk: initialScores.overpricedRisk,
      tastingNotes: TASTING_NOTES,
      sourceUrl: PROFITSHARE_URL,
      producerPageUrl: PRODUCER_PAGE_URL,
      submittedBy: "admin-cli",
      submitType: "affiliate",
      status: "verified",
      sourceBadge: AFFILIATE_SOURCE_BADGE,
      imageUrl: IMAGE_URL,
      imageSource: "producer",
      imageAlt: buildWineImageAlt({
        name: NAME,
        wineryName: winery.name,
        type: "white",
      }),
      availability: [
        {
          retailer: "eMAG.ro",
          url: EMAG_URL,
          priceRon: PRICE,
          inStock: true,
          lastCheckedAt: checkedAt,
        },
      ],
      affiliateLinks: [
        {
          retailer: "eMAG.ro",
          url: PROFITSHARE_URL,
          priceRon: PRICE,
        },
      ],
      producerContent: {
        tastingNotes: TASTING_NOTES,
        culinaryPairings: CULINARY_PAIRINGS,
        sourceUrls: [PRODUCER_PAGE_URL],
        extractedAt: checkedAt,
        sourceType: "producer_page",
        extractionMethod: "deterministic",
      },
    })
    .returning({ id: wines.id, slug: wines.slug });

  await updatePrice(created.id, PRICE, EMAG_URL);

  try {
    await generateAndApplyFullEditorial(created.id);
  } catch (error) {
    if (error instanceof EditorialFactCheckError) {
      console.warn(`[editorial] fact-guard: ${error.violations.join("; ")}`);
    } else {
      throw error;
    }
  }

  const loaded = await loadWineForEditorial(created.id);
  if (loaded && (loaded.dessertPairings ?? []).length === 0) {
    const dessert = await generateDessertPairingsForWine(loaded);
    await applyDessertPairingsToWine(loaded, dessert.dessertPairings);
  }

  const current = await db.query.wines.findFirst({
    where: eq(wines.id, created.id),
    columns: { foodPairingNotes: true },
  });
  if ((current?.foodPairingNotes ?? []).length === 0) {
    await db
      .update(wines)
      .set({ foodPairingNotes: PRODUCER_FOOD_NOTES })
      .where(eq(wines.id, created.id));
  }

  const wine = await db.query.wines.findFirst({
    where: eq(wines.id, created.id),
    columns: {
      id: true,
      slug: true,
      name: true,
      type: true,
      sweetness: true,
      priceAvg: true,
      valueScore: true,
      giftScore: true,
      foodMatchScore: true,
      descriptionEditorial: true,
      foodPairingNotes: true,
      dessertPairings: true,
      sourceUrl: true,
      producerPageUrl: true,
      affiliateLinks: true,
    },
  });

  console.log(
    JSON.stringify(
      {
        status: "created",
        ...wine,
        hasEditorial: Boolean(wine?.descriptionEditorial?.trim()),
        foodCount: (wine?.foodPairingNotes ?? []).length,
        dessertCount: (wine?.dessertPairings ?? []).length,
      },
      null,
      2,
    ),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
