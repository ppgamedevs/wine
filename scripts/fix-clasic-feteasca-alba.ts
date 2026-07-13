import "../lib/load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { wines } from "../lib/schema";
import { upgradeBudureascaImageUrl } from "../lib/budureasca-image-url";
import { buildWineImageAlt } from "../lib/wine-images";
import { generateAndApplyFullEditorial } from "../lib/wine-enrichment";

const WINE_ID = 357;
const PRODUCER_URL = "https://budureasca.ro/vin-clasic/clasic-feteasca-alba/";
const CORRECT_SLUG = "budureasca-clasic-feteasca-alba-sec-2023";

async function main() {
  const name = "Clasic Fetească Albă Sec";
  const vintage = 2023;
  const price = 27;
  const imageUrl = upgradeBudureascaImageUrl(
    "https://budureasca.ro/media/catalog/product/b/u/budureasca_clasic_feteasca_alba_main.jpg",
  );

  await db
    .update(wines)
    .set({
      slug: CORRECT_SLUG,
      name,
      vintage,
      type: "white",
      sweetness: "sec",
      grapeVarieties: [{ name: "Fetească Albă", percentage: 100 }],
      alcohol: 13,
      tastingNotes:
        "Culoare galben pai, cu arome proaspete de fructe de vara, pere si piersici coapte. Gust proaspat, cu elemente de pară coapta, aciditate persistenta si final fresh. Se potriveste cu peste, carne alba, salate sau branzeturi proaspete.",
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
