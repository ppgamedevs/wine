import {
  looksLikeInferredCellarPotential,
  looksLikeQualityAdjectiveProse,
  validateEditorialClaims,
  type EditorialClaimIssue,
} from "@/lib/editorial-claim-validator";
import { db, libsqlClient } from "@/lib/db";
import {
  calculateQualityConfidence,
  confidencePercent,
  resolveConfidenceScoreCeiling,
} from "@/lib/scoring-v2";
import type {
  AffiliateLink,
  EditorialFoodPairingNote,
  ExpertNotes,
  FoodPairing,
  PriceHistoryEntry,
  ProducerPageContent,
  WineMedal,
} from "@/lib/schema";
import { wineFactEvidence } from "@/lib/schema";
import { detectSourceConflicts } from "@/lib/source-conflicts";
import { detectTechnicalFactIssues } from "@/lib/tech-facts/scan";
import type { TechFactField } from "@/lib/tech-facts/types";
import { VALUE_SCORE_EXCEPTIONAL_MIN } from "@/lib/value-score-thresholds";
import { isValidWineVintage } from "@/lib/wine-vintage";

/**
 * Scan de integritate a datelor, rulabil local, in CI, si din admin (Faza 4 +
 * Faza 10 din planul de audit). Fiecare verificare este o functie pura,
 * testabila unitar, care primeste date simple (nu interogheaza baza de date
 * direct) - `runIntegrityScan()` este singurul punct care face I/O.
 */

export type IntegritySeverity = "critical" | "high" | "medium" | "low";

export interface IntegrityIssue {
  wineId: number;
  slug: string;
  severity: IntegritySeverity;
  code: string;
  message: string;
  explanation?: string;
  evidenceSummary?: string;
  blocksPublication?: boolean;
}

export interface WineScanInput {
  id: number;
  slug: string;
  name: string;
  wineryId: number | null;
  wineryName: string | null;
  regionId: number | null;
  regionName: string | null;
  type: string;
  sweetness: string | null;
  vintage: number | null;
  grapeVarieties: { name: string }[];
  priceAvg: number | null;
  currentPrice: number | null;
  priceHistory: PriceHistoryEntry[];
  valueScore: number | null;
  criticScore: number | null;
  ratingAvg: number | null;
  communityScore: number | null;
  medals: WineMedal[];
  status: string;
  sourceUrl: string | null;
  affiliateLinks: AffiliateLink[];
  descriptionEditorial: string | null;
  valueExplanation?: string | null;
  tasteProfile?: string | null;
  thingsYouShouldKnow?: string[] | null;
  foodPairingNotes?: EditorialFoodPairingNote[] | null;
  dessertPairings?: EditorialFoodPairingNote[] | null;
  recommendedOccasions?: string[] | null;
  expertNotes?: ExpertNotes | null;
  tastingNotes?: string | null;
  producerContent?: ProducerPageContent | null;
  producerPageUrl?: string | null;
  tastingSheetUrl?: string | null;
  alcohol?: number | null;
  acidity?: number | null;
  sugar?: number | null;
  cellarPotential?: number | null;
  drinkabilityStart?: number | null;
  drinkabilityEnd?: number | null;
  foodPairings: FoodPairing[];
  evidenceFields?: TechFactField[];
  updatedAt: string;
}

const STALE_PRICE_DAYS = 45;
const VERY_STALE_PRICE_DAYS = 90;
const THIN_CONTENT_MIN_CHARS = 80;
const WEAK_EVIDENCE_CONFIDENCE_PERCENT = 50;

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24);
}

function lastPriceObservationDate(wine: WineScanInput): Date | null {
  const entries = wine.priceHistory
    .map((entry) => parseDate(entry.date))
    .filter((date): date is Date => date !== null)
    .sort((a, b) => b.getTime() - a.getTime());

  return entries[0] ?? parseDate(wine.updatedAt);
}

/**
 * Preturi stale: nicio observatie de pret in ultimele `STALE_PRICE_DAYS` zile
 * pentru un vin altfel publicat. Afisarea unui pret vechi ca fiind curent
 * ar viola regula de "prospetime a pretului" din metodologie.
 */
export function detectStalePrices(
  input: WineScanInput[],
  referenceDate: Date = new Date(),
): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];

  for (const wine of input) {
    if (wine.status !== "verified") continue;
    if (wine.currentPrice == null && wine.priceAvg == null) continue;

    const lastObserved = lastPriceObservationDate(wine);
    if (!lastObserved) {
      issues.push({
        wineId: wine.id,
        slug: wine.slug,
        severity: "medium",
        code: "price_no_observation_date",
        message:
          "Vinul are pret dar nu exista nicio data de observare a pretului.",
      });
      continue;
    }

    const ageDays = Math.round(daysBetween(referenceDate, lastObserved));
    if (ageDays >= VERY_STALE_PRICE_DAYS) {
      issues.push({
        wineId: wine.id,
        slug: wine.slug,
        severity: "high",
        code: "price_very_stale",
        message: `Pretul nu a fost verificat de ${ageDays} zile (peste ${VERY_STALE_PRICE_DAYS}).`,
      });
    } else if (ageDays >= STALE_PRICE_DAYS) {
      issues.push({
        wineId: wine.id,
        slug: wine.slug,
        severity: "medium",
        code: "price_stale",
        message: `Pretul nu a fost verificat de ${ageDays} zile (peste ${STALE_PRICE_DAYS}).`,
      });
    }
  }

  return issues;
}

/**
 * Recalculeaza increderea (fara bonusul de model ML, indisponibil sincron in
 * scan) si semnaleaza scoruri mari sprijinite de dovezi vizibile slabe, ca
 * cazuri de revizuit manual. NU reevalueaza automat scorul si NU il schimba;
 * e strict un semnal pentru coada de revizuire umana.
 */
export function detectSuspiciousHighScores(
  input: WineScanInput[],
): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];

  for (const wine of input) {
    if (wine.status !== "verified" || wine.valueScore == null) continue;

    const confidence = calculateQualityConfidence({
      grapeVarieties: wine.grapeVarieties.map((g) => g.name),
      region: wine.regionName ?? undefined,
      wineryName: wine.wineryName ?? undefined,
      wineMedals: wine.medals,
      criticScore: wine.criticScore,
      ratingAvg: wine.ratingAvg,
      communityScore: wine.communityScore,
      hasMlModel: false,
      mlPrediction: null,
    });
    const percent = confidencePercent(confidence);
    const ceiling = resolveConfidenceScoreCeiling(percent);

    if (wine.valueScore > ceiling) {
      issues.push({
        wineId: wine.id,
        slug: wine.slug,
        severity: "high",
        code: "score_above_confidence_ceiling",
        message: `Value Score (${wine.valueScore}) depaseste plafonul recalculat pentru increderea vizibila (${percent}%, plafon ${ceiling}). Posibil scor calculat inainte de introducerea plafoanelor sau override nedocumentat.`,
      });
      continue;
    }

    if (
      wine.valueScore >= VALUE_SCORE_EXCEPTIONAL_MIN &&
      percent < WEAK_EVIDENCE_CONFIDENCE_PERCENT
    ) {
      issues.push({
        wineId: wine.id,
        slug: wine.slug,
        severity: "medium",
        code: "high_score_weak_visible_evidence",
        message: `Scor exceptional (${wine.valueScore}) cu dovezi vizibile limitate (incredere recalculata fara model ML: ${percent}%). Recomandat: revizuire manuala a surselor.`,
      });
    }
  }

  return issues;
}

/** Vintage invalid (viitor nerealist sau anterior anului minim acceptat). */
export function detectInvalidVintages(
  input: WineScanInput[],
  referenceYear?: number,
): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  for (const wine of input) {
    if (wine.vintage == null) continue;
    if (!isValidWineVintage(wine.vintage, referenceYear)) {
      issues.push({
        wineId: wine.id,
        slug: wine.slug,
        severity: "critical",
        code: "invalid_vintage",
        message: `Vintage ${wine.vintage} este in afara intervalului valid.`,
      });
    }
  }
  return issues;
}

/** Vinuri publicate fara nicio sursa (nici URL de origine, nici linkuri afiliate). */
export function detectMissingSources(input: WineScanInput[]): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  for (const wine of input) {
    if (wine.status !== "verified") continue;
    const hasSourceUrl = Boolean(wine.sourceUrl?.trim());
    const hasAffiliateLink = wine.affiliateLinks.length > 0;
    if (!hasSourceUrl && !hasAffiliateLink) {
      issues.push({
        wineId: wine.id,
        slug: wine.slug,
        severity: "high",
        code: "missing_source",
        message:
          "Vin publicat fara URL sursa si fara linkuri de retailer. Nu se poate verifica provenienta.",
      });
    }
  }
  return issues;
}

/** URL de afiliat structural invalid (nu se poate parsa sau nu e http/https: risc de open redirect). */
export function detectInvalidAffiliateLinks(
  input: WineScanInput[],
): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  for (const wine of input) {
    for (const link of wine.affiliateLinks) {
      let parsed: URL | null = null;
      try {
        parsed = new URL(link.url);
      } catch {
        parsed = null;
      }
      if (!parsed || !/^https?:$/.test(parsed.protocol)) {
        issues.push({
          wineId: wine.id,
          slug: wine.slug,
          severity: "high",
          code: "invalid_affiliate_link",
          message: `Link afiliat invalid pentru retailer "${link.retailer}": "${link.url}".`,
        });
      }
    }
  }
  return issues;
}

/** Continut editorial subtire pe o pagina altfel publicata (risc de "thin content" SEO). */
export function detectThinContent(input: WineScanInput[]): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  for (const wine of input) {
    if (wine.status !== "verified") continue;
    const length = wine.descriptionEditorial?.trim().length ?? 0;
    if (length === 0) {
      issues.push({
        wineId: wine.id,
        slug: wine.slug,
        severity: "medium",
        code: "missing_editorial_content",
        message: "Vin publicat fara descriere editoriala.",
      });
    } else if (length < THIN_CONTENT_MIN_CHARS) {
      issues.push({
        wineId: wine.id,
        slug: wine.slug,
        severity: "low",
        code: "thin_editorial_content",
        message: `Descrierea editoriala are doar ${length} caractere.`,
      });
    }
  }
  return issues;
}

const SWEET_WORDS = ["dulce"];
const OFF_DRY_WORDS = ["demidulce", "demisec"];
const DRY_WORD = "sec";

/**
 * Detecteaza contradictii text-vs-fapte: descrierea editoriala mentioneaza
 * "sec" pentru un vin dulce/demidulce sau invers. Verificare simpla, dar
 * directa aplicare a regulii "nu contrazice culoarea/dulceata".
 */
export function detectContradictorySweetnessText(
  input: WineScanInput[],
): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  for (const wine of input) {
    const text = (wine.descriptionEditorial ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    if (!text.trim() || !wine.sweetness) continue;

    const mentionsSweet = SWEET_WORDS.some((word) =>
      new RegExp(`\\b${word}\\b`).test(text),
    );
    const mentionsOffDry = OFF_DRY_WORDS.some((word) =>
      new RegExp(`\\b${word}\\b`).test(text),
    );
    const mentionsDry = new RegExp(`\\b${DRY_WORD}\\b`).test(text);

    if (wine.sweetness === "sec" && (mentionsSweet || mentionsOffDry)) {
      issues.push({
        wineId: wine.id,
        slug: wine.slug,
        severity: "high",
        code: "sweetness_contradiction",
        message: `Vinul este clasificat "sec" dar descrierea mentioneaza dulceata/demidulce.`,
      });
    } else if (
      (wine.sweetness === "dulce" || wine.sweetness === "demidulce") &&
      mentionsDry &&
      !mentionsSweet &&
      !mentionsOffDry
    ) {
      issues.push({
        wineId: wine.id,
        slug: wine.slug,
        severity: "medium",
        code: "sweetness_contradiction",
        message: `Vinul este clasificat "${wine.sweetness}" dar descrierea mentioneaza "sec" fara nuantare.`,
      });
    }
  }
  return issues;
}

function normalizeNameTokens(name: string): Set<string> {
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\bvin\b/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return new Set(normalized.split(" ").filter((token) => token.length > 2));
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let overlap = 0;
  for (const token of a) {
    if (b.has(token)) overlap += 1;
  }
  const union = a.size + b.size - overlap;
  return union === 0 ? 0 : overlap / union;
}

export interface DuplicateCandidateGroup {
  wineIds: number[];
  slugs: string[];
  similarity: number;
  reason: string;
}

const DUPLICATE_NAME_SIMILARITY_THRESHOLD = 0.75;

/**
 * Semnaleaza PERECHI candidate de duplicat pentru revizuire manuala. NU
 * fuzioneaza automat - regula non-negociabila #9 spune explicit sa nu unim
 * vinuri distincte doar pe baza de nume similar. Grupeaza intai pe
 * (wineryId, vintage, tip) ca sa reduca comparatiile O(n^2) la nivel de
 * crama, apoi compara similaritatea de nume in interiorul grupului.
 */
export function detectDuplicateCandidates(
  input: WineScanInput[],
): DuplicateCandidateGroup[] {
  const buckets = new Map<string, WineScanInput[]>();

  for (const wine of input) {
    if (wine.wineryId == null) continue;
    const key = `${wine.wineryId}:${wine.vintage ?? "nv"}:${wine.type}`;
    const bucket = buckets.get(key) ?? [];
    bucket.push(wine);
    buckets.set(key, bucket);
  }

  const groups: DuplicateCandidateGroup[] = [];

  for (const bucket of buckets.values()) {
    if (bucket.length < 2) continue;

    for (let i = 0; i < bucket.length; i += 1) {
      for (let j = i + 1; j < bucket.length; j += 1) {
        const left = bucket[i];
        const right = bucket[j];
        const similarity = jaccardSimilarity(
          normalizeNameTokens(left.name),
          normalizeNameTokens(right.name),
        );
        if (similarity >= DUPLICATE_NAME_SIMILARITY_THRESHOLD) {
          groups.push({
            wineIds: [left.id, right.id],
            slugs: [left.slug, right.slug],
            similarity: Math.round(similarity * 100) / 100,
            reason: `Aceeasi crama, vintage si tip; nume similare (${Math.round(similarity * 100)}%).`,
          });
        }
      }
    }
  }

  return groups;
}

export interface IntegrityScanSummary {
  totalWines: number;
  publishedWines: number;
  issuesBySeverity: Record<IntegritySeverity, number>;
  issuesByCode: Record<string, number>;
  duplicateGroupCount: number;
}

export interface IntegrityScanReport {
  generatedAt: string;
  summary: IntegrityScanSummary;
  issues: IntegrityIssue[];
  duplicateGroups: DuplicateCandidateGroup[];
}

const PUBLICATION_BLOCKING_CODES = new Set([
  "invalid_vintage",
  "TYPE_EDITORIAL_CONTRADICTION",
  "SWEETNESS_EDITORIAL_CONTRADICTION",
  "sweetness_contradiction",
  "AGEING_EDITORIAL_CONTRADICTION",
  "UNSUPPORTED_TANNIN_CLAIM",
  "UNSUPPORTED_OAK_CLAIM",
  "UNSUPPORTED_OAK_DETAIL",
  "UNSUPPORTED_SENSORY_CLAIM",
  "SOURCE_CONFLICT_GRAPES",
  "SOURCE_CONFLICT_SWEETNESS",
  "SOURCE_CONFLICT_VINTAGE",
  "SOURCE_CONFLICT_TYPE",
  "NO_DATA_BUT_SPECIFIC_CLAIMS",
  "EXPERT_NOTE_UNSUPPORTED",
  "EDITORIAL_PAIRING_UNSUPPORTED",
  "PAIRING_REASON_UNSUPPORTED",
  "PAIRING_CONTRADICTS_WINE_TYPE",
]);

export function isPublicationBlockingIssue(issue: IntegrityIssue): boolean {
  if (issue.blocksPublication === true) return true;
  if (issue.blocksPublication === false) return false;
  return (
    (issue.severity === "critical" || issue.severity === "high") &&
    PUBLICATION_BLOCKING_CODES.has(issue.code)
  );
}

function evidenceSummaryFor(wine: WineScanInput): string {
  const parts = [
    wine.tastingNotes?.trim() ? "tastingNotes" : null,
    wine.producerContent?.tastingNotes?.trim() ? "producer.tastingNotes" : null,
    wine.tastingSheetUrl?.trim() ? "tastingSheetUrl" : null,
    (wine.foodPairings?.length ?? 0) > 0 ? "foodPairings" : null,
    wine.acidity != null ? `acidity=${wine.acidity}` : null,
  ].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(", ") : "fara evidenta de degustare";
}

function claimIssueToIntegrity(
  wine: WineScanInput,
  claim: EditorialClaimIssue,
): IntegrityIssue {
  return {
    wineId: wine.id,
    slug: wine.slug,
    severity: claim.severity,
    code: claim.code,
    message: claim.message,
    explanation: claim.explanation,
    evidenceSummary: evidenceSummaryFor(wine),
    blocksPublication: claim.blocksPublication,
  };
}

/**
 * Claim-uri editoriale, pairing si expert notes. Foloseste acelasi validator
 * ca fact-guard-ul de generare, ca sa nu existe doua seturi de reguli.
 */
export function detectEditorialTruthIssues(
  input: WineScanInput[],
): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];

  for (const wine of input) {
    const claims = validateEditorialClaims(
      {
        descriptionEditorial: wine.descriptionEditorial,
        valueExplanation: wine.valueExplanation,
        tasteProfile: wine.tasteProfile,
        thingsYouShouldKnow: wine.thingsYouShouldKnow,
        foodPairingNotes: wine.foodPairingNotes,
        dessertPairings: wine.dessertPairings,
        recommendedOccasions: wine.recommendedOccasions,
        expertNotes: wine.expertNotes,
        foodPairings: wine.foodPairings,
      },
      {
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
        expertNotes: wine.expertNotes,
      },
    );

    for (const claim of claims) {
      issues.push(claimIssueToIntegrity(wine, claim));
    }

    const extractedFacts = wine.producerContent?.facts;
    if (extractedFacts) {
      issues.push(
        ...detectSourceConflicts(
          {
            id: wine.id,
            slug: wine.slug,
            alcohol: wine.alcohol,
            sweetness: wine.sweetness,
            vintage: wine.vintage,
            type: wine.type,
            grapeVarieties: wine.grapeVarieties,
          },
          extractedFacts,
        ),
      );
    }

    if (looksLikeQualityAdjectiveProse(wine.tasteProfile)) {
      issues.push({
        wineId: wine.id,
        slug: wine.slug,
        severity: "low",
        code: "AI_TEXT_USED_AS_QUALITY_EVIDENCE",
        message:
          "tasteProfile contine adjective de calitate (complex/elegant/mineral/persistent). Acestea nu mai intra in Q, dar textul merita revizuit.",
        explanation:
          "Inainte de Truth Layer, heuristicQualityWithoutPrice putea adauga +2 Q din aceste cuvinte.",
        evidenceSummary: evidenceSummaryFor(wine),
        blocksPublication: false,
      });
    }

    if (
      wine.valueScore != null &&
      wine.valueScore >= VALUE_SCORE_EXCEPTIONAL_MIN &&
      looksLikeInferredCellarPotential({
        type: wine.type,
        price: wine.currentPrice ?? wine.priceAvg,
        cellarPotential: wine.cellarPotential,
        drinkabilityStart: wine.drinkabilityStart,
        drinkabilityEnd: wine.drinkabilityEnd,
      })
    ) {
      issues.push({
        wineId: wine.id,
        slug: wine.slug,
        severity: "low",
        code: "INFERRED_CELLAR_USED_AS_QUALITY_EVIDENCE",
        message:
          "cellarPotential arata a estimare algoritmica (rosu+pret), nu ca fereastra documentata. Nu mai intra in Q.",
        explanation:
          "Valorile 2/4 din regula de categorie/pret raman stocate ca ghid generic, dar nu sunt tratate ca potential verificat.",
        evidenceSummary: evidenceSummaryFor(wine),
        blocksPublication: false,
      });
    }
  }

  return issues;
}

export interface WineIssueGroup {
  wineId: number;
  slug: string;
  status?: string;
  valueScore?: number | null;
  critical: number;
  high: number;
  medium: number;
  low: number;
  blocking: number;
  issues: IntegrityIssue[];
}

export function groupIssuesByWine(
  issues: IntegrityIssue[],
  wines: WineScanInput[] = [],
): WineIssueGroup[] {
  const byId = new Map<number, WineIssueGroup>();
  const wineById = new Map(wines.map((wine) => [wine.id, wine]));

  for (const issue of issues) {
    const existing = byId.get(issue.wineId);
    if (!existing) {
      const wine = wineById.get(issue.wineId);
      byId.set(issue.wineId, {
        wineId: issue.wineId,
        slug: issue.slug,
        status: wine?.status,
        valueScore: wine?.valueScore,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        blocking: 0,
        issues: [issue],
      });
    } else {
      existing.issues.push(issue);
    }
  }

  for (const group of byId.values()) {
    for (const issue of group.issues) {
      group[issue.severity] += 1;
      if (isPublicationBlockingIssue(issue)) group.blocking += 1;
    }
  }

  return Array.from(byId.values()).sort((left, right) => {
    if (right.blocking !== left.blocking) return right.blocking - left.blocking;
    if (right.critical !== left.critical) return right.critical - left.critical;
    if (right.high !== left.high) return right.high - left.high;
    return (right.valueScore ?? 0) - (left.valueScore ?? 0);
  });
}

export function reviewQueueGroups(
  report: IntegrityScanReport,
  wines: WineScanInput[],
): WineIssueGroup[] {
  const groups = groupIssuesByWine(report.issues, wines);
  return groups.sort((left, right) => {
    const leftVerified = left.status === "verified" ? 1 : 0;
    const rightVerified = right.status === "verified" ? 1 : 0;
    if (rightVerified !== leftVerified) return rightVerified - leftVerified;
    if (right.critical !== left.critical) return right.critical - left.critical;
    if (right.high !== left.high) return right.high - left.high;
    return (right.valueScore ?? 0) - (left.valueScore ?? 0);
  });
}

/** Ruleaza toate verificarile pure asupra unui set de date deja incarcat (fara I/O). Usor de testat unitar. */
export function runIntegrityChecks(
  input: WineScanInput[],
  referenceDate: Date = new Date(),
): IntegrityScanReport {
  const issues = [
    ...detectStalePrices(input, referenceDate),
    ...detectSuspiciousHighScores(input),
    ...detectInvalidVintages(input, referenceDate.getFullYear()),
    ...detectMissingSources(input),
    ...detectInvalidAffiliateLinks(input),
    ...detectThinContent(input),
    ...detectContradictorySweetnessText(input),
    ...detectEditorialTruthIssues(input),
    ...detectTechnicalFactIssues(input),
  ];

  const duplicateGroups = detectDuplicateCandidates(input);

  const issuesBySeverity: Record<IntegritySeverity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  const issuesByCode: Record<string, number> = {};

  for (const issue of issues) {
    issuesBySeverity[issue.severity] += 1;
    issuesByCode[issue.code] = (issuesByCode[issue.code] ?? 0) + 1;
  }

  return {
    generatedAt: referenceDate.toISOString(),
    summary: {
      totalWines: input.length,
      publishedWines: input.filter((w) => w.status === "verified").length,
      issuesBySeverity,
      issuesByCode,
      duplicateGroupCount: duplicateGroups.length,
    },
    issues,
    duplicateGroups,
  };
}

/** Incarca vinurile din baza de date si ruleaza scanul complet de integritate. */
export async function runIntegrityScan(): Promise<IntegrityScanReport> {
  const rows = await db.query.wines.findMany({
    columns: {
      id: true,
      slug: true,
      name: true,
      wineryId: true,
      regionId: true,
      type: true,
      sweetness: true,
      vintage: true,
      grapeVarieties: true,
      priceAvg: true,
      currentPrice: true,
      priceHistory: true,
      valueScore: true,
      criticScore: true,
      ratingAvg: true,
      communityScore: true,
      medals: true,
      status: true,
      sourceUrl: true,
      affiliateLinks: true,
      descriptionEditorial: true,
      valueExplanation: true,
      tasteProfile: true,
      thingsYouShouldKnow: true,
      foodPairingNotes: true,
      dessertPairings: true,
      recommendedOccasions: true,
      expertNotes: true,
      tastingNotes: true,
      producerContent: true,
      producerPageUrl: true,
      tastingSheetUrl: true,
      alcohol: true,
      acidity: true,
      sugar: true,
      cellarPotential: true,
      drinkabilityStart: true,
      drinkabilityEnd: true,
      foodPairings: true,
      updatedAt: true,
    },
    with: {
      winery: { columns: { name: true } },
      region: { columns: { name: true } },
    },
  });

  const evidenceByWine = new Map<number, Set<TechFactField>>();
  const evidenceTable = await libsqlClient.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'wine_fact_evidence'",
  );
  if (evidenceTable.rows.length === 1) {
    const evidence = await db
      .select({
        wineId: wineFactEvidence.wineId,
        field: wineFactEvidence.field,
      })
      .from(wineFactEvidence);
    for (const item of evidence) {
      const fields = evidenceByWine.get(item.wineId) ?? new Set<TechFactField>();
      fields.add(item.field);
      evidenceByWine.set(item.wineId, fields);
    }
  }

  const input: WineScanInput[] = rows.map((row) => ({
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
    evidenceFields: [...(evidenceByWine.get(row.id) ?? [])],
    updatedAt: row.updatedAt,
  }));

  return runIntegrityChecks(input);
}

export function collectWineIdsWithIssues(
  report: IntegrityScanReport,
): number[] {
  return Array.from(new Set(report.issues.map((issue) => issue.wineId)));
}
