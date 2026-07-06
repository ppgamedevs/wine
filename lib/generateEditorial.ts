import "./load-env";
import { eq } from "drizzle-orm";
import {
  applyDessertPairingsToWine,
  applyFullEditorialToWine,
  generateDessertPairingsForWine,
  generateFullEditorialForWine,
  hasMinimumFactualDataForEditorial,
  loadWineForEditorial,
} from "@/lib/regenerate-wine-editorial";
import { db } from "@/lib/db";
import { wines } from "@/lib/schema";

function parseArgs() {
  const args = process.argv.slice(2);
  const slugArg = args.find((a) => a.startsWith("--slug="));
  const slug = slugArg?.slice("--slug=".length);
  const force = args.includes("--force");
  const dessertOnly = args.includes("--dessert-only");
  return { slug, force, dessertOnly };
}

async function loadWines(slug?: string) {
  if (slug) {
    const wine = await loadWineForEditorial(
      (
        await db.query.wines.findFirst({
          where: eq(wines.slug, slug),
          columns: { id: true },
        })
      )?.id ?? -1,
    );
    return wine ? [wine] : [];
  }
  return db.query.wines.findMany({
    with: { winery: true, region: true },
  });
}

function hasEditorial(wine: Awaited<ReturnType<typeof loadWines>>[number]): boolean {
  return Boolean(
    wine.descriptionEditorial?.trim() ||
      wine.valueExplanation?.trim() ||
      wine.thingsYouShouldKnow.length > 0,
  );
}

function needsDessertPairings(
  wine: Awaited<ReturnType<typeof loadWines>>[number],
): boolean {
  return wine.dessertPairings.length === 0;
}

async function main() {
  const { slug, force, dessertOnly } = parseArgs();
  const targetWines = await loadWines(slug);

  if (slug && targetWines.length === 0) {
    console.error(`Vin negasit: ${slug}`);
    process.exit(1);
  }

  const modeLabel = dessertOnly ? "dessert pairings" : "editorial content";
  console.log(`Generating ${modeLabel} for ${targetWines.length} wine(s)...`);

  if (targetWines.length === 0) {
    console.log("Baza de date este goala. Ruleaza mai intai: npm run db:seed");
    return;
  }

  let done = 0;
  for (const wine of targetWines) {
    if (dessertOnly) {
      if (!force && !needsDessertPairings(wine)) {
        console.log(`Skip ${wine.slug} (already has dessert pairings)`);
        continue;
      }
      if (!hasMinimumFactualDataForEditorial(wine)) {
        console.log(`Skip ${wine.slug} (insufficient factual data)`);
        continue;
      }

      try {
        console.log(`Dessert pairings: ${wine.name}...`);
        const result = await generateDessertPairingsForWine(wine);
        await applyDessertPairingsToWine(wine, result.dessertPairings);

        done += 1;
        const dishes = result.dessertPairings.map((p) => p.dish).join(", ");
        console.log(
          `  OK ${wine.slug} | ${result.dessertPairings.length} pairing(s)${dishes ? `: ${dishes}` : ""}`,
        );
        await sleep(1200);
      } catch (error) {
        console.error(`Failed for ${wine.slug}:`, error);
      }
      continue;
    }

    if (!force && hasEditorial(wine)) {
      console.log(`Skip ${wine.slug} (already has editorial)`);
      continue;
    }

    try {
      console.log(`Generating: ${wine.name}...`);
      const editorial = await generateFullEditorialForWine(wine);
      await applyFullEditorialToWine(wine.id, editorial);

      done += 1;
      console.log(
        `  OK ${wine.slug} | Value ${editorial.valueScore} Gift ${editorial.giftScore} Food ${editorial.foodMatchScore}`,
      );
      await sleep(1500);
    } catch (error) {
      console.error(`Failed for ${wine.slug}:`, error);
    }
  }

  const suffix = dessertOnly ? "dessert pairing set(s)" : "editorial set(s)";
  console.log(`Done. Generated ${done} ${suffix}.`);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error("generateEditorial failed:", error);
  process.exit(1);
});
