import "../lib/load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { wines } from "../lib/schema";
import { buildWineImageAlt } from "../lib/wine-images";
import { generateAndApplyFullEditorial } from "../lib/wine-enrichment";

const WINE_ID = 367;
const PROFITSHARE_URL = "https://l.profitshare.ro/l/16170170";
const EMAG_URL =
  "https://www.emag.ro/vin-alb-budureasca-fume-demisec-bib-2l-5941976202447/pd/D2SXXMYBM/";
const PRODUCER_URL = "https://budureasca.ro/vin-bag-in-box/bag-in-box-fume/";
const CORRECT_SLUG = "budureasca-bag-in-box-fume-demisec-2l-2024";
const IMAGE_URL =
  "https://s13emagst.akamaized.net/products/58583/58582130/images/res_860ec4fdc3a5782439a06f51650ca64f.jpg?hash=D0116232DC2C21267A1D0C3892A5EE0E";

async function main() {
  const name = "Bag in Box 2L FUME Demisec";
  const vintage = 2024;
  const emagPrice = 60;
  const producerPrice = 57;

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
        "Culoare galbena, cu arome de pepene galben coapta si note de stejar afumat. Gust fructat, cu final persistent. Se potriveste cu carne alba, peste, fructe de mare, paste, salata Caesar sau platouri de branzeturi.",
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
        vintage,
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
