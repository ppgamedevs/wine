/**
 * Read-only OLD vs NEW pairing draft comparison. Does not approve or write.
 */
import "../lib/load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { wines } from "../lib/schema";
import { normalizeWineRows } from "../lib/normalize-wine";
import { generatePairingDrafts } from "../lib/pairing-curation";
import { generateLegacyPairingDrafts } from "../lib/pairing/generate-legacy-pairing-drafts";
import { selectBalancedCurationBatch } from "../lib/pairing-curation";
import type { WineWithRelations } from "../types";

function isSarmaleMiciCheese(names: string[]): boolean {
  const folded = names.map((name) => name.toLowerCase());
  return (
    folded.includes("sarmale") &&
    folded.includes("mici") &&
    folded.some((name) => name.includes("branzeturi") || name.includes("cascaval"))
  );
}

async function main(): Promise<void> {
  const rows = await db.query.wines.findMany({
    with: { winery: true, region: true },
    where: eq(wines.status, "verified"),
  });
  const catalog = normalizeWineRows(rows as WineWithRelations[]);
  const batch = selectBalancedCurationBatch(catalog, 30);
  const allNew: string[] = [];
  let oldTriple = 0;
  let newTriple = 0;
  const report = batch.map((wine) => {
    const oldDrafts = generateLegacyPairingDrafts(wine);
    const newDrafts = generatePairingDrafts(wine);
    const oldNames = oldDrafts.map((row) => row.dish);
    const newNames = newDrafts.map((row) => row.dish);
    if (isSarmaleMiciCheese(oldNames)) oldTriple += 1;
    if (isSarmaleMiciCheese(newNames)) newTriple += 1;
    allNew.push(...newNames);
    return {
      wine: wine.name,
      slug: wine.slug,
      grapes: (wine.grapeVarieties ?? []).map((grape) => grape.name).join(" + "),
      old: oldNames,
      next: newDrafts.map((row) => ({
        dish: row.dish,
        strength: row.strength,
        confidence: row.confidence,
        basis: row.basis,
      })),
    };
  });

  const counts = new Map<string, number>();
  for (const name of allNew) counts.set(name, (counts.get(name) ?? 0) + 1);
  const repeated = [...counts.entries()].sort((left, right) => right[1] - left[1]);
  const wineCount = report.length || 1;
  const has = (re: RegExp) =>
    report.filter((row) => row.next.some((item) => re.test(item.dish))).length;

  const payload = {
    oldTriple,
    newTriple,
    uniqueDishes: counts.size,
    romanianDishes: [...counts.keys()].filter(
      (name) => !["Aperitive", "Fructe de mare", "Paste cu ragu"].includes(name),
    ).length,
    avgDistinct: Number((allNew.length / wineCount).toFixed(2)),
    mostRepeated: repeated[0] ?? null,
        pctSarmale: Math.round((has(/^sarmale$/i) / wineCount) * 100),
    pctMici: Math.round((has(/^mici$/i) / wineCount) * 100),
    pctCheese: Math.round((has(/telemea|cascaval|bulz|branza|mamaliga cu branza/i) / wineCount) * 100),
    nPui: has(/pui|ostropel|ciulama/i),
    nRata: has(/rata/i),
    nIepure: has(/iepure/i),
    nMiel: has(/miel|pastrama|drob/i),
    nFish: has(/crap|scrumbie|pastrav|storceag|hamsii|icre|plachie/i),
    nDessert: has(/cozonac|pasca|papanasi|placinta cu|alivenci|poale/i),
    report,
  };
  const { writeFileSync } = await import("node:fs");
  writeFileSync("tmp-pairing-compare.json", JSON.stringify(payload, null, 2), "utf8");
  console.log("wrote tmp-pairing-compare.json");
  console.log(
    JSON.stringify(
      {
        oldTriple: payload.oldTriple,
        newTriple: payload.newTriple,
        uniqueDishes: payload.uniqueDishes,
        mostRepeated: payload.mostRepeated,
        pctSarmale: payload.pctSarmale,
        pctMici: payload.pctMici,
        nRata: payload.nRata,
        nIepure: payload.nIepure,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
