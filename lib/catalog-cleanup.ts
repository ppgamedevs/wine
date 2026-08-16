import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  detectEditorialTruthIssues,
  groupIssuesByWine,
  isPublicationBlockingIssue,
  runIntegrityChecks,
  type IntegrityIssue,
  type WineScanInput,
} from "@/lib/integrity-scan";
import { wines } from "@/lib/schema";
import { TRUTH_ISSUE_CODES } from "@/lib/editorial-claim-validator";
import { normalizeEditorialText } from "@/lib/wine-editorial-evidence";

export interface CatalogCleanupReport {
  dryRun: boolean;
  totalVerified: number;
  clean: number;
  blocking: number;
  warnings: number;
  issuesByCode: Record<string, number>;
  issuesBySeverity: Record<string, number>;
  repaired: Array<{ wineId: number; slug: string; actions: string[] }>;
  reviewQueue: Array<{
    wineId: number;
    slug: string;
    critical: number;
    high: number;
    medium: number;
    low: number;
    valueScore: number | null;
  }>;
}

const UNSAFE_WHITE_PATTERNS = [
  /\btanin(?:uri|ul|urile)?\b/i,
  /\bfructe(?:le)? rosii\b/i,
  /\bfructe(?:le)? negre\b/i,
  /\bbarrique\b/i,
  /\bstejar\b/i,
];

function isNonRed(type: string): boolean {
  const normalized = normalizeEditorialText(type);
  return (
    normalized === "white" ||
    normalized === "alb" ||
    normalized === "rose" ||
    normalized === "roze" ||
    normalized === "sparkling" ||
    normalized === "spumant"
  );
}

function stripUnsafeSentences(text: string | null | undefined): string | null {
  if (!text?.trim()) return text ?? null;
  const sentences = text.split(/(?<=[.!?])\s+/);
  const kept = sentences.filter(
    (sentence) => !UNSAFE_WHITE_PATTERNS.some((pattern) => pattern.test(sentence)),
  );
  const next = kept.join(" ").trim();
  return next.length > 0 ? next : null;
}

export function planDeterministicRepairs(
  wine: WineScanInput,
  issues: IntegrityIssue[],
): { next: Partial<typeof wines.$inferInsert>; actions: string[] } {
  const actions: string[] = [];
  const next: Partial<typeof wines.$inferInsert> = {};
  const codes = new Set(issues.map((issue) => issue.code));

  if (
    isNonRed(wine.type) &&
    (codes.has(TRUTH_ISSUE_CODES.UNSUPPORTED_TANNIN_CLAIM) ||
      codes.has(TRUTH_ISSUE_CODES.PAIRING_CONTRADICTS_WINE_TYPE) ||
      codes.has(TRUTH_ISSUE_CODES.TYPE_EDITORIAL_CONTRADICTION))
  ) {
    const cleaned = stripUnsafeSentences(wine.descriptionEditorial);
    if (cleaned !== wine.descriptionEditorial) {
      next.descriptionEditorial = cleaned;
      actions.push("eliminat fraze de tanin/fructe rosii/stejar din descriere");
    }
    if (wine.tasteProfile && UNSAFE_WHITE_PATTERNS.some((p) => p.test(wine.tasteProfile ?? ""))) {
      next.tasteProfile = null;
      actions.push("golit tasteProfile nesustinut");
    }
  }

  if (
    codes.has(TRUTH_ISSUE_CODES.EDITORIAL_PAIRING_UNSUPPORTED) ||
    codes.has(TRUTH_ISSUE_CODES.PAIRING_CONTRADICTS_WINE_TYPE) ||
    codes.has(TRUTH_ISSUE_CODES.PAIRING_REASON_UNSUPPORTED)
  ) {
    if ((wine.foodPairingNotes?.length ?? 0) > 0) {
      next.foodPairingNotes = [];
      actions.push("golit foodPairingNotes nesustinute");
    }
  }

  if (
    codes.has(TRUTH_ISSUE_CODES.UNSUPPORTED_OAK_CLAIM) &&
    wine.tasteProfile &&
    /barrique|stejar|butoi/i.test(wine.tasteProfile)
  ) {
    next.tasteProfile = null;
    actions.push("golit tasteProfile cu stejar nesustinut");
  }

  return { next, actions };
}

export async function runCatalogCleanup(options: {
  repair?: boolean;
}): Promise<CatalogCleanupReport> {
  const dryRun = options.repair !== true;
  const { runIntegrityScan } = await import("@/lib/integrity-scan");
  const scan = await runIntegrityScan();

  const verified = scan.summary.publishedWines;
  const groups = groupIssuesByWine(
    scan.issues,
    [],
  );
  const blockingGroups = groups.filter((group) => group.blocking > 0);
  const warningGroups = groups.filter(
    (group) => group.blocking === 0 && group.issues.length > 0,
  );

  const repaired: CatalogCleanupReport["repaired"] = [];

  if (!dryRun) {
    const rows = await db.query.wines.findMany({
      with: {
        winery: { columns: { name: true } },
        region: { columns: { name: true } },
      },
    });
    const byId = new Map(rows.map((row) => [row.id, row]));

    for (const group of groups) {
      const row = byId.get(group.wineId);
      if (!row) continue;
      const input: WineScanInput = {
        id: row.id,
        slug: row.slug,
        name: row.name,
        wineryId: row.wineryId,
        wineryName: row.winery?.name ?? null,
        regionId: row.regionId,
        regionName: row.region?.name ?? null,
        type: row.type,
        sweetness: row.sweetness,
        vintage: row.vintage,
        grapeVarieties: row.grapeVarieties,
        priceAvg: row.priceAvg,
        currentPrice: row.currentPrice,
        priceHistory: row.priceHistory,
        valueScore: row.valueScore,
        criticScore: row.criticScore,
        ratingAvg: row.ratingAvg,
        communityScore: row.communityScore,
        medals: row.medals,
        status: row.status,
        sourceUrl: row.sourceUrl,
        affiliateLinks: row.affiliateLinks,
        descriptionEditorial: row.descriptionEditorial,
        valueExplanation: row.valueExplanation,
        tasteProfile: row.tasteProfile,
        thingsYouShouldKnow: row.thingsYouShouldKnow,
        foodPairingNotes: row.foodPairingNotes,
        dessertPairings: row.dessertPairings,
        recommendedOccasions: row.recommendedOccasions,
        expertNotes: row.expertNotes,
        tastingNotes: row.tastingNotes,
        producerContent: row.producerContent,
        producerPageUrl: row.producerPageUrl,
        tastingSheetUrl: row.tastingSheetUrl,
        alcohol: row.alcohol,
        acidity: row.acidity,
        sugar: row.sugar,
        cellarPotential: row.cellarPotential,
        drinkabilityStart: row.drinkabilityStart,
        drinkabilityEnd: row.drinkabilityEnd,
        foodPairings: row.foodPairings,
        updatedAt: row.updatedAt,
      };
      const { next, actions } = planDeterministicRepairs(input, group.issues);
      if (actions.length === 0) continue;
      await db.update(wines).set(next).where(eq(wines.id, row.id));
      repaired.push({ wineId: row.id, slug: row.slug, actions });
    }
  }

  const reviewQueue = groups
    .filter((group) => group.issues.some((issue) => issue.severity !== "low" || isPublicationBlockingIssue(issue)))
    .slice(0, 50)
    .map((group) => ({
      wineId: group.wineId,
      slug: group.slug,
      critical: group.critical,
      high: group.high,
      medium: group.medium,
      low: group.low,
      valueScore: group.valueScore ?? null,
    }));

  return {
    dryRun,
    totalVerified: verified,
    clean: Math.max(0, verified - groups.filter((g) => g.issues.length > 0).length),
    blocking: blockingGroups.length,
    warnings: warningGroups.length,
    issuesByCode: scan.summary.issuesByCode,
    issuesBySeverity: scan.summary.issuesBySeverity,
    repaired,
    reviewQueue,
  };
}

export function catalogCleanupScanOnly(input: WineScanInput[]) {
  const report = runIntegrityChecks(input);
  const editorial = detectEditorialTruthIssues(input);
  return { report, editorial };
}
