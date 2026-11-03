import "../lib/load-env";
import { inArray } from "drizzle-orm";
import { db } from "../lib/db";
import { wines } from "../lib/schema";

const SLUGS = [
  "murfatlar-sable-noble-alb",
  "murfatlar-lacrima-lui-ovidiu-rosu",
  "murfatlar-lacrima-lui-ovidiu-roze",
  "murfatlar-lacrima-lui-ovidiu-alb",
];

async function main() {
  const rows = await db.query.wines.findMany({
    where: inArray(wines.slug, SLUGS),
    columns: {
      slug: true,
      foodPairingNotes: true,
      dessertPairings: true,
      foodPairings: true,
      recommendedOccasions: true,
      valueExplanation: true,
      tasteProfile: true,
      thingsYouShouldKnow: true,
      descriptionEditorial: true,
    },
  });

  for (const row of rows) {
    console.log(
      JSON.stringify({
        slug: row.slug,
        foodPairingNotes: (row.foodPairingNotes ?? []).length,
        dessertPairings: (row.dessertPairings ?? []).length,
        foodPairings: (row.foodPairings ?? []).length,
        occasions: (row.recommendedOccasions ?? []).length,
        things: (row.thingsYouShouldKnow ?? []).length,
        hasValueExplanation: Boolean(row.valueExplanation?.trim()),
        hasTaste: Boolean(row.tasteProfile?.trim()),
        editorialPreview: row.descriptionEditorial?.slice(0, 120),
        dessertSample: (row.dessertPairings ?? [])[0]?.dish ?? null,
        foodNoteSample: (row.foodPairingNotes ?? [])[0]?.dish ?? null,
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
