import { fetchPageWithResolution } from "@/lib/fetch-page-html";
import { resolveBallaGezaWineFromCatalog } from "@/lib/ballageza-producer";

const urls = [
  "https://www.ballageza.com/ro/catalog/vinuri/mustoasa-de-maderat,2024",
  "https://www.ballageza.com/ro/catalog/vinuri/feteasca-regala,2025",
  "https://www.ballageza.com/ro/catalog/vinuri/sauvignon-blanc,2025",
  "https://www.ballageza.com/ro/catalog/vinuri/furmint,2024",
];

async function main() {
  const page = await fetchPageWithResolution(
    "https://www.ballageza.com/ro/catalog/vinuri",
  );
  for (const url of urls) {
    const wine = resolveBallaGezaWineFromCatalog(page.html, url);
    console.log(url, "=>", wine?.name, wine?.vintage, wine?.category, wine?.sweetness);
  }
}

main().catch(console.error);
