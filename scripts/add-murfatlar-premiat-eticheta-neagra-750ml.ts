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
  type FoodPairing,
} from "../lib/schema";
import { calculateFoodVersatility } from "../lib/scoring-v2/food-versatility";
import { calculateGiftScore } from "../lib/scoring-v2/gift-score";
import {
  foodVersatilityInputFromWine,
  giftScoreInputFromWine,
} from "../lib/scoring-v2/wine-score-inputs";
import {
  PREMIAT_PRODUCER,
  PREMIAT_PRODUCER_PAGE,
  PREMIAT_RANGE,
  PREMIAT_VARIANTS_750ML,
  premiatIdentityKey,
  premiatSourceUrl,
  type PremiatVariant,
} from "../lib/murfatlar-premiat-profile";
import { buildWineImageAlt } from "../lib/wine-images";
import { buildWineSlug } from "../lib/wine-url";

function hash(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function pairingRows(variant: PremiatVariant): FoodPairing[] {
  return variant.foodNotes.map((note) => ({
    dish: note.dish,
    note: note.note,
    basis: ["producer_evidence"],
    strength: "good",
  }));
}

function claimRows(variant: PremiatVariant, wineId: number, identity: string) {
  const sourceUrl = premiatSourceUrl(variant);
  const observedAt = new Date().toISOString();
  const sourceHash = hash(`${sourceUrl}|${variant.tastingNotes}`);
  const common = {
    wineId,
    canonicalIdentityKey: identity,
    sourceUrl,
    sourceTitle: "Premiat - Murfatlar Vinul",
    sourceClass: "official_producer_page" as const,
    observedAt,
    extractionMethod: "deterministic",
    identityMatchStatus: "EXACT_WINE_UNDATED",
    verificationStatus: "attributed_editorial" as const,
    confidence: 0.78,
    sourceHash,
  };

  const claims: Array<{
    field: Parameters<typeof db.insert>[0] extends never ? never : string;
    value: string | number | string[];
    normalized: string;
    excerpt: string;
  }> = [
    {
      field: "producer",
      value: PREMIAT_PRODUCER,
      normalized: PREMIAT_PRODUCER.toLowerCase(),
      excerpt: "Producător: Murfatlar.",
    },
    {
      field: "range",
      value: PREMIAT_RANGE,
      normalized: PREMIAT_RANGE.toLowerCase(),
      excerpt: "Gama Premiat Eticheta Neagra.",
    },
    {
      field: "product_name",
      value: variant.name,
      normalized: variant.name.toLowerCase(),
      excerpt: variant.tastingNotes,
    },
    {
      field: "wine_color",
      value: variant.type,
      normalized: variant.type,
      excerpt: `Vin ${variant.label.toLowerCase()}.`,
    },
    {
      field: "sweetness",
      value: "demisec",
      normalized: "demisec",
      excerpt: "DEMISEC, obținut din podgoria Murfatlar.",
    },
    {
      field: "bottle_volume",
      value: 750,
      normalized: "750",
      excerpt: "750ml",
    },
    {
      field: "serving_temperature",
      value: variant.servingTemperature,
      normalized: variant.servingTemperature,
      excerpt: `Temperatura de servire: ${variant.servingTemperature}.`,
    },
    {
      field: "food_pairing",
      value: variant.foodNotes.map((note) => note.dish),
      normalized: variant.culinaryPairings.toLowerCase(),
      excerpt: variant.culinaryPairings,
    },
    {
      field: "aroma_descriptors",
      value: variant.tastingNotes.split("Miros:")[1]?.split("Gust:")[0]?.trim() ?? "",
      normalized: variant.tastingNotes.toLowerCase(),
      excerpt: variant.tastingNotes,
    },
    {
      field: "taste_descriptors",
      value: variant.tastingNotes.split("Gust:")[1]?.split("Temperatura")[0]?.trim() ?? "",
      normalized: variant.tastingNotes.toLowerCase(),
      excerpt: variant.tastingNotes,
    },
  ];

  return claims
    .filter((claim) => claim.value !== "")
    .map((claim) => ({
      ...common,
      field: claim.field as never,
      valueJson: claim.value,
      normalizedValue: claim.normalized,
      excerpt: claim.excerpt,
      claimHash: hash(
        `${identity}|${claim.field}|${JSON.stringify(claim.value)}|${sourceHash}`,
      ),
    }));
}

async function main() {
  const apply = process.argv.includes("--apply");
  const claimTable = await db.all(
    sql.raw(
      "select name from sqlite_master where type = 'table' and name = 'wine_claim_evidence' limit 1",
    ),
  );
  const claimsAvailable = claimTable.length > 0;
  const winery = await db.query.wineries.findFirst({
    where: eq(wineries.slug, "murfatlar"),
    columns: { id: true, name: true },
  });
  if (!winery) throw new Error("Crama Murfatlar nu există în catalog.");

  const region = await db.query.regions.findFirst({
    where: eq(regions.slug, "murfatlar"),
    columns: { id: true },
  });

  const rows: Array<{ action: string; slug: string; name: string }> = [];
  for (const variant of PREMIAT_VARIANTS_750ML) {
    const slug = buildWineSlug({
      producer: PREMIAT_PRODUCER,
      name: variant.name,
      vintage: null,
    });
    const sourceUrl = premiatSourceUrl(variant);
    const identity = premiatIdentityKey(variant);
    const existing = await db.query.wines.findFirst({
      where: or(eq(wines.slug, slug), eq(wines.sourceUrl, sourceUrl)),
      columns: { id: true, slug: true, name: true },
    });
    if (existing) {
      rows.push({ action: "existing", slug: existing.slug, name: existing.name });
      continue;
    }

    rows.push({ action: apply ? "create" : "dry-run", slug, name: variant.name });
    if (!apply) continue;

    const extractedAt = new Date().toISOString();
    const foodPairings = pairingRows(variant);
    const producerContent = {
      tastingNotes: variant.tastingNotes,
      culinaryPairings: variant.culinaryPairings,
      sourceUrls: [PREMIAT_PRODUCER_PAGE],
      extractedAt,
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
      producerPageUrl: PREMIAT_PRODUCER_PAGE,
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
        producerPageUrl: PREMIAT_PRODUCER_PAGE,
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
    if (claimsAvailable) {
      try {
        await db
          .insert(wineClaimEvidence)
          .values(claimRows(variant, created.id, identity))
          .onConflictDoNothing();
      } catch (error) {
        console.warn(
          `Structured claims skipped for ${variant.key}`,
          error instanceof Error ? error.message : error,
        );
      }
    }
    rows.push({
      action: "created",
      slug: created.slug,
      name: variant.name,
    });
  }

  console.log(
    JSON.stringify(
      {
        dryRun: !apply,
        producerPage: PREMIAT_PRODUCER_PAGE,
        sourceIdentity: "official page + ?variant= slug, no synthetic anchor fragments",
        variants: rows,
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
