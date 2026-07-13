import "../lib/load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { buildWineImageAlt } from "../lib/wine-images";
import { generateAndApplyFullEditorial } from "../lib/wine-enrichment";
import { wines } from "../lib/schema";

const WINE_ID = 373;
const PROFITSHARE_URL = "https://l.profitshare.ro/l/16170221";
const EMAG_URL =
  "https://www.emag.ro/vin-rose-crama-gabai-sec-0-75l-6427921000010/pd/DV709HYBM/";
const PRODUCER_URL = "https://cramagabai.ro/product/pinot-rose/";
const CORRECT_SLUG = "crama-gabai-vin-rose-sec-pinot-rose-2020";

async function main() {
  const name = "Vin Rose Sec – Pinot Rose";
  const vintage = 2020;
  const price = 60;
  const producerPrice = 55;
  const imageUrl =
    "https://cramagabai.ro/wp-content/uploads/2021/10/Crama-Gabai-Sweet-Pinot-Rose-2020-111-1.jpg";

  await db
    .update(wines)
    .set({
      slug: CORRECT_SLUG,
      name,
      vintage,
      type: "rose",
      sweetness: "sec",
      grapeVarieties: [{ name: "Pinot Noir" }],
      alcohol: 12.5,
      tastingNotes:
        "Roz-mango pal. Olfactiv discret, cu note de fructe de padure rosii, visine si kirsch, floare de bujor si pomelo roz. Sec si proaspat, cu aciditate sprintara si textura moale, matasoasa. Postgust proaspat cu coacaze rosii si coaja de pomelo.",
      producerPageUrl: PRODUCER_URL,
      sourceUrl: PROFITSHARE_URL,
      submitType: "affiliate",
      imageUrl,
      imageSource: "gabai",
      imageAlt: buildWineImageAlt({
        name,
        vintage,
        type: "rose",
        wineryName: "Crama Gabai",
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
          retailer: "Crama Gabai",
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
      imageSource: true,
      producerPageUrl: true,
      affiliateLinks: true,
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
