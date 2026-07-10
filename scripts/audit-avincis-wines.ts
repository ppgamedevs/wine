import "../lib/load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import {
  calculateInitialScores,
  calculateValueScore,
  valueScoreInputFromWine,
  buildValueScoreBreakdown,
} from "../lib/scoring";
import { buildFeatureInputFromWine } from "../lib/quality-model/features";
import { predictEstimatedQualitySync } from "../lib/quality-model/predict";
import { wines, wineries, type WineMedal } from "../lib/schema";
import {
  enrichWineFromProducerSite,
  inferAvincisProducerPageUrl,
  shouldPreferProducerImageOverEmag,
  producerImageSourceFromUrl,
} from "../lib/wine-producer-enrichment";
import { buildWineImageAlt } from "../lib/wine-images";
import { regenerateWineEditorialContent } from "../lib/regenerate-wine-editorial";
import { getValueScoreVerdict } from "../lib/value-score-thresholds";
import type { WineType } from "../types";

function mapWineTypeToScoreCategory(type: WineType): string {
  const map: Record<WineType, string> = {
    red: "rosu",
    white: "alb",
    rose: "rose",
    sparkling: "spumant",
    dessert: "desert",
    orange: "orange",
  };
  return map[type];
}

function computeAuthoritativeScores(wine: {
  type: WineType;
  currentPrice: number | null;
  priceAvg: number | null;
  grapeVarieties: { name: string }[];
  region: { name: string } | null;
  winery: { name: string } | null;
  medals: unknown;
  vintage: number | null;
  acidity: number | null;
  cellarPotential: number | null;
  tasteProfile: string | null;
  ratingAvg: number | null;
  communityScore: number | null;
  criticScore: number | null;
  estimatedQuality: number | null;
  drinkabilityStart: number | null;
  drinkabilityEnd: number | null;
  sweetness: string | null;
  dessertPairings: unknown;
}) {
  const estimatedQuality =
    predictEstimatedQualitySync(
      buildFeatureInputFromWine({
        type: wine.type,
        vintage: wine.vintage,
        grapeVarieties: wine.grapeVarieties,
        region: wine.region,
        winery: wine.winery,
        acidity: wine.acidity,
        cellarPotential: wine.cellarPotential,
        medals: wine.medals as never,
      }),
    ) ?? wine.estimatedQuality ?? undefined;

  const input = valueScoreInputFromWine({
    priceAvg: wine.priceAvg,
    currentPrice: wine.currentPrice,
    grapeVarieties: wine.grapeVarieties,
    region: wine.region,
    medals: (wine.medals ?? null) as WineMedal[] | null,
    winery: wine.winery,
    type: wine.type,
    cellarPotential: wine.cellarPotential,
    acidity: wine.acidity,
    tasteProfile: wine.tasteProfile,
    vintage: wine.vintage,
    ratingAvg: wine.ratingAvg,
    communityScore: wine.communityScore,
    criticScore: wine.criticScore,
    estimatedQuality: estimatedQuality ?? null,
    drinkabilityStart: wine.drinkabilityStart,
    drinkabilityEnd: wine.drinkabilityEnd,
  });
  const valueScore = calculateValueScore(input);

  const price = wine.currentPrice ?? wine.priceAvg ?? 50;
  const dessertCount = Array.isArray(wine.dessertPairings)
    ? wine.dessertPairings.length
    : 0;
  const auxiliary = calculateInitialScores({
    price: price > 0 ? price : 50,
    category: mapWineTypeToScoreCategory(wine.type),
    region: wine.region?.name,
    grapeVarieties: wine.grapeVarieties.map((g) => g.name),
    sweetness: wine.sweetness ?? undefined,
    dessertPairingCount: dessertCount,
    wineMedals: (wine.medals as never) ?? [],
    baseQuality: estimatedQuality,
    wineryName: wine.winery?.name,
    cellarPotential: wine.cellarPotential ?? undefined,
    acidity: wine.acidity ?? undefined,
    tasteProfile: wine.tasteProfile ?? undefined,
  });

  return {
    valueScore,
    giftScore: auxiliary.giftScore,
    foodMatchScore: auxiliary.foodMatchScore,
    overpricedRisk: auxiliary.overpricedRisk,
    beginnerFriendly: auxiliary.beginnerFriendly,
    cellarPotential: auxiliary.cellarPotential,
    estimatedQuality: estimatedQuality ?? null,
    breakdown: buildValueScoreBreakdown(input),
  };
}

function noteMismatch(
  valueScore: number,
  valueExplanation: string | null | undefined,
): string | null {
  const text = valueExplanation?.toLowerCase() ?? "";
  if (!text.trim()) return "missing_value_explanation";

  const label = getValueScoreVerdict(valueScore);
  const exceptional = label === "exceptional";
  const recommended = label === "recommended" || exceptional;
  const poor = label === "overpriced";

  if (exceptional && /mediu|nu prea|sub prag|alternative/i.test(text)) {
    return "text_too_negative_for_score";
  }
  if (poor) {
    const overlyPositive =
      /\bmerita banii\b/i.test(text) ||
      /\brecomand(am)?\b/i.test(text) ||
      (/\bexceptional\b/i.test(text) && !/\bnu\s+exceptional/i.test(text));
    if (overlyPositive) return "text_too_positive_for_score";
  }
  if (
    recommended &&
    valueScore >= 75 &&
    /nu prea merita|sub pragul|alternative cu raport/i.test(text)
  ) {
    return "text_contradicts_recommended_score";
  }
  return null;
}

async function auditImage(wine: {
  name: string;
  type: string;
  imageUrl: string | null;
  imageSource: string | null;
  producerPageUrl: string | null;
  winery: { slug: string; website: string | null; name: string };
}): Promise<{ issue: string | null; suggested: string | null }> {
  const url = wine.imageUrl?.trim() ?? "";
  if (!url) {
    return { issue: "missing_image", suggested: null };
  }

  const isEmagAkamai =
    wine.imageSource === "emag" && url.includes("akamaized.net");
  const isSpumant =
    wine.type === "sparkling" ||
    /spumant|metod[aă]?\s*tradition|extra\s*brut/i.test(wine.name);

  if (isEmagAkamai && isSpumant) {
    const preferred =
      wine.producerPageUrl ??
      inferAvincisProducerPageUrl(wine.name, wine.producerPageUrl);
    if (preferred) {
      const producer = await enrichWineFromProducerSite({
        wineryWebsite: wine.winery.website,
        winerySlug: wine.winery.slug,
        wineName: wine.name,
        preferredPageUrl: preferred,
      });
      const producerImage = producer.canonical?.imageUrl ?? null;
      if (
        producerImage &&
        shouldPreferProducerImageOverEmag({
          wineName: wine.name,
          wineType: wine.type,
          currentImageUrl: wine.imageUrl,
          currentImageSource: wine.imageSource,
          producerImageUrl: producerImage,
        })
      ) {
        return { issue: "emag_letterbox_spumant", suggested: producerImage };
      }
    }
  }

  if (isEmagAkamai && url.includes("width=") && url.includes("height=")) {
    try {
      const parsed = new URL(url);
      const w = parsed.searchParams.get("width");
      const h = parsed.searchParams.get("height");
      if (w && h && w === h) {
        parsed.searchParams.delete("width");
        parsed.searchParams.delete("height");
        return { issue: "emag_square_crop", suggested: parsed.toString() };
      }
    } catch {
      /* ignore */
    }
  }

  return { issue: null, suggested: null };
}

function inferSparklingTypeFix(
  type: WineType,
  name: string,
): WineType | null {
  if (type === "sparkling") return null;
  if (/spumant|metod[aă]?\s*tradition|extra\s*brut/i.test(name)) {
    return "sparkling";
  }
  return null;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const regenNotes = process.argv.includes("--regen-notes");

  const avincis = await db.query.wineries.findFirst({
    where: eq(wineries.slug, "avincis"),
    columns: { id: true, name: true },
  });

  if (!avincis) {
    console.error("Crama Avincis negasita.");
    process.exit(1);
  }

  const rows = await db.query.wines.findMany({
    where: eq(wines.wineryId, avincis.id),
    with: { winery: true, region: true },
    orderBy: (table, { asc }) => [asc(table.name)],
  });

  console.log(`\n=== Audit Avincis: ${rows.length} vinuri ===\n`);

  let fixCount = 0;

  for (const wine of rows) {
    const authoritative = computeAuthoritativeScores(wine);
    const scoreDelta =
      wine.valueScore != null
        ? Math.abs(wine.valueScore - authoritative.valueScore)
        : authoritative.valueScore;

    const typeFix = inferSparklingTypeFix(wine.type, wine.name);
    const workingType = typeFix ?? wine.type;
    const workingWine = typeFix ? { ...wine, type: typeFix } : wine;
    const scoresAfterType = typeFix
      ? computeAuthoritativeScores(workingWine)
      : authoritative;

    const { issue, suggested } = await auditImage({
      name: wine.name,
      type: workingType,
      imageUrl: wine.imageUrl,
      imageSource: wine.imageSource,
      producerPageUrl: wine.producerPageUrl,
      winery: wine.winery!,
    });

    const noteIssue = noteMismatch(
      scoresAfterType.valueScore,
      wine.valueExplanation,
    );

    const flags: string[] = [];
    if (scoreDelta > 0) {
      flags.push(`SCORE stored=${wine.valueScore} -> ${scoresAfterType.valueScore}`);
    }
    if (wine.giftScore !== scoresAfterType.giftScore) {
      flags.push(`GIFT ${wine.giftScore} -> ${scoresAfterType.giftScore}`);
    }
    if (wine.foodMatchScore !== scoresAfterType.foodMatchScore) {
      flags.push(
        `FOOD ${wine.foodMatchScore} -> ${scoresAfterType.foodMatchScore}`,
      );
    }
    if (typeFix) flags.push(`TYPE ${wine.type} -> ${typeFix}`);
    if (issue) flags.push(`IMAGE ${issue}`);
    if (noteIssue) flags.push(`NOTES ${noteIssue}`);
    if (wine.currentPrice == null && wine.priceAvg == null) flags.push("NO_PRICE");

    console.log(`[${wine.id}] ${wine.slug}`);
    console.log(`  ${wine.name} (${wine.type})`);
    console.log(
      `  scores: value=${wine.valueScore} gift=${wine.giftScore} food=${wine.foodMatchScore} | verdict=${getValueScoreVerdict(scoresAfterType.valueScore)}`,
    );
    console.log(
      `  price=${wine.currentPrice ?? wine.priceAvg ?? "N/A"} medals=${Array.isArray(wine.medals) ? wine.medals.length : 0}`,
    );
    console.log(
      `  image=${wine.imageSource ?? "null"} ${wine.imageUrl?.slice(0, 85) ?? "null"}`,
    );
    if (suggested) console.log(`  suggested image: ${suggested}`);
    if (flags.length > 0) console.log(`  ** ${flags.join(" | ")}`);
    console.log("");

    const needsFix =
      scoreDelta > 0 ||
      typeFix != null ||
      issue != null ||
      wine.giftScore !== scoresAfterType.giftScore ||
      wine.foodMatchScore !== scoresAfterType.foodMatchScore ||
      noteIssue != null;

    if (!apply || !needsFix) continue;

    const patch: Record<string, unknown> = {
      valueScore: scoresAfterType.valueScore,
      giftScore: scoresAfterType.giftScore,
      foodMatchScore: scoresAfterType.foodMatchScore,
      overpricedRisk: scoresAfterType.overpricedRisk,
      beginnerFriendly: scoresAfterType.beginnerFriendly,
      cellarPotential: scoresAfterType.cellarPotential,
      estimatedQuality: scoresAfterType.estimatedQuality,
      updatedAt: new Date().toISOString(),
    };

    if (typeFix) patch.type = typeFix;
    if (issue && suggested) {
      patch.imageUrl = suggested;
      patch.imageSource =
        issue === "emag_square_crop" || issue === "emag_letterbox_spumant"
          ? issue === "emag_letterbox_spumant"
            ? wine.producerPageUrl
              ? producerImageSourceFromUrl(wine.producerPageUrl)
              : "avincis"
            : "emag"
          : wine.imageSource ?? "emag";
      patch.imageAlt = buildWineImageAlt({
        name: wine.name,
        vintage: wine.vintage,
        type: workingType,
        wineryName: wine.winery!.name,
      });
    }

    await db.update(wines).set(patch).where(eq(wines.id, wine.id));
    fixCount += 1;
    console.log(`  -> applied: ${Object.keys(patch).join(", ")}`);

    if (regenNotes && noteIssue) {
      try {
        await regenerateWineEditorialContent(wine.id);
        console.log(`  -> regenerated editorial notes`);
      } catch (error) {
        console.warn(
          `  -> editorial regen failed:`,
          error instanceof Error ? error.message : error,
        );
      }
    }
  }

  console.log(`--- Done: ${fixCount} vinuri actualizate ---`);
  if (!apply) {
    console.log("Ruleaza cu --apply pentru corectii.");
    console.log("Adauga --regen-notes pentru regenerarea textelor contradictorii.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
