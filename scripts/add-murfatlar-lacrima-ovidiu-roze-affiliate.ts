import "../lib/load-env";
import { eq, or } from "drizzle-orm";
import { db } from "../lib/db";
import {
  AFFILIATE_SOURCE_BADGE,
  regions,
  wineries,
  wines,
} from "../lib/schema";
import { updatePrice } from "../lib/price-tracker";
import { calculateInitialScores } from "../lib/scoring";
import { generateAndApplyFullEditorial } from "../lib/wine-enrichment";
import { buildWineImageAlt } from "../lib/wine-images";
import { buildWineSlug } from "../lib/wine-url";

const PROFITSHARE_URL = "https://l.profitshare.ro/l/16559497";
const EMAG_URL =
  "https://www.emag.ro/vin-roze-licoros-lacrima-lui-ovidiu-murfatlar-vinul-0-75l-alcrovinw043/pd/DBTGR6YBM/";
const PRODUCER_PAGE_URL = "https://murfatlar-vinul.ro/lacrima-lui-ovidiu/";
const IMAGE_URL =
  "https://murfatlar-vinul.ro/wp-content/uploads/2024/07/Lacrima-Rose-HR-scaled.jpg";
const NAME = "Lacrima lui Ovidiu Roze";
const PRICE = 41;
const ALCOHOL = 15;
const GRAPE_VARIETIES = [
  { name: "Pinot Noir" },
  { name: "Feteasca Neagra" },
  { name: "Cabernet Sauvignon" },
  { name: "Merlot" },
];
const TASTING_NOTES =
  "Culoare: roz intens cu nuante delicate de caramiziu. Miros: placut, imbietor, de buchet de vin invechit, cu note de vanilie si stejar. Gust: catifelat, suplu, savuros, dulce, cu aciditate ridicata, echilibrat, imbogatit cu note de stejar si vanilie, gust final savuros si indelungat. Temperatura de servire: 7-8C.";
const CULINARY_PAIRINGS =
  "Se poate servi ca aperitiv sau dupa masa. Ideal alaturi de deserturi pe baza de fructe sau ciocolata, branzeturi sarate, limba rece cu masline, ciuperci la cuptor.";

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
    sweetness: "dulce",
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
      sweetness: "dulce",
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
    console.warn(
      "[add-murfatlar-lacrima-ovidiu-roze] editorial skip:",
      error instanceof Error ? error.message : error,
    );
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
      sourceUrl: true,
      producerPageUrl: true,
      affiliateLinks: true,
    },
  });

  console.log(JSON.stringify({ status: "created", ...wine }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
