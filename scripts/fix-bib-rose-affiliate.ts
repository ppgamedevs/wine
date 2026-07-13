import "../lib/load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { wines } from "../lib/schema";
import { buildWineImageAlt } from "../lib/wine-images";
import { generateAndApplyFullEditorial } from "../lib/wine-enrichment";

const WINE_ID = 368;
const PROFITSHARE_URL = "https://l.profitshare.ro/l/16170171";
const EMAG_URL =
  "https://www.emag.ro/vin-rose-budureasca-demisec-bib-2l-5941976201181/pd/DNSXXMYBM/";
const PRODUCER_URL = "https://budureasca.ro/vin-bag-in-box/bag-in-box-rose/";
const CORRECT_SLUG = "budureasca-bag-in-box-rose-demisec-2l-2024";
const IMAGE_URL =
  "https://s13emagst.akamaized.net/products/58583/58582135/images/res_2b72f0eaf5842bbcc844cdf9221a7027.jpg?hash=5AD07890B5517C6F4D20F2FE1BC5933F";

async function main() {
  const name = "Bag in Box 2L Rosé Demisec";
  const vintage = 2024;
  const emagPrice = 55;
  const producerPrice = 57;

  await db
    .update(wines)
    .set({
      slug: CORRECT_SLUG,
      name,
      vintage,
      type: "rose",
      sweetness: "demisec",
      grapeVarieties: [
        { name: "Fetească Neagră" },
        { name: "Cabernet Sauvignon" },
        { name: "Merlot" },
        { name: "Pinot Noir" },
      ],
      alcohol: 13,
      tastingNotes:
        "Culoare roz pal, cu arome de capsuni, zmeura si cirese de padure cu accente de trandafir. Aciditate proaspata si postgust lung, curat. Se potriveste cu pui, curcan, carne alba, fructe de mare, peste, salate sau branzeturi proaspete.",
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
        type: "rose",
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
