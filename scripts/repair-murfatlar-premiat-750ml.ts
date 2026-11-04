import "../lib/load-env";
import { createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "../lib/db";
import {
  COMMUNITY_SOURCE_BADGE,
  wineClaimEvidence,
  wines,
} from "../lib/schema";
import {
  PREMIAT_PRODUCER,
  PREMIAT_PRODUCER_PAGE,
  PREMIAT_RANGE,
  PREMIAT_VARIANTS_750ML,
  premiatIdentityKey,
  premiatSourceUrl,
} from "../lib/murfatlar-premiat-profile";
import { calculateFoodVersatility } from "../lib/scoring-v2/food-versatility";
import { calculateGiftScore } from "@/lib/scoring-v2/gift-score";
import {
  foodVersatilityInputFromWine,
  giftScoreInputFromWine,
} from "@/lib/scoring-v2/wine-score-inputs";
import { buildWineSlug } from "../lib/wine-url";

function hash(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

async function main() {
  const apply = process.argv.includes("--apply");
  const confirmed = process.argv.includes("--confirm-repair");
  if (apply && !confirmed) {
    throw new Error("Refusing to write without --apply --confirm-repair.");
  }

  const table = await db.all(
    sql.raw(
      "select name from sqlite_master where type = 'table' and name = 'wine_claim_evidence' limit 1",
    ),
  );
  const claimsAvailable = table.length > 0;
  const report: Array<Record<string, unknown>> = [];

  for (const variant of PREMIAT_VARIANTS_750ML) {
    const slug = buildWineSlug({
      producer: PREMIAT_PRODUCER,
      name: variant.name,
      vintage: null,
    });
    const row = await db.query.wines.findFirst({
      where: eq(wines.slug, slug),
      columns: {
        id: true,
        slug: true,
        name: true,
        status: true,
        sourceUrl: true,
      },
    });
    if (!row) {
      report.push({ variant: variant.key, status: "missing", slug });
      continue;
    }

    const foodPairings = variant.foodNotes.map((note) => ({
      dish: note.dish,
      note: note.note,
      basis: ["producer_evidence"] as const,
      strength: "good" as const,
    }));
    const producerContent = {
      tastingNotes: variant.tastingNotes,
      culinaryPairings: variant.culinaryPairings,
      sourceUrls: [PREMIAT_PRODUCER_PAGE],
      extractedAt: new Date().toISOString(),
      sourceType: "producer_page" as const,
      extractionMethod: "deterministic" as const,
    };
    const scoreInput = {
      type: variant.type,
      sweetness: variant.sweetness,
      grapeVarieties: [],
      region: { name: "Murfatlar" },
      winery: { name: PREMIAT_PRODUCER },
      vintage: null,
      valueScore: null,
      giftScore: null,
      foodMatchScore: null,
      estimatedQuality: null,
      qualityFinal: null,
      qualityEffective: null,
      medals: [],
      criticScore: null,
      ratingAvg: null,
      communityScore: null,
      producerPageUrl: PREMIAT_PRODUCER_PAGE,
      tastingSheetUrl: null,
      alcohol: null,
      acidity: null,
      foodPairings,
      producerContent,
    };
    const patch = {
      name: variant.name,
      status: "user_submitted" as const,
      sourceUrl: premiatSourceUrl(variant),
      sourceBadge: COMMUNITY_SOURCE_BADGE,
      tastingNotes: variant.tastingNotes,
      descriptionEditorial: variant.editorial.description,
      tasteProfile: variant.editorial.tasteProfile,
      thingsYouShouldKnow: variant.editorial.thingsYouShouldKnow,
      foodPairings,
      foodPairingNotes: variant.foodNotes,
      producerContent,
      giftScore: calculateGiftScore(giftScoreInputFromWine(scoreInput)).score,
      foodMatchScore: calculateFoodVersatility(
        foodVersatilityInputFromWine(scoreInput),
      ).score,
      updatedAt: new Date().toISOString(),
    };

    const entry: Record<string, unknown> = {
      variant: variant.key,
      status: "repair-plan",
      id: row.id,
      slug: row.slug,
      before: {
        name: row.name,
        status: row.status,
        sourceUrl: row.sourceUrl,
      },
      after: {
        name: patch.name,
        status: patch.status,
        sourceUrl: patch.sourceUrl,
      },
      action: apply ? "applied" : "dry-run",
      claims: claimsAvailable ? "pending" : "skipped_missing_wine_claim_evidence",
    };
    report.push(entry);

    if (!apply) continue;

    await db.update(wines).set(patch).where(eq(wines.id, row.id));
    if (!claimsAvailable) continue;

    try {
      const identity = premiatIdentityKey(variant);
      const sourceUrl = premiatSourceUrl(variant);
      const sourceHash = hash(`${sourceUrl}|${variant.tastingNotes}`);
      const claims = [
        ["producer", PREMIAT_PRODUCER, "Producător: Murfatlar."],
        ["range", PREMIAT_RANGE, "Gama Premiat Eticheta Neagra."],
        ["product_name", variant.name, variant.tastingNotes],
        ["wine_color", variant.type, `Vin ${variant.label.toLowerCase()}.`],
        ["sweetness", "demisec", "DEMISEC, obținut din podgoria Murfatlar."],
        ["bottle_volume", 750, "750ml"],
        [
          "serving_temperature",
          variant.servingTemperature,
          `Temperatura de servire: ${variant.servingTemperature}.`,
        ],
        [
          "food_pairing",
          variant.foodNotes.map((note) => note.dish),
          variant.culinaryPairings,
        ],
      ] as const;

      await db
        .insert(wineClaimEvidence)
        .values(
          claims.map(([field, value, excerpt]) => ({
            wineId: row.id,
            canonicalIdentityKey: identity,
            field: field as never,
            valueJson: value as never,
            normalizedValue: String(value).toLowerCase(),
            sourceUrl,
            sourceTitle: "Premiat - Murfatlar Vinul",
            sourceClass: "official_producer_page" as const,
            excerpt,
            observedAt: new Date().toISOString(),
            extractionMethod: "deterministic",
            identityMatchStatus: "EXACT_WINE_UNDATED",
            verificationStatus: "attributed_editorial" as const,
            confidence: 0.78,
            sourceHash,
            claimHash: hash(
              `${identity}|${field}|${JSON.stringify(value)}|${sourceHash}`,
            ),
          })),
        )
        .onConflictDoNothing();
      entry.claims = "written_or_already_present";
    } catch (error) {
      entry.claims =
        "claim_write_failed: " +
        (error instanceof Error ? error.message : String(error));
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun: !apply,
        sourceIdentity:
          "official page + ?variant= slug, no synthetic anchor fragments",
        report,
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
