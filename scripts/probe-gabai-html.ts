import "../lib/load-env";
import { fetchPageWithResolution } from "../lib/fetch-page-html";

async function main() {
  const productUrl =
    "https://cramagabai.ro/product/vin-rose-demidulce-sweet-pinot-rose/";
  const page = await fetchPageWithResolution(productUrl);
  const h = page.html;

  console.log("og:title", page.html.match(/property="og:title"\s+content="([^"]+)"/i)?.[1]);
  console.log(
    "product h1",
    h.match(/<h1[^>]*class="[^"]*product_title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i)?.[1],
  );
  for (const match of h.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)) {
    console.log("h1:", match[1]?.slice(0, 100));
  }

  const descTab = h.match(
    /woocommerce-Tabs-panel--description[\s\S]*?<\/div>/i,
  )?.[0];
  console.log("desc tab text:", descTab?.slice(0, 600));

  for (const u of [
    "https://cramagabai.ro/shop/",
    "https://cramagabai.ro/",
  ]) {
    try {
      const p = await fetchPageWithResolution(u);
      console.log(
        u,
        "OK",
        p.finalUrl,
        "products",
        (p.html.match(/\/product\//g) ?? []).length,
      );
    } catch (error) {
      console.log(u, "FAIL", error instanceof Error ? error.message : error);
    }
  }
}

main().catch(console.error);
