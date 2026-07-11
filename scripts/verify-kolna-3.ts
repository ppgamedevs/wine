import "../lib/load-env";
import { fetchPageWithResolution } from "../lib/fetch-page-html";
import { resolveBallaGezaWineFromCatalog } from "../lib/ballageza-producer";

const candidates = [
  "https://www.ballageza.com/ro/catalog/vinuri/sauvignon-blanc-feteasca-regala,2023",
  "https://www.ballageza.com/ro/catalog/vinuri/sauvignon-blanc-si-feteasca-regala,2023",
  "https://www.ballageza.com/ro/catalog/vinuri/sauvignon-blanc,2024",
  "https://www.ballageza.com/ro/catalog/vinuri/riesling-de-rhin,2023",
  "https://www.ballageza.com/ro/catalog/vinuri/riesling,2023",
];

async function main() {
  const page = await fetchPageWithResolution(
    "https://www.ballageza.com/ro/catalog/vinuri",
  );
  for (const url of candidates) {
    const wine = resolveBallaGezaWineFromCatalog(page.html, url);
    console.log(
      url,
      "=>",
      wine?.name,
      wine?.vintage,
      wine?.category,
      wine?.alcohol,
    );
  }

  const kolna = page.html.match(/Sauvignon Blanc & Feteasc[^\n<]*/gi);
  console.log("blend mentions:", [...new Set(kolna ?? [])].slice(0, 5));
}

main().catch(console.error);
