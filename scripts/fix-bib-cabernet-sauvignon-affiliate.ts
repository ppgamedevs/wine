import "../lib/load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { wines } from "../lib/schema";
import { buildWineImageAlt } from "../lib/wine-images";
import { generateAndApplyFullEditorial } from "../lib/wine-enrichment";

const WINE_ID = 366;
const PROFITSHARE_URL = "https://l.profitshare.ro/l/16170156";
const EMAG_URL =
  "https://www.emag.ro/vin-rosu-budureasca-cabernet-sauvignon-sec-bib-2l-5941976201174/pd/D7SXXMYBM/";
const PRODUCER_URL =
  "https://budureasca.ro/vin-bag-in-box/bag-in-box-cabernet-sauvignon/";
const CORRECT_SLUG = "budureasca-bag-in-box-cabernet-sauvignon-sec-2l-2023";

async function main() {
  const name = "Bag in Box 2L Cabernet Sauvignon Sec";
  const vintage = 2023;
  const emagPrice = 60;
  const producerPrice = 57;
  const imageUrl =
    "https://s13emagst.akamaized.net/products/58583/58582131/images/res_802818c70cb10cb99a193c639cae6f13.jpg?hash=A6163EDD7E82F52DC7EBA3115791A63A";

  await db
    .update(wines)
    .set({
      slug: CORRECT_SLUG,
      name,
      vintage,
      type: "red",
      sweetness: "sec",
      grapeVarieties: [{ name: "Cabernet Sauvignon", percentage: 100 }],
      alcohol: 14,
      tastingNotes:
        "Culoare rosu rubiniu, elegant, cu arome de fructe de padure si piper negru. Se potriveste cu vita, vanat, miel, porc, carnati, fripturi sau branzeturi.",
      producerPageUrl: PRODUCER_URL,
      sourceUrl: PROFITSHARE_URL,
      submitType: "affiliate",
      priceAvg: emagPrice,
      currentPrice: emagPrice,
      lowestPrice30d: emagPrice,
      imageUrl,
      imageSource: "emag",
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
          priceRon: emagPrice,
          inStock: true,
          lastCheckedAt: new Date().toISOString(),
        },
        {
          retailer: "Budureasca.ro",
          url: PRODUCER_URL,
          priceRon: producerPrice,
          inStock: true,
          lastCheckedAt: new Date().toISOString(),
        },
      ],
      affiliateLinks: [
        {
          retailer: "eMAG.ro",
          url: PROFITSHARE_URL,
          priceRon: emagPrice,
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
