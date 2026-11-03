/**
 * Read-only provenance triage assistant.
 *
 * Deterministic identity checks always run first and always win:
 * vintage, producer, bottle size and grape mismatches are never overridden by
 * a language model. Jev may only make the assistant *more* cautious.
 *
 * Absolute guarantees encoded in the types:
 * - `readOnly: true` and `verifiedEligible: false` are literals.
 * - Nothing here writes to the database, merges records or changes status.
 */
import { detectSourceConflicts } from "@/lib/source-conflicts";
import { normalizeFoodToken } from "@/lib/food-taxonomy";
import type {
  ProducerExtractedFacts,
  WineFactIdentityMatch,
} from "@/lib/schema";

export const SOURCE_TRIAGE_CODES = {
  VINTAGE_MISMATCH: "TRIAGE_VINTAGE_MISMATCH",
  PRODUCER_MISMATCH: "TRIAGE_PRODUCER_MISMATCH",
  BOTTLE_SIZE_MISMATCH: "TRIAGE_BOTTLE_SIZE_MISMATCH",
  GRAPE_MISMATCH: "TRIAGE_GRAPE_MISMATCH",
  NAME_MISMATCH: "TRIAGE_NAME_MISMATCH",
  INSUFFICIENT_IDENTITY: "TRIAGE_INSUFFICIENT_IDENTITY",
  SOURCE_CONFLICT: "TRIAGE_SOURCE_CONFLICT",
  DUPLICATE_CANDIDATE: "TRIAGE_DUPLICATE_CANDIDATE",
  JEV_CANNOT_OVERRIDE: "TRIAGE_JEV_CANNOT_OVERRIDE_DETERMINISTIC",
  JEV_UNRELATED_SOURCE: "TRIAGE_JEV_UNRELATED_SOURCE",
  JEV_CONTRADICTORY_DESCRIPTION: "TRIAGE_JEV_CONTRADICTORY_DESCRIPTION",
  JEV_LOW_CONFIDENCE: "TRIAGE_JEV_LOW_CONFIDENCE",
} as const;

export interface CatalogWineIdentity {
  id: number;
  slug: string;
  name: string;
  wineryName: string | null;
  vintage: number | null;
  type: string;
  grapes: string[];
  /** Optional stored facts; used only when present. */
  sweetness?: string | null;
  alcohol?: number | null;
}

export interface SourceCandidateIdentity {
  url?: string | null;
  /** Source document title, usually `Producator - Vin - an`. */
  title?: string | null;
  wineName?: string | null;
  producerName?: string | null;
  vintage?: number | null;
  bottleSizeMl?: number | null;
  grapes?: string[] | null;
  sweetness?: string | null;
  type?: string | null;
  alcohol?: number | null;
  descriptionText?: string | null;
}

export type TriageAction =
  | "likely_match"
  | "review"
  | "reject_candidate"
  | "insufficient_evidence";

export interface TriageFinding {
  code: string;
  severity: "high" | "medium" | "low";
  message: string;
  /** `false` means an AI inference, never evidence. */
  deterministic: boolean;
}

export interface TriageResult {
  readonly readOnly: true;
  readonly verifiedEligible: false;
  identityClass: WineFactIdentityMatch;
  action: TriageAction;
  findings: TriageFinding[];
  conflicts: string[];
  /** Jev may not change identity/action while this is true. */
  lockedByDeterministic: boolean;
  jevAssisted: boolean;
  notes: string[];
}

export interface JevSemanticJudgment {
  /** Does the source describe the same product family? */
  sameProductFamily: boolean | null;
  sourceRelevance: "primary_source" | "retailer_listing" | "unrelated" | "unknown";
  contradictoryDescription: boolean | null;
  confidence: number;
}

const DUPLICATE_SIMILARITY_THRESHOLD = 0.75;
const MIN_JEV_CONFIDENCE = 0.55;

function foldedTokens(value: string | null | undefined): string[] {
  if (!value) return [];
  return normalizeFoodToken(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2)
    // Years, vintages and bottle sizes are compared as their own fields.
    .filter((token) => !/^\d+$/.test(token));
}

/** Containment similarity for duplicate candidates (names may have a suffix). */
function containment(left: string[], right: string[]): number {
  const a = new Set(left);
  const b = new Set(right);
  if (a.size === 0 || b.size === 0) return 0;
  let overlap = 0;
  for (const token of a) {
    if (b.has(token)) overlap += 1;
  }
  return overlap / Math.min(a.size, b.size);
}

function jaccard(left: string[], right: string[]): number {
  const a = new Set(left);
  const b = new Set(right);
  if (a.size === 0 || b.size === 0) return 0;
  let overlap = 0;
  for (const token of a) {
    if (b.has(token)) overlap += 1;
  }
  const union = a.size + b.size - overlap;
  return union === 0 ? 0 : overlap / union;
}

/** Parse "750 ml", "1,5 l", "1500 ML" into millilitres. */
export function parseBottleSizeMl(
  value: string | null | undefined,
): number | null {
  if (!value) return null;
  const match = value.match(/(\d+(?:[.,]\d+)?)\s*(ml|l|litri|litru)\b/i);
  if (!match) return null;
  const amount = Number((match[1] ?? "").replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const unit = (match[2] ?? "").toLowerCase();
  const ml = unit === "ml" ? amount : amount * 1_000;
  if (ml < 100 || ml > 30_000) return null;
  return Math.round(ml);
}

function producerMatches(
  catalogProducer: string | null,
  sourceProducer: string | null,
): boolean | null {
  if (!catalogProducer || !sourceProducer) return null;
  const left = normalizeFoodToken(catalogProducer);
  const right = normalizeFoodToken(sourceProducer);
  if (!left || !right) return null;
  if (left.includes(right) || right.includes(left)) return true;
  return jaccard(foldedTokens(left), foldedTokens(right)) >= 0.5;
}

function buildExtractedFacts(
  candidate: SourceCandidateIdentity,
): ProducerExtractedFacts | null {
  const facts: ProducerExtractedFacts = {};
  if (candidate.alcohol != null) facts.alcohol = candidate.alcohol;
  if (candidate.sweetness) facts.sweetness = candidate.sweetness;
  if (candidate.type) facts.type = candidate.type;
  if (candidate.vintage != null) facts.vintage = candidate.vintage;
  if (candidate.grapes && candidate.grapes.length > 0) {
    facts.grapes = candidate.grapes;
  }
  return Object.keys(facts).length > 0 ? facts : null;
}

function baseResult(): TriageResult {
  return {
    readOnly: true,
    verifiedEligible: false,
    identityClass: "SOURCE_IDENTITY_INCOMPLETE",
    action: "insufficient_evidence",
    findings: [],
    conflicts: [],
    lockedByDeterministic: false,
    jevAssisted: false,
    notes: [],
  };
}

/**
 * Deterministic triage of one candidate source against one catalog wine.
 * Pure function: no I/O, no writes, no external calls.
 */
export function triageSourceCandidate(
  catalogWine: CatalogWineIdentity,
  candidate: SourceCandidateIdentity,
): TriageResult {
  const result = baseResult();
  const add = (
    code: string,
    severity: TriageFinding["severity"],
    message: string,
  ) => {
    result.findings.push({ code, severity, message, deterministic: true });
  };

  const sourceName = candidate.wineName ?? candidate.title ?? null;
  const nameSimilarity = jaccard(
    foldedTokens(catalogWine.name),
    foldedTokens(sourceName),
  );

  if (!sourceName && !candidate.producerName) {
    add(
      SOURCE_TRIAGE_CODES.INSUFFICIENT_IDENTITY,
      "low",
      "Sursa nu are nume de vin sau producator; nu se poate evalua identitatea.",
    );
    return result;
  }

  if (sourceName && nameSimilarity < 0.34) {
    add(
      SOURCE_TRIAGE_CODES.NAME_MISMATCH,
      "high",
      `Numele sursei ("${sourceName}") nu seamana cu "${catalogWine.name}".`,
    );
    result.conflicts.push(SOURCE_TRIAGE_CODES.NAME_MISMATCH);
  }

  if (
    catalogWine.vintage != null &&
    candidate.vintage != null &&
    catalogWine.vintage !== candidate.vintage
  ) {
    add(
      SOURCE_TRIAGE_CODES.VINTAGE_MISMATCH,
      "high",
      `Vintage catalog ${catalogWine.vintage} vs sursa ${candidate.vintage}. Nu este acelasi produs verificat.`,
    );
    result.conflicts.push(SOURCE_TRIAGE_CODES.VINTAGE_MISMATCH);
    result.lockedByDeterministic = true;
    result.identityClass = "EXACT_WINE_DIFFERENT_VINTAGE";
  }

  const producer = producerMatches(catalogWine.wineryName, candidate.producerName ?? null);
  if (producer === false) {
    add(
      SOURCE_TRIAGE_CODES.PRODUCER_MISMATCH,
      "high",
      `Producator sursa "${candidate.producerName}" nu corespunde cramii "${catalogWine.wineryName}".`,
    );
    result.conflicts.push(SOURCE_TRIAGE_CODES.PRODUCER_MISMATCH);
    result.lockedByDeterministic = true;
  }

  const sourceSize = candidate.bottleSizeMl ?? parseBottleSizeMl(
    `${candidate.title ?? ""} ${candidate.descriptionText ?? ""}`,
  );
  // There is no bottle-size column in the catalog: use the size stated in the
  // catalog wine name (e.g. "Magnum 1,5 l"), otherwise leave it unknown.
  const catalogSize = parseBottleSizeMl(catalogWine.name);
  if (
    sourceSize != null &&
    catalogSize != null &&
    sourceSize !== catalogSize
  ) {
    add(
      SOURCE_TRIAGE_CODES.BOTTLE_SIZE_MISMATCH,
      "high",
      `Sticla sursa ${sourceSize} ml vs referinta ${catalogSize} ml.`,
    );
    result.conflicts.push(SOURCE_TRIAGE_CODES.BOTTLE_SIZE_MISMATCH);
    result.lockedByDeterministic = true;
  }

  if ((candidate.grapes?.length ?? 0) > 0 && catalogWine.grapes.length > 0) {
    const overlap = jaccard(
      foldedTokens(candidate.grapes?.join(" ")),
      foldedTokens(catalogWine.grapes.join(" ")),
    );
    if (overlap === 0) {
      add(
        SOURCE_TRIAGE_CODES.GRAPE_MISMATCH,
        "high",
        `Soiurile sursei (${candidate.grapes?.join(", ")}) nu se suprapun cu ${catalogWine.grapes.join(", ")}.`,
      );
      result.conflicts.push(SOURCE_TRIAGE_CODES.GRAPE_MISMATCH);
      result.lockedByDeterministic = true;
    }
  }

  const extracted = buildExtractedFacts(candidate);
  if (extracted) {
    const conflicts = detectSourceConflicts(
      {
        id: catalogWine.id,
        slug: catalogWine.slug,
        vintage: catalogWine.vintage,
        type: catalogWine.type,
        grapeVarieties: catalogWine.grapes,
        sweetness: catalogWine.sweetness ?? null,
        alcohol: catalogWine.alcohol ?? null,
      },
      extracted,
    );
    for (const conflict of conflicts) {
      const isVintage = conflict.code === "SOURCE_CONFLICT_VINTAGE";
      add(
        isVintage
          ? SOURCE_TRIAGE_CODES.VINTAGE_MISMATCH
          : SOURCE_TRIAGE_CODES.SOURCE_CONFLICT,
        conflict.severity === "critical"
          ? "high"
          : conflict.severity === "low"
            ? "low"
            : conflict.severity,
        conflict.message,
      );
      result.conflicts.push(conflict.code);
      if (conflict.blocksPublication) result.lockedByDeterministic = true;
      if (isVintage) result.identityClass = "EXACT_WINE_DIFFERENT_VINTAGE";
    }
  }

  if (result.conflicts.length > 0) {
    if (result.identityClass !== "EXACT_WINE_DIFFERENT_VINTAGE") {
      result.identityClass = "PRODUCT_MISMATCH";
    }
    result.action = "review";
    result.notes.push(
      "Conflict determinist: verificarea umana este obligatorie inainte de orice modificare.",
    );
    return result;
  }

  if (nameSimilarity >= 0.85) {
    result.identityClass =
      catalogWine.vintage != null && candidate.vintage != null
        ? "EXACT_WINE_EXACT_VINTAGE"
        : "EXACT_WINE_UNDATED_SOURCE";
    result.action = "likely_match";
  } else if (nameSimilarity >= 0.55) {
    result.identityClass = "LIKELY_WINE";
    result.action = "review";
    result.notes.push("Potrivire probabila, nu identitate verificata.");
  } else {
    result.identityClass = "SOURCE_IDENTITY_INCOMPLETE";
    result.action = "insufficient_evidence";
    result.notes.push("Identitatea nu poate fi stabilita din datele sursei.");
  }

  return result;
}

/**
 * Apply a validated Jev semantic judgment.
 *
 * Jev may only downgrade confidence. It never upgrades an identity class, never
 * clears a deterministic conflict and never makes a record verified.
 */
export function applyJevSemanticJudgment(
  result: TriageResult,
  judgment: JevSemanticJudgment,
): TriageResult {
  const next: TriageResult = {
    ...result,
    findings: [...result.findings],
    conflicts: [...result.conflicts],
    notes: [...result.notes],
    jevAssisted: true,
  };

  if (judgment.confidence < MIN_JEV_CONFIDENCE) {
    next.findings.push({
      code: SOURCE_TRIAGE_CODES.JEV_LOW_CONFIDENCE,
      severity: "low",
      message: "Judecata semantica Jev are incredere scazuta si nu este folosita.",
      deterministic: false,
    });
    return next;
  }

  if (result.lockedByDeterministic) {
    next.findings.push({
      code: SOURCE_TRIAGE_CODES.JEV_CANNOT_OVERRIDE,
      severity: "low",
      message:
        "Jev nu poate suprascrie un conflict determinist de identitate. Ramane revizuire umana.",
      deterministic: false,
    });
    return next;
  }

  const downgrade = (reason: string) => {
    next.notes.push(reason);
    if (next.identityClass === "LIKELY_WINE") {
      next.identityClass = "SOURCE_IDENTITY_INCOMPLETE";
    }
    next.action = "review";
  };

  if (judgment.sourceRelevance === "unrelated") {
    next.findings.push({
      code: SOURCE_TRIAGE_CODES.JEV_UNRELATED_SOURCE,
      severity: "medium",
      message: "Jev considera ca sursa nu este despre acest produs.",
      deterministic: false,
    });
    downgrade("Semantica sursei nu sustine potrivirea.");
  }

  if (judgment.contradictoryDescription === true) {
    next.findings.push({
      code: SOURCE_TRIAGE_CODES.JEV_CONTRADICTORY_DESCRIPTION,
      severity: "medium",
      message: "Jev semnaleaza descrieri contradictorii intre sursa si catalog.",
      deterministic: false,
    });
    downgrade("Descriere contradictorie semnalata semantic.");
  }

  if (judgment.sameProductFamily === true) {
    next.notes.push(
      "Jev sustine aceeasi familie de produs, dar inferenta AI nu este evidenta si nu schimba starea de verificare.",
    );
  }

  return next;
}

export interface DuplicateCandidatePair {
  leftSlug: string;
  rightSlug: string;
  similarity: number;
  reason: string;
}

/**
 * Pairs worth manual review. Mirrors the admin integrity scan rule
 * (same winery + vintage + type, similar name) and never merges anything.
 */
export function detectDuplicateCandidatePairs(
  wines: Array<CatalogWineIdentity & { wineryId?: number | null }>,
  threshold = DUPLICATE_SIMILARITY_THRESHOLD,
): DuplicateCandidatePair[] {
  const buckets = new Map<string, Array<CatalogWineIdentity & { wineryId?: number | null }>>();
  for (const wine of wines) {
    const key = `${wine.wineryId ?? wine.wineryName ?? "unknown"}:${wine.vintage ?? "nv"}:${wine.type}`;
    const bucket = buckets.get(key) ?? [];
    bucket.push(wine);
    buckets.set(key, bucket);
  }

  const pairs: DuplicateCandidatePair[] = [];
  for (const bucket of buckets.values()) {
    for (let i = 0; i < bucket.length; i++) {
      for (let j = i + 1; j < bucket.length; j++) {
        const left = bucket[i]!;
        const right = bucket[j]!;
        const similarity = containment(
          foldedTokens(left.name),
          foldedTokens(right.name),
        );
        if (similarity < threshold) continue;
        pairs.push({
          leftSlug: left.slug,
          rightSlug: right.slug,
          similarity: Number(similarity.toFixed(2)),
          reason:
            "Aceeasi crama, vintage si tip, cu nume foarte similar. Candidat de duplicat, nu se fuzioneaza automat.",
        });
      }
    }
  }
  return pairs;
}
