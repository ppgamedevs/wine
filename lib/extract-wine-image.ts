import "./load-env";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { fetchPageWithResolution } from "./fetch-page-html";
import { extractProductFromHtml, extractProductFromUrl } from "./price-extractor";
import { wines } from "./schema";
import { extractAndSaveWineImageIfMissing } from "./wine-enrichment";
import { buildWineImageAlt } from "./wine-images";
import { inferImageSourceFromUrl } from "./price-extractor";

async function main() {
  const slug = process.argv[2] ?? "cramele-recas-muse-stars-rose-spumant-2022";
  const force = process.argv.includes("--force");

  const wine = await db.query.wines.findFirst({
    where: eq(wines.slug, slug),
    columns: {
      id: true,
      slug: true,
      name: true,
      type: true,
      vintage: true,
      sourceUrl: true,
      producerPageUrl: true,
      imageUrl: true,
      imageSource: true,
    },
    with: { winery: { columns: { name: true } } },
  });

  if (!wine) {
    console.error(`Vin negasit: ${slug}`);
    process.exit(1);
  }

  if (wine.imageUrl?.trim() && !force) {
    console.log(`Imagine existenta: ${wine.imageUrl}`);
    return;
  }

  const urls = [
    wine.producerPageUrl,
    wine.sourceUrl,
  ].filter((value, index, array): value is string => {
    if (!value?.trim()) return false;
    return array.indexOf(value) === index;
  });

  let imageUrl: string | null = null;
  let imageFromUrl: string | null = null;

  for (const url of urls) {
    const fromUrl = await extractProductFromUrl(url, { allowLlm: true });
    if (fromUrl.imageUrl) {
      imageUrl = fromUrl.imageUrl;
      imageFromUrl = fromUrl.finalUrl;
      console.log(`Imagine gasita via extractProductFromUrl: ${imageUrl}`);
      break;
    }

    const page = await fetchPageWithResolution(url);
    const fromHtml = await extractProductFromHtml(page.html, page.finalUrl, {
      sourceUrl: url,
    });
    if (fromHtml.imageUrl) {
      imageUrl = fromHtml.imageUrl;
      imageFromUrl = page.finalUrl;
      console.log(`Imagine gasita via extractProductFromHtml: ${imageUrl}`);
      break;
    }
  }

  if (!imageUrl) {
    const extracted = await extractAndSaveWineImageIfMissing(wine.id);
    if (extracted) {
      const updated = await db.query.wines.findFirst({
        where: eq(wines.id, wine.id),
        columns: { imageUrl: true },
      });
      console.log(`Imagine salvata via extractAndSaveWineImageIfMissing: ${updated?.imageUrl}`);
      return;
    }

    console.error("Nu am gasit imagine pentru acest vin.");
    process.exit(1);
  }

  await db
    .update(wines)
    .set({
      imageUrl,
      imageSource: inferImageSourceFromUrl(imageFromUrl ?? wine.sourceUrl ?? ""),
      imageAlt: buildWineImageAlt({
        name: wine.name,
        vintage: wine.vintage,
        type: wine.type,
        wineryName: wine.winery?.name,
      }),
    })
    .where(eq(wines.id, wine.id));

  console.log(`Actualizat wine ${wine.id} (${wine.slug}) cu ${imageUrl}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
