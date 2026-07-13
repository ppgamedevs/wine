import "../lib/load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { wines } from "../lib/schema";
import { upgradeBudureascaImageUrl } from "../lib/budureasca-image-url";
import { buildWineImageAlt } from "../lib/wine-images";
import { generateAndApplyFullEditorial } from "../lib/wine-enrichment";

const WINE_ID = 350;
const PROFITSHARE_URL = "https://l.profitshare.ro/l/16170095";
const EMAG_URL =
  "https://www.emag.ro/vin-rose-budureasca-clasic-demisec-0-75l-5940541820062/pd/DQDM8KYBM/";
const CORRECT_SLUG = "budureasca-clasic-rose-demisec-2024";

async function main() {
  const name = "Clasic Rosé Demisec";
  const vintage = 2024;
  const price = 66;
  const imageUrl = upgradeBudureascaImageUrl(
    "https://budureasca.ro/media/catalog/product/b/u/budureasca_clasic_rose_main.jpg",
  );

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
      alcohol: 12.5,
      tastingNotes:
        "Un vin fresh, cu culoare roz pal si arome de pere proaspata si zmeura. Gust placut de fructe de vara coapte, echilibrat, cu aciditate proaspata si postgust lung. Se potriveste cu fructe de mare, branzeturi proaspete si salate.",
      producerPageUrl: "https://budureasca.ro/vin-clasic/clasic-rose/",
      sourceUrl: PROFITSHARE_URL,
      submitType: "affiliate",
      imageUrl,
      imageSource: "producer",
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
          priceRon: price,
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
