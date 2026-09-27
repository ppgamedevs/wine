import "../lib/load-env";
import { eq, or } from "drizzle-orm";
import { db } from "../lib/db";
import {
  AFFILIATE_SOURCE_BADGE,
  regions,
  wineries,
  wines,
} from "../lib/schema";
import { updatePrice } from "../lib/price-tracker";
import { calculateInitialScores } from "../lib/scoring";
import { generateAndApplyFullEditorial } from "../lib/wine-enrichment";
import { buildWineImageAlt } from "../lib/wine-images";
import { buildWineSlug } from "../lib/wine-url";

const PROFITSHARE_URL = "https://l.profitshare.ro/l/16559495";
const EMAG_URL =
  "https://www.emag.ro/vin-rosu-dulce-licoros-lacrima-lui-ovidiu-cupaj-alcool-15-0-75l-cri-132/pd/DP0RLPYBM/";
const PRODUCER_PAGE_URL = "https://murfatlar-vinul.ro/lacrima-lui-ovidiu/";
const IMAGE_URL =
  "https://murfatlar-vinul.ro/wp-content/uploads/2024/07/Lacrima-rosu-scaled.jpg";
const NAME = "Lacrima lui Ovidiu Roșu";
const PRICE = 44;
const ALCOHOL = 15;
const GRAPE_VARIETIES = [
  { name: "Pinot Noir" },
  { name: "Feteasca Neagra" },
  { name: "Cabernet Sauvignon" },
  { name: "Merlot" },
];
const TASTING_NOTES =
  "Culoare: rosu-rubiniu cu valente de grena. Miros: placut, imbietor, rafinat, de vin invechit in butoaie de stejar. Gust: catifelat si robust de coacaze si afine, dulce si in acelasi timp tare, cu corpolenta si tanin de Cabernet Sauvignon, suplete de Pinot Noir, note lemnoase si afumate cu valente de cacao, aciditate bine integrata, final remanent prelung. Temperatura de servire: 12-14C.";
const CULINARY_PAIRINGS =
  "Se poate servi ca aperitiv sau dupa masa, alaturi de deserturi dulci, mancaturi rafinate, produse de patiserie cu crema de vanilie.";

async function main() {
  const slug = buildWineSlug({
    producer: "Murfatlar",
    name: NAME,
    vintage: null,
  });

  const existing = await db.query.wines.findFirst({
    where: or(
      eq(wines.slug, slug),
      eq(wines.sourceUrl, PROFITSHARE_URL),
      eq(wines.sourceUrl, EMAG_URL),
    ),
    columns: { id: true, slug: true, name: true },
  });
  if (existing) {
    console.log(
      JSON.stringify(
        {
          status: "existing",
          id: existing.id,
          slug: existing.slug,
          message: "Vinul exista deja.",
        },
        null,
        2,
      ),
    );
    return;
  }

  const winery = await db.query.wineries.findFirst({
    where: eq(wineries.slug, "murfatlar"),
    columns: { id: true, name: true },
  });
  if (!winery) {
    throw new Error("Crama Murfatlar nu exista in catalog.");
  }

  const region = await db.query.regions.findFirst({
    where: eq(regions.slug, "murfatlar"),
    columns: { id: true },
  });

  const checkedAt = new Date().toISOString();
  const initialScores = calculateInitialScores({
    price: PRICE,
    category: "red",
    region: "Murfatlar",
    grapeVarieties: GRAPE_VARIETIES.map((grape) => grape.name),
    sweetness: "dulce",
    wineryName: winery.name,
    alcohol: ALCOHOL,
  });

  const [created] = await db
    .insert(wines)
    .values({
      slug,
      name: NAME,
      wineryId: winery.id,
      regionId: region?.id ?? null,
      type: "red",
      sweetness: "dulce",
      grapeVarieties: GRAPE_VARIETIES,
      alcohol: ALCOHOL,
      priceAvg: PRICE,
      currentPrice: PRICE,
      lowestPrice30d: PRICE,
      valueScore: initialScores.valueScore,
      valueScoreVersion: 2,
      giftScore: initialScores.giftScore,
      foodMatchScore: initialScores.foodMatchScore,
      beginnerFriendly: initialScores.beginnerFriendly,
      cellarPotential: initialScores.cellarPotential,
      overpricedRisk: initialScores.overpricedRisk,
      tastingNotes: TASTING_NOTES,
      sourceUrl: PROFITSHARE_URL,
      producerPageUrl: PRODUCER_PAGE_URL,
      submittedBy: "admin-cli",
      submitType: "affiliate",
      status: "verified",
      sourceBadge: AFFILIATE_SOURCE_BADGE,
      imageUrl: IMAGE_URL,
      imageSource: "producer",
      imageAlt: buildWineImageAlt({
        name: NAME,
        wineryName: winery.name,
        type: "red",
      }),
      availability: [
        {
          retailer: "eMAG.ro",
          url: EMAG_URL,
          priceRon: PRICE,
          inStock: true,
          lastCheckedAt: checkedAt,
        },
      ],
      affiliateLinks: [
        {
          retailer: "eMAG.ro",
          url: PROFITSHARE_URL,
          priceRon: PRICE,
        },
      ],
      producerContent: {
        tastingNotes: TASTING_NOTES,
        culinaryPairings: CULINARY_PAIRINGS,
        sourceUrls: [PRODUCER_PAGE_URL],
        extractedAt: checkedAt,
        sourceType: "producer_page",
        extractionMethod: "deterministic",
      },
    })
    .returning({ id: wines.id, slug: wines.slug });

  await updatePrice(created.id, PRICE, EMAG_URL);

  await generateAndApplyFullEditorial(created.id);

  const wine = await db.query.wines.findFirst({
    where: eq(wines.id, created.id),
    columns: {
      id: true,
      slug: true,
      name: true,
      type: true,
      sweetness: true,
      alcohol: true,
      priceAvg: true,
      valueScore: true,
      descriptionEditorial: true,
      sourceUrl: true,
      producerPageUrl: true,
      affiliateLinks: true,
    },
  });

  console.log(
    JSON.stringify(
      {
        status: "created",
        ...wine,
        hasEditorial: Boolean(wine?.descriptionEditorial?.trim()),
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
