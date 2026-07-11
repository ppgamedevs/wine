import "../lib/load-env";
import { eq, inArray } from "drizzle-orm";
import { execSync } from "node:child_process";
import { db } from "../lib/db";
import { regions, wines } from "../lib/schema";

const URLS = [
  "https://www.ballageza.com/ro/catalog/vinuri/cadarca-reserve,2020-editie-limitata",
  "https://www.ballageza.com/ro/catalog/vinuri/pinot-noir-reserve,2020-editie-limitata",
  "https://www.ballageza.com/ro/catalog/vinuri/feteasca-neagra-reserve,2020-editie-limitata",
  "https://www.ballageza.com/ro/catalog/vinuri/merlot-reserve,2020-editie-limitata",
  "https://www.ballageza.com/ro/catalog/vinuri/cuvee-reserve,2020-editie-limitata",
  "https://www.ballageza.com/ro/catalog/vinuri/grand-cuvee-reserve,2020-editie-limitata",
  "https://www.ballageza.com/ro/catalog/vinuri/aradinum-cuvee,2021-editie-limitata",
  "https://www.ballageza.com/ro/catalog/vinuri/david-cuvee,2015-editie-limitata",
  "https://www.ballageza.com/ro/catalog/vinuri/cadarissima,2023-editie-limitata",
];

async function main() {
  const createdIds: number[] = [];

  for (const url of URLS) {
    console.log("\n=== Import", url, "===");
    const output = execSync(`npx tsx lib/add-wine-from-url.ts "${url}"`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "inherit"],
      cwd: process.cwd(),
    });

    const match = output.match(/"wineId":\s*(\d+)/);
    const statusMatch = output.match(/"status":\s*"([^"]+)"/);
    const slugMatch = output.match(/"slug":\s*"([^"]+)"/);

    if (match?.[1]) {
      createdIds.push(Number.parseInt(match[1], 10));
    }

    console.log(
      statusMatch?.[1] ?? "unknown",
      slugMatch?.[1] ?? "",
      match?.[1] ?? "",
    );
  }

  const minis = await db.query.regions.findFirst({
    where: eq(regions.slug, "minis"),
    columns: { id: true },
  });

  if (minis && createdIds.length > 0) {
    await db
      .update(wines)
      .set({ regionId: minis.id, tastingSheetUrl: null })
      .where(inArray(wines.id, createdIds));
  }

  const rows = await db.query.wines.findMany({
    where: inArray(wines.id, createdIds),
    columns: { id: true, slug: true, name: true, vintage: true, regionId: true },
    orderBy: (w, { asc }) => [asc(w.id)],
  });

  console.log("\n=== Rezultat ===");
  console.log(JSON.stringify(rows, null, 2));
}

main().catch(console.error);
