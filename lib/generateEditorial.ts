import "./load-env";
import { eq } from "drizzle-orm";
import {
  applyFullEditorialToWine,
  generateFullEditorialForWine,
  loadWineForEditorial,
} from "@/lib/regenerate-wine-editorial";
import { db } from "@/lib/db";
import { wines } from "@/lib/schema";

function parseArgs() {
  const args = process.argv.slice(2);
  const slugArg = args.find((a) => a.startsWith("--slug="));
  const slug = slugArg?.slice("--slug=".length);
  const force = args.includes("--force");
  return { slug, force };
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

async function main() {
  const { slug, force } = parseArgs();
  const targetWines = await loadWines(slug);

  if (slug && targetWines.length === 0) {
    console.error(`Vin negasit: ${slug}`);
    process.exit(1);
  }

  console.log(
    `Generating editorial content for ${targetWines.length} wine(s)...`,
  );

  if (targetWines.length === 0) {
    console.log("Baza de date este goala. Ruleaza mai intai: npm run db:seed");
    return;
  }

  let done = 0;
  for (const wine of targetWines) {
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

  console.log(`Done. Generated editorial for ${done} wine(s).`);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error("generateEditorial failed:", error);
  process.exit(1);
});
