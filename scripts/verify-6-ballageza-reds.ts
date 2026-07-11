import "../lib/load-env";
import { fetchPageWithResolution } from "../lib/fetch-page-html";
import { resolveBallaGezaWineFromCatalog } from "../lib/ballageza-producer";

const urls = [
  "https://www.ballageza.com/ro/catalog/vinuri/cadarca,2023",
  "https://www.ballageza.com/ro/catalog/vinuri/feteasca-neagra,2022",
  "https://www.ballageza.com/ro/catalog/vinuri/blaufrankisch,2021",
  "https://www.ballageza.com/ro/catalog/vinuri/pinot-noir,2022",
  "https://www.ballageza.com/ro/catalog/vinuri/merlot,2023",
  "https://www.ballageza.com/ro/catalog/vinuri/cabernet-sauvignon,2021",
];

async function main() {
  const page = await fetchPageWithResolution(
    "https://www.ballageza.com/ro/catalog/vinuri",
  );
  for (const url of urls) {
    const wine = resolveBallaGezaWineFromCatalog(page.html, url);
    console.log(
      url,
      "=>",
      wine?.name,
      wine?.vintage,
      wine?.category,
      wine?.sweetness,
      wine?.alcohol,
    );
  }
}

main().catch(console.error);
