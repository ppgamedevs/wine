import "../lib/load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { updatePrice } from "../lib/price-tracker";
import {
  buildValueScoreBreakdown,
  valueScoreInputFromWine,
} from "../lib/scoring";
import { regions, wines } from "../lib/schema";

const FRIZZY_KEEP = 270;
const FRIZZY_REMOVE = 269;
const FRIZZY_EMAG =
  "https://www.emag.ro/vin-perlant-balla-geza-frizzy-sec-0-75l-5942167002600/pd/D4LFQ9YBM/";
const FRIZZY_PRICE = 60;

const ROZZY_KEEP = 271;
const ROZZY_EMAG =
  "https://www.emag.ro/vin-perlant-balla-geza-rozzy-sec-0-75l-5942167002624/pd/D5MTVFYBM/";
const ROZZY_PRICE = 60;

const FRIZZY_GRAPES = [
  { name: "Muscat Ottonel", percentage: 25 },
  { name: "Tămâioasă Românească", percentage: 25 },
  { name: "Traminer", percentage: 25 },
  { name: "Mustoasă de Măderat", percentage: 25 },
];

async function mergeEmag(
  keepId: number,
  emagUrl: string,
  price: number,
  removeId?: number,
) {
  const keep = await db.query.wines.findFirst({ where: eq(wines.id, keepId) });
  if (!keep) throw new Error(`Vinul ${keepId} nu exista.`);

  const availability = [...(keep.availability ?? [])];
  const affiliateLinks = [...(keep.affiliateLinks ?? [])];
  const pdToken = emagUrl.match(/\/pd\/([^/]+)/)?.[1] ?? "";

  const emagAvailability = {
    retailer: "eMAG.ro",
    url: emagUrl,
    priceRon: price,
    inStock: true,
    lastCheckedAt: new Date().toISOString(),
  };
  const emagAffiliate = {
    retailer: "eMAG.ro",
    url: emagUrl,
    priceRon: price,
  };

  if (pdToken && !availability.some((entry) => entry.url?.includes(pdToken))) {
    availability.push(emagAvailability);
  }
  if (pdToken && !affiliateLinks.some((entry) => entry.url?.includes(pdToken))) {
    affiliateLinks.push(emagAffiliate);
  }

  await db
    .update(wines)
    .set({ availability, affiliateLinks, submitType: "affiliate" })
    .where(eq(wines.id, keepId));

  await updatePrice(keepId, price, emagUrl);

  const wineForScore = await db.query.wines.findFirst({
    where: eq(wines.id, keepId),
    with: {
      region: { columns: { name: true } },
      winery: { columns: { name: true } },
    },
  });

  if (wineForScore) {
    const breakdown = buildValueScoreBreakdown(
      valueScoreInputFromWine({
        priceAvg: price,
        currentPrice: price,
        grapeVarieties: wineForScore.grapeVarieties,
        medals: wineForScore.medals,
        type: wineForScore.type,
        cellarPotential: wineForScore.cellarPotential,
        acidity: wineForScore.acidity,
        tasteProfile: wineForScore.tasteProfile,
        vintage: wineForScore.vintage,
        ratingAvg: wineForScore.ratingAvg,
        communityScore: wineForScore.communityScore,
        criticScore: wineForScore.criticScore,
        estimatedQuality: wineForScore.estimatedQuality,
        drinkabilityStart: wineForScore.drinkabilityStart,
        drinkabilityEnd: wineForScore.drinkabilityEnd,
        regionName: wineForScore.region?.name ?? null,
        wineryName: wineForScore.winery?.name ?? null,
      }),
    );

    await db
      .update(wines)
      .set({
        valueScore: breakdown.finalScore,
        valueScoreVersion: breakdown.version,
        priceAvg: price,
      })
      .where(eq(wines.id, keepId));
  }

  if (removeId != null) {
    await db.delete(wines).where(eq(wines.id, removeId));
  }
}

async function main() {
  const minis = await db.query.regions.findFirst({
    where: eq(regions.slug, "minis"),
    columns: { id: true },
  });

  if (!minis) throw new Error("Regiunea minis nu exista.");

  await db
    .update(wines)
    .set({
      regionId: minis.id,
      type: "sparkling",
      grapeVarieties: FRIZZY_GRAPES,
      tastingSheetUrl: null,
    })
    .where(eq(wines.id, FRIZZY_KEEP));

  await mergeEmag(FRIZZY_KEEP, FRIZZY_EMAG, FRIZZY_PRICE, FRIZZY_REMOVE);

  await db
    .update(wines)
    .set({
      regionId: minis.id,
      type: "rose",
      tastingSheetUrl: null,
    })
    .where(eq(wines.id, ROZZY_KEEP));

  await mergeEmag(ROZZY_KEEP, ROZZY_EMAG, ROZZY_PRICE);

  const updated = await db.query.wines.findMany({
    where: eq(wines.wineryId, 61),
    columns: {
      id: true,
      slug: true,
      name: true,
      type: true,
      priceAvg: true,
      regionId: true,
      availability: true,
    },
  });

  const rows = updated.filter((wine) => wine.id === FRIZZY_KEEP || wine.id === ROZZY_KEEP);
  console.log(JSON.stringify(rows, null, 2));
  console.log("Removed duplicate Frizzy id", FRIZZY_REMOVE);
}

main().catch(console.error);
