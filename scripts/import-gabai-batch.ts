import "../lib/load-env";
import { analyzeAndSaveWineFromUrl } from "@/lib/analyze-wine-service";
import { findWineBySourceUrl } from "@/lib/wine-duplicate-detection";

const URLS = [
  "https://cramagabai.ro/product/vin-rosu-sec-merlot-oak-cask/",
  "https://cramagabai.ro/product/vin-alb-demisec-riesling-italian/",
  "https://cramagabai.ro/product/feteasca-neagra-oak-cask/",
  "https://cramagabai.ro/product/cabernet-sauvignon-oak-cask/",
  "https://cramagabai.ro/product/blend-double-magnum-cutie-personalizata-de-cires/",
  "https://cramagabai.ro/product/blend-2019/",
  "https://cramagabai.ro/product/vin-alb-sec-riesling-italian/",
  "https://cramagabai.ro/product/chardonnay/",
  "https://cramagabai.ro/product/miraz-roze/",
  "https://cramagabai.ro/product/miraz-2020/",
  "https://cramagabai.ro/product/vin-alb-sec-sauvignon-blanc/",
  "https://cramagabai.ro/product/vin-alb-sec-feteasca-alba/",
  "https://cramagabai.ro/product/pinot-noir-demidulce/",
];

const DELAY_MS = 1500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const results: Array<{ url: string; status: string; slug?: string; wineId?: number }> = [];

  for (const url of URLS) {
    console.log(`\n=== ${url} ===`);
    const existing = await findWineBySourceUrl(url);
    if (existing) {
      results.push({
        url,
        status: "existing",
        slug: existing.slug,
        wineId: existing.id,
      });
      console.log("existing", existing.slug);
      continue;
    }

    try {
      const result = await analyzeAndSaveWineFromUrl(url, "admin-cli");
      results.push({
        url,
        status: result.status,
        slug: result.slug,
        wineId: result.wineId,
      });
      console.log(result.status, result.slug ?? result.message);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ url, status: `error: ${message}` });
      console.error("FAILED", message);
    }

    await sleep(DELAY_MS);
  }

  console.log("\n=== summary ===");
  console.table(results);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
