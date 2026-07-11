import "../lib/load-env";
import {
  BUDUREASCA_CATALOG_URL,
  fetchBudureascaCatalogItems,
  parseBudureascaCatalogListing,
  parseBudureascaProductPage,
} from "@/lib/budureasca-producer";
import { fetchPageHtml } from "@/lib/fetch-page-html";
import fs from "node:fs";

async function main() {
  const htmlFile = process.argv.find((arg) => arg.startsWith("--html="))?.slice(7);

  if (htmlFile) {
    const html = fs.readFileSync(htmlFile, "utf8");
    const items = parseBudureascaCatalogListing(html, BUDUREASCA_CATALOG_URL);
    console.log(`[probe-budureasca] parsed ${items.length} items from ${htmlFile}`);
    console.table(items.slice(0, 20));
    return;
  }

  const sampleUrl = process.argv.find(
    (arg) => arg.startsWith("http://") || arg.startsWith("https://"),
  );
  if (sampleUrl) {
    const html = await fetchPageHtml(sampleUrl);
    const wine = parseBudureascaProductPage(html, sampleUrl);
    console.log(JSON.stringify(wine, null, 2));
    return;
  }

  const items = await fetchBudureascaCatalogItems({ maxPages: 10 });
  console.log(`[probe-budureasca] ${items.length} produse gasite`);
  console.table(items.slice(0, 25));

  if (items[0]) {
    console.log("\n--- sample product parse ---");
    const html = await fetchPageHtml(items[0].url);
    const wine = parseBudureascaProductPage(html, items[0].url);
    console.log(JSON.stringify(wine, null, 2));
  }
}

main().catch((error) => {
  console.error("[probe-budureasca] fatal:", error);
  process.exit(1);
});
