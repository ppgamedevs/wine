import "../lib/load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { wines } from "../lib/schema";
import { upgradeBudureascaImageUrl } from "../lib/budureasca-image-url";
import { buildWineImageAlt } from "../lib/wine-images";
import { generateAndApplyFullEditorial } from "../lib/wine-enrichment";

const WINE_ID = 348;
const CORRECT_SLUG = "budureasca-bristena-busuioaca-de-bohotin-demidulce-2025";

async function main() {
  const name = "Bristena Busuioacă de Bohotin Demidulce";
  const vintage = 2025;
  const imageUrl = upgradeBudureascaImageUrl(
    "https://budureasca.ro/media/catalog/product/b/u/budureasca_bristena_busuioaca_bohotin_main.jpg",
  );

  await db
    .update(wines)
    .set({
      slug: CORRECT_SLUG,
      name,
      vintage,
      type: "rose",
      sweetness: "demidulce",
      grapeVarieties: [{ name: "Busuioacă de Bohotin", percentage: 100 }],
      alcohol: 12,
      tastingNotes:
        "Bristena Busuioaca de Bohotin impresioneaza prin culoarea roz intens si prin aromele puternice de petale de trandafir. Gustul este plin, cu senzatii placute de fructe coapte de vara ce completeaza parfumul inconfundabil al vinului. Echilibrul excelent dintre dulceata si aciditate conduce catre un final fructat, lung si placut.",
      producerPageUrl: "https://budureasca.ro/vin-bristena/bristena-busuioaca/",
      sourceUrl: "https://budureasca.ro/vin-bristena/bristena-busuioaca/",
      submitType: "producer",
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
          retailer: "Budureasca.ro",
          url: "https://budureasca.ro/vin-bristena/bristena-busuioaca/",
          priceRon: 44,
          inStock: true,
          lastCheckedAt: new Date().toISOString(),
        },
      ],
      affiliateLinks: [
        {
          retailer: "Budureasca.ro",
          url: "https://budureasca.ro/vin-bristena/bristena-busuioaca/",
          priceRon: 44,
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
