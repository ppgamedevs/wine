import { isQualifyingProfitshareUrl } from "@/lib/retailer-links";
import type {
  CatalogQualityReport,
  CatalogQualitySummary,
  QualityAssessment,
  QualityCategory,
  QualityCategoryResult,
  QualityGate,
  QualityGateCode,
  QualityGateSeverity,
  QualityStatus,
  QualityWine,
} from "@/lib/quality/types";
import { CATEGORY_FIELDS } from "@/lib/quality/types";

function norm(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

function parseYears(value: string): number[] {
  return [...value.matchAll(/\b(19\d{2}|20[0-2]\d)\b/g)].map((match) =>
    Number.parseInt(match[0], 10),
  );
}

function extractCoreIdentity(wine: QualityWine): string {
  const core = norm(wine.name)
    .replace(/\b0\s*75\s*l\b|\b750\s*ml\b|\b1\s*5\s*l\b|\b1500\s*ml\b/g, " ")
    .replace(/\b(19\d{2}|20[0-2]\d)\b/g, " ")
    .replace(/\b(demisec|demidulce|dulce|sec)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const channelText = norm(`${wine.slug} ${wine.name}`);
  const channel =
    ["stonewines", "kolna", "editie limitata", "magnum", "reserve", "classic"].find(
      (token) => channelText.includes(token),
    ) ?? "";
  return [
    norm(wine.producer ?? ""),
    core,
    [...wine.grapeVarieties].map(norm).sort().join("+"),
    norm(wine.sweetness ?? ""),
    channel,
    // Volume is intentionally excluded so different bottle sizes of the same
    // product surface as a reviewable duplicate/merge conflict.
    wine.vintage ?? "",
  ].join("|");
}

function gate(
  code: QualityGateCode,
  severity: QualityGateSeverity,
  message: string,
  repairAction: string,
  blocking = severity === "critical" || severity === "high",
): QualityGate {
  return { code, severity, message, repairAction, blocking };
}

function categoryResult(
  category: QualityCategory,
  presentFields: string[],
  applicableFields: string[],
): QualityCategoryResult {
  const present = applicableFields.filter((field) => presentFields.includes(field));
  return {
    category,
    applicable: applicableFields.length,
    present: present.length,
    percent:
      applicableFields.length === 0
        ? 100
        : Math.round((present.length / applicableFields.length) * 100),
    missing: applicableFields.filter((field) => !presentFields.includes(field)),
    presentFields: present,
  };
}

function hasAnyTechnical(wine: QualityWine): boolean {
  return (
    wine.alcohol != null ||
    wine.sugar != null ||
    wine.acidity != null ||
    wine.volumeMl != null ||
    hasText(wine.tastingNotes) ||
    Boolean(wine.producerPageUrl || wine.tastingSheetUrl || wine.sourceUrl)
  );
}

function hasSensoryEvidence(wine: QualityWine): boolean {
  const text = `${wine.tastingNotes ?? ""} ${wine.descriptionEditorial ?? ""}`;
  return /culoare|miros|aroma|gust|corpolen|aciditate|tanin|final/i.test(text);
}

function detectGenericClaims(wine: QualityWine): boolean {
  const text = `${wine.tastingNotes ?? ""} ${wine.descriptionEditorial ?? ""}`;
  return /\b(in general|de regula|de obicei|tipic pentru|vinurile (albe|rosii|roze|spumante))\b/i.test(
    text,
  );
}

function detectSweetnessMixing(wine: QualityWine): boolean {
  const haystack = norm(`${wine.name} ${wine.tastingNotes ?? ""}`);
  const hasDemisec = /\bdemisec\b/.test(haystack);
  const hasDemidulce = /\bdemidulce\b/.test(haystack);
  if (hasDemisec && hasDemidulce) return true;
  if (wine.sweetness === "demisec" && hasDemidulce) return true;
  if (wine.sweetness === "demidulce" && hasDemisec) return true;
  return false;
}

function detectVintageMismatch(wine: QualityWine): boolean {
  const years = parseYears(`${wine.name} ${wine.slug}`);
  if (wine.vintage != null && years.length > 0 && !years.includes(wine.vintage)) {
    return true;
  }
  return false;
}

const KNOWN_GRAPES = [
  "muscat ottonel",
  "riesling italian",
  "sauvignon blanc",
  "cabernet sauvignon",
  "feteasca neagra",
  "feteasca regala",
  "feteasca alba",
  "pinot noir",
  "pinot gris",
  "chardonnay",
  "merlot",
];

function detectIncorrectVariant(wine: QualityWine): boolean {
  const name = norm(wine.name);
  const mentioned = KNOWN_GRAPES.filter((grape) => name.includes(grape));
  if (mentioned.length === 0 || wine.grapeVarieties.length === 0) return false;
  const stored = wine.grapeVarieties.map(norm);
  return mentioned.some(
    (grape) => !stored.some((item) => item.includes(grape) || grape.includes(item)),
  );
}

function detectAlcoholConflict(wine: QualityWine): boolean {
  const observed = [
    ...(wine.tastingNotes ?? "").matchAll(/(\d+(?:[.,]\d+)?)\s*%\s*(?:vol|alcool)/gi),
  ].map((match) => Number.parseFloat((match[1] ?? "").replace(",", ".")));
  const unique = [...new Set(observed.filter((value) => Number.isFinite(value)))];
  if (unique.length > 1) return true;
  if (wine.alcohol != null && unique.length === 1 && Math.abs(wine.alcohol - unique[0]!) > 0.1) {
    return true;
  }
  return false;
}

function imageConflicts(wine: QualityWine): boolean {
  if (!wine.imageUrl) return false;
  const image = norm(wine.imageUrl);
  const color = norm(wine.type);
  if (
    (color.includes("white") || color.includes("alb")) &&
    /\b(rosu|red)\b/.test(image)
  ) {
    return true;
  }
  if (
    (color.includes("red") || color.includes("rosu")) &&
    /\b(alb|white)\b/.test(image)
  ) {
    return true;
  }
  if (wine.sweetness === "demisec" && image.includes("demidulce")) return true;
  if (wine.sweetness === "demidulce" && /\bdemisec\b/.test(image)) return true;
  return false;
}

function assessCategories(wine: QualityWine): QualityCategoryResult[] {
  const notes = `${wine.tastingNotes ?? ""} ${wine.descriptionEditorial ?? ""}`;
  const identityApplicable = ["name", "producer", "type", "sweetness", "grape_varieties"];
  if (
    wine.vintage != null ||
    parseYears(`${wine.name} ${wine.slug}`).length > 0
  ) {
    identityApplicable.push("vintage");
  }
  const identityPresent = [
    hasText(wine.name) ? "name" : null,
    hasText(wine.producer) ? "producer" : null,
    hasText(wine.type) ? "type" : null,
    hasText(wine.sweetness) ? "sweetness" : null,
    wine.vintage != null ? "vintage" : null,
    wine.grapeVarieties.length > 0 ? "grape_varieties" : null,
  ].filter((field): field is string => Boolean(field));

  const technicalApplicable = ["alcohol", "sugar", "acidity", "bottle_volume"];
  const technicalPresent = [
    wine.alcohol != null ? "alcohol" : null,
    wine.sugar != null ? "sugar" : null,
    wine.acidity != null ? "acidity" : null,
    wine.volumeMl != null ? "bottle_volume" : null,
  ].filter((field): field is string => Boolean(field));

  const sensoryApplicable = ["tasting_notes"];
  const sensoryPresent: string[] = [];
  if (hasText(notes)) sensoryPresent.push("tasting_notes");
  for (const [field, pattern] of [
    ["visual", /culoare/i],
    ["aroma", /miros|aroma/i],
    ["taste", /gust/i],
    ["body", /corpolen/i],
    ["acidity_perception", /aciditate/i],
    ["tannin", /tanin/i],
    ["finish", /final/i],
  ] as const) {
    if (pattern.test(notes)) {
      sensoryApplicable.push(field);
      if (pattern.test(notes)) sensoryPresent.push(field);
    }
  }

  // Only require serving temperature when the source notes explicitly contain
  // it. Otherwise it is a source-gap, not a factual defect of the record.
  const servingApplicable: string[] = [];
  const servingPresent: string[] = [];
  if (/temperatura\s+(?:de\s+)?servire/i.test(notes)) {
    servingApplicable.push("serving_temperature");
    if (wine.servingTemperature) servingPresent.push("serving_temperature");
  }

  const foodApplicable =
    wine.foodPairings.length > 0 || /asocierea culinar/i.test(notes)
      ? ["food_pairing"]
      : [];
  const foodPresent =
    wine.foodPairings.length > 0 || /asocierea culinar/i.test(notes)
      ? ["food_pairing"]
      : [];

  const producerApplicable = ["producer_source"];
  const producerPresent = [
    wine.producerPageUrl || wine.sourceUrl || wine.tastingSheetUrl
      ? "producer_source"
      : null,
  ].filter((field): field is string => Boolean(field));

  const contextApplicable = ["grape_varieties", "region"];
  const contextPresent = [
    wine.grapeVarieties.length > 0 ? "grape_varieties" : null,
    wine.region ? "region" : null,
  ].filter((field): field is string => Boolean(field));

  const evidenceApplicable = ["source_url"];
  const evidencePresent = [
    wine.sourceUrl || wine.producerPageUrl || wine.tastingSheetUrl
      ? "source_url"
      : null,
    wine.evidenceFields.length > 0 ? "evidence_fields" : null,
  ].filter((field): field is string => Boolean(field));
  if (wine.evidenceFields.length > 0) evidenceApplicable.push("evidence_fields");

  return [
    categoryResult("identity", identityPresent, identityApplicable),
    categoryResult(
      "technical",
      technicalPresent,
      hasAnyTechnical(wine) ? technicalApplicable : [],
    ),
    categoryResult(
      "sensory",
      [...new Set(sensoryPresent)],
      sensoryApplicable,
    ),
    categoryResult("serving", servingPresent, servingApplicable),
    categoryResult("food", foodPresent, foodApplicable),
    categoryResult("producer", producerPresent, producerApplicable),
    categoryResult("context", contextPresent, contextApplicable),
    categoryResult("evidence", evidencePresent, evidenceApplicable),
  ];
}

function statusFor(score: number): QualityStatus {
  if (score >= 85) return "complete";
  if (score >= 50) return "partial";
  return "incomplete";
}

function repairForGate(gate: QualityGate): QualityAssessment["repairQueue"][number] {
  return {
    priority:
      gate.severity === "critical" ? "P0" : gate.severity === "high" ? "P1" : "P2",
    action: gate.repairAction,
    fields: [gate.code],
  };
}

function commercialFor(wine: QualityWine): QualityAssessment["commercial"] {
  // priceAvg/priceHistory are internal research data. Only a current public
  // price can create a public exposure risk without a qualified offer.
  const hasPrice = (wine.currentPrice ?? 0) > 0;
  if (wine.hasQualifiedProfitshareOffer) {
    return {
      hasQualifiedProfitshareOffer: true,
      priceCoverage: "affiliate",
      note: "Qualifying Profitshare offer available.",
    };
  }
  if (hasPrice) {
    const hasProfitshareLink = wine.affiliateLinks.some(
      (link) =>
        typeof link.url === "string" && isQualifyingProfitshareUrl(link.url),
    );
    return {
      hasQualifiedProfitshareOffer: false,
      priceCoverage: hasProfitshareLink
        ? "unqualified_affiliate"
        : "non_affiliate_only",
      note: hasProfitshareLink
        ? "A public price exists without a fresh, fully qualified Profitshare offer."
        : "A public price exists without a Profitshare offer; public price must remain unavailable.",
    };
  }
  return {
    hasQualifiedProfitshareOffer: false,
    priceCoverage: "unavailable",
    note: "No public price. This is not a factual quality defect.",
  };
}

function sourceGapsFor(
  categories: QualityCategoryResult[],
): QualityAssessment["sourceGaps"] {
  const gaps: QualityAssessment["sourceGaps"] = [];
  const mapping: Record<string, string[]> = {
    alcohol: ["official_technical_sheet", "official_producer_page"],
    sugar: ["official_technical_sheet"],
    acidity: ["official_technical_sheet"],
    bottle_volume: ["official_producer_page", "retailer"],
    tasting_notes: ["official_producer_page", "retailer"],
    aroma: ["official_producer_page"],
    taste: ["official_producer_page"],
    visual: ["official_producer_page"],
    serving_temperature: ["official_producer_page", "official_technical_sheet"],
    food_pairing: ["official_producer_page", "specialist"],
    producer_source: ["official_producer_page", "official_catalog"],
    source_url: ["official_producer_page", "official_technical_sheet"],
    region: ["official_catalog", "specialist"],
  };
  for (const category of categories) {
    for (const field of category.missing) {
      gaps.push({
        field,
        preferredSources: mapping[field] ?? ["official_producer_page"],
        reason: `Missing ${field}; prefer information gain from an official or independent relevant source.`,
      });
    }
  }
  return gaps;
}

export function assessWineQuality(wine: QualityWine): QualityAssessment {
  const categories = assessCategories(wine);
  const notes = `${wine.tastingNotes ?? ""} ${wine.descriptionEditorial ?? ""}`;
  const applicable = categories.reduce((sum, category) => sum + category.applicable, 0);
  const present = categories.reduce((sum, category) => sum + category.present, 0);
  const factualScore = applicable === 0 ? 0 : Math.round((present / applicable) * 100);
  const status = statusFor(factualScore);
  const gates: QualityGate[] = [];

  if (detectIncorrectVariant(wine)) {
    gates.push(
      gate(
        "INCORRECT_VARIANT",
        "critical",
        "The product name names a grape that is not present in the stored grape variety set.",
        "Resolve the exact variant from its bounded producer block; do not force a partial match.",
      ),
    );
  }
  if (detectSweetnessMixing(wine)) {
    gates.push(
      gate(
        "SWEETNESS_MIXING",
        "critical",
        "Name/notes contain both Demisec and Demidulce, or contradict the sweetness field.",
        "Resolve the exact variant and re-extract only its bounded source block.",
      ),
    );
  }
  if (detectVintageMismatch(wine)) {
    gates.push(
      gate(
        "VINTAGE_MISMATCH",
        "high",
        "Name/slug vintage differs from the stored vintage field.",
        "Confirm the product vintage and preserve exact-vintage evidence.",
      ),
    );
  }
  if (detectAlcoholConflict(wine)) {
    gates.push(
      gate(
        "ALCOHOL_CONFLICT",
        "high",
        "Stored alcohol or source text contains contradictory alcohol values.",
        "Attach source provenance and open a human conflict review; do not auto-overwrite.",
      ),
    );
  }
  if (wine.tastingNotes && !wine.sourceUrl && !wine.producerPageUrl && !wine.tastingSheetUrl) {
    gates.push(
      gate(
        "UNATTRIBUTED_TASTING_CLAIM",
        "high",
        "Sensory notes exist without a source URL or evidence record.",
        "Attach the original producer/retailer source and excerpt.",
      ),
    );
  }
  if (detectGenericClaims(wine)) {
    gates.push(
      gate(
        "GENERIC_AI_FACT",
        "medium",
        "Generic/AI-style prose is presented in a wine-specific sensory field.",
        "Keep generic interpretation separate from source-backed bottle notes.",
      ),
    );
  }
  if (
    /temperatura\s+(?:de\s+)?servire/i.test(
      `${wine.tastingNotes ?? ""} ${wine.descriptionEditorial ?? ""}`,
    ) &&
    !wine.servingTemperature
  ) {
    gates.push(
      gate(
        "MISSING_PUBLIC_SERVING_TEMP",
        "medium",
        "Serving temperature is present in the source text but not in the public structured field.",
        "Populate the structured serving temperature from the existing excerpt.",
      ),
    );
  }
  if (
    (wine.tastingNotes || wine.foodPairings.length > 0) &&
    !wine.descriptionEditorial
  ) {
    gates.push(
      gate(
        "INCOMPLETE_PUBLIC_RENDERING",
        "medium",
        "Stored sensory/food data is not reflected in a public attributed description.",
        "Render the stored facts with attribution; do not hide available data.",
      ),
    );
  }
  if (
    /asocierea culinar/i.test(notes) &&
    wine.foodPairings.length === 0
  ) {
    gates.push(
      gate(
        "INCOMPLETE_PUBLIC_RENDERING",
        "medium",
        "Food pairing exists in source text but is not represented in the structured food field.",
        "Structure the existing food-pairing excerpt; do not invent new pairings.",
      ),
    );
  }
  if (imageConflicts(wine)) {
    gates.push(
      gate(
        "WRONG_BOTTLE_PHOTO",
        "high",
        "The bottle image URL appears to describe a different colour/sweetness variant.",
        "Replace with the exact-product image or remove the image.",
      ),
    );
  }
  if (
    (wine.currentPrice ?? 0) > 0 &&
    !wine.hasQualifiedProfitshareOffer
  ) {
    const hasProfitshareLink = wine.affiliateLinks.some(
      (link) =>
        typeof link.url === "string" && isQualifyingProfitshareUrl(link.url),
    );
    gates.push(
      gate(
        "NON_PROFITSHARE_PRICE_EXPOSURE",
        "critical",
        hasProfitshareLink
          ? "A public price exists without a fresh, fully qualified Profitshare offer."
          : "A public price exists without a Profitshare offer.",
        "Ensure the public resolver returns Price unavailable; never expose a non-qualifying price.",
      ),
    );
  }

  const repairQueue = gates.map(repairForGate);
  for (const gap of sourceGapsFor(categories)) {
    repairQueue.push({
      priority: gap.field === "alcohol" || gap.field === "source_url" ? "P1" : "P2",
      action: `Find ${gap.field} in ${gap.preferredSources.join(", ")}`,
      fields: [gap.field],
    });
  }

  return {
    wine,
    status,
    factualScore,
    categories,
    gates,
    repairQueue,
    commercial: commercialFor(wine),
    sourceGaps: sourceGapsFor(categories),
  };
}

export function runCatalogQualityAudit(
  wines: QualityWine[],
  options: { now?: Date; recentDays?: number } = {},
): CatalogQualityReport {
  const now = options.now ?? new Date();
  const recentDays = options.recentDays ?? 30;
  const assessments = wines.map(assessWineQuality);
  const duplicateMap = new Map<string, QualityWine[]>();
  for (const wine of wines) {
    const key = extractCoreIdentity(wine);
    const group = duplicateMap.get(key) ?? [];
    group.push(wine);
    duplicateMap.set(key, group);
  }
  const duplicateGroups = [...duplicateMap.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([key, group]) => ({
      key,
      wineIds: group.map((wine) => wine.id),
      names: group.map((wine) => wine.name),
    }));

  const gateCounts: Record<string, number> = {};
  for (const assessment of assessments) {
    for (const gate of assessment.gates) {
      gateCounts[gate.code] = (gateCounts[gate.code] ?? 0) + 1;
    }
  }
  for (const group of duplicateGroups) {
    for (const assessment of assessments.filter((item) =>
      group.wineIds.includes(item.wine.id),
    )) {
      if (
        !assessment.gates.some((gate) => gate.code === "DUPLICATE_WINE")
      ) {
        assessment.gates.push(
          gate(
            "DUPLICATE_WINE",
            "high",
            `Potential duplicate group: ${group.names.join(" / ")}.`,
            "Review identity and merge plan; do not destructively merge automatically.",
          ),
        );
        assessment.repairQueue.push({
          priority: "P1",
          action: "Review potential duplicate identity; do not merge automatically",
          fields: ["DUPLICATE_WINE"],
        });
      }
    }
    gateCounts.DUPLICATE_WINE =
      (gateCounts.DUPLICATE_WINE ?? 0) + group.wineIds.length;
  }

  const summary: CatalogQualitySummary = {
    totalWines: wines.length,
    complete: assessments.filter((item) => item.status === "complete").length,
    partial: assessments.filter((item) => item.status === "partial").length,
    incomplete: assessments.filter((item) => item.status === "incomplete").length,
    verifiedTechnicalCoverage: Math.round(
      (wines.filter(
        (wine) =>
          wine.alcohol != null || wine.sugar != null || wine.acidity != null,
      ).length /
        Math.max(1, wines.length)) *
        100,
    ),
    sensoryEvidenceCoverage: Math.round(
      (wines.filter(hasSensoryEvidence).length / Math.max(1, wines.length)) *
        100,
    ),
    identityConflicts: new Set(
      assessments
        .filter((item) =>
          item.gates.some((gate) =>
            ["INCORRECT_VARIANT", "SWEETNESS_MIXING", "VINTAGE_MISMATCH"].includes(
              gate.code,
            ),
          ),
        )
        .map((item) => item.wine.id),
    ).size,
    potentialDuplicates: duplicateGroups.length,
    missingProducerSources: wines.filter(
      (wine) => !wine.producerPageUrl && !wine.sourceUrl && !wine.tastingSheetUrl,
    ).length,
    affiliatePriceCoverage: wines.filter((wine) => wine.hasQualifiedProfitshareOffer)
      .length,
    noAffiliatePrice: wines.filter((wine) => !wine.hasQualifiedProfitshareOffer)
      .length,
    recentlyImproved: wines.filter((wine) => {
      if (!wine.updatedAt) return false;
      const timestamp = Date.parse(wine.updatedAt);
      return (
        Number.isFinite(timestamp) &&
        now.getTime() - timestamp <= recentDays * 24 * 60 * 60 * 1000
      );
    }).length,
    criticalGates: assessments.filter((item) =>
      item.gates.some((gate) => gate.severity === "critical"),
    ).length,
    retryQueue: assessments.filter((item) =>
      item.repairQueue.some((repair) => repair.priority !== "P2"),
    ).length,
    factualCompletenessAverage:
      Math.round(
        (assessments.reduce((sum, item) => sum + item.factualScore, 0) /
          Math.max(1, assessments.length)) *
          10,
      ) / 10,
  };

  const retryQueue = assessments
    .flatMap((assessment) =>
      assessment.repairQueue
        .filter((repair) => repair.priority !== "P2")
        .map((repair) => ({
          wineId: assessment.wine.id,
          slug: assessment.wine.slug,
          priority: repair.priority,
          action: repair.action,
          reason: assessment.gates
            .find((gate) => repair.fields.includes(gate.code))
            ?.message ?? `Missing ${repair.fields.join(", ")}`,
        })),
    )
    .sort((left, right) => left.priority.localeCompare(right.priority));

  return {
    generatedAt: now.toISOString(),
    summary,
    assessments,
    gateCounts,
    duplicateGroups,
    retryQueue,
  };
}

export function categoryPercent(
  assessment: QualityAssessment,
  category: QualityCategory,
): number {
  return assessment.categories.find((item) => item.category === category)?.percent ?? 0;
}

export { CATEGORY_FIELDS };
