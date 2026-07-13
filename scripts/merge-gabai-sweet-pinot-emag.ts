import "../lib/load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { updatePrice } from "../lib/price-tracker";
import { wines, wineries } from "../lib/schema";

const KEEP_ID = 371;
const REMOVE_ID = 372;

const PROFITSHARE_URL = "https://l.profitshare.ro/l/16170218";
const EMAG_URL =
  "https://www.emag.ro/vin-rose-crama-gabai-sweet-demidulce-0-75l-6427921000027/pd/DS709HYBM/";
const PRODUCER_URL =
  "https://cramagabai.ro/product/vin-rose-demidulce-sweet-pinot-rose/";
const PRICE = 78;

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
  const profitshareAffiliate = {
    retailer: "eMAG.ro",
    url: PROFITSHARE_URL,
    priceRon: PRICE,
  };

  if (!availability.some((entry) => entry.url?.includes("/pd/DS709HYBM"))) {
    availability.push(emagAvailability);
  }
  if (!affiliateLinks.some((entry) => entry.url?.includes("16170218"))) {
    affiliateLinks.push(profitshareAffiliate);
  }

  await db.delete(wines).where(eq(wines.id, REMOVE_ID));

  await db
    .update(wines)
    .set({
      availability,
      affiliateLinks,
      sourceUrl: PROFITSHARE_URL,
      submitType: "affiliate",
    })
    .where(eq(wines.id, KEEP_ID));

  await updatePrice(KEEP_ID, PRICE, EMAG_URL);

  await db
    .update(wineries)
    .set({ website: "https://cramagabai.ro", name: "Crama Gabai" })
    .where(eq(wineries.id, keep.wineryId));

  const updated = await db.query.wines.findFirst({
    where: eq(wines.id, KEEP_ID),
    columns: {
      id: true,
      slug: true,
      name: true,
      producerPageUrl: true,
      priceAvg: true,
      availability: true,
      affiliateLinks: true,
      sourceUrl: true,
    },
  });

  console.log("Merged Profitshare into", updated?.slug);
  console.log(JSON.stringify(updated, null, 2));
  console.log("Removed duplicate wine id", REMOVE_ID);
  console.log("Producer page:", PRODUCER_URL);
}

main().catch(console.error);
