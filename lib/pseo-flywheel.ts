import {
  findClosestRomanianWines,
  parseComparisonIntent,
  STYLE_REFERENCES,
  type ComparisonMatch,
  type ReferenceStyle,
  type RomanianComparisonResult,
} from "@/lib/sommelier-comparison";
import type { WineWithRelations } from "@/types";

export type FlywheelLanguage = "ro" | "en" | "other";
export type FlywheelAnswerQuality = "high" | "low" | "unknown";
export type FlywheelPageType =
  | "romanian_equivalent"
  | "romanian_alternative"
  | "romanian_wines_for_lovers"
  | "unsupported";
export type FlywheelRecommendation = "publish" | "review" | "reject";

export interface QuestionIntentInput {
  rawQuery: string;
  language: FlywheelLanguage;
  answerQuality?: FlywheelAnswerQuality;
  similarPageExists?: boolean;
}

export interface ParsedQuestionIntent {
  rawQuery: string;
  normalizedQuery: string;
  entities: {
    references: string[];
    grapes: string[];
    regions: string[];
    wineries: string[];
    wines: string[];
    vintages: number[];
  };
  topicCluster: string;
  canonicalQuestion: string;
  intentType: FlywheelPageType;
  language: FlywheelLanguage;
  answerQuality: FlywheelAnswerQuality;
  similarPageExists: boolean;
  blocked: boolean;
  blockReason: string | null;
  referenceId: string | null;
  referenceName: string | null;
  pageType: FlywheelPageType;
}

export interface IntentCluster {
  key: string;
  referenceId: string;
  referenceName: string;
  pageType: FlywheelPageType;
  canonicalQuestion: string;
  records: ParsedQuestionIntent[];
  demandCount: number;
  uniqueDemandCount: number;
  highQualityCount: number;
  languages: FlywheelLanguage[];
  sourceIntentIds: number[];
}

export interface QualityGateCheck {
  code: string;
  passed: boolean;
  value: number | string | boolean;
  threshold: number | string | boolean;
  detail: string;
}

export interface QualityGateResult {
  passed: boolean;
  checks: QualityGateCheck[];
  supportingWineCount: number;
  coverage: number;
  confidence: number;
  duplicationRisk: number;
  demandCount: number;
  publishRecommendation: FlywheelRecommendation;
}

export interface GroundedDraft {
  slug: string;
  locale: "ro" | "en";
  pageType: FlywheelPageType;
  title: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  contentMarkdown: string;
  sections: Array<{ heading: string; body: string }>;
  faq: Array<{ question: string; answer: string }>;
  sources: Array<{ label: string; href?: string }>;
  generatedFromIntentCluster: string;
  clusterKey: string;
  confidence: number;
  publishRecommendation: FlywheelRecommendation;
  noindexUntilApproved: true;
  status: "draft";
  supportingWineCount: number;
  demandCount: number;
  qualityGate: QualityGateResult;
  sourceIntentIds: number[];
}

const MIN_DEMAND = 3;
const MIN_HIGH_QUALITY = 2;
const MIN_WINES = 3;
const MIN_COVERAGE = 0.6;
const MIN_CONFIDENCE = 0.65;
const MAX_DUPLICATION_RISK = 0.35;

const NONSENSE =
  /delfin|dolphin|balena|whale|urs polar|foca|tigru|carne de caine|carne de pisica|parizer|suc de portocale|bautura energizanta/i;

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectLanguage(raw: string, fallback: FlywheelLanguage): FlywheelLanguage {
  if (fallback !== "other") return fallback;
  const normalized = normalize(raw);
  if (/\b(?:vin|soi|crama|romanesc|romania|asemanator|apropiat|vreau)\b/.test(normalized)) {
    return "ro";
  }
  if (/\b(?:wine|grape|closest|similar|romanian|what|which)\b/.test(normalized)) {
    return "en";
  }
  return "other";
}

function referenceById(id: string): ReferenceStyle | null {
  return STYLE_REFERENCES.find((reference) => reference.id === id) ?? null;
}

function clusterReference(reference: ReferenceStyle): ReferenceStyle {
  const parentId = reference.clusterId ?? reference.id;
  return referenceById(parentId) ?? reference;
}

function pageTypeFor(
  reference: ReferenceStyle,
  normalized: string,
): FlywheelPageType {
  if (/\blover|iubitor|for .* lovers|pentru iubitor/.test(normalized)) {
    return "romanian_wines_for_lovers";
  }
  if (reference.color === "sparkling") return "romanian_alternative";
  return "romanian_equivalent";
}

function canonicalQuestionFor(reference: ReferenceStyle): string {
  return `Romanian equivalent of ${reference.name}`;
}

function canonicalKey(reference: ReferenceStyle, pageType: FlywheelPageType): string {
  return `${pageType}:${reference.id}`;
}

/**
 * Deterministic question analysis. It is intentionally not an LLM call: the
 * clustering key must stay stable across paraphrases and deployments.
 */
export function analyzeQuestion(
  input: QuestionIntentInput,
): ParsedQuestionIntent {
  const rawQuery = input.rawQuery.trim().slice(0, 2_000);
  const normalizedQuery = normalize(rawQuery);
  const language = detectLanguage(rawQuery, input.language);
  const parsed = parseComparisonIntent(rawQuery);
  const rawReference = parsed?.reference ?? null;
  const reference = rawReference ? clusterReference(rawReference) : null;
  const pageType = reference
    ? pageTypeFor(reference, normalizedQuery)
    : "unsupported";
  const blocked =
    !reference ||
    NONSENSE.test(normalizedQuery) ||
    normalizedQuery.length < 8 ||
    pageType === "unsupported";

  return {
    rawQuery,
    normalizedQuery,
    entities: {
      references: [
        ...(reference ? [reference.name] : []),
        ...(rawReference && rawReference.name !== reference?.name
          ? [rawReference.name]
          : []),
      ],
      grapes: rawReference?.grape ? [rawReference.grape] : [],
      regions: parsed?.claimedOrigin ? [parsed.claimedOrigin] : [],
      wineries: [],
      wines: [],
      vintages: parsed?.claimedVintage ? [parsed.claimedVintage] : [],
    },
    topicCluster: reference
      ? canonicalKey(reference, pageType)
      : `unsupported:${normalizedQuery.slice(0, 80)}`,
    canonicalQuestion: reference
      ? canonicalQuestionFor(reference)
      : `Unsupported question: ${normalizedQuery.slice(0, 120)}`,
    intentType: pageType,
    language,
    answerQuality: input.answerQuality ?? "unknown",
    similarPageExists: input.similarPageExists ?? false,
    blocked,
    blockReason: blocked
      ? !reference
        ? "unsupported_or_missing_reference"
        : NONSENSE.test(normalizedQuery)
          ? "nonsense_or_absurd"
          : "too_short_or_low_value"
      : null,
    referenceId: reference?.id ?? null,
    referenceName: reference?.name ?? null,
    pageType,
  };
}

export function clusterQuestionIntents(
  records: Array<ParsedQuestionIntent & { id?: number }>,
): IntentCluster[] {
  const groups = new Map<string, Array<ParsedQuestionIntent & { id?: number }>>();
  for (const record of records) {
    if (record.blocked || !record.referenceId || !record.referenceName) continue;
    const group = groups.get(record.topicCluster) ?? [];
    group.push(record);
    groups.set(record.topicCluster, group);
  }

  return [...groups.entries()]
    .map(([key, group]) => {
      const normalized = new Set(group.map((record) => record.normalizedQuery));
      const uniqueLanguages = [
        ...new Set(group.map((record) => record.language)),
      ];
      return {
        key,
        referenceId: group[0].referenceId!,
        referenceName: group[0].referenceName!,
        pageType: group[0].pageType,
        canonicalQuestion: group[0].canonicalQuestion,
        records: group,
        demandCount: group.length,
        uniqueDemandCount: normalized.size,
        highQualityCount: group.filter(
          (record) => record.answerQuality === "high",
        ).length,
        languages: uniqueLanguages,
        sourceIntentIds: group
          .map((record) => record.id)
          .filter((id): id is number => typeof id === "number"),
      };
    })
    .sort((a, b) => b.demandCount - a.demandCount);
}

function averageCoverage(result: RomanianComparisonResult): number {
  const matches = [result.best, ...result.alternatives];
  const values = matches.map((match) => {
    const available = match.dimensions.filter(
      (dimension) => dimension.evidence !== "missing",
    ).length;
    return available / match.dimensions.length;
  });
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function averageConfidence(result: RomanianComparisonResult): number {
  const matches = [result.best, ...result.alternatives];
  return (
    matches.reduce((sum, match) => sum + match.confidence, 0) /
    matches.length /
    100
  );
}

export function evaluateQualityGates(input: {
  cluster: IntentCluster;
  supportingWineCount: number;
  coverage: number;
  confidence: number;
  duplicationRisk?: number;
}): QualityGateResult {
  const duplicationRisk = input.duplicationRisk ?? 0.1;
  const checks: QualityGateCheck[] = [
    {
      code: "repeated_demand",
      passed: input.cluster.uniqueDemandCount >= MIN_DEMAND,
      value: input.cluster.uniqueDemandCount,
      threshold: MIN_DEMAND,
      detail: "Minimum unique normalized questions before a page is justified.",
    },
    {
      code: "answer_quality",
      passed: input.cluster.highQualityCount >= MIN_HIGH_QUALITY,
      value: input.cluster.highQualityCount,
      threshold: MIN_HIGH_QUALITY,
      detail: "At least two answers must be grounded and recommendation-bearing.",
    },
    {
      code: "catalog_coverage",
      passed: input.supportingWineCount >= MIN_WINES,
      value: input.supportingWineCount,
      threshold: MIN_WINES,
      detail: "Enough real catalog wines support the comparison.",
    },
    {
      code: "evidence_coverage",
      passed: input.coverage >= MIN_COVERAGE,
      value: Math.round(input.coverage * 100) / 100,
      threshold: MIN_COVERAGE,
      detail: "Share of structured dimensions with usable evidence.",
    },
    {
      code: "duplication_risk",
      passed: duplicationRisk <= MAX_DUPLICATION_RISK,
      value: Math.round(duplicationRisk * 100) / 100,
      threshold: MAX_DUPLICATION_RISK,
      detail: "Canonical cluster must not duplicate an existing page.",
    },
    {
      code: "answer_confidence",
      passed: input.confidence >= MIN_CONFIDENCE,
      value: Math.round(input.confidence * 100) / 100,
      threshold: MIN_CONFIDENCE,
      detail: "Average match confidence across the best result and alternatives.",
    },
  ];
  const passed = checks.every((check) => check.passed);
  const publishRecommendation: FlywheelRecommendation = !passed
    ? "reject"
    : input.confidence >= 0.8 && duplicationRisk <= 0.15
      ? "publish"
      : "review";

  return {
    passed,
    checks,
    supportingWineCount: input.supportingWineCount,
    coverage: input.coverage,
    confidence: input.confidence,
    duplicationRisk,
    demandCount: input.cluster.demandCount,
    publishRecommendation,
  };
}

function slugify(value: string): string {
  return normalize(value).replace(/\s+/g, "-").replace(/-+/g, "-");
}

export function draftSlug(
  reference: ReferenceStyle,
  pageType: FlywheelPageType,
  locale: "ro" | "en" = "ro",
): string {
  if (locale === "en") {
    if (pageType === "romanian_alternative") {
      return `romanian-alternatives-to-${slugify(reference.name)}`;
    }
    if (pageType === "romanian_wines_for_lovers") {
      return `romanian-wines-for-${slugify(reference.name)}-lovers`;
    }
    return `romanian-wine-similar-to-${slugify(reference.name)}`;
  }
  if (pageType === "romanian_alternative") {
    return `alternative-romanesti-${slugify(reference.name)}`;
  }
  if (pageType === "romanian_wines_for_lovers") {
    return `vinuri-romanesti-pentru-iubitorii-de-${slugify(reference.name)}`;
  }
  return `vin-romanesc-asemanator-${slugify(reference.name)}`;
}

function formatMatch(
  match: ComparisonMatch,
  locale: "ro" | "en",
): string {
  const facts = match.evidence.confirmed.slice(0, 4).join("; ");
  const reasons = match.reasons.join(" ");
  const differences = match.differences.join(" ");
  return locale === "ro"
    ? `**${match.wine.name}** (${match.score}/100). ${reasons} ${differences} Fapte: ${facts}.`
    : `**${match.wine.name}** (${match.score}/100). ${reasons} ${differences} Facts: ${facts}.`;
}

function draftCopy(
  reference: ReferenceStyle,
  pageType: FlywheelPageType,
  result: RomanianComparisonResult,
  locale: "ro" | "en",
) {
  const best = result.best;
  const alternatives = result.alternatives;
  const premise = result.intent.premiseIssues.join(" ");
  const label = reference.name;
  if (locale === "en") {
    const title =
      pageType === "romanian_wines_for_lovers"
        ? `Romanian wines for ${label} lovers`
        : pageType === "romanian_alternative"
          ? `Romanian alternatives to ${label}`
          : `Romanian wine similar to ${label}`;
    const metaTitle = `${title}: grounded matches | VinIntel`;
    const metaDescription = `A grounded guide to ${label} style in Romanian wine, with catalog matches, differences and evidence limits.`;
    const intro = `${label} is a reference point, not a Romanian grape. The closest VinIntel catalog matches are chosen on colour, body, acidity, tannin, alcohol, sweetness, aroma, oak, freshness, ageability, food affinity and climate cues.${premise ? ` Premise correction: ${premise}` : ""}`;
    const sections = [
      {
        heading: `Why ${label} is not a template`,
        body: `${label} has its own origin and structure. The matches below are structural bridges, not copies. A Romanian wine can share acidity and tannin while differing in aroma, climate and food affinity.`,
      },
      {
        heading: "Best Romanian match",
        body: formatMatch(best, "en"),
      },
      {
        heading: "Alternatives",
        body:
          alternatives.length > 0
            ? alternatives.map((match) => formatMatch(match, "en")).join("\n\n")
            : "No second catalogue match currently clears the evidence bar.",
      },
      {
        heading: "What is different",
        body: best.differences.join(" ") || "The distinction is mainly origin and variety, not a ranking of quality.",
      },
      {
        heading: "What the evidence does not establish",
        body: `Missing data: ${best.evidence.missing.join("; ") || "no major gaps identified"}. This is a style comparison, not a claim that the Romanian wine is identical to ${label}.`,
      },
    ];
    return {
      title,
      metaTitle,
      metaDescription,
      intro,
      sections,
      faq: [
        {
          question: `Is this a Romanian ${label}?`,
          answer: `No. It is a Romanian wine selected for structural similarity to ${label}, not a substitute label or an identical clone.`,
        },
        {
          question: "How were the matches chosen?",
          answer:
            "The comparison engine scores catalog wines across colour, body, acidity, tannin, alcohol, sweetness, aroma, oak, freshness, ageability, food affinity and climate cues. Missing dimensions are not invented.",
        },
        {
          question: "Why do the bottles differ?",
          answer:
            "Origin, grape variety, vintage and winemaking change the wine. The differences are listed so the recommendation remains useful rather than a false equivalence.",
        },
      ],
    };
  }

  const title =
    pageType === "romanian_wines_for_lovers"
      ? `Vinuri romanesti pentru iubitorii de ${label}`
      : pageType === "romanian_alternative"
        ? `Alternative romanesti la ${label}`
        : `Vin romanesc asemanator cu ${label}`;
  const metaTitle = `${title}: potriviri fundamentate | VinIntel`;
  const metaDescription = `Ghid fundamentat pentru stilul ${label} in vinul romanesc, cu potriviri din catalog, diferente si limite de evidenta.`;
  const intro = `${label} este o referinta, nu un soi romanesc. Potrivirile VinIntel sunt alese dupa culoare, corp, aciditate, tanin, alcool, dulceata, profil aromatic, lemn, prospetime, potential de evolutie, afinitate culinara si indicii de climat.${premise ? ` Corectura de premisa: ${premise}` : ""}`;
  const sections = [
    {
      heading: `De ce ${label} nu este un sablon`,
      body: `${label} are origine si structura proprie. Potrivirile de mai jos sunt punti structurale, nu copii. Un vin romanesc poate avea aciditate si tanin apropiate, dar aroma, climatul si masa pot diferi.`,
    },
    {
      heading: "Cea mai buna potrivire romaneasca",
      body: formatMatch(best, "ro"),
    },
    {
      heading: "Alternative",
      body:
        alternatives.length > 0
          ? alternatives.map((match) => formatMatch(match, "ro")).join("\n\n")
          : "Nu exista inca o a doua potrivire din catalog care sa treaca pragul de evidenta.",
    },
    {
      heading: "Ce difereste",
      body: best.differences.join(" ") || "Diferenta principala este originea, nu un clasament de calitate.",
    },
    {
      heading: "Ce nu dovedeste comparatia",
      body: `Date lipsa: ${best.evidence.missing.join("; ") || "nu au fost identificate goluri majore"}. Este o comparatie de stil, nu o afirmatie ca vinul romanesc este identic cu ${label}.`,
    },
  ];
  return {
    title,
    metaTitle,
    metaDescription,
    intro,
    sections,
    faq: [
      {
        question: `Este un ${label} romanesc?`,
        answer: `Nu. Este un vin romanesc ales pentru similitudine structurala cu ${label}, nu un inlocuitor de eticheta si nici o copie identica.`,
      },
      {
        question: "Cum au fost alese potrivirile?",
        answer:
          "Motorul compara vinurile din catalog dupa culoare, corp, aciditate, tanin, alcool, dulceata, aroma, lemn, prospetime, potential de evolutie, afinitate culinara si indicii de climat. Dimensiunile lipsa nu sunt inventate.",
      },
      {
        question: "De ce difera sticlele?",
        answer:
          "Originea, soiul, recolta si vinificatia schimba vinul. Diferentele sunt listate pentru ca recomandarea sa ramana utila, nu o echivalenta falsa.",
      },
    ],
  };
}

export interface DraftBuildInput {
  cluster: IntentCluster;
  wines: WineWithRelations[];
  locale?: "ro" | "en";
  duplicationRisk?: number;
}

export interface DraftBuildResult {
  gate: QualityGateResult;
  draft: GroundedDraft | null;
}

export function buildGroundedDraft(input: DraftBuildInput): DraftBuildResult | null {
  const reference = referenceById(input.cluster.referenceId);
  if (!reference) return null;
  const locale = input.locale ?? "ro";
  const intent = parseComparisonIntent(input.cluster.canonicalQuestion);
  if (!intent) return null;
  const result = findClosestRomanianWines({
    intent,
    wines: input.wines,
    locale,
  });
  if (!result) return null;

  const supportingWineCount = 1 + result.alternatives.length;
  const coverage = averageCoverage(result);
  const confidence = averageConfidence(result);
  const duplicationRisk = input.duplicationRisk ?? 0.1;
  const gate = evaluateQualityGates({
    cluster: input.cluster,
    supportingWineCount,
    coverage,
    confidence,
    duplicationRisk,
  });
  if (!gate.passed) return { gate, draft: null };

  const copy = draftCopy(reference, input.cluster.pageType, result, locale);
  const contentMarkdown = [
    `# ${copy.title}`,
    copy.intro,
    ...copy.sections.map((section) => `## ${section.heading}\n\n${section.body}`),
  ].join("\n\n");
  const slug = draftSlug(reference, input.cluster.pageType, locale);

  return {
    gate,
    draft: {
      slug,
      locale,
      pageType: input.cluster.pageType,
      title: copy.title,
      metaTitle: copy.metaTitle,
      metaDescription: copy.metaDescription,
      intro: copy.intro,
      contentMarkdown,
      sections: copy.sections,
      faq: copy.faq,
      sources: [
        { label: "Catalog VinIntel", href: "/vinuri" },
        { label: "Ghidul soiurilor VinIntel", href: "/soiuri" },
      ],
      generatedFromIntentCluster: input.cluster.key,
      clusterKey: input.cluster.key,
      confidence,
      publishRecommendation: gate.publishRecommendation,
      noindexUntilApproved: true,
      status: "draft",
      supportingWineCount,
      demandCount: input.cluster.demandCount,
      qualityGate: gate,
      sourceIntentIds: input.cluster.sourceIntentIds,
    },
  };
}
