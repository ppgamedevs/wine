import "../lib/load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { wines } from "../lib/schema";
import { upgradeBudureascaImageUrl } from "../lib/budureasca-image-url";
import { buildWineImageAlt } from "../lib/wine-images";
import { generateAndApplyFullEditorial } from "../lib/wine-enrichment";

const WINE_ID = 365;
const PRODUCER_URL = "https://budureasca.ro/vin-cuvee-regia/cuvee-regia-blanc/";
const CORRECT_SLUG = "budureasca-cuvee-regia-blanc-demisec-screw-cap-2023";

async function main() {
  const name = "Cuvée Regia Blanc Demisec (screw-cap)";
  const vintage = 2023;
  const price = 22;
  const imageUrl = upgradeBudureascaImageUrl(
    "https://budureasca.ro/media/catalog/product/c/u/cuvee_regia_bl.jpg",
  );

  await db
    .update(wines)
    .set({
      slug: CORRECT_SLUG,
      name,
      vintage,
      type: "white",
      sweetness: "demisec",
      regionId: 49,
      grapeVarieties: [
        { name: "Sauvignon Blanc" },
        { name: "Tămâioasă Românească" },
        { name: "Fetească Regală" },
      ],
      alcohol: 12.5,
      tastingNotes:
        "Corp mediu, culoare galben pai stralucitor, cu arome de piersici proaspete si pepene galben. Gust fructat si dulceag, cu aciditate proaspata si crocanta si final persistent. Se potriveste ca aperitiv sau cu branzeturi proaspete, peste sau carne alba de pasare.",
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
