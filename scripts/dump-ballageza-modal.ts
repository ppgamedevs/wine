import { writeFileSync } from "node:fs";
import { fetchPageWithResolution } from "@/lib/fetch-page-html";

async function main() {
  const page = await fetchPageWithResolution(
    "https://www.ballageza.com/ro/catalog/vinuri",
  );
  const html = page.html;

  const modalIdx = html.indexOf('id="product-24"');
  console.log("modal idx", modalIdx);
  if (modalIdx >= 0) {
    writeFileSync(
      "scripts/ballageza-modal.html",
      html.slice(modalIdx, modalIdx + 6000),
    );
  }

  const modalCount = (html.match(/id="product-\d+"/g) ?? []).length;
  console.log("modal count", modalCount);
}

main().catch(console.error);
