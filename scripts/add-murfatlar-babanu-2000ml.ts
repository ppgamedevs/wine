import "../lib/load-env";
import { createHash } from "node:crypto";
import { eq, or, sql } from "drizzle-orm";
import { db } from "../lib/db";
import {
  COMMUNITY_SOURCE_BADGE,
  regions,
  wineClaimEvidence,
  wineries,
  wines,
} from "../lib/schema";
import {
  BABANU_PRODUCER,
  BABANU_PRODUCER_PAGE,
  BABANU_RANGE,
  BABANU_VARIANTS,
  babanuIdentityKey,
  babanuSourceUrl,
} from "../lib/murfatlar-babanu-profile";
import { calculateFoodVersatility } from "@/lib/scoring-v2/food-versatility";
import { calculateGiftScore } from "@/lib/scoring-v2/gift-score";
import {
  foodVersatilityInputFromWine,
  giftScoreInputFromWine,
} from "@/lib/scoring-v2/wine-score-inputs";
import { buildWineSlug } from "../lib/wine-url";
import { buildWineImageAlt } from "@/lib/wine-images";

function hash(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

async function main() {
  const apply = process.argv.includes("--apply");
  const winery = await db.query.wineries.findFirst({
    where: eq(wineries.slug, "murfatlar"),
    columns: { id: true, name: true },
  });
  if (!winery) throw new Error("Crama Murfatlar nu există în catalog.");

  const region = await db.query.regions.findFirst({
    where: eq(regions.slug, "murfatlar"),
    columns: { id: true },
  });

  const claimTable = await db.all(
    sql.raw(
      "select name from sqlite_master where type = 'table' and name = 'wine_claim_evidence' limit 1",
    ),
  );
  const claimsAvailable = claimTable.length > 0;
  const rows: Array<Record<string, unknown>> = [];

  for (const variant of BABANU_VARIANTS) {
    const slug = buildWineSlug({
      producer: BABANU_PRODUCER,
      name: variant.name,
      vintage: null,
    });
    const sourceUrl = babanuSourceUrl(variant);
    const identity = babanuIdentityKey(variant);
    const existing = await db.query.wines.findFirst({
      where: or(eq(wines.slug, slug), eq(wines.sourceUrl, sourceUrl)),
      columns: { id: true, slug: true, name: true },
    });
    if (existing) {
      rows.push({
        key: variant.key,
        action: "existing",
        id: existing.id,
        slug: existing.slug,
        name: existing.name,
      });
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
      sourceUrls: [BABANU_PRODUCER_PAGE],
      extractedAt: new Date().toISOString(),
      sourceType: "producer_page" as const,
      extractionMethod: "deterministic" as const,
    };
    const scoreInput = {
      type: variant.type,
      sweetness: variant.sweetness,
      grapeVarieties: [],
      region: { name: "Murfatlar" },
      winery: { name: winery.name },
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
      producerPageUrl: BABANU_PRODUCER_PAGE,
      tastingSheetUrl: null,
      alcohol: null,
      acidity: null,
      foodPairings,
      producerContent,
    };
    const giftScore = calculateGiftScore(giftScoreInputFromWine(scoreInput)).score;
    const foodMatchScore = calculateFoodVersatility(
      foodVersatilityInputFromWine(scoreInput),
    ).score;

    const entry: Record<string, unknown> = {
      key: variant.key,
      action: apply ? "create" : "dry-run",
      slug,
      name: variant.name,
      sourceUrl,
      claims: claimsAvailable ? "pending" : "skipped_missing_wine_claim_evidence",
    };
    rows.push(entry);
    if (!apply) continue;

    const [created] = await db
      .insert(wines)
      .values({
        slug,
        name: variant.name,
        wineryId: winery.id,
        regionId: region?.id ?? null,
        type: variant.type,
        sweetness: variant.sweetness,
        vintage: null,
        grapeVarieties: [],
        alcohol: null,
        sugar: null,
        acidity: null,
        priceAvg: null,
        currentPrice: null,
        lowestPrice30d: null,
        valueScore: null,
        giftScore,
        foodMatchScore,
        beginnerFriendly: false,
        cellarPotential: null,
        overpricedRisk: null,
        tastingNotes: variant.tastingNotes,
        descriptionEditorial: variant.editorial.description,
        tasteProfile: variant.editorial.tasteProfile,
        thingsYouShouldKnow: variant.editorial.thingsYouShouldKnow,
        foodPairings,
        foodPairingNotes: variant.foodNotes,
        dessertPairings: [],
        sourceUrl,
        producerPageUrl: BABANU_PRODUCER_PAGE,
        submittedBy: "admin-cli",
        submitType: "community",
        status: "user_submitted",
        sourceBadge: COMMUNITY_SOURCE_BADGE,
        imageUrl: variant.image,
        imageSource: "producer",
        imageAlt: buildWineImageAlt({
          name: variant.name,
          wineryName: winery.name,
          type: variant.type,
        }),
        availability: [],
        affiliateLinks: [],
        producerContent,
      })
      .returning({ id: wines.id, slug: wines.slug });

    if (!created) throw new Error(`Insert failed for ${variant.key}`);
    entry.id = created.id;
    entry.action = "created";

    if (!claimsAvailable) continue;

    try {
      const sourceHash = hash(`${sourceUrl}|${variant.tastingNotes}`);
      const claims = [
        ["producer", BABANU_PRODUCER, "Producător: Murfatlar."],
        ["range", BABANU_RANGE, "Gama Babanu."],
        ["product_name", variant.name, variant.tastingNotes],
        ["wine_color", variant.type, `Vin ${variant.type}.`],
        ["sweetness", variant.sweetness, variant.sweetness.toUpperCase()],
        ["bottle_volume", 2000, "2000ml"],
        ["serving_temperature", variant.tastingNotes, variant.culinaryPairings],
        ...(variant.foodNotes.length > 0
          ? [
              [
                "food_pairing",
                variant.foodNotes.map((note) => note.dish),
                variant.culinaryPairings,
              ] as const,
            ]
          : []),
      ] as const;

      await db
        .insert(wineClaimEvidence)
        .values(
          claims.map(([field, value, excerpt]) => ({
            wineId: created.id,
            canonicalIdentityKey: identity,
            field: field as never,
            valueJson: value as never,
            normalizedValue: String(value).toLowerCase(),
            sourceUrl,
            sourceTitle: "Babanu - Murfatlar Vinul",
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
          "official Babanu page + ?variant= slug, no synthetic anchors",
        report: rows,
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
