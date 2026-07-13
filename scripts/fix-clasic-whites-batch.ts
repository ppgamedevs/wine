import "../lib/load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { wines } from "../lib/schema";
import { upgradeBudureascaImageUrl } from "../lib/budureasca-image-url";
import { buildWineImageAlt } from "../lib/wine-images";
import { generateAndApplyFullEditorial } from "../lib/wine-enrichment";

interface WineFix {
  id: number;
  slug: string;
  name: string;
  vintage: number;
  grapeVarieties: Array<{ name: string; percentage?: number }>;
  alcohol: number;
  tastingNotes: string;
  producerUrl: string;
  imagePath: string;
}

const FIXES: WineFix[] = [
  {
    id: 355,
    slug: "budureasca-clasic-sauvignon-blanc-demisec-2025",
    name: "Clasic Sauvignon Blanc Demisec",
    vintage: 2025,
    grapeVarieties: [{ name: "Sauvignon Blanc", percentage: 100 }],
    alcohol: 12.5,
    tastingNotes:
      "Nuanță de galben verzui, cu note fructate de pară coaptă și mango. Gust cu accente de mango și ananas, aciditate proaspătă și final catifelat, lung în gură. Se potriveste cu carne de pasare, legume caramelizate, peste la cuptor sau platouri de branzeturi proaspete.",
    producerUrl: "https://budureasca.ro/vin-clasic/clasic-sauvignon-blanc/",
    imagePath:
      "https://budureasca.ro/media/catalog/product/b/u/budureasca_clasic_sauvignon_blanc_main.jpg",
  },
  {
    id: 354,
    slug: "budureasca-clasic-feteasca-regala-demisec-2025",
    name: "Clasic Fetească Regală Demisec",
    vintage: 2025,
    grapeVarieties: [{ name: "Fetească Regală", percentage: 100 }],
    alcohol: 12.5,
    tastingNotes:
      "Culoare galben pal, cu arome de pară coaptă și busuioc proaspat, caracteristice soiului Fetească Regală. Gust echilibrat si placut, amintind de piersica zemoasa, cu aciditate fina in echilibru cu dulceata naturala si final lung. Se potriveste cu pui, ciuperci la gratar, file de peste, tartar, salate sau platouri de branzeturi proaspete.",
    producerUrl: "https://budureasca.ro/vin-clasic/clasic-feteasca-regala/",
    imagePath:
      "https://budureasca.ro/media/catalog/product/b/u/budureasca_clasic_feteasca_regala_main.jpg",
  },
  {
    id: 353,
    slug: "budureasca-clasic-tamaioasa-romaneasca-demisec-2025",
    name: "Clasic Tămâioasă Românească Demisec",
    vintage: 2025,
    grapeVarieties: [{ name: "Tămâioasă Românească", percentage: 100 }],
    alcohol: 13.5,
    tastingNotes:
      "Culoare galben pal, cu arome de pară coaptă, busuioc verde si gutui proaspata. In gura apar note de pară si mango, proaspat, aromatic si bine echilibrat, cu final moale si catifelat. Se potriveste cu bucatarie asiatica, branzeturi proaspete, peste, fructe de mare sau salate.",
    producerUrl: "https://budureasca.ro/vin-clasic/clasic-tamaioasa-romaneasca/",
    imagePath:
      "https://budureasca.ro/media/catalog/product/b/u/budureasca_clasic_tamaioasa_romaneasca_main.jpg",
  },
];

async function fixWine(entry: WineFix) {
  const price = 38;
  const imageUrl = upgradeBudureascaImageUrl(entry.imagePath);

  await db
    .update(wines)
    .set({
      slug: entry.slug,
      name: entry.name,
      vintage: entry.vintage,
      type: "white",
      sweetness: "demisec",
      grapeVarieties: entry.grapeVarieties,
      alcohol: entry.alcohol,
      tastingNotes: entry.tastingNotes,
      producerPageUrl: entry.producerUrl,
      sourceUrl: entry.producerUrl,
      submitType: "producer",
      priceAvg: price,
      currentPrice: price,
      lowestPrice30d: price,
      imageUrl,
      imageSource: "producer",
      imageAlt: buildWineImageAlt({
        name: entry.name,
        vintage: entry.vintage,
        type: "white",
        wineryName: "Budureasca",
      }),
      availability: [
        {
          retailer: "Budureasca.ro",
          url: entry.producerUrl,
          priceRon: price,
          inStock: true,
          lastCheckedAt: new Date().toISOString(),
        },
      ],
      affiliateLinks: [
        {
          retailer: "Budureasca.ro",
          url: entry.producerUrl,
          priceRon: price,
        },
      ],
    })
    .where(eq(wines.id, entry.id));

  await generateAndApplyFullEditorial(entry.id);

  return db.query.wines.findFirst({
    where: eq(wines.id, entry.id),
    columns: {
      id: true,
      slug: true,
      name: true,
      type: true,
      vintage: true,
      priceAvg: true,
      valueScore: true,
    },
  });
}

async function main() {
  const results = [];
  for (const entry of FIXES) {
    results.push(await fixWine(entry));
  }
  console.log(JSON.stringify({ status: "fixed", wines: results }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
