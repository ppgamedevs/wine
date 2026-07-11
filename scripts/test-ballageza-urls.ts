import { fetchPageWithResolution } from "@/lib/fetch-page-html";

async function test(url: string) {
  const page = await fetchPageWithResolution(url);
  const hasCadarca2023 = page.html.includes("Cadarca") && page.html.includes("2023");
  const modalCount = (page.html.match(/id="product-\d+"/g) ?? []).length;
  console.log(url, "len", page.html.length, "modals", modalCount, "has cadarca 2023", hasCadarca2023);
}

async function main() {
  await test("https://www.ballageza.com/ro/catalog/vinuri/cadarca,2023");
  await test("https://www.ballageza.com/ro/catalog/vinuri/mustoasa-de-maderat,2024");
  await test("https://www.ballageza.com/ro/catalog/vinuri/feteasca-neagra,2022");
}

main().catch(console.error);
