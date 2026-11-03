import "../lib/load-env";
import { eq, inArray } from "drizzle-orm";
import { db } from "../lib/db";
import { wines } from "../lib/schema";
import { generateAndApplyFullEditorial } from "../lib/wine-enrichment";

const TARGETS = [
  "murfatlar-sable-noble-alb",
  "murfatlar-lacrima-lui-ovidiu-rosu",
  "murfatlar-lacrima-lui-ovidiu-roze",
  "murfatlar-lacrima-lui-ovidiu-alb",
] as const;

async function main() {
  const rows = await db.query.wines.findMany({
    where: inArray(wines.slug, [...TARGETS]),
    columns: {
      id: true,
      slug: true,
      name: true,
      alcohol: true,
      sweetness: true,
      type: true,
      valueScore: true,
      giftScore: true,
      foodMatchScore: true,
      priceAvg: true,
      descriptionEditorial: true,
      tasteProfile: true,
      foodPairingNotes: true,
      thingsYouShouldKnow: true,
      producerContent: true,
      imageUrl: true,
      status: true,
    },
  });

  for (const row of rows) {
    const needsAlcohol =
      row.slug === "murfatlar-sable-noble-alb" && row.alcohol == null;
    const needsEditorial =
      !row.descriptionEditorial?.trim() ||
      !row.tasteProfile?.trim() ||
      (row.foodPairingNotes ?? []).length === 0 ||
      row.slug === "murfatlar-sable-noble-alb";

    if (needsAlcohol) {
      await db
        .update(wines)
        .set({ alcohol: 13 })
        .where(eq(wines.id, row.id));
      console.log(`[patch] ${row.slug} alcohol=13`);
    }

    if (needsEditorial) {
      console.log(`[editorial] generating for ${row.slug}...`);
      await generateAndApplyFullEditorial(row.id);
    } else {
      console.log(`[ok] ${row.slug} already has editorial`);
    }
  }

  const refreshed = await db.query.wines.findMany({
    where: inArray(wines.slug, [...TARGETS]),
    columns: {
      id: true,
      slug: true,
      name: true,
      alcohol: true,
      type: true,
      sweetness: true,
      valueScore: true,
      giftScore: true,
      foodMatchScore: true,
      priceAvg: true,
      descriptionEditorial: true,
      tasteProfile: true,
      foodPairingNotes: true,
      thingsYouShouldKnow: true,
      imageUrl: true,
    },
  });

  for (const r of refreshed) {
    console.log(
      JSON.stringify({
        id: r.id,
        slug: r.slug,
        type: r.type,
        sweetness: r.sweetness,
        alcohol: r.alcohol,
        priceAvg: r.priceAvg,
        valueScore: r.valueScore,
        giftScore: r.giftScore,
        foodMatchScore: r.foodMatchScore,
        hasEditorial: Boolean(r.descriptionEditorial?.trim()),
        editorialLen: r.descriptionEditorial?.length ?? 0,
        hasTaste: Boolean(r.tasteProfile?.trim()),
        pairingCount: (r.foodPairingNotes ?? []).length,
        things: (r.thingsYouShouldKnow ?? []).length,
        hasImage: Boolean(r.imageUrl),
      }),
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
