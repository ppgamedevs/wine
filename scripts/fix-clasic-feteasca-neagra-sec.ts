import "../lib/load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { wines } from "../lib/schema";
import { upgradeBudureascaImageUrl } from "../lib/budureasca-image-url";
import { buildWineImageAlt } from "../lib/wine-images";
import { generateAndApplyFullEditorial } from "../lib/wine-enrichment";

const WINE_ID = 358;
const PRODUCER_URL = "https://budureasca.ro/vin-clasic/clasic-feteasca-neagra/";
const CORRECT_SLUG = "budureasca-clasic-feteasca-neagra-sec-2021";

async function main() {
  const name = "Clasic Fetească Neagră Sec";
  const vintage = 2021;
  const price = 27;
  const imageUrl = upgradeBudureascaImageUrl(
    "https://budureasca.ro/media/catalog/product/b/u/budureasca_clasic_feteasca_neagra_main.jpg",
  );

  await db
    .update(wines)
    .set({
      slug: CORRECT_SLUG,
      name,
      vintage,
      type: "red",
      sweetness: "sec",
      grapeVarieties: [{ name: "Fetească Neagră", percentage: 100 }],
      alcohol: 14.5,
      tastingNotes:
        "Culoare rosu rubiniu intens, cu note fructate de prune si mure bine coapte. Gust rotund, dominat de fructe negre de padure, cu taninuri delicate si postgust lung. Se potriveste cu vita si porc, carnati romanesti, sarmale sau coaste de porc la gratar.",
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
        type: "red",
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
      sweetness: true,
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
