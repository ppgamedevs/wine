import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { TRUTH_ISSUE_CODES, validateEditorialClaims } from "@/lib/editorial-claim-validator";
import {
  detectEditorialTruthIssues,
  groupIssuesByWine,
  isPublicationBlockingIssue,
  runIntegrityChecks,
  type IntegrityIssue,
  type WineScanInput,
} from "@/lib/integrity-scan";
import { wines } from "@/lib/schema";
import { normalizeEditorialText } from "@/lib/wine-editorial-evidence";

export interface CatalogCleanupReport {
  dryRun: boolean;
  totalVerified: number;
  clean: number;
  blocking: number;
  warnings: number;
  issuesByCode: Record<string, number>;
  issuesBySeverity: Record<string, number>;
  planned: Array<{ wineId: number; slug: string; actions: string[] }>;
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
  counts: {
    sentencesRemovable: number;
    fieldsClearable: number;
    pairingNotesRemovable: number;
  };
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

export function splitEditorialSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function evidenceInputFromWine(wine: WineScanInput) {
  return {
    type: wine.type,
    sweetness: wine.sweetness,
    grapeVarieties: wine.grapeVarieties,
    regionName: wine.regionName,
    wineryName: wine.wineryName,
    vintage: wine.vintage,
    tastingNotes: wine.tastingNotes,
    producerContent: wine.producerContent,
    producerPageUrl: wine.producerPageUrl,
    tastingSheetUrl: wine.tastingSheetUrl,
    alcohol: wine.alcohol,
    acidity: wine.acidity,
    sugar: wine.sugar,
    foodPairings: wine.foodPairings,
    medals: wine.medals,
    cellarPotential: wine.cellarPotential,
    drinkabilityStart: wine.drinkabilityStart,
    drinkabilityEnd: wine.drinkabilityEnd,
  };
}

function sentenceIsUnsupported(
  sentence: string,
  wine: WineScanInput,
  field: "descriptionEditorial" | "tasteProfile" | "valueExplanation",
): boolean {
  const issues = validateEditorialClaims(
    { [field]: sentence },
    evidenceInputFromWine(wine),
  );
  return issues.some((issue) => issue.blocksPublication);
}

export function keepSupportedSentences(
  text: string | null | undefined,
  wine: WineScanInput,
  field: "descriptionEditorial" | "tasteProfile" | "valueExplanation",
): string | null {
  if (!text?.trim()) return text ?? null;
  const sentences = splitEditorialSentences(text);
  const kept = sentences.filter((sentence) => !sentenceIsUnsupported(sentence, wine, field));
  if (kept.length === 0) return null;
  if (kept.length === sentences.length) return text;
  return kept.join(" ").trim();
}

function stripUnsafeSentences(text: string | null | undefined): string | null {
  if (!text?.trim()) return text ?? null;
  const sentences = splitEditorialSentences(text);
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

  const cleanedDescription = keepSupportedSentences(
    wine.descriptionEditorial,
    wine,
    "descriptionEditorial",
  );
  if (cleanedDescription !== (wine.descriptionEditorial ?? null)) {
    next.descriptionEditorial = cleanedDescription;
    actions.push("eliminat propozitii editoriale nesustinute");
  } else if (
    isNonRed(wine.type) &&
    (codes.has(TRUTH_ISSUE_CODES.UNSUPPORTED_TANNIN_CLAIM) ||
      codes.has(TRUTH_ISSUE_CODES.PAIRING_CONTRADICTS_WINE_TYPE) ||
      codes.has(TRUTH_ISSUE_CODES.TYPE_EDITORIAL_CONTRADICTION))
  ) {
    const fallback = stripUnsafeSentences(wine.descriptionEditorial);
    if (fallback !== wine.descriptionEditorial) {
      next.descriptionEditorial = fallback;
      actions.push("eliminat fraze de tanin/fructe rosii/stejar din descriere");
    }
  }

  const cleanedTaste = keepSupportedSentences(wine.tasteProfile, wine, "tasteProfile");
  if (cleanedTaste !== (wine.tasteProfile ?? null)) {
    next.tasteProfile = cleanedTaste;
    actions.push("curatat tasteProfile la nivel de propozitie");
  } else if (
    isNonRed(wine.type) &&
    wine.tasteProfile &&
    UNSAFE_WHITE_PATTERNS.some((pattern) => pattern.test(wine.tasteProfile ?? ""))
  ) {
    next.tasteProfile = null;
    actions.push("golit tasteProfile nesustinut");
  } else if (
    codes.has(TRUTH_ISSUE_CODES.UNSUPPORTED_OAK_CLAIM) &&
    wine.tasteProfile &&
    /barrique|stejar|butoi/i.test(wine.tasteProfile)
  ) {
    next.tasteProfile = null;
    actions.push("golit tasteProfile cu stejar nesustinut");
  }

  const cleanedValue = keepSupportedSentences(
    wine.valueExplanation,
    wine,
    "valueExplanation",
  );
  if (cleanedValue !== (wine.valueExplanation ?? null)) {
    next.valueExplanation = cleanedValue;
    actions.push("eliminat propozitii din valueExplanation");
  }

  if (
    codes.has(TRUTH_ISSUE_CODES.EDITORIAL_PAIRING_UNSUPPORTED) ||
    codes.has(TRUTH_ISSUE_CODES.PAIRING_CONTRADICTS_WINE_TYPE) ||
    codes.has(TRUTH_ISSUE_CODES.PAIRING_REASON_UNSUPPORTED)
  ) {
    const notes = wine.foodPairingNotes ?? [];
    const keptNotes = notes.filter((note) => {
      const probe = validateEditorialClaims(
        { foodPairingNotes: [note] },
        evidenceInputFromWine(wine),
      );
      return !probe.some((issue) => issue.blocksPublication);
    });
    if (keptNotes.length !== notes.length) {
      next.foodPairingNotes = keptNotes;
      actions.push(
        keptNotes.length === 0
          ? "golit foodPairingNotes nesustinute"
          : `eliminat ${notes.length - keptNotes.length} note de pairing nesustinute`,
      );
    }
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
  const rows = await db.query.wines.findMany({
    with: {
      winery: { columns: { name: true } },
      region: { columns: { name: true } },
    },
  });
  const byId = new Map(rows.map((row) => [row.id, row]));
  const groups = groupIssuesByWine(scan.issues, []);
  const blockingGroups = groups.filter((group) => group.blocking > 0);
  const warningGroups = groups.filter(
    (group) => group.blocking === 0 && group.issues.length > 0,
  );

  const planned: CatalogCleanupReport["planned"] = [];
  const repaired: CatalogCleanupReport["repaired"] = [];
  let sentencesRemovable = 0;
  let fieldsClearable = 0;
  let pairingNotesRemovable = 0;

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
    planned.push({ wineId: row.id, slug: row.slug, actions });
    if (actions.some((action) => action.includes("propozitie") || action.includes("fraze"))) {
      sentencesRemovable += 1;
    }
    if (actions.some((action) => action.includes("golit"))) {
      fieldsClearable += 1;
    }
    if (actions.some((action) => action.includes("pairing") || action.includes("foodPairingNotes"))) {
      pairingNotesRemovable += 1;
    }

    if (!dryRun) {
      await db.update(wines).set(next).where(eq(wines.id, row.id));
      repaired.push({ wineId: row.id, slug: row.slug, actions });
    }
  }

  const reviewQueue = groups
    .filter((group) =>
      group.issues.some((issue) => issue.severity !== "low" || isPublicationBlockingIssue(issue)),
    )
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
    clean: Math.max(0, verified - groups.filter((group) => group.issues.length > 0).length),
    blocking: blockingGroups.length,
    warnings: warningGroups.length,
    issuesByCode: scan.summary.issuesByCode,
    issuesBySeverity: scan.summary.issuesBySeverity,
    planned,
    repaired,
    reviewQueue,
    counts: {
      sentencesRemovable,
      fieldsClearable,
      pairingNotesRemovable,
    },
  };
}

export function catalogCleanupScanOnly(input: WineScanInput[]) {
  const report = runIntegrityChecks(input);
  const editorial = detectEditorialTruthIssues(input);
  return { report, editorial };
}
