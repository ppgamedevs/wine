import "../lib/load-env";
import fs from "node:fs";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { regions, wines } from "../lib/schema";
import { parseBudureascaProductPage } from "../lib/budureasca-producer";
import { updatePrice } from "../lib/price-tracker";
import { calculateInitialScores } from "../lib/scoring";
import { generateAndApplyFullEditorial } from "../lib/wine-enrichment";
import { buildWineImageAlt } from "../lib/wine-images";
import { buildWineSlug } from "../lib/wine-url";

const PRODUCER_URL = "https://budureasca.ro/vin-editii-speciale/orange-wine/";
const WINERY_ID = 52;
const HTML_PATH = "tmp-orange-wine.html";

const GRAPE_VARIETIES = [
  { name: "Sauvignon Blanc", percentage: 34 },
  { name: "Feteasca Regala", percentage: 33 },
  { name: "Pinot Gris", percentage: 33 },
];

async function main() {
  const html = fs.readFileSync(HTML_PATH, "utf8");
  const parsed = parseBudureascaProductPage(html, PRODUCER_URL);
  if (!parsed) {
    throw new Error("Nu am putut parsa pagina Budureasca.");
  }

  const name = parsed.name;
  const slug = buildWineSlug({
    producer: "Budureasca",
    name,
    vintage: parsed.vintage,
  });

  const existing = await db.query.wines.findFirst({
    where: eq(wines.slug, slug),
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

  const dealuMare = await db.query.regions.findFirst({
    where: eq(regions.slug, "dealu-mare"),
    columns: { id: true },
  });

  const price = parsed.price ?? 67;
  const checkedAt = new Date().toISOString();
  const initialScores = calculateInitialScores({
    price,
    category: "orange",
    region: "Dealu Mare",
    grapeVarieties: GRAPE_VARIETIES.map((grape) => grape.name),
    sweetness: "sec",
    wineryName: "Budureasca",
  });

  const [created] = await db
    .insert(wines)
    .values({
      slug,
      name,
      wineryId: WINERY_ID,
      regionId: dealuMare?.id ?? null,
      type: "orange",
      sweetness: "sec",
      vintage: parsed.vintage ?? 2022,
      grapeVarieties: GRAPE_VARIETIES,
      alcohol: parsed.alcohol ?? 13.5,
      priceAvg: price,
      currentPrice: price,
      lowestPrice30d: price,
      valueScore: initialScores.valueScore,
      valueScoreVersion: 2,
      giftScore: initialScores.giftScore,
      foodMatchScore: initialScores.foodMatchScore,
      beginnerFriendly: initialScores.beginnerFriendly,
      cellarPotential: initialScores.cellarPotential,
      overpricedRisk: initialScores.overpricedRisk,
      tastingNotes: parsed.tastingNotes,
      sourceUrl: PRODUCER_URL,
      submittedBy: "admin-cli",
      submitType: "producer",
      status: "verified",
      producerPageUrl: PRODUCER_URL,
      imageUrl: parsed.imageUrl,
      imageSource: "producer",
      imageAlt: buildWineImageAlt({
        name,
        producer: "Budureasca",
        type: "orange",
      }),
      availability: [
        {
          retailer: "Budureasca.ro",
          url: PRODUCER_URL,
          priceRon: price,
          inStock: true,
          lastCheckedAt: checkedAt,
        },
      ],
    })
    .returning({ id: wines.id, slug: wines.slug });

  await updatePrice(created.id, price, PRODUCER_URL);
  await generateAndApplyFullEditorial(created.id);

  const wine = await db.query.wines.findFirst({
    where: eq(wines.id, created.id),
    columns: {
      id: true,
      slug: true,
      name: true,
      priceAvg: true,
      valueScore: true,
      producerPageUrl: true,
      type: true,
      vintage: true,
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
