import "../lib/load-env";
import { eq, inArray } from "drizzle-orm";
import { db } from "../lib/db";
import { regions, wines } from "../lib/schema";

const WINE_IDS = [235, 236, 237, 238];

async function main() {
  const minis = await db.query.regions.findFirst({
    where: eq(regions.slug, "minis"),
    columns: { id: true },
  });

  if (!minis) {
    throw new Error("Regiunea minis nu exista in baza de date.");
  }

  await db
    .update(wines)
    .set({
      regionId: minis.id,
      tastingSheetUrl: null,
    })
    .where(inArray(wines.id, WINE_IDS));

  await db
    .update(wines)
    .set({
      grapeVarieties: [{ name: "Furmint", percentage: 100 }],
    })
    .where(eq(wines.id, 238));

  console.log("Actualizat regionId=minis si tastingSheetUrl=null pentru vinurile", WINE_IDS);
}

main().catch(console.error);
