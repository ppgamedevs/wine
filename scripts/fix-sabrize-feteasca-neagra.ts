import "../lib/load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { wines } from "../lib/schema";
import { upgradeBudureascaImageUrl } from "../lib/budureasca-image-url";
import { buildWineImageAlt } from "../lib/wine-images";
import { generateAndApplyFullEditorial } from "../lib/wine-enrichment";

const WINE_ID = 347;
const CORRECT_SLUG = "budureasca-sabrize-feteasca-neagra-sec-2023";

async function main() {
  const imageUrl = upgradeBudureascaImageUrl(
    "https://budureasca.ro/media/catalog/product/p/h/photo_budureasca_sabrize_feteasca_neagra.jpg",
  );

  const name = "Sabrize Fetească Neagră Sec";
  const vintage = 2023;

  await db
    .update(wines)
    .set({
      slug: CORRECT_SLUG,
      name,
      vintage,
      type: "red",
      sweetness: "sec",
      grapeVarieties: [{ name: "Fetească Neagră", percentage: 100 }],
      alcohol: 14,
      tastingNotes:
        "In pahar, vinul isi etaleaza frumoasa culoare rubiniu inchis, cu arome fructate de coacaze negre si mure. Gustul de gem de prune progreseaza spre un postgust lung, echilibrat cu aciditate moderata.",
      producerPageUrl: "https://budureasca.ro/vin-sabrize/sabrize-feteasca-neagra/",
      sourceUrl: "https://budureasca.ro/vin-sabrize/sabrize-feteasca-neagra/",
      submitType: "producer",
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
          retailer: "Budureasca.ro",
          url: "https://budureasca.ro/vin-sabrize/sabrize-feteasca-neagra/",
          priceRon: 46,
          inStock: true,
          lastCheckedAt: new Date().toISOString(),
        },
      ],
      affiliateLinks: [
        {
          retailer: "Budureasca.ro",
          url: "https://budureasca.ro/vin-sabrize/sabrize-feteasca-neagra/",
          priceRon: 46,
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
