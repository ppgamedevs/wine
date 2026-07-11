import {
  parseBudureascaCatalogListing,
  parseBudureascaProductPage,
} from "@/lib/budureasca-producer";

const catalogHtml = `
<ul class="products list items product-items">
  <li class="item product product-item">
    <a class="product-item-link" href="https://budureasca.ro/premium-sauvignon-blanc/" title="Premium Sauvignon Blanc Sec 2024">
      <span>Premium Sauvignon Blanc Sec 2024</span>
    </a>
    <span class="price">59&nbsp;<span class="decimal">00</span>&nbsp;<span class="currency">Lei</span></span>
  </li>
  <li class="item product product-item">
    <a class="product-item-link" href="https://budureasca.ro/clasic-sauvignon-blanc/" title="Budureasca Clasic Sauvignon Blanc Demisec 2024">
      Budureasca Clasic Sauvignon Blanc Demisec 2024
    </a>
    <span class="price">38&nbsp;<span class="decimal">00</span>&nbsp;<span class="currency">Lei</span></span>
  </li>
  <li class="item product product-item">
    <a class="product-item-link" href="https://budureasca.ro/pachet-cadou-test/" title="Pachet 2 x Polar Wine Sec 2023 (1 + 1 cadou!)">
      Pachet 2 x Polar Wine Sec 2023 (1 + 1 cadou!)
    </a>
  </li>
</ul>
`;

const productHtml = `
<h1 class="page-title"><span>Premium Sauvignon Blanc Sec 2024</span></h1>
<meta property="og:title" content="Premium Sauvignon Blanc Sec 2024 - Crama Budureasca" />
<meta property="product:price:amount" content="59" />
<meta property="og:image" content="https://budureasca.ro/media/catalog/product/premium-sb.png" />
<p>Vinul ne intampina in pahar cu o culoare galben-pai pal. Aromele primare sunt bazate pe note vegetale de sparanghel.</p>
<table id="product-attribute-specs-table">
  <tr><th>An de recoltă</th><td>2024</td></tr>
  <tr><th>Soi de struguri</th><td>Sauvignon Blanc</td></tr>
  <tr><th>Culoare vin</th><td>Alb</td></tr>
  <tr><th>Tip vin</th><td>Sec</td></tr>
  <tr><th>Volum alcool</th><td>13%</td></tr>
  <tr><th>Cantitate</th><td>750 ml</td></tr>
</table>
`;

const catalog = parseBudureascaCatalogListing(catalogHtml);
console.assert(catalog.length === 2, `expected 2 catalog items, got ${catalog.length}`);
console.assert(
  catalog[0]?.url === "https://budureasca.ro/premium-sauvignon-blanc/",
  "catalog url mismatch",
);

const wine = parseBudureascaProductPage(
  productHtml,
  "https://budureasca.ro/premium-sauvignon-blanc/",
);
console.assert(wine?.name === "Premium Sauvignon Blanc Sec 2024", "product name mismatch");
console.assert(wine?.vintage === 2024, "vintage mismatch");
console.assert(wine?.price === 59, "price mismatch");
console.assert(wine?.sweetness === "sec", "sweetness mismatch");
console.assert(wine?.color === "alb", "color mismatch");
console.assert(wine?.grapeVarieties[0]?.name === "Sauvignon Blanc", "grape mismatch");

console.log("[verify-budureasca-parser] ok");
