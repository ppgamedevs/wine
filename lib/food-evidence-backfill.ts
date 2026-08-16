/**
 * Catalog-wide culinary evidence recovery.
 * Default is dry-run. Never writes giftScore, foodMatchScore, or valueScore.
 * Never invokes scores:recalculate.
 */

import { eq } from "drizzle-orm";
import {
  extractConstrainedCulinaryClaims,
  extractCulinarySectionFromHtml,
  isCulinaryChromeText,
  isTastingNoteLeak,
  sanitizeCulinaryText,
} from "@/lib/culinary-extract";
import { db } from "@/lib/db";
import {
  assessFoodEvidence,
  isLaundryListText,
  type FoodEvidenceClaim,
} from "@/lib/food-evidence";
import { fetchPageWithResolution } from "@/lib/fetch-page-html";
import { normalizeWineRows } from "@/lib/normalize-wine";
import { wines } from "@/lib/schema";
import { calculateFoodVersatility } from "@/lib/scoring-v2/food-versatility";
import { foodVersatilityInputFromWine } from "@/lib/scoring-v2/wine-score-inputs";
import { classifySourceUrl } from "@/lib/source-trust";
import type { WineWithRelations } from "@/types";

export interface FoodEvidenceBackfillOptions {
  apply?: boolean;
  wineSlug?: string;
  producerSlug?: string;
  limit?: number;
  skipFetch?: boolean;
}

export interface FoodEvidenceWineRow {
  slug: string;
  winery: string;
  curated: boolean;
  producerPairing: boolean;
  tastingSheet: boolean;
  evidenceLevel: string;
  displayable: boolean;
  chromeRejected: boolean;
  laundryRejected: boolean;
  fetchFailed: boolean;
  oldFood: number | null;
  newFood: number;
  newConfidence: number;
}

export interface FoodEvidenceBackfillReport {
  dryRun: boolean;
  applyRequested: boolean;
  written: number;
  totals: {
    wines: number;
    curatedExact: number;
    producerOfficial: number;
    tastingSheet: number;
    styleOnly: number;
    insufficient: number;
    chromeRejected: number;
    laundryRejected: number;
    fetchFailures: number;
    displayable: number;
  };
  rows: FoodEvidenceWineRow[];
}

function argSourceType(url: string): "tasting_sheet" | "producer_page" {
  return classifySourceUrl(url) === "tasting_sheet" ? "tasting_sheet" : "producer_page";
}

async function maybeFetchCulinary(
  wine: WineWithRelations,
  skipFetch: boolean,
): Promise<{
  claims: FoodEvidenceClaim[];
  chromeRejected: boolean;
  laundryRejected: boolean;
  fetchFailed: boolean;
  tastingSheet: boolean;
  sectionText: string | null;
}> {
  const stored = sanitizeCulinaryText(wine.producerContent?.culinaryPairings);
  const storedChrome =
    Boolean(wine.producerContent?.culinaryPairings?.trim()) &&
    (isCulinaryChromeText(stored) || !stored);
  const storedTasting = stored ? isTastingNoteLeak(stored) : false;
  const storedLaundry = stored ? isLaundryListText(stored) : false;
  const urls = [wine.producerPageUrl, wine.tastingSheetUrl].filter(
    (url): url is string => Boolean(url?.trim()),
  );

  if (skipFetch || urls.length === 0) {
    const claims =
      stored && !storedChrome && !storedTasting && !storedLaundry
        ? extractConstrainedCulinaryClaims(stored, {
            sourceType: "producer_page",
          }).claims
        : [];
    return {
      claims,
      chromeRejected:
        storedChrome ||
        storedTasting ||
        Boolean(wine.producerContent?.culinaryChromeRejected),
      laundryRejected: storedLaundry || Boolean(wine.producerContent?.culinaryLaundryRejected),
      fetchFailed: false,
      tastingSheet: false,
      sectionText:
        storedChrome || storedTasting || storedLaundry ? null : stored || null,
    };
  }

  let chromeRejected = storedChrome;
  let laundryRejected = storedLaundry;
  let fetchFailed = false;
  let tastingSheet = false;
  const claims: FoodEvidenceClaim[] = [];
  let sectionText: string | null = stored && !storedChrome && !storedLaundry ? stored : null;

  for (const url of urls) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    try {
      const page = await fetchPageWithResolution(url);
      const section = extractCulinarySectionFromHtml(page.html);
      chromeRejected = chromeRejected || section.chromeRejected || section.tastingNoteRejected;
      laundryRejected = laundryRejected || section.laundryListRejected;
      if (argSourceType(page.finalUrl) === "tasting_sheet") tastingSheet = true;
      if (section.found) {
        const extracted = extractConstrainedCulinaryClaims(section.text, {
          sourceUrl: page.finalUrl,
          sourceType: argSourceType(page.finalUrl),
        });
        claims.push(...extracted.claims);
        sectionText = section.text;
      }
    } catch {
      fetchFailed = true;
    }
  }

  return { claims, chromeRejected, laundryRejected, fetchFailed, tastingSheet, sectionText };
}

export async function runFoodEvidenceBackfill(
  options: FoodEvidenceBackfillOptions = {},
): Promise<FoodEvidenceBackfillReport> {
  const apply = Boolean(options.apply);
  const rows = await db.query.wines.findMany({
    with: { winery: true, region: true },
    where: eq(wines.status, "verified"),
  });
  let catalog = normalizeWineRows(rows as WineWithRelations[]);
  if (options.wineSlug) {
    catalog = catalog.filter((wine) => wine.slug === options.wineSlug);
  }
  if (options.producerSlug) {
    catalog = catalog.filter((wine) => wine.winery?.slug === options.producerSlug);
  }
  if (options.limit != null) {
    catalog = catalog.slice(0, options.limit);
  }

  const reportRows: FoodEvidenceWineRow[] = [];
  let curatedExact = 0;
  let producerOfficial = 0;
  let tastingSheet = 0;
  let styleOnly = 0;
  let insufficient = 0;
  let chromeRejected = 0;
  let laundryRejected = 0;
  let fetchFailures = 0;
  let displayable = 0;

  for (const wine of catalog) {
    const fetched = await maybeFetchCulinary(wine, Boolean(options.skipFetch));
    const assessment = assessFoodEvidence({
      curatedDishes: wine.foodPairings.map((pairing) => pairing.dish),
      producerCulinary: fetched.sectionText,
      tastingSheetCulinary:
        fetched.tastingSheet && wine.tastingSheetUrl
          ? fetched.sectionText
          : null,
      foodEvidence: fetched.claims,
      type: wine.type,
      sweetness: wine.sweetness,
      chromeRejected: fetched.chromeRejected,
    });
    const food = calculateFoodVersatility({
      ...foodVersatilityInputFromWine(wine),
      producerCulinaryPairings: fetched.sectionText,
      foodEvidence: fetched.claims,
      culinaryChromeRejected: fetched.chromeRejected,
    });

    if (assessment.curatedCategories.length > 0) curatedExact += 1;
    if (assessment.producerCategories.length > 0) producerOfficial += 1;
    if (fetched.tastingSheet && assessment.tastingSheetCategories.length > 0) {
      tastingSheet += 1;
    }
    if (food.evidenceLevel === "style_only") styleOnly += 1;
    if (food.evidenceLevel === "insufficient") insufficient += 1;
    if (fetched.chromeRejected) chromeRejected += 1;
    if (fetched.laundryRejected) laundryRejected += 1;
    if (fetched.fetchFailed) fetchFailures += 1;
    if (food.displayable) displayable += 1;

    reportRows.push({
      slug: wine.slug,
      winery: wine.winery?.name ?? "",
      curated: assessment.curatedCategories.length > 0,
      producerPairing: assessment.producerCategories.length > 0,
      tastingSheet: fetched.tastingSheet && assessment.tastingSheetCategories.length > 0,
      evidenceLevel: food.evidenceLevel,
      displayable: food.displayable,
      chromeRejected: fetched.chromeRejected,
      laundryRejected: fetched.laundryRejected,
      fetchFailed: fetched.fetchFailed,
      oldFood: wine.foodMatchScore,
      newFood: food.score,
      newConfidence: food.confidence,
    });
  }

  if (apply) {
    throw new Error(
      "Food evidence --apply is disabled until Prompt 6 implements producerContent-only writes.",
    );
  }

  return {
    dryRun: !apply,
    applyRequested: apply,
    written: 0,
    totals: {
      wines: catalog.length,
      curatedExact,
      producerOfficial,
      tastingSheet,
      styleOnly,
      insufficient,
      chromeRejected,
      laundryRejected,
      fetchFailures,
      displayable,
    },
    rows: reportRows,
  };
}
