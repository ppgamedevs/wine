import "../lib/load-env";
import { fetchPageWithResolution } from "../lib/fetch-page-html";
import { parseAllBallaGezaWinesFromCatalog, resolveBallaGezaWineFromCatalog } from "../lib/ballageza-producer";

const urls = [
  "https://www.ballageza.com/ro/catalog/vinuri/tamioasa-romaneasca,2023",
  "https://www.ballageza.com/ro/catalog/vinuri/rose-cadarca,2024",
  "https://www.ballageza.com/ro/catalog/vinuri/cadarca,2022",
  "https://www.ballageza.com/ro/catalog/vinuri/feteasca-neagra,2022",
  "https://www.ballageza.com/ro/catalog/vinuri/blaufrankisch,2020",
  "https://www.ballageza.com/ro/catalog/vinuri/merlot,2022",
  "https://www.ballageza.com/ro/catalog/vinuri/cabernet-franc,2020",
  "https://www.ballageza.com/ro/catalog/vinuri/cabernet-sauvignon,2021",
];

async function main() {
  const page = await fetchPageWithResolution(
    "https://www.ballageza.com/ro/catalog/vinuri",
  );
  const all = parseAllBallaGezaWinesFromCatalog(page.html);

  for (const url of urls) {
    const wine = resolveBallaGezaWineFromCatalog(page.html, url);
    console.log(
      url.split("/").pop(),
      "=>",
      wine?.name,
      wine?.vintage,
      wine?.category,
      wine?.sweetness,
    );
  }

  console.log("\nDuplicates same vintage:");
  for (const url of urls) {
    const hint = url.split("/").pop() ?? "";
    const [slug, vintagePart] = hint.split(",");
    const vintage = Number.parseInt(vintagePart ?? "", 10);
    const matches = all.filter(
      (w) =>
        w.vintage === vintage &&
        w.name.toLowerCase().includes((slug ?? "").replace(/-/g, " ").slice(0, 8)),
    );
    if (matches.length > 1) {
      console.log(
        hint,
        matches.map((m) => `${m.name} ${m.category}`).join(" | "),
      );
    }
  }
}

main().catch(console.error);
