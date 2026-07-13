import "../lib/load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { wines } from "../lib/schema";
import { upgradeBudureascaImageUrl } from "../lib/budureasca-image-url";
import { buildWineImageAlt } from "../lib/wine-images";
import { generateAndApplyFullEditorial } from "../lib/wine-enrichment";

const WINERY_ID = 52;
const DEALU_MARE = 27;
const DEALURILE_MUNTENIEI = 49;

interface WineSpec {
  id?: number;
  slug: string;
  name: string;
  type: "white" | "red" | "rose";
  vintage: number;
  alcohol: number;
  price: number;
  inStock: boolean;
  regionId: number;
  grapes: Array<{ name: string; percentage?: number }>;
  tastingNotes: string;
  producerUrl: string;
  imagePath: string;
}

const SPECS: WineSpec[] = [
  {
    id: 359,
    slug: "budureasca-exuberant-blanc-demisec-screw-cap-2022",
    name: "Exuberant Blanc Demisec (screw-cap)",
    type: "white",
    vintage: 2022,
    alcohol: 13,
    price: 29,
    inStock: false,
    regionId: DEALU_MARE,
    grapes: [
      { name: "Sauvignon Blanc" },
      { name: "Tămâioasă Românească" },
      { name: "Fetească Regală" },
    ],
    tastingNotes:
      "Vin tineresc si proaspat, cu arome varietale bine definite. Se potriveste cu preparate din peste, paste, carne alba sau branzeturi.",
    producerUrl: "https://budureasca.ro/vin-exuberant/exuberant-blanc/",
    imagePath:
      "https://budureasca.ro/media/catalog/product/e/x/exuberant-blanc.jpg",
  },
  {
    slug: "budureasca-exuberant-noir-demisec-screw-cap-2022",
    name: "Exuberant Noir Demisec (screw-cap)",
    type: "red",
    vintage: 2022,
    alcohol: 13.5,
    price: 29,
    inStock: true,
    regionId: DEALU_MARE,
    grapes: [{ name: "Cabernet Sauvignon" }, { name: "Merlot" }],
    tastingNotes:
      "Culoare rosu-violet intens, cu arome bine definite de fructe de padure coapete proaspat culese. Gust intens de gem de mure, cu taninuri ferme care confera structura si corpolenta.",
    producerUrl: "https://budureasca.ro/vin-exuberant/exuberant-noir/",
    imagePath:
      "https://budureasca.ro/media/catalog/product/e/x/exuberant-noir.jpg",
  },
  {
    id: 360,
    slug: "budureasca-exuberant-rose-demisec-screw-cap-2023",
    name: "Exuberant Rosé Demisec (screw-cap)",
    type: "rose",
    vintage: 2023,
    alcohol: 12.5,
    price: 29,
    inStock: true,
    regionId: DEALU_MARE,
    grapes: [
      { name: "Fetească Neagră" },
      { name: "Merlot" },
      { name: "Pinot Noir" },
    ],
    tastingNotes:
      "Culoare roz pal, cu arome puternice de zmeura coapta. Echilibrat, amintind de fructe proaspete de vara, cu aciditate curata. Se potriveste cu bruschette cu rosii proaspete, busuioc si mozzarella.",
    producerUrl: "https://budureasca.ro/vin-exuberant/exuberant-rose/",
    imagePath:
      "https://budureasca.ro/media/catalog/product/e/x/exuberant-rose.jpg",
  },
  {
    id: 361,
    slug: "budureasca-cuvee-regia-noir-demisec-dop-2022",
    name: "Cuvée Regia Noir Demisec (dop)",
    type: "red",
    vintage: 2022,
    alcohol: 13.5,
    price: 18,
    inStock: true,
    regionId: DEALURILE_MUNTENIEI,
    grapes: [
      { name: "Fetească Neagră", percentage: 70 },
      { name: "Pinot Noir", percentage: 30 },
    ],
    tastingNotes:
      "Culoare rosu-garnet, cu arome de condimente si prune proaspete. Gust amintind de fructe de padure proaspat culese, corp mediu si postgust lung, usor dulceag.",
    producerUrl: "https://budureasca.ro/vin-cuvee-regia/cuvee-regia-noir-dop/",
    imagePath:
      "https://budureasca.ro/media/catalog/product/c/u/cuvee-regia-noir.jpg",
  },
  {
    slug: "budureasca-cuvee-regia-noir-demisec-screw-cap-2023",
    name: "Cuvée Regia Noir Demisec (screw-cap)",
    type: "red",
    vintage: 2023,
    alcohol: 13.5,
    price: 22,
    inStock: true,
    regionId: DEALU_MARE,
    grapes: [
      { name: "Fetească Neagră", percentage: 70 },
      { name: "Pinot Noir", percentage: 30 },
    ],
    tastingNotes:
      "Culoare rosu-rosuie intensa, cu arome de cirese negre si condimente. Note de fructe de padure proaspete, structura medie si final lung, catifelat, mineral.",
    producerUrl: "https://budureasca.ro/vin-cuvee-regia/cuvee-regia-noir/",
    imagePath:
      "https://budureasca.ro/media/catalog/product/c/u/cuvee-regia-noir.jpg",
  },
  {
    slug: "budureasca-cuvee-regia-rose-demisec-screw-cap-2023",
    name: "Cuvée Regia Rosé Demisec (screw-cap)",
    type: "rose",
    vintage: 2023,
    alcohol: 11.5,
    price: 22,
    inStock: true,
    regionId: DEALU_MARE,
    grapes: [
      { name: "Fetească Neagră" },
      { name: "Merlot" },
      { name: "Pinot Noir" },
    ],
    tastingNotes:
      "Vin roz proaspat si fructat, ideal pentru petreceri sau ocazii speciale. Se potriveste cu aperitive, carne alba, peste, fructe de mare, paste, salate sau branzeturi.",
    producerUrl: "https://budureasca.ro/vin-cuvee-regia/cuvee-regia-rose/",
    imagePath:
      "https://budureasca.ro/media/catalog/product/c/u/cuvee-regia-rose.jpg",
  },
];

function buildPayload(spec: WineSpec) {
  const imageUrl = upgradeBudureascaImageUrl(spec.imagePath);
  const now = new Date().toISOString();

  return {
    slug: spec.slug,
    name: spec.name,
    wineryId: WINERY_ID,
    regionId: spec.regionId,
    type: spec.type,
    sweetness: "demisec" as const,
    vintage: spec.vintage,
    grapeVarieties: spec.grapes,
    alcohol: spec.alcohol,
    tastingNotes: spec.tastingNotes,
    producerPageUrl: spec.producerUrl,
    sourceUrl: spec.producerUrl,
    submitType: "producer" as const,
    status: "verified" as const,
    submittedBy: "admin-cli",
    priceAvg: spec.price,
    currentPrice: spec.price,
    lowestPrice30d: spec.price,
    priceHistory: [
      { date: now, price: spec.price, source: spec.producerUrl },
    ],
    imageUrl,
    imageSource: "producer",
    imageAlt: buildWineImageAlt({
      name: spec.name,
      vintage: spec.vintage,
      type: spec.type,
      wineryName: "Budureasca",
    }),
    availability: [
      {
        retailer: "Budureasca.ro",
        url: spec.producerUrl,
        priceRon: spec.price,
        inStock: spec.inStock,
        lastCheckedAt: now,
      },
    ],
    affiliateLinks: [
      {
        retailer: "Budureasca.ro",
        url: spec.producerUrl,
        priceRon: spec.price,
      },
    ],
  };
}

async function upsertWine(spec: WineSpec): Promise<number> {
  const payload = buildPayload(spec);

  if (spec.id) {
    await db.update(wines).set(payload).where(eq(wines.id, spec.id));
    return spec.id;
  }

  const [inserted] = await db
    .insert(wines)
    .values(payload)
    .returning({ id: wines.id });

  return inserted.id;
}

async function main() {
  const results: Array<{ id: number; slug: string; name: string }> = [];

  for (const spec of SPECS) {
    const id = await upsertWine(spec);
    await generateAndApplyFullEditorial(id);

    const wine = await db.query.wines.findFirst({
      where: eq(wines.id, id),
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

    if (wine) results.push(wine);
  }

  console.log(JSON.stringify({ status: "fixed", wines: results }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
