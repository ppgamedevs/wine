/**
 * Pairing curation draft generator. DRY RUN by default.
 * Never writes approved foodPairings.
 *
 *   npm run pairing-curation:generate
 *   npm run pairing-curation:generate -- --limit=30 --coverage-priority
 *   npm run pairing-curation:generate -- --wine=slug
 */
import "../lib/load-env";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { wines } from "../lib/schema";
import { normalizeWineRows } from "../lib/normalize-wine";
import { buildCurationCard } from "../lib/pairing-curation-cards";
import { selectBalancedCurationBatch } from "../lib/pairing-curation";
import { calculateFoodVersatility } from "../lib/scoring-v2/food-versatility";
import { foodVersatilityInputFromWine } from "../lib/scoring-v2/wine-score-inputs";
import { rankWinesForOccasion, type OccasionId } from "../lib/recommendation/occasion-match";
import { assessFoodEvidence } from "../lib/food-evidence";
import { getSecondaryScoringMode } from "../lib/scoring-v2/secondary-scoring-mode";
import type { WineWithRelations } from "../types";

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function culinarySupported(wine: WineWithRelations): boolean {
  const assessment = assessFoodEvidence({
    curatedDishes: wine.foodPairings.map((pairing) => pairing.dish),
    producerCulinary: wine.producerContent?.culinaryPairings,
    type: wine.type,
    sweetness: wine.sweetness,
  });
  return (
    assessment.curatedCategories.length > 0 ||
    assessment.producerCategories.length > 0
  );
}

function coverageReport(catalog: WineWithRelations[]) {
  let curated = 0;
  let displayable = 0;
  let styleOnly = 0;
  let supported = 0;
  let recasSupported = 0;
  const byWinery = new Map<string, { wines: number; culinary: number }>();
  for (const wine of catalog) {
    const food = calculateFoodVersatility(foodVersatilityInputFromWine(wine));
    if (wine.foodPairings.length > 0) curated += 1;
    if (food.displayable) displayable += 1;
    if (food.evidenceLevel === "style_only") styleOnly += 1;
    const supportedWine = culinarySupported(wine);
    if (supportedWine) {
      supported += 1;
      if (wine.winery?.slug === "cramele-recas") recasSupported += 1;
    }
    const name = wine.winery?.name ?? "unknown";
    const current = byWinery.get(name) ?? { wines: 0, culinary: 0 };
    current.wines += 1;
    if (supportedWine) current.culinary += 1;
    byWinery.set(name, current);
  }
  return { curated, displayable, styleOnly, supported, recasSupported, byWinery };
}

function topWineryCounts(catalog: WineWithRelations[]) {
  const occasions: OccasionId[] = [
    "oricare",
    "nunta",
    "cadou",
    "cadou-business",
    "cina-romantica",
    "sarmale",
    "gratar",
    "petrecere",
    "sarbatori",
    "pentru-desert",
  ];
  const wanted = [
    "Cramele Recas",
    "Budureasca",
    "Balla Geza",
    "Avincis",
    "Crama Gabai",
    "Murfatlar",
  ];
  const result: Record<string, Record<string, number>> = {};
  for (const occasion of occasions) {
    const counts: Record<string, number> = {};
    for (const name of wanted) counts[name] = 0;
    for (const row of rankWinesForOccasion(catalog, { occasion }).slice(0, 10)) {
      const name = (row.wine as WineWithRelations).winery?.name ?? "";
      if (name in counts) counts[name] += 1;
    }
    result[occasion] = counts;
  }
  return result;
}

async function main() {
  const apply = process.argv.includes("--apply");
  if (apply) {
    console.log("Refusing --apply. This script never writes curated foodPairings.");
    process.exit(1);
  }

  const wineSlug = argValue("wine");
  const limit = Number.parseInt(argValue("limit") ?? "30", 10);
  const rows = await db.query.wines.findMany({
    with: { winery: true, region: true },
    where: eq(wines.status, "verified"),
  });
  const catalog = normalizeWineRows(rows as WineWithRelations[]);
  const batch = wineSlug
    ? catalog.filter((wine) => wine.slug === wineSlug)
    : selectBalancedCurationBatch(catalog, limit);

  console.log("[pairing-curation:generate] DRY RUN");
  console.log("mode", getSecondaryScoringMode());
  console.log("batch", batch.length);

  const dist = new Map<string, number>();
  for (const wine of batch) {
    const name = wine.winery?.name ?? "unknown";
    dist.set(name, (dist.get(name) ?? 0) + 1);
  }
  console.log("\n=== Winery distribution ===");
  for (const [name, count] of [...dist.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`${name}: ${count}`);
  }

  for (const wine of batch) {
    const card = buildCurationCard(wine);
    console.log(`\n--- ${card.name} (${card.winery}) ---`);
    console.log(
      `${card.type} ${card.sweetness ?? ""} ${card.grapes.join(", ")} value=${card.valueScore}`,
    );
    console.log("producer:", card.producerCulinary ? card.producerCulinary.slice(0, 160) : "none");
    console.log("existing foodPairings:", card.existingPairings.length);
    for (const draft of card.drafts) {
      console.log(
        `  * ${draft.dish} [${draft.category}] ${draft.basis.join("+")} ${draft.confidence}`,
      );
      console.log(`    ${draft.rationale}`);
    }
    if (card.warnings.length) console.log("warnings:", card.warnings.join(" | "));
    if (card.impact.evidenceUpliftWarning) {
      console.log("uplift:", card.impact.evidenceUpliftWarning);
    }
    console.log(
      `Food v2 ${card.impact.currentFood.score}/C${card.impact.currentFood.confidence}/${card.impact.currentFood.level} -> ${card.impact.predictedFood.score}/C${card.impact.predictedFood.confidence}/${card.impact.predictedFood.level} (${card.impact.predictedFood.provenance})`,
    );
    console.log(
      "occasions",
      card.impact.occasions
        .map((row) => `${row.occasion} ${row.before}->${row.after}`)
        .join("; "),
    );
  }

  const simulated = catalog.map((wine) => {
    const inBatch = batch.some((item) => item.slug === wine.slug);
    if (!inBatch) return wine;
    const card = buildCurationCard(wine);
    return {
      ...wine,
      foodPairings: [
        ...wine.foodPairings,
        ...card.drafts.map((draft) => ({
          dish: draft.dish,
          note: draft.rationale,
          category: draft.category,
          source: "vinintel_curated" as const,
          basis: draft.basis,
          strength: draft.strength,
        })),
      ],
    };
  });

  const before = coverageReport(catalog);
  const after = coverageReport(simulated);
  console.log("\n=== Simulation BEFORE vs AFTER ===");
  console.log("curated", before.curated, "->", after.curated);
  console.log("displayable", before.displayable, "->", after.displayable);
  console.log("styleOnly", before.styleOnly, "->", after.styleOnly);
  console.log(
    "Recas share",
    before.supported ? ((before.recasSupported / before.supported) * 100).toFixed(1) : "n/a",
    "->",
    after.supported ? ((after.recasSupported / after.supported) * 100).toFixed(1) : "n/a",
  );
  console.log("\n=== Winery culinary AFTER sim ===");
  for (const [name, row] of [...after.byWinery.entries()].sort((a, b) => b[1].wines - a[1].wines)) {
    console.log(`${name}: ${row.culinary}/${row.wines}`);
  }

  const beforeRanks = topWineryCounts(catalog);
  const afterRanks = topWineryCounts(simulated);
  console.log("\n=== Occasion top-10 winery counts ===");
  for (const occasion of Object.keys(beforeRanks)) {
    console.log(occasion, "BEFORE", beforeRanks[occasion], "AFTER", afterRanks[occasion]);
  }
}

main().catch((error) => {
  console.error("[pairing-curation:generate] fatal:", error);
  process.exit(1);
});
