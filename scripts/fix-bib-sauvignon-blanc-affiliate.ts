import "../lib/load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { wines } from "../lib/schema";
import { buildWineImageAlt } from "../lib/wine-images";
import { generateAndApplyFullEditorial } from "../lib/wine-enrichment";

const WINE_ID = 370;
const PROFITSHARE_URL = "https://l.profitshare.ro/l/16170174";
const EMAG_URL =
  "https://www.emag.ro/vin-alb-budureasca-sauvignon-blanc-demisec-bib-2l-5941976201204/pd/DDSXXMYBM/";
const PRODUCER_URL =
  "https://budureasca.ro/vin-bag-in-box/bag-in-box-sauvignon-blanc/";
const CORRECT_SLUG = "budureasca-bag-in-box-sauvignon-blanc-demisec-2l";
const IMAGE_URL =
  "https://s13emagst.akamaized.net/products/58583/58582132/images/res_ab61c9d0f338dacb5a04d71a5b722c3a.jpg?hash=886F417DB444278C2F3F559FA3010176";

async function main() {
  const name = "Bag in Box 2L Sauvignon Blanc Demisec";
  const emagPrice = 60;
  const producerPrice = 57;

  await db
    .update(wines)
    .set({
      slug: CORRECT_SLUG,
      name,
      type: "white",
      sweetness: "demisec",
      grapeVarieties: [{ name: "Sauvignon Blanc", percentage: 100 }],
      alcohol: 12.5,
      tastingNotes:
        "Vin alb demisec, proaspat si usor de baut, cu note de citrice si mar verde. Format practic de 2 litri, potrivit pentru consum zilnic, gratar sau petreceri.",
      producerPageUrl: PRODUCER_URL,
      sourceUrl: PROFITSHARE_URL,
      submitType: "affiliate",
      priceAvg: emagPrice,
      currentPrice: emagPrice,
      lowestPrice30d: emagPrice,
      imageUrl: IMAGE_URL,
      imageSource: "emag",
      imageAlt: buildWineImageAlt({
        name,
        type: "white",
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
