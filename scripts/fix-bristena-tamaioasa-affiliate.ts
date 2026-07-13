import "../lib/load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { wines } from "../lib/schema";
import { upgradeBudureascaImageUrl } from "../lib/budureasca-image-url";
import { buildWineImageAlt } from "../lib/wine-images";
import { generateAndApplyFullEditorial } from "../lib/wine-enrichment";

const WINE_ID = 349;
const PROFITSHARE_URL = "https://l.profitshare.ro/l/16170087";
const EMAG_URL =
  "https://www.emag.ro/vin-alb-budureasca-bristena-tamaioasa-romaneasca-demidulce-0-75l-5940541820178/pd/DCDM8KYBM/";
const CORRECT_SLUG = "budureasca-bristena-tamaioasa-romaneasca-demidulce-2024";

async function main() {
  const name = "Bristena Tămâioasă Românească Demidulce";
  const vintage = 2024;
  const price = 42;
  const imageUrl = upgradeBudureascaImageUrl(
    "https://budureasca.ro/media/catalog/product/b/r/bristena_tamaioasa_romaneasca_front.jpg",
  );

  await db
    .update(wines)
    .set({
      slug: CORRECT_SLUG,
      name,
      vintage,
      type: "white",
      sweetness: "demidulce",
      grapeVarieties: [{ name: "Tămâioasă Românească", percentage: 100 }],
      alcohol: 13,
      tastingNotes:
        "Un vin savuros de culoare galben-pai deschis, cu un profil aromatic complex de flori de soc, pepene galben si caise coapte. Gustul este fructat, dulce si cremos, amintind de fructe tropicale proaspete, cu aciditate revigoranta.",
      producerPageUrl: "https://budureasca.ro/vin-bristena/bristena-tamaioasa-romaneasca/",
      sourceUrl: PROFITSHARE_URL,
      submitType: "affiliate",
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
