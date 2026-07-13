import "../lib/load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { wines } from "../lib/schema";
import { upgradeBudureascaImageUrl } from "../lib/budureasca-image-url";
import { buildWineImageAlt } from "../lib/wine-images";
import type { WineType, WineSweetness } from "@/types";

interface SabrizeUpdate {
  slug: string;
  name: string;
  vintage: number;
  type: WineType;
  sweetness: WineSweetness;
  grapeVarieties: { name: string; percentage?: number }[];
  alcohol: number;
  producerPageUrl: string;
  imagePath: string;
  tastingNotes: string;
}

const SABRIZE_UPDATES: SabrizeUpdate[] = [
  {
    slug: "budureasca-rose-sabrize-sec-crama-budureasca-0-75l",
    name: "Sabrize Rosé Sec",
    vintage: 2023,
    type: "rose",
    sweetness: "sec",
    grapeVarieties: [
      { name: "Cabernet Sauvignon", percentage: 50 },
      { name: "Merlot", percentage: 50 },
    ],
    alcohol: 13.5,
    producerPageUrl: "https://budureasca.ro/vin-sabrize/sabrize-rose/",
    imagePath: "/media/catalog/product/p/h/photo_budureasca_sabrize_rose.jpg",
    tastingNotes:
      "In pahar descoperim un vin plin de senzatii revigorante, cu o frumoasa culoare roz deschis si un buchet aromatic proaspat si fructat. Gustul fructat si rotund de capsuni si fragi prezinta o aciditate echilibrata ce conduce spre un final lung si catifelat.",
  },
  {
    slug: "budureasca-alb-budureasca-sabrize-fume-sec-0-75l",
    name: "Sabrize FUME Sec",
    vintage: 2023,
    type: "white",
    sweetness: "sec",
    grapeVarieties: [
      { name: "Chardonnay" },
      { name: "Sauvignon Blanc" },
      { name: "Pinot Gris" },
    ],
    alcohol: 13.5,
    producerPageUrl: "https://budureasca.ro/vin-sabrize/sabrize-fume/",
    imagePath: "/media/catalog/product/p/h/photo_budureasca_sabrize_fume.jpg",
    tastingNotes:
      "Obtinut din Chardonnay, Sauvignon Blanc si Pinot Gris, vinul se prezinta intr-o culoare galben-pai, cu arome de vanilie. Gustul rotund de fructe tropicale conduce spre un final elegant, cu note de stejar de la maturarea in stejar francez.",
  },
  {
    slug: "budureasca-sabrize-sauvignon-blanc-sec",
    name: "Sabrize Sauvignon Blanc Sec",
    vintage: 2023,
    type: "white",
    sweetness: "sec",
    grapeVarieties: [{ name: "Sauvignon Blanc", percentage: 100 }],
    alcohol: 13.5,
    producerPageUrl: "https://budureasca.ro/vin-sabrize/sabrize-sauvignon-blanc/",
    imagePath:
      "/media/catalog/product/p/h/photo_budureasca_sabrize_sauvignon_blanc.jpg",
    tastingNotes:
      "Culoare galben-verzuie, buchet intens fructat cu flori de soc si fructe tropicale. Gust complex de agrise bine coapte si final lung, proaspat.",
  },
];

async function main() {
  for (const item of SABRIZE_UPDATES) {
    const wine = await db.query.wines.findFirst({
      where: eq(wines.slug, item.slug),
    });
    if (!wine) {
      console.warn("Skip missing", item.slug);
      continue;
    }

    const imageUrl = upgradeBudureascaImageUrl(
      `https://budureasca.ro${item.imagePath}`,
    );

    await db
      .update(wines)
      .set({
        name: item.name,
        vintage: item.vintage,
        type: item.type,
        sweetness: item.sweetness,
        grapeVarieties: item.grapeVarieties,
        alcohol: item.alcohol,
        tastingNotes: item.tastingNotes,
        producerPageUrl: item.producerPageUrl,
        imageUrl,
        imageSource: "producer",
        imageAlt: buildWineImageAlt({
          name: item.name,
          vintage: item.vintage,
          type: item.type,
          wineryName: "Budureasca",
        }),
      })
      .where(eq(wines.id, wine.id));

    console.log(
      JSON.stringify(
        {
          slug: item.slug,
          name: item.name,
          vintage: item.vintage,
          imageUrl,
          producerPageUrl: item.producerPageUrl,
        },
        null,
        2,
      ),
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
