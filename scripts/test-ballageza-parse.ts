import { fetchPageWithResolution } from "@/lib/fetch-page-html";
import { parseAllBallaGezaWinesFromCatalog } from "@/lib/ballageza-producer";

async function main() {
  const page = await fetchPageWithResolution(
    "https://www.ballageza.com/ro/catalog/vinuri",
  );
  const wines = parseAllBallaGezaWinesFromCatalog(page.html);
  console.log("total", wines.length);
  const cadarca = wines.filter((w) => w.name.toLowerCase().includes("cadarca"));
  console.log(
    "cadarca wines:",
    cadarca.map((w) => `${w.name} ${w.vintage} ${w.category}`),
  );
}

main().catch(console.error);
