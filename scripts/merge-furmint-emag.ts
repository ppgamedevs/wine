import "../lib/load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { updatePrice } from "../lib/price-tracker";
import {
  buildValueScoreBreakdown,
  valueScoreInputFromWine,
} from "../lib/scoring";
import { wines } from "../lib/schema";

const KEEP_ID = 238;
const REMOVE_ID = 259;

const EMAG_URL =
  "https://www.emag.ro/vin-alb-balla-geza-stone-wine-furmint-sec-0-75l-5942167003393/pd/DBYTVFYBM/";
const PRICE = 101;

async function main() {
  const duplicate = await db.query.wines.findFirst({
    where: eq(wines.id, REMOVE_ID),
  });
  const keep = await db.query.wines.findFirst({
    where: eq(wines.id, KEEP_ID),
  });

  if (!duplicate || !keep) {
    throw new Error("Vinurile tinta nu exista.");
  }

  const availability = [...(keep.availability ?? [])];
  const affiliateLinks = [...(keep.affiliateLinks ?? [])];

  const emagAvailability = {
    retailer: "eMAG.ro",
    url: EMAG_URL,
    priceRon: PRICE,
    inStock: true,
    lastCheckedAt: new Date().toISOString(),
  };
  const emagAffiliate = {
    retailer: "eMAG.ro",
    url: EMAG_URL,
    priceRon: PRICE,
  };

  if (!availability.some((entry) => entry.url?.includes("/pd/DBYTVFYBM"))) {
    availability.push(emagAvailability);
  }
  if (!affiliateLinks.some((entry) => entry.url?.includes("/pd/DBYTVFYBM"))) {
    affiliateLinks.push(emagAffiliate);
  }

  await db
    .update(wines)
    .set({
      availability,
      affiliateLinks,
      submitType: "affiliate",
    })
    .where(eq(wines.id, KEEP_ID));

  await updatePrice(KEEP_ID, PRICE, EMAG_URL);

  const wineForScore = await db.query.wines.findFirst({
    where: eq(wines.id, KEEP_ID),
    with: {
      region: { columns: { name: true } },
      winery: { columns: { name: true } },
    },
  });

  if (wineForScore) {
    const breakdown = buildValueScoreBreakdown(
      valueScoreInputFromWine({
        priceAvg: PRICE,
        currentPrice: PRICE,
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
        priceAvg: PRICE,
      })
      .where(eq(wines.id, KEEP_ID));
  }

  await db.delete(wines).where(eq(wines.id, REMOVE_ID));

  const updated = await db.query.wines.findFirst({
    where: eq(wines.id, KEEP_ID),
    columns: {
      slug: true,
      priceAvg: true,
      currentPrice: true,
      valueScore: true,
      availability: true,
      affiliateLinks: true,
    },
  });

  console.log("Merged eMAG price into", updated?.slug);
  console.log(JSON.stringify(updated, null, 2));
  console.log("Removed duplicate wine id", REMOVE_ID);
}

main().catch(console.error);
