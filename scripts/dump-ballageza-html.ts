import { writeFileSync } from "node:fs";
import { fetchPageWithResolution } from "@/lib/fetch-page-html";

async function main() {
  const page = await fetchPageWithResolution(
    "https://www.ballageza.com/ro/catalog/vinuri",
  );
  const html = page.html;

  const markers = [
    "Mustoas",
    "Cadarca 2023",
    "Categoria:",
    "product-item",
    "product_card",
    "wine-item",
  ];
  for (const marker of markers) {
    console.log(marker, html.indexOf(marker));
  }

  const mustoIdx = html.indexOf("Mustoas");
  if (mustoIdx >= 0) {
    writeFileSync(
      "scripts/ballageza-wine-block.html",
      html.slice(Math.max(0, mustoIdx - 2000), mustoIdx + 5000),
    );
    console.log("wrote block at", mustoIdx);
  }

  const cardIdx = html.indexOf("product-item");
  if (cardIdx >= 0) {
    writeFileSync(
      "scripts/ballageza-card.html",
      html.slice(Math.max(0, cardIdx - 500), cardIdx + 3000),
    );
    console.log("wrote card at", cardIdx);
  }
}

main().catch(console.error);
