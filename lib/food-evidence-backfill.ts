/**
 * Catalog-wide culinary evidence recovery.
 * Default is dry-run. Writes only producerContent culinary fields.
 * Never writes giftScore, foodMatchScore, valueScore, or foodPairings.
 * Never invokes scores:recalculate.
 */

import { eq } from "drizzle-orm";
import {
  extractConstrainedCulinaryClaims,
  extractCulinarySectionFromPlainText,
  isCulinaryChromeText,
  isTastingNoteLeak,
  sanitizeCulinaryText,
} from "@/lib/culinary-extract";
import { db } from "@/lib/db";
import {
  assertFoodEvidencePatchHasNoScores,
  assessFoodEvidence,
  compareScoreSnapshots,
  isLaundryListText,
  type FoodEvidenceClaim,
  type StoredScoreSnapshot,
} from "@/lib/food-evidence";
import {
  inventoryWineCulinarySources,
  summarizeCulinarySourceInventory,
  type WinerySourceCoverage,
} from "@/lib/food-evidence-inventory";
import { fetchPageWithResolution } from "@/lib/fetch-page-html";
import { normalizeWineRows } from "@/lib/normalize-wine";
import { extractPdfTextFromUrl } from "@/lib/pdf-text";
import { extractOfficialCulinaryFromHtml } from "@/lib/producer-culinary";
import {
  wines,
  type ProducerFoodEvidenceClaim,
  type ProducerPageContent,
} from "@/lib/schema";
import { calculateFoodVersatility } from "@/lib/scoring-v2/food-versatility";
import { foodVersatilityInputFromWine } from "@/lib/scoring-v2/wine-score-inputs";
import {
  classifySourceUrl,
  isOfficialProducerSource,
} from "@/lib/source-trust";
import type { WineWithRelations } from "@/types";

export interface FoodEvidenceBackfillOptions {
  apply?: boolean;
  wineSlug?: string;
  producerSlug?: string;
  limit?: number;
  skipFetch?: boolean;
}

export interface FoodEvidenceWineRow {
  id: number;
  slug: string;
  winery: string;
  winerySlug: string;
  curated: boolean;
  producerPairing: boolean;
  tastingSheet: boolean;
  evidenceLevel: string;
  displayable: boolean;
  chromeRejected: boolean;
  laundryRejected: boolean;
  fetchFailed: boolean;
  noSource: boolean;
  oldFood: number | null;
  newFood: number;
  newConfidence: number;
  willWrite: boolean;
  reviewReasons: string[];
}

export interface ProposedCulinaryWrite {
  wineId: number;
  slug: string;
  winery: string;
  action: "new_evidence" | "sanitize_stored" | "clear_chrome";
  culinaryPairings: string;
  claimCount: number;
  sourceUrl: string | null;
  sourceType: string;
  extractionMethod: string;
}

export interface ManualReviewExclusion {
  slug: string;
  winery: string;
  reason: string;
  excerpt: string;
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
    noSource: number;
    proposedWrites: number;
  };
  sourceCoverage: WinerySourceCoverage[];
  rows: FoodEvidenceWineRow[];
  proposedWrites: ProposedCulinaryWrite[];
  reviewExclusions: ManualReviewExclusion[];
  scoreSnapshots: {
    before: StoredScoreSnapshot[];
    after: StoredScoreSnapshot[];
    identical: boolean;
    diffs: number;
  };
}

const REQUEST_DELAY_MS = 250;

function isPdfUrl(url: string): boolean {
  return /\.pdf(\?|#|$)/i.test(url);
}

function isPrivacyOrLegalPdf(url: string): boolean {
  return /politica|confidentialitate|privacy|cookie|termeni|gdpr/i.test(url);
}

function officialUrlsFor(wine: WineWithRelations): string[] {
  const urls = [wine.tastingSheetUrl, wine.producerPageUrl].filter(
    (url): url is string => Boolean(url?.trim()),
  );
  return urls.filter((url) => {
    if (isPrivacyOrLegalPdf(url)) return false;
    return isOfficialProducerSource(classifySourceUrl(url, { isPdf: isPdfUrl(url) }));
  });
}

function argSourceType(url: string): "tasting_sheet" | "producer_page" {
  return classifySourceUrl(url, { isPdf: isPdfUrl(url) }) === "tasting_sheet"
    ? "tasting_sheet"
    : "producer_page";
}

function toProducerClaims(
  claims: FoodEvidenceClaim[],
): ProducerFoodEvidenceClaim[] {
  return claims.map((claim) => ({
    category: claim.category,
    dish: claim.dish,
    ...(claim.sourceUrl ? { sourceUrl: claim.sourceUrl } : {}),
    sourceType: claim.sourceType,
    excerpt: claim.excerpt,
    extractionMethod: claim.extractionMethod,
    evidenceClass: claim.evidenceClass,
    confidence: claim.confidence,
  }));
}

function mergeCulinaryContent(
  current: ProducerPageContent | null | undefined,
  incoming: ProducerPageContent,
): ProducerPageContent {
  const sourceUrls = [
    ...(current?.sourceUrls ?? []),
    ...(incoming.sourceUrls ?? []),
  ].filter((url, index, all) => url && all.indexOf(url) === index);
  return {
    ...current,
    culinaryPairings: incoming.culinaryPairings,
    foodEvidence: incoming.foodEvidence,
    culinaryChromeRejected: incoming.culinaryChromeRejected,
    culinaryLaundryRejected: incoming.culinaryLaundryRejected,
    sourceUrls,
    extractedAt: incoming.extractedAt ?? new Date().toISOString(),
    sourceType: incoming.sourceType ?? current?.sourceType,
    extractionMethod: incoming.extractionMethod ?? "deterministic",
  };
}

export async function snapshotVerifiedScores(): Promise<StoredScoreSnapshot[]> {
  return db
    .select({
      id: wines.id,
      valueScore: wines.valueScore,
      giftScore: wines.giftScore,
      foodMatchScore: wines.foodMatchScore,
    })
    .from(wines)
    .where(eq(wines.status, "verified"));
}

function culinaryFromOfficialNotes(
  wine: WineWithRelations,
  urls: string[],
): Pick<
  FetchedCulinary,
  "claims" | "sectionText" | "chromeRejected" | "laundryRejected"
> {
  const officialNotes = [wine.tastingNotes, wine.producerContent?.tastingNotes]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ");
  if (!officialNotes || urls.length === 0) {
    return {
      claims: [],
      sectionText: null,
      chromeRejected: false,
      laundryRejected: false,
    };
  }
  const fromNotes = extractCulinarySectionFromPlainText(officialNotes);
  if (!fromNotes.found) {
    return {
      claims: [],
      sectionText: null,
      chromeRejected: fromNotes.chromeRejected || fromNotes.tastingNoteRejected,
      laundryRejected: fromNotes.laundryListRejected,
    };
  }
  return {
    claims: extractConstrainedCulinaryClaims(fromNotes.text, {
      sourceUrl: urls[0],
      sourceType: argSourceType(urls[0] ?? ""),
    }).claims,
    sectionText: fromNotes.text,
    chromeRejected: fromNotes.chromeRejected || fromNotes.tastingNoteRejected,
    laundryRejected: fromNotes.laundryListRejected,
  };
}

interface FetchedCulinary {
  claims: FoodEvidenceClaim[];
  chromeRejected: boolean;
  laundryRejected: boolean;
  fetchFailed: boolean;
  tastingSheet: boolean;
  sectionText: string | null;
  sourceUrl: string | null;
  sourceType: string;
  extractionMethod: string;
  mixedProductCards: boolean;
  catalogLevel: boolean;
  noSource: boolean;
}

async function maybeFetchCulinary(
  wine: WineWithRelations,
  skipFetch: boolean,
): Promise<FetchedCulinary> {
  const storedRaw = wine.producerContent?.culinaryPairings ?? "";
  const stored = sanitizeCulinaryText(storedRaw);
  const storedChrome =
    Boolean(storedRaw.trim()) && (isCulinaryChromeText(stored) || !stored);
  const storedTasting = stored ? isTastingNoteLeak(stored) : false;
  const storedLaundry = stored ? isLaundryListText(stored) : false;
  const urls = officialUrlsFor(wine);
  const noSource = urls.length === 0 && !stored;

  const storedClaims =
    stored && !storedChrome && !storedTasting && !storedLaundry
      ? extractConstrainedCulinaryClaims(stored, {
          sourceType: "producer_page",
          sourceUrl: wine.producerPageUrl ?? undefined,
        }).claims
      : [];

  if (skipFetch || urls.length === 0) {
    let claims = storedClaims;
    let sectionText =
      storedChrome || storedTasting || storedLaundry ? null : stored || null;
    let extractionMethod = "deterministic";
    let chromeRejected =
      storedChrome ||
      storedTasting ||
      Boolean(wine.producerContent?.culinaryChromeRejected);
    let laundryRejected =
      storedLaundry || Boolean(wine.producerContent?.culinaryLaundryRejected);
    if (!sectionText && urls.length > 0) {
      const fromNotes = culinaryFromOfficialNotes(wine, urls);
      chromeRejected = chromeRejected || fromNotes.chromeRejected;
      laundryRejected = laundryRejected || fromNotes.laundryRejected;
      if (fromNotes.sectionText) {
        claims = fromNotes.claims;
        sectionText = fromNotes.sectionText;
        extractionMethod = "stored_official_notes";
      }
    }
    return {
      claims,
      chromeRejected,
      laundryRejected,
      fetchFailed: false,
      tastingSheet: false,
      sectionText,
      sourceUrl: wine.producerPageUrl ?? wine.tastingSheetUrl ?? null,
      sourceType: wine.producerContent?.sourceType ?? "producer_page",
      extractionMethod,
      mixedProductCards: false,
      catalogLevel: false,
      noSource,
    };
  }

  let chromeRejected = storedChrome;
  let laundryRejected = storedLaundry;
  let fetchFailed = false;
  let tastingSheet = false;
  let mixedProductCards = false;
  let catalogLevel = false;
  const claims: FoodEvidenceClaim[] = [];
  let sectionText: string | null =
    stored && !storedChrome && !storedLaundry && !storedTasting ? stored : null;
  let sourceUrl: string | null = null;
  let sourceType = "producer_page";
  let extractionMethod = "deterministic";

  for (const url of urls) {
    await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS));
    try {
      if (isPdfUrl(url)) {
        const pdfText = await extractPdfTextFromUrl(url);
        if (!pdfText) {
          fetchFailed = true;
          continue;
        }
        const section = extractCulinarySectionFromPlainText(pdfText);
        chromeRejected = chromeRejected || section.chromeRejected || section.tastingNoteRejected;
        laundryRejected = laundryRejected || section.laundryListRejected;
        tastingSheet = true;
        if (section.found) {
          const extracted = extractConstrainedCulinaryClaims(section.text, {
            sourceUrl: url,
            sourceType: "tasting_sheet",
          });
          claims.push(...extracted.claims);
          sectionText = section.text;
          sourceUrl = url;
          sourceType = "tasting_sheet";
          extractionMethod = "tasting_sheet_pdf";
        }
        continue;
      }

      const page = await fetchPageWithResolution(url);
      const section = extractOfficialCulinaryFromHtml(page.html, page.finalUrl, {
        winerySlug: wine.winery?.slug,
        wineName: wine.name,
      });
      chromeRejected = chromeRejected || section.chromeRejected || section.tastingNoteRejected;
      laundryRejected = laundryRejected || section.laundryListRejected;
      mixedProductCards = mixedProductCards || section.mixedProductCards;
      catalogLevel = catalogLevel || section.catalogLevel;
      if (argSourceType(page.finalUrl) === "tasting_sheet") tastingSheet = true;
      if (section.found) {
        const extracted = extractConstrainedCulinaryClaims(section.text, {
          sourceUrl: page.finalUrl,
          sourceType: argSourceType(page.finalUrl),
        });
        claims.push(...extracted.claims);
        sectionText = section.text;
        sourceUrl = page.finalUrl;
        sourceType = argSourceType(page.finalUrl);
        extractionMethod = section.method;
      }
    } catch {
      fetchFailed = true;
    }
  }

  if (!sectionText) {
    const fromNotes = culinaryFromOfficialNotes(wine, urls);
    chromeRejected = chromeRejected || fromNotes.chromeRejected;
    laundryRejected = laundryRejected || fromNotes.laundryRejected;
    if (fromNotes.sectionText) {
      claims.push(...fromNotes.claims);
      sectionText = fromNotes.sectionText;
      sourceUrl = urls[0] ?? null;
      sourceType = argSourceType(urls[0] ?? "");
      extractionMethod = "stored_official_notes";
    }
  }

  return {
    claims,
    chromeRejected,
    laundryRejected,
    fetchFailed,
    tastingSheet,
    sectionText,
    sourceUrl,
    sourceType,
    extractionMethod,
    mixedProductCards,
    catalogLevel,
    noSource,
  };
}

function reviewReasonsFor(
  wine: WineWithRelations,
  fetched: FetchedCulinary,
): string[] {
  const reasons: string[] = [];
  if (fetched.laundryRejected) reasons.push("laundry_rejected");
  if (fetched.chromeRejected) reasons.push("chrome_rejected");
  if (fetched.mixedProductCards) reasons.push("mixed_product_cards");
  if (fetched.catalogLevel) reasons.push("catalog_not_exact");
  const text = fetched.sectionText ?? "";
  const type = (wine.type ?? "").toLowerCase();
  const sweetness = (wine.sweetness ?? "").toLowerCase();
  const categories = fetched.claims.map((claim) => claim.category);
  if (
    categories.includes("dessert") &&
    (sweetness === "sec" || sweetness === "dry" || sweetness === "brut")
  ) {
    reasons.push("dessert_on_dry");
  }
  if (
    categories.includes("grilled_meat") &&
    (type === "white" || type === "alb" || type === "rose" || type === "roze")
  ) {
    reasons.push("red_meat_on_light_wine");
  }
  if (looksLikePageWideFoodAggregationSafe(text)) {
    reasons.push("page_wide_aggregation");
  }
  return reasons;
}

function looksLikePageWideFoodAggregationSafe(text: string): boolean {
  return text.length > 400 && isLaundryListText(text);
}

function shouldExcludeFromApply(reasons: string[]): boolean {
  return reasons.some((reason) =>
    [
      "laundry_rejected",
      "chrome_rejected",
      "mixed_product_cards",
      "page_wide_aggregation",
      "shared_excerpt",
    ].includes(reason),
  );
}

function buildIncomingContent(
  fetched: FetchedCulinary,
  action: ProposedCulinaryWrite["action"],
): ProducerPageContent {
  return {
    culinaryPairings: action === "clear_chrome" ? "" : fetched.sectionText ?? "",
    foodEvidence: action === "clear_chrome" ? [] : toProducerClaims(fetched.claims),
    culinaryChromeRejected: fetched.chromeRejected,
    culinaryLaundryRejected: fetched.laundryRejected,
    sourceUrls: fetched.sourceUrl ? [fetched.sourceUrl] : [],
    extractedAt: new Date().toISOString(),
    sourceType: fetched.sourceType,
    extractionMethod: "deterministic",
  };
}

export async function runFoodEvidenceBackfill(
  options: FoodEvidenceBackfillOptions = {},
): Promise<FoodEvidenceBackfillReport> {
  const apply = Boolean(options.apply);
  const beforeScores = await snapshotVerifiedScores();
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

  const sourceCoverage = summarizeCulinarySourceInventory(
    catalog.map(inventoryWineCulinarySources),
  );

  const reportRows: FoodEvidenceWineRow[] = [];
  const proposedWrites: ProposedCulinaryWrite[] = [];
  const reviewExclusions: ManualReviewExclusion[] = [];
  const excerptOwners = new Map<string, string[]>();
  let curatedExact = 0;
  let producerOfficial = 0;
  let tastingSheet = 0;
  let styleOnly = 0;
  let insufficient = 0;
  let chromeRejected = 0;
  let laundryRejected = 0;
  let fetchFailures = 0;
  let displayable = 0;
  let noSource = 0;

  const pending: Array<{
    wine: WineWithRelations;
    fetched: FetchedCulinary;
    reasons: string[];
    assessmentLevel: string;
    foodScore: number;
    foodConfidence: number;
    displayable: boolean;
    curated: boolean;
    producerPairing: boolean;
  }> = [];

  for (const wine of catalog) {
    const fetched = await maybeFetchCulinary(wine, Boolean(options.skipFetch));
    const assessment = assessFoodEvidence({
      curatedDishes: wine.foodPairings.map((pairing) => pairing.dish),
      producerCulinary: fetched.sectionText,
      tastingSheetCulinary:
        fetched.tastingSheet && wine.tastingSheetUrl ? fetched.sectionText : null,
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
    const reasons = reviewReasonsFor(wine, fetched);
    if (fetched.sectionText) {
      const key = fetched.sectionText.slice(0, 160).toLowerCase();
      const owners = excerptOwners.get(key) ?? [];
      owners.push(wine.slug);
      excerptOwners.set(key, owners);
    }
    pending.push({
      wine,
      fetched,
      reasons,
      assessmentLevel: food.evidenceLevel,
      foodScore: food.score,
      foodConfidence: food.confidence,
      displayable: food.displayable,
      curated: assessment.curatedCategories.length > 0,
      producerPairing: assessment.producerCategories.length > 0,
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
    if (fetched.noSource) noSource += 1;
  }

  const sharedExcerpts = new Set(
    [...excerptOwners.entries()]
      .filter(([, slugs]) => slugs.length >= 3)
      .map(([excerpt]) => excerpt),
  );

  let written = 0;

  for (const item of pending) {
    const { wine, fetched } = item;
    const excerptKey = fetched.sectionText?.slice(0, 160).toLowerCase() ?? "";
    if (excerptKey && sharedExcerpts.has(excerptKey)) {
      item.reasons.push("shared_excerpt");
    }

    const storedRaw = wine.producerContent?.culinaryPairings ?? "";
    const storedSanitized = sanitizeCulinaryText(storedRaw);
    const storedDirty =
      Boolean(storedRaw.trim()) && storedSanitized !== storedRaw.trim();
    const exclude = shouldExcludeFromApply(item.reasons);
    let action: ProposedCulinaryWrite["action"] | null = null;

    if (exclude) {
      if (storedDirty && storedSanitized && !isLaundryListText(storedSanitized)) {
        action = "sanitize_stored";
        fetched.sectionText = storedSanitized;
        fetched.claims = extractConstrainedCulinaryClaims(storedSanitized, {
          sourceType: "producer_page",
          sourceUrl: wine.producerPageUrl ?? undefined,
        }).claims;
      } else if (storedRaw.trim() && (fetched.chromeRejected || !storedSanitized)) {
        action = "clear_chrome";
      }
    } else if (fetched.claims.length > 0 && fetched.sectionText) {
      const currentText = storedSanitized;
      if (currentText !== fetched.sectionText || storedDirty) {
        action = storedDirty ? "sanitize_stored" : "new_evidence";
      } else if (
        JSON.stringify(wine.producerContent?.foodEvidence ?? []) !==
        JSON.stringify(toProducerClaims(fetched.claims))
      ) {
        action = "new_evidence";
      }
    } else if (storedDirty && storedSanitized) {
      action = "sanitize_stored";
      fetched.sectionText = storedSanitized;
      fetched.claims = extractConstrainedCulinaryClaims(storedSanitized, {
        sourceType: "producer_page",
        sourceUrl: wine.producerPageUrl ?? undefined,
      }).claims;
    } else if (storedRaw.trim() && fetched.chromeRejected && !storedSanitized) {
      action = "clear_chrome";
    }

    if (exclude && action !== "sanitize_stored" && action !== "clear_chrome") {
      reviewExclusions.push({
        slug: wine.slug,
        winery: wine.winery?.name ?? "",
        reason: item.reasons.join(","),
        excerpt: fetched.sectionText?.slice(0, 180) ?? fetched.sourceUrl ?? "",
      });
    } else if (
      item.reasons.some((reason) =>
        ["dessert_on_dry", "red_meat_on_light_wine", "catalog_not_exact"].includes(
          reason,
        ),
      )
    ) {
      reviewExclusions.push({
        slug: wine.slug,
        winery: wine.winery?.name ?? "",
        reason: `flag:${item.reasons.join(",")}`,
        excerpt: fetched.sectionText?.slice(0, 180) ?? "",
      });
    }

    let willWrite = false;
    if (action) {
      const incoming = buildIncomingContent(fetched, action);
      const nextContent = mergeCulinaryContent(wine.producerContent, incoming);
      const patch = { producerContent: nextContent };
      assertFoodEvidencePatchHasNoScores(patch);
      proposedWrites.push({
        wineId: wine.id,
        slug: wine.slug,
        winery: wine.winery?.name ?? "",
        action,
        culinaryPairings: nextContent.culinaryPairings ?? "",
        claimCount: nextContent.foodEvidence?.length ?? 0,
        sourceUrl: fetched.sourceUrl,
        sourceType: fetched.sourceType,
        extractionMethod: fetched.extractionMethod,
      });
      willWrite = true;
      if (apply) {
        await db.update(wines).set(patch).where(eq(wines.id, wine.id));
        written += 1;
      }
    }

    reportRows.push({
      id: wine.id,
      slug: wine.slug,
      winery: wine.winery?.name ?? "",
      winerySlug: wine.winery?.slug ?? "",
      curated: item.curated,
      producerPairing: item.producerPairing,
      tastingSheet: fetched.tastingSheet && item.producerPairing,
      evidenceLevel: item.assessmentLevel,
      displayable: item.displayable,
      chromeRejected: fetched.chromeRejected,
      laundryRejected: fetched.laundryRejected,
      fetchFailed: fetched.fetchFailed,
      noSource: fetched.noSource,
      oldFood: wine.foodMatchScore,
      newFood: item.foodScore,
      newConfidence: item.foodConfidence,
      willWrite,
      reviewReasons: item.reasons,
    });
  }

  const afterScores = apply ? await snapshotVerifiedScores() : beforeScores;
  const comparison = compareScoreSnapshots(beforeScores, afterScores);
  if (apply && !comparison.identical) {
    throw new Error(
      `NO-GO: food evidence apply changed stored scores (${comparison.diffs} rows).`,
    );
  }

  return {
    dryRun: !apply,
    applyRequested: apply,
    written,
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
      noSource,
      proposedWrites: proposedWrites.length,
    },
    sourceCoverage,
    rows: reportRows,
    proposedWrites,
    reviewExclusions,
    scoreSnapshots: {
      before: beforeScores,
      after: afterScores,
      identical: comparison.identical,
      diffs: comparison.diffs,
    },
  };
}
