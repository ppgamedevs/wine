import "../lib/load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { wines } from "../lib/schema";
import { updatePrice } from "../lib/price-tracker";
import { calculateInitialScores } from "../lib/scoring";
import { generateAndApplyFullEditorial } from "../lib/wine-enrichment";
import { buildWineImageAlt } from "../lib/wine-images";
import { buildWineSlug } from "../lib/wine-url";

const PROFITSHARE_URL = "https://l.profitshare.ro/l/16170078";
const EMAG_URL =
  "https://www.emag.ro/vin-alb-budureasca-sabrize-sauvignon-blanc-sec-0-75l-5940541821656/pd/DHD94JYBM/";
const NAME = "Sabrize Sauvignon Blanc Sec";
const WINERY_ID = 52;
const REGION_ID = 27;
const PRICE = 64;
const IMAGE_URL =
  "https://s13emagst.akamaized.net/products/72615/72614318/images/res_5ba621006fa0ea37e53fb2eb86ccffaa.jpg?hash=9FCBD885579182727D39843A4603189D";

async function main() {
  const slug = buildWineSlug({
    producer: "Budureasca",
    name: NAME,
    vintage: null,
  });

  const existingBySource = await db.query.wines.findFirst({
    where: eq(wines.sourceUrl, PROFITSHARE_URL),
  });
  if (existingBySource) {
    console.log(JSON.stringify({ status: "existing", slug: existingBySource.slug }, null, 2));
    return;
  }

  const existingBySlug = await db.query.wines.findFirst({
    where: eq(wines.slug, slug),
  });
  if (existingBySlug) {
    console.log(JSON.stringify({ status: "existing", slug: existingBySlug.slug }, null, 2));
    return;
  }

  const checkedAt = new Date().toISOString();
  const initialScores = calculateInitialScores({
    price: PRICE,
    category: "white",
    region: "Dealu Mare",
    grapeVarieties: ["Sauvignon Blanc"],
    sweetness: "sec",
    wineryName: "Budureasca",
  });

  const [created] = await db
    .insert(wines)
    .values({
      slug,
      name: NAME,
      wineryId: WINERY_ID,
      regionId: REGION_ID,
      type: "white",
      sweetness: "sec",
      grapeVarieties: [{ name: "Sauvignon Blanc", percentage: 100 }],
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
      sourceUrl: PROFITSHARE_URL,
      submittedBy: "admin-cli",
      submitType: "affiliate",
      status: "verified",
      imageUrl: IMAGE_URL,
      imageSource: "emag",
      imageAlt: buildWineImageAlt({
        name: NAME,
        wineryName: "Budureasca",
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
    })
    .returning({ id: wines.id, slug: wines.slug });

  await updatePrice(created.id, PRICE, EMAG_URL);
  await generateAndApplyFullEditorial(created.id);

  const wine = await db.query.wines.findFirst({
    where: eq(wines.id, created.id),
    columns: { id: true, slug: true, name: true, priceAvg: true, valueScore: true },
  });

  console.log(JSON.stringify({ status: "created", ...wine }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
