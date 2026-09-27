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

const PROFITSHARE_URL = "https://l.profitshare.ro/l/16559500";
const EMAG_URL =
  "https://www.emag.ro/vin-alb-licoros-lacrima-lui-ovidiu-murfatlar-0-75-l-5941982055297/pd/D4PWJKYBM/";
const PRODUCER_PAGE_URL = "https://murfatlar-vinul.ro/lacrima-lui-ovidiu/";
const IMAGE_URL =
  "https://murfatlar-vinul.ro/wp-content/uploads/2024/07/Lacrima-alb-scaled.jpg";
const NAME = "Lacrima lui Ovidiu Alb";
const PRICE = 79;
const ALCOHOL = 15;
const GRAPE_VARIETIES = [
  { name: "Chardonnay" },
  { name: "Pinot Gris" },
  { name: "Muscat Ottonel" },
];
const TASTING_NOTES =
  "Culoare: limpede, chihlimbar-auriu. Miros: placut, imbietor, de buchet de vin maturat cu note de miere. Gust: foarte placut, lejer, dulce, cu arome lemnoase, caramelizate, de cedru si stejar, precum si gust delicat de miere. Intensitatea buchetului si dulceata fac ca vinul sa poata fi consumat imediat, dar se poate pastra in sticla multi ani. Temperatura de servire: 5-6C.";
const CULINARY_PAIRINGS =
  "Se poate servi ca aperitiv sau dupa masa. Se asociaza cu mancaturi pe baza de ficat de gasca, produse de patiserie, legume si branzeturi fine, deserturi in foietaj, placinta dobrogeana.";

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
    category: "white",
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
      type: "white",
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
        type: "white",
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

  try {
    await generateAndApplyFullEditorial(created.id);
  } catch (error) {
    console.warn(
      "[add-murfatlar-lacrima-ovidiu-alb] editorial skip:",
      error instanceof Error ? error.message : error,
    );
  }

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
      sourceUrl: true,
      producerPageUrl: true,
      affiliateLinks: true,
    },
  });

  console.log(JSON.stringify({ status: "created", ...wine }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
