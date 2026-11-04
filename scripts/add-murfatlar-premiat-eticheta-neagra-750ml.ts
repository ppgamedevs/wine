import "../lib/load-env";
import { eq, or } from "drizzle-orm";
import { db } from "../lib/db";
import {
  DEFAULT_WINE_SOURCE_BADGE,
  regions,
  wineries,
  wines,
  type EditorialFoodPairingNote,
} from "../lib/schema";
import { buildWineImageAlt } from "../lib/wine-images";
import { buildWineSlug } from "../lib/wine-url";

const PRODUCER_PAGE_URL = "https://murfatlar-vinul.ro/premiat/";
const PRODUCER = "Murfatlar";

interface PremiatVariant {
  key: "rosu" | "alb" | "roze";
  name: string;
  type: "red" | "white" | "rose";
  sourceAnchor: string;
  image: string;
  tastingNotes: string;
  culinaryPairings: string;
  foodNotes: EditorialFoodPairingNote[];
}

const VARIANTS: PremiatVariant[] = [
  {
    key: "rosu",
    name: "Premiat Eticheta Neagra Rosu, 0.75L",
    type: "red",
    sourceAnchor: "rosu-750ml",
    image:
      "/images/wines/murfatlar-premiat-eticheta-neagra-rosu-750ml.webp",
    tastingNotes:
      "Culoare: roÈ™u-rubiniu, limpede. Miros: caracteristic strugurelui. Gust: taninuri moi, aciditate medie, vin tÃ¢nÄƒr, proaspÄƒt, cu fructuozitate delicatÄƒ. Temperatura de servire: 14-16Â°C.",
    culinaryPairings:
      "Preparate din carne roÈ™ie, miel È™i specialitÄƒÈ›i la grÄƒtar.",
    foodNotes: [
      {
        dish: "Carne roÈ™ie la grÄƒtar",
        note: "Recomandarea producÄƒtorului pentru acest vin demisec.",
      },
      {
        dish: "Miel",
        note: "Asociere indicatÄƒ de producÄƒtor.",
      },
      {
        dish: "SpecialitÄƒÈ›i la grÄƒtar",
        note: "Asociere indicatÄƒ de producÄƒtor.",
      },
    ],
  },
  {
    key: "alb",
    name: "Premiat Eticheta Neagra Alb, 0.75L",
    type: "white",
    sourceAnchor: "alb-750ml",
    image:
      "/images/wines/murfatlar-premiat-eticheta-neagra-alb-750ml.webp",
    tastingNotes:
      "Culoare: galben-verzui, limpede. Miros: caracteristic strugurelui. Gust: plÄƒcut, lejer, de o corpolenÈ›Äƒ medie, aciditate bunÄƒ, cu gust remanent suculent. Temperatura de servire: 6-8Â°C.",
    culinaryPairings:
      "SpecialitÄƒÈ›i de peÈ™te, crustacee, fructe de mare, pui È™i cÄƒrnuri slabe.",
    foodNotes: [
      {
        dish: "PeÈ™te È™i fructe de mare",
        note: "Recomandarea producÄƒtorului pentru acest vin demisec.",
      },
      {
        dish: "Crustacee",
        note: "Asociere indicatÄƒ de producÄƒtor.",
      },
      {
        dish: "Pui È™i cÄƒrnuri slabe",
        note: "Asociere indicatÄƒ de producÄƒtor.",
      },
    ],
  },
  {
    key: "roze",
    name: "Premiat Eticheta Neagra Roze, 0.75L",
    type: "rose",
    sourceAnchor: "roze-750ml",
    image:
      "/images/wines/murfatlar-premiat-eticheta-neagra-roze-750ml.webp",
    tastingNotes:
      "Culoare: roz, cu nuanÈ›e de somon. Miros: delicat, fructat, de cireÈ™e crude. Gust: plÄƒcut, lejer, cu aciditate medie. Temperatura de servire: 8-9Â°C.",
    culinaryPairings:
      "Mezeluri din carne de porc, brÃ¢nzeturi proaspete de oaie È™i caprÄƒ, legume crude.",
    foodNotes: [
      {
        dish: "Mezeluri din porc",
        note: "Recomandarea producÄƒtorului pentru acest vin demisec.",
      },
      {
        dish: "BrÃ¢nzeturi proaspete de oaie È™i caprÄƒ",
        note: "Asociere indicatÄƒ de producÄƒtor.",
      },
      {
        dish: "Legume crude",
        note: "Asociere indicatÄƒ de producÄƒtor.",
      },
    ],
  },
];

async function main() {
  const apply = process.argv.includes("--apply");
  const winery = await db.query.wineries.findFirst({
    where: eq(wineries.slug, "murfatlar"),
    columns: { id: true, name: true },
  });
  if (!winery) throw new Error("Crama Murfatlar nu existÄƒ Ã®n catalog.");

  const region = await db.query.regions.findFirst({
    where: eq(regions.slug, "murfatlar"),
    columns: { id: true },
  });

  const rows: Array<{ action: string; slug: string; name: string }> = [];
  for (const variant of VARIANTS) {
    const slug = buildWineSlug({
      producer: PRODUCER,
      name: variant.name,
      vintage: null,
    });
    const sourceUrl = `${PRODUCER_PAGE_URL}#${variant.sourceAnchor}`;
    const existing = await db.query.wines.findFirst({
      where: or(eq(wines.slug, slug), eq(wines.sourceUrl, sourceUrl)),
      columns: { id: true, slug: true, name: true },
    });
    if (existing) {
      rows.push({ action: "existing", slug: existing.slug, name: existing.name });
      continue;
    }

    rows.push({ action: apply ? "create" : "dry-run", slug, name: variant.name });
    if (!apply) continue;

    const extractedAt = new Date().toISOString();
    await db.insert(wines).values({
      slug,
      name: variant.name,
      wineryId: winery.id,
      regionId: region?.id ?? null,
      type: variant.type,
      sweetness: "demisec",
      vintage: null,
      grapeVarieties: [],
      alcohol: null,
      sugar: null,
      acidity: null,
      priceAvg: null,
      currentPrice: null,
      lowestPrice30d: null,
      valueScore: null,
      giftScore: null,
      foodMatchScore: null,
      beginnerFriendly: false,
      cellarPotential: null,
      overpricedRisk: null,
      tastingNotes: variant.tastingNotes,
      foodPairings: [],
      foodPairingNotes: variant.foodNotes,
      dessertPairings: [],
      sourceUrl,
      producerPageUrl: PRODUCER_PAGE_URL,
      submittedBy: "admin-cli",
      submitType: "community",
      status: "verified",
      sourceBadge: DEFAULT_WINE_SOURCE_BADGE,
      imageUrl: variant.image,
      imageSource: "producer",
      imageAlt: buildWineImageAlt({
        name: variant.name,
        wineryName: winery.name,
        type: variant.type,
      }),
      availability: [],
      affiliateLinks: [],
      producerContent: {
        tastingNotes: variant.tastingNotes,
        culinaryPairings: variant.culinaryPairings,
        sourceUrls: [PRODUCER_PAGE_URL],
        extractedAt,
        sourceType: "producer_page",
        extractionMethod: "deterministic",
      },
    });
  }

  console.log(
    JSON.stringify(
      {
        dryRun: !apply,
        producerPage: PRODUCER_PAGE_URL,
        variants: rows,
      },
      null,
      2,
    ),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

