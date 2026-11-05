import { normalizeIdentityText } from "@/lib/wine-identity";
import type { WineWithRelations } from "@/types";
import type {
  MaturityStatus,
  VintageAssessment,
  VintageClassification,
  VintageEvidenceRecord,
  VintageSource,
} from "@/lib/vintage/types";
import { bottleSizeMlFromName, wineFamilyKey } from "@/lib/vintage/types";

const EVIDENCE_ORDER: VintageEvidenceRecord["evidenceType"][] = [
  "winter_water",
  "spring_frost",
  "flowering",
  "rain_drought",
  "heat",
  "disease_hail",
  "veraison_ripening",
  "harvest_timing_weather",
  "sugar_acidity",
  "phenolic_ripeness",
  "yield_selection",
  "producer_note",
  "critic_review",
  "official_report",
  "maturity_guidance",
];

function matchesScope(
  evidence: VintageEvidenceRecord,
  wine: WineWithRelations,
): boolean {
  if ((evidence.vintage ?? null) !== (wine.vintage ?? null)) return false;
  const region = wine.region?.name ?? null;
  const familyKey = wineFamilyKey({
    name: wine.name,
    producer: wine.winery?.name ?? "",
    range: null,
    color: wine.type,
    sweetness: wine.sweetness,
  });

  switch (evidence.scope) {
    case "wine":
      return (
        (evidence.wineId != null && evidence.wineId === wine.id) ||
        (evidence.familyKey != null && evidence.familyKey === familyKey)
      );
    case "winery":
      return evidence.wineryId != null && evidence.wineryId === wine.wineryId;
    case "appellation":
      return Boolean(region && evidence.region && normalizeIdentityText(evidence.region) === normalizeIdentityText(region));
    case "grape_region": {
      const grape = wine.grapeVarieties?.[0]?.name ?? "";
      return (
        Boolean(region && evidence.region && normalizeIdentityText(evidence.region) === normalizeIdentityText(region)) &&
        Boolean(grape && evidence.grape && normalizeIdentityText(evidence.grape) === normalizeIdentityText(grape))
      );
    }
    case "region":
      return Boolean(region && evidence.region && normalizeIdentityText(evidence.region) === normalizeIdentityText(region));
  }
}

export function selectVintageEvidence(
  wine: WineWithRelations,
  evidence: VintageEvidenceRecord[],
): VintageEvidenceRecord[] {
  const scopes: VintageEvidenceRecord["scope"][] = [
    "wine",
    "winery",
    "appellation",
    "grape_region",
    "region",
  ];
  for (const scope of scopes) {
    const scoped = evidence.filter(
      (item) => item.scope === scope && matchesScope(item, wine),
    );
    if (scoped.length >= 2) return scoped;
  }
  return evidence.filter((item) => matchesScope(item, wine));
}

function sourceFor(evidence: VintageEvidenceRecord): VintageSource {
  return {
    url: evidence.sourceUrl,
    title: evidence.sourceTitle,
    publisher: evidence.publisher,
    publishedAt: evidence.publishedAt,
    producerClaim: evidence.producerClaim,
    independent: evidence.independent,
    confidence: evidence.confidence,
  };
}

function maturityFromEvidence(evidence: VintageEvidenceRecord[]): {
  status: MaturityStatus;
  text: string | null;
} {
  const values = evidence
    .filter((item) => item.evidenceType === "maturity_guidance" && item.maturity)
    .map((item) => ({ maturity: item.maturity!, text: item.excerpt }));
  if (values.length === 0) return { status: "insufficient", text: null };
  const unique = [...new Set(values.map((item) => item.maturity))];
  if (unique.length > 1) return { status: "insufficient", text: null };
  return { status: unique[0]!, text: values[0]!.text };
}

export function assessVintage(input: {
  wine: WineWithRelations;
  evidence: VintageEvidenceRecord[];
}): VintageAssessment {
  const selected = selectVintageEvidence(input.wine, input.evidence);
  const sources = [...new Map(selected.map((item) => [item.sourceUrl, sourceFor(item)])).values()];
  const independentSourceCount = sources.filter((source) => source.independent).length;
  const producerSourceCount = sources.filter((source) => source.producerClaim).length;
  const positives = selected.filter((item) => item.impact === "positive");
  const negatives = selected.filter((item) => item.impact === "negative");
  const mixed = selected.filter((item) => item.impact === "mixed");
  const maturity = maturityFromEvidence(selected);

  let classification: VintageClassification = "insufficient";
  const enoughEvidence =
    selected.length >= 2 &&
    sources.length >= 2 &&
    independentSourceCount >= 1 &&
    selected.some((item) =>
      ["official_report", "critic_review", "producer_note", "harvest_timing_weather", "sugar_acidity", "phenolic_ripeness"].includes(item.evidenceType),
    );

  if (enoughEvidence) {
    if (positives.length > 0 && (negatives.length > 0 || mixed.length > 0)) {
      classification = "mixed";
    } else if (negatives.length >= 2 && positives.length === 0) {
      classification = "difficult";
    } else if (positives.length >= 2 && negatives.length === 0) {
      const exceptional =
        independentSourceCount >= 3 &&
        selected.some((item) => item.evidenceType === "official_report") &&
        selected.some((item) => item.evidenceType === "harvest_timing_weather");
      classification = exceptional ? "exceptional" : "favorable";
    } else if (positives.length === 1 && negatives.length === 0) {
      classification = "mixed";
    } else {
      classification = "mixed";
    }
  }

  const confidence =
    selected.length === 0
      ? 0
      : Math.round(
          (selected.reduce((sum, item) => sum + item.confidence, 0) / selected.length) *
            Math.min(1, 0.5 + independentSourceCount * 0.15) *
            100,
        ) / 100;

  const reasons = selected
    .filter((item) => item.impact !== "neutral")
    .sort(
      (left, right) =>
        EVIDENCE_ORDER.indexOf(left.evidenceType) -
        EVIDENCE_ORDER.indexOf(right.evidenceType),
    )
    .map((item) => item.excerpt);
  const strengths = positives.map((item) => item.excerpt);
  const weaknesses = negatives.map((item) => item.excerpt);
  const regionalExceptions = selected
    .filter((item) => item.regionalException)
    .map((item) => item.excerpt);
  const timeline = selected
    .slice()
    .sort(
      (left, right) =>
        EVIDENCE_ORDER.indexOf(left.evidenceType) -
        EVIDENCE_ORDER.indexOf(right.evidenceType),
    )
    .map((item) => ({
      label: item.evidenceType,
      evidenceType: item.evidenceType,
      impact: item.impact,
      excerpt: item.excerpt,
      eventDate: item.eventDate ?? null,
    }));

  const grape = input.wine.grapeVarieties?.[0]?.name ?? null;
  const grapeEvidence = selected.find((item) => item.scope === "grape_region");
  const grapeSuitability =
    grape && grapeEvidence ? `${grape}: ${grapeEvidence.excerpt}` : null;

  const unknown: string[] = [];
  if (selected.length === 0) unknown.push("No matching vintage evidence.");
  else if (independentSourceCount === 0) unknown.push("No independent source.");
  if (!selected.some((item) => ["harvest_timing_weather", "sugar_acidity", "phenolic_ripeness"].includes(item.evidenceType))) {
    unknown.push("Harvest and ripeness evidence is incomplete.");
  }
  if (maturity.status === "insufficient") unknown.push("Drinking-window evidence is insufficient.");

  return {
    classification,
    confidence,
    reasons,
    strengths,
    weaknesses,
    regionalExceptions,
    sources,
    evidenceCount: selected.length,
    independentSourceCount,
    producerSourceCount,
    grapeSuitability,
    maturity: maturity.status,
    maturityText: maturity.text,
    timeline,
    summaryFacts: selected
      .filter((item) => item.independent)
      .slice(0, 3)
      .map((item) => item.excerpt),
    interpretation: [],
    unknowns: unknown,
  };
}

export function compareVintageAssessments(
  releases: Array<{ wine: WineWithRelations; assessment: VintageAssessment }>,
): Array<{
  left: { wine: WineWithRelations; assessment: VintageAssessment };
  right: { wine: WineWithRelations; assessment: VintageAssessment };
  differences: string[];
}> {
  const comparisons = [];
  for (let index = 0; index < releases.length; index += 1) {
    for (let other = index + 1; other < releases.length; other += 1) {
      const left = releases[index]!;
      const right = releases[other]!;
      if (left.wine.vintage === right.wine.vintage) continue;
      const leftVolume = bottleSizeMlFromName(left.wine.name);
      const rightVolume = bottleSizeMlFromName(right.wine.name);
      const differences: string[] = [];
      if (leftVolume !== rightVolume) differences.push("bottle_format");
      const leftGrapes = (left.wine.grapeVarieties ?? []).map((g) => g.name).sort().join("|");
      const rightGrapes = (right.wine.grapeVarieties ?? []).map((g) => g.name).sort().join("|");
      if (leftGrapes !== rightGrapes) differences.push("blend");
      if (left.wine.sweetness !== right.wine.sweetness) differences.push("sweetness");
      comparisons.push({ left, right, differences });
    }
  }
  return comparisons;
}
