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
import { calculateInitialScores } from "../lib/scoring";
import { generateAndApplyFullEditorial } from "../lib/wine-enrichment";
import { buildWineImageAlt } from "../lib/wine-images";
import { buildWineSlug } from "../lib/wine-url";

const PROFITSHARE_URL = "https://l.profitshare.ro/l/16559564";
const EMAG_URL =
  "https://www.emag.ro/vin-roze-aerosoli-feteasca-neagra-pinot-noir-750-ml-12-vol-sec-doc-cmd-murfatlar-alcrovinw039/pd/D47J5XYBM/";
const PRODUCER_PAGE_URL = "https://murfatlar-vinul.ro/aerosoli/";
const IMAGE_URL =
  "https://murfatlar-vinul.ro/wp-content/uploads/2025/06/Aerosoli-poze-site-roze.png";
const NAME = "Aerosoli Roze";
const PRICE = 39;
const ALCOHOL = 12;
const GRAPE_VARIETIES = [
  { name: "Feteasca Neagra" },
  { name: "Pinot Noir" },
];
const TASTING_NOTES =
  "Culoare: roz deschis cu nuante de piersica. Miros: fructat si condimentat cu note florale. Gust: placut, de zmeura, imbogatit cu citrice (pomelo si grapefruit). Temperatura de servire: 7-8C.";
const CULINARY_PAIRINGS =
  "Un vin creat pentru preparate din peste si fructe de mare, carne alba, branza proaspata, preparate mediteraneene usoare.";
const PRODUCER_FOOD_NOTES: EditorialFoodPairingNote[] = [
  {
    dish: "Peste si fructe de mare",
    note: "Producatorul recomanda asocierea cu preparate din peste si fructe de mare.",
  },
  {
    dish: "Carne alba",
    note: "Fisa Murfatlar mentioneaza carne alba printre asociatiile culinare.",
  },
  {
    dish: "Branza proaspata",
    note: "Recomandare oficiala pentru branza proaspata si preparate mediteraneene usoare.",
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
    category: "rose",
    region: "Murfatlar",
    grapeVarieties: GRAPE_VARIETIES.map((grape) => grape.name),
    sweetness: "sec",
    wineryName: winery.name,
    alcohol: ALCOHOL,
  });

  const [created] = await db
    .insert(wines)
    .values({
      slug,
      name: NAME,
      wineryId: winery.id,
      regionId: region?.id ?? null,
      type: "rose",
      sweetness: "sec",
      grapeVarieties: GRAPE_VARIETIES,
      alcohol: ALCOHOL,
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
        type: "rose",
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
      alcohol: true,
      priceAvg: true,
      valueScore: true,
      giftScore: true,
      foodMatchScore: true,
      descriptionEditorial: true,
      foodPairingNotes: true,
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
