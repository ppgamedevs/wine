import { fetchPageWithResolution } from "@/lib/fetch-page-html";
import {
  resolveBallaGezaWineFromCatalog,
  inferBallaGezaProducerPageUrl,
} from "@/lib/ballageza-producer";
import { extractProductFromHtml } from "@/lib/price-extractor";

async function main() {
  const url = "https://www.ballageza.com/ro/catalog/vinuri/cadarca,2023";
  const page = await fetchPageWithResolution(url);
  const wine = resolveBallaGezaWineFromCatalog(page.html, page.finalUrl);
  console.log("resolved wine:", wine);

  const extracted = await extractProductFromHtml(page.html, page.finalUrl, {
    allowLlm: false,
  });
  console.log("extracted:", extracted);

  console.log(
    "inferred:",
    inferBallaGezaProducerPageUrl("Cadarca 2023 Classic", ""),
  );
}

main().catch(console.error);
