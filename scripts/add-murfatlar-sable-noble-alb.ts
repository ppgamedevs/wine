import "../lib/load-env";
import { eq, or } from "drizzle-orm";
import { db } from "../lib/db";
import {
  DEFAULT_WINE_SOURCE_BADGE,
  regions,
  wineries,
  wines,
} from "../lib/schema";
import { generateAndApplyFullEditorial } from "../lib/wine-enrichment";
import { buildWineImageAlt } from "../lib/wine-images";
import { buildWineSlug } from "../lib/wine-url";

const PRODUCER_PAGE_URL = "https://murfatlar-vinul.ro/sable-noble/";
const SOURCE_URL = `${PRODUCER_PAGE_URL}#alb`;
const IMAGE_URL =
  "https://murfatlar-vinul.ro/wp-content/uploads/2025/06/Sable-Noble-Alb.png";
const NAME = "Sable Noble Alb";
const GRAPE_VARIETIES = [
  { name: "Chardonnay" },
  { name: "Sauvignon Blanc" },
  { name: "Pinot Gris" },
];
const TASTING_NOTES =
  "Culoare: verde galbui. Miros: regasim arome proaspete de smochine, flori de camp si fructe tropicale. Gust: aciditate bine echilibrata si persistenta, cu nuante de fruct tropical si caracter mineral. Temperatura de servire: 8-9C.";
const CULINARY_PAIRINGS =
  "Se poate servi cu preparate din carne de pui, peste, fructe de mare, preparate usoare, branzeturi tinere, salate mediteraneene.";

async function main() {
  const slug = buildWineSlug({
    producer: "Murfatlar",
    name: NAME,
    vintage: null,
  });

  const existing = await db.query.wines.findFirst({
    where: or(eq(wines.slug, slug), eq(wines.sourceUrl, SOURCE_URL)),
    columns: { id: true, slug: true, name: true },
  });
  if (existing) {
    console.log(
      JSON.stringify(
        {
          status: "existing",
          id: existing.id,
          slug: existing.slug,
          message: "Vinul exista deja.",
        },
        null,
        2,
      ),
    );
    return;
  }

  const winery = await db.query.wineries.findFirst({
    where: eq(wineries.slug, "murfatlar"),
    columns: { id: true, name: true },
  });
  if (!winery) {
    throw new Error("Crama Murfatlar nu exista in catalog.");
  }

  const region = await db.query.regions.findFirst({
    where: eq(regions.slug, "murfatlar"),
    columns: { id: true },
  });

  const extractedAt = new Date().toISOString();
  const [created] = await db
    .insert(wines)
    .values({
      slug,
      name: NAME,
      wineryId: winery.id,
      regionId: region?.id ?? null,
      type: "white",
      sweetness: "sec",
      grapeVarieties: GRAPE_VARIETIES,
      alcohol: 13,
      tastingNotes: TASTING_NOTES,
      sourceUrl: SOURCE_URL,
      producerPageUrl: PRODUCER_PAGE_URL,
      submittedBy: "admin-cli",
      submitType: "community",
      status: "verified",
      sourceBadge: DEFAULT_WINE_SOURCE_BADGE,
      imageUrl: IMAGE_URL,
      imageSource: "producer",
      imageAlt: buildWineImageAlt({
        name: NAME,
        wineryName: winery.name,
        type: "white",
      }),
      affiliateLinks: [],
      availability: [],
      producerContent: {
        tastingNotes: TASTING_NOTES,
        culinaryPairings: CULINARY_PAIRINGS,
        sourceUrls: [PRODUCER_PAGE_URL],
        extractedAt,
        sourceType: "producer_page",
        extractionMethod: "deterministic",
      },
    })
    .returning({ id: wines.id, slug: wines.slug });

  await generateAndApplyFullEditorial(created.id);

  const wine = await db.query.wines.findFirst({
    where: eq(wines.id, created.id),
    columns: {
      id: true,
      slug: true,
      name: true,
      type: true,
      sweetness: true,
      alcohol: true,
      grapeVarieties: true,
      valueScore: true,
      descriptionEditorial: true,
      affiliateLinks: true,
      producerPageUrl: true,
      imageUrl: true,
    },
  });

  console.log(
    JSON.stringify(
      {
        status: "created",
        ...wine,
        hasEditorial: Boolean(wine?.descriptionEditorial?.trim()),
      },
      null,
      2,
    ),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
