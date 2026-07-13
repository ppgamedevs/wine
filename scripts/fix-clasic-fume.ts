import "../lib/load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { wines } from "../lib/schema";
import { upgradeBudureascaImageUrl } from "../lib/budureasca-image-url";
import { buildWineImageAlt } from "../lib/wine-images";
import { generateAndApplyFullEditorial } from "../lib/wine-enrichment";

const WINE_ID = 351;
const PRODUCER_URL = "https://budureasca.ro/vin-clasic/clasic-fume/";
const CORRECT_SLUG = "budureasca-clasic-fume-demisec-2025";

async function main() {
  const name = "Clasic FUME Demisec";
  const vintage = 2025;
  const price = 38;
  const imageUrl = upgradeBudureascaImageUrl(
    "https://budureasca.ro/media/catalog/product/b/u/budureasca_clasic_fume_main.jpg",
  );

  await db
    .update(wines)
    .set({
      slug: CORRECT_SLUG,
      name,
      vintage,
      type: "white",
      sweetness: "demisec",
      grapeVarieties: [
        { name: "Chardonnay" },
        { name: "Sauvignon Blanc" },
        { name: "Fetească Regală" },
        { name: "Pinot Gris" },
      ],
      alcohol: 13,
      tastingNotes:
        "Culoare galben pal, cu arome de ananas si pere zemoase. Gust rotund si echilibrat, cu note delicate fumate de la fermentatia in butoaie de stejar. Se potriveste cu carne alba, peste gras, fructe de mare, paste cu branzeturi sau piept de pui la gratar.",
      producerPageUrl: PRODUCER_URL,
      sourceUrl: PRODUCER_URL,
      submitType: "producer",
      priceAvg: price,
      currentPrice: price,
      lowestPrice30d: price,
      imageUrl,
      imageSource: "producer",
      imageAlt: buildWineImageAlt({
        name,
        vintage,
        type: "white",
        wineryName: "Budureasca",
      }),
      availability: [
        {
          retailer: "Budureasca.ro",
          url: PRODUCER_URL,
          priceRon: price,
          inStock: true,
          lastCheckedAt: new Date().toISOString(),
        },
      ],
      affiliateLinks: [
        {
          retailer: "Budureasca.ro",
          url: PRODUCER_URL,
          priceRon: price,
        },
      ],
    })
    .where(eq(wines.id, WINE_ID));

  await generateAndApplyFullEditorial(WINE_ID);

  const wine = await db.query.wines.findFirst({
    where: eq(wines.id, WINE_ID),
    columns: {
      slug: true,
      name: true,
      type: true,
      vintage: true,
      priceAvg: true,
      valueScore: true,
      imageUrl: true,
      producerPageUrl: true,
    },
  });

  console.log(JSON.stringify({ status: "fixed", ...wine }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
