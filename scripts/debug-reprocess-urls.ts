import "../lib/load-env";
import { db } from "../lib/db";
import {
  fetchAndExtractProducerPages,
  resolveProducerPageUrlsForWine,
} from "../lib/fetch-producer-page-content";

const SLUGS = [
  "avincis-spumant-avincis-metoda-traditionla-extra-brut-0-75l",
  "cramele-recas-la-stejari-chardonnay-2020",
  "cramele-recas-sole-chardonnay-2025",
];

async function main() {
  for (const slug of SLUGS) {
    const wine = await db.query.wines.findFirst({
      where: (table, { eq }) => eq(table.slug, slug),
      columns: {
        name: true,
        sourceUrl: true,
        producerPageUrl: true,
        medals: true,
      },
    });

    if (!wine) {
      console.log(`${slug}: NOT FOUND`);
      continue;
    }

    const urls = resolveProducerPageUrlsForWine(wine);
    const extracted = await fetchAndExtractProducerPages(urls);

    console.log(`\n--- ${slug} ---`);
    console.log("name:", wine.name);
    console.log("sourceUrl:", wine.sourceUrl?.slice(0, 80));
    console.log("resolved urls:", urls.length);
    for (const url of urls) console.log(" ", url);
    console.log("fetched:", extracted.fetchedUrls.length);
    console.log("heuristic medals:", extracted.medals.length);
    console.log("db medals:", wine.medals?.length ?? 0);
  }
}

main().catch(console.error);
