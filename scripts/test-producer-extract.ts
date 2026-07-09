/**
 * Test extragere medalii + continut producator de pe pagini live.
 *
 *   npx tsx scripts/test-producer-extract.ts
 */
import "../lib/load-env";
import { fetchPageWithResolution } from "../lib/fetch-page-html";
import { extractProducerPageFromHtml } from "../lib/producer-page-extract";

const FIXTURES = [
  {
    label: "Avincis Spumant Metoda Traditionala",
    url: "https://www.avincis.ro/vin-spumant-metoda-traditionala-vin-avincis-42-ro.htm",
    expectedMedals: 10,
  },
  {
    label: "Recas La Stejari Chardonnay",
    url: "https://cramelerecas.ro/la-stejari-chardonnay/",
    expectedMedals: 6,
  },
  {
    label: "Recas Castel Huniade Feteasca Regala",
    url: "https://cramelerecas.ro/castel-huniade-feteasca-regala/",
    expectedMedals: 17,
  },
] as const;

async function main() {
  let failed = 0;

  for (const fixture of FIXTURES) {
    console.log(`\n=== ${fixture.label} ===`);
    console.log(`URL: ${fixture.url}`);

    const page = await fetchPageWithResolution(fixture.url);
    const extracted = extractProducerPageFromHtml(page.html, page.finalUrl);

    console.log("Medals:", extracted.medals.length);
    console.log(JSON.stringify(extracted.medals, null, 2));

    if (fixture.label.includes("Recas")) {
      console.log("Viticulture len:", extracted.content.viticulture?.length ?? 0);
      console.log("Tasting len:", extracted.content.tastingNotes?.length ?? 0);
      console.log(
        "Pairings len:",
        extracted.content.culinaryPairings?.length ?? 0,
      );
    }

    if (extracted.medals.length !== fixture.expectedMedals) {
      console.error(
        `FAIL: expected ${fixture.expectedMedals} medals, got ${extracted.medals.length}`,
      );
      failed += 1;
    } else {
      console.log(`OK: ${fixture.expectedMedals} medals`);
    }
  }

  if (failed > 0) {
    process.exitCode = 1;
    console.error(`\n${failed} fixture(s) failed.`);
  } else {
    console.log("\nAll fixtures passed.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
