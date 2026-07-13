import "../lib/load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { wines } from "../lib/schema";
import { buildWineImageAlt } from "../lib/wine-images";
import { generateAndApplyFullEditorial } from "../lib/wine-enrichment";

const WINE_ID = 369;
const PROFITSHARE_URL = "https://l.profitshare.ro/l/16170172";
const EMAG_URL =
  "https://www.emag.ro/vin-rosu-budureasca-cuvee-demisec-bib-2l-5941976202591/pd/DKSXXMYBM/";
const PRODUCER_URL =
  "https://budureasca.ro/vin-bag-in-box/bag-in-box-red-cuvee/";
const CORRECT_SLUG = "budureasca-bag-in-box-red-cuvee-demisec-2l-2022";
const IMAGE_URL =
  "https://s13emagst.akamaized.net/products/58583/58582134/images/res_a9ec75f202d96c234c8d105f76f0f8a7.jpg?hash=7FBAF515DCD7B7A7F2E398D6BA4403B6";

async function main() {
  const name = "Bag in Box 2L Red Cuvée Demisec";
  const vintage = 2022;
  const emagPrice = 60;
  const producerPrice = 57;

  await db
    .update(wines)
    .set({
      slug: CORRECT_SLUG,
      name,
      vintage,
      type: "red",
      sweetness: "demisec",
      grapeVarieties: [
        { name: "Shiraz" },
        { name: "Cabernet Sauvignon" },
        { name: "Merlot" },
      ],
      alcohol: 14,
      tastingNotes:
        "Culoare rosu rubiniu, cu taninuri bine definite de la 6 luni de maturare in butoaie de stejar. Note de stejar si fructe de padure. Se potriveste cu carne la gratar, preparate picante sau branzeturi cu maturare medie.",
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
