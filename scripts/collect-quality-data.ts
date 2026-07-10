/**
 * Colecteaza date de calitate reale din DB (+ overrides optionale).
 *
 *   npx tsx scripts/collect-quality-data.ts
 */
import "../lib/load-env";
import {
  collectQualityDataFromDb,
  saveQualityDataset,
  summarizeQualityDataset,
} from "@/lib/quality-model";

async function main() {
  const bootstrap = process.argv.includes("--bootstrap");
  const rows = await collectQualityDataFromDb({ bootstrap });
  const summary = summarizeQualityDataset(rows);
  const filePath = await saveQualityDataset(rows);

  console.log("[collect-quality] Dataset salvat:", filePath);
  console.log("[collect-quality] Vinuri cu eticheta:", summary.total);
  console.log("[collect-quality] Cu critic:", summary.withCritic);
  console.log("[collect-quality] Cu Vivino:", summary.withVivino);
  console.log("[collect-quality] Cu expert:", summary.withExpert);
  console.log("[collect-quality] Cu consumer:", summary.withConsumer);
  console.log("[collect-quality] Bootstrap (medalii):", summary.bootstrap);
  console.log("[collect-quality] Label mediu:", summary.avgLabel);

  if (summary.total < 10) {
    console.warn(
      "[collect-quality] Prea putine etichete pentru antrenare robusta (minim recomandat: 10).",
    );
  }
}

main().catch((error) => {
  console.error("[collect-quality] fatal:", error);
  process.exit(1);
});
