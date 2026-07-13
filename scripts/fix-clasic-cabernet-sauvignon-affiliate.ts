import "../lib/load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { wines } from "../lib/schema";
import { upgradeBudureascaImageUrl } from "../lib/budureasca-image-url";
import { buildWineImageAlt } from "../lib/wine-images";
import { generateAndApplyFullEditorial } from "../lib/wine-enrichment";

const WINE_ID = 356;
const PROFITSHARE_URL = "https://l.profitshare.ro/l/16170123";
const EMAG_URL =
  "https://www.emag.ro/vin-rosu-budureasca-clasic-cabernet-sauvignon-sec-0-75l-5940541820079/pd/D551G0YBM/";
const PRODUCER_URL = "https://budureasca.ro/vin-clasic/clasic-cabernet-sauvignon/";
const CORRECT_SLUG = "budureasca-clasic-cabernet-sauvignon-sec-2025";

async function main() {
  const name = "Clasic Cabernet Sauvignon Sec";
  const vintage = 2025;
  const price = 66;
  const imageUrl = upgradeBudureascaImageUrl(
    "https://budureasca.ro/media/catalog/product/b/u/budureasca_clasic_cabernet_sauvignon_main.jpg",
  );

  await db
    .update(wines)
    .set({
      slug: CORRECT_SLUG,
      name,
      vintage,
      type: "red",
      sweetness: "sec",
      grapeVarieties: [{ name: "Cabernet Sauvignon", percentage: 100 }],
      alcohol: 14.5,
      tastingNotes:
        "Culoare rosu rubiniu, cu arome de fructe de padure rosii si note ierboase. Vin corpolent si rotund, cu structura echilibrata, gust proaspat cu note subtile de ardei verde si postgust lung. Se potriveste cu fripturi de porc sau vita, branzeturi maturate sau burgeri.",
      producerPageUrl: PRODUCER_URL,
      sourceUrl: PROFITSHARE_URL,
      submitType: "affiliate",
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
          retailer: "eMAG.ro",
          url: EMAG_URL,
          priceRon: price,
          inStock: true,
          lastCheckedAt: new Date().toISOString(),
        },
        {
          retailer: "Budureasca.ro",
          url: PRODUCER_URL,
          priceRon: 38,
          inStock: true,
          lastCheckedAt: new Date().toISOString(),
        },
      ],
      affiliateLinks: [
        {
          retailer: "eMAG.ro",
          url: PROFITSHARE_URL,
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
