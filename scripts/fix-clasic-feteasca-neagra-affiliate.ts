import "../lib/load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { wines } from "../lib/schema";
import { upgradeBudureascaImageUrl } from "../lib/budureasca-image-url";
import { buildWineImageAlt } from "../lib/wine-images";
import { generateAndApplyFullEditorial } from "../lib/wine-enrichment";

const WINE_ID = 352;
const PROFITSHARE_URL = "https://l.profitshare.ro/l/16170104";
const EMAG_URL =
  "https://www.emag.ro/vin-rosu-budureasca-clasic-feteasca-neagra-demisec-0-75l-5940541820109/pd/DLDM8KYBM/";
const PRODUCER_URL = "https://budureasca.ro/vin-clasic/clasic-feteasca-neagra/";
const CORRECT_SLUG = "budureasca-clasic-feteasca-neagra-demisec-2023";

async function main() {
  const name = "Clasic Fetească Neagră Demisec";
  const vintage = 2023;
  const price = 66;
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
      sweetness: "demisec",
      grapeVarieties: [{ name: "Fetească Neagră", percentage: 100 }],
      alcohol: 14,
      tastingNotes:
        "Culoare rosu rubiniu, cu parfum de fructe de padure negre si accente de piper negru. Gust rotund si fructat, cu taninuri catifelate si final lung. Se potriveste cu carne rosie la gratar, sarmale sau cotlete de porc suculente.",
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
