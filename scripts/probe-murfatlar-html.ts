import "../lib/load-env";
import { fetchPageWithResolution } from "@/lib/fetch-page-html";
import {
  fetchMurfatlarCatalogItems,
  parseMurfatlarProductVariants,
} from "../lib/murfatlar-producer";

async function main() {
  const catalog = await fetchMurfatlarCatalogItems();
  console.log("catalog", catalog.length);
  for (const item of catalog) {
    console.log(`- ${item.name} -> ${item.url}`);
  }

  const productUrl = process.argv[2] ?? "https://murfatlar-vinul.ro/sable-noble/";
  const page = await fetchPageWithResolution(productUrl);
  const variants = parseMurfatlarProductVariants(page.html, page.finalUrl);
  console.log("\nvariants for", productUrl);
  console.log(JSON.stringify(variants, null, 2));
}

main().catch(console.error);
