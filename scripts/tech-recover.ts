/**
 * Read-only technical recovery dry-run.
 *
 *   npm run tech:recover
 *   npm run tech:recover -- --winery=cramele-recas
 *   npm run tech:recover -- --wine=<slug>
 *   npm run tech:recover -- --no-fetch
 */
import "../lib/load-env";
import { getSecondaryScoringMode } from "../lib/scoring-v2/secondary-scoring-mode";
import { buildTechAuditReport } from "../lib/tech-facts/audit";
import { loadVerifiedTechWines } from "../lib/tech-facts/catalog";
import { fetchOfficialSources } from "../lib/tech-facts/fetch-source";
import {
  officialUrlCandidates,
  recoverWineFromStored,
  recoverWineWithSources,
  simulatedSafePatch,
  type WineTechRecovery,
} from "../lib/tech-facts/recover";

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  if (process.argv.includes("--apply")) {
    console.log("Refusing --apply. Prompt 12 recovery is read-only.");
    process.exit(0);
  }
  console.log("SECONDARY_SCORING_MODE", getSecondaryScoringMode());
  console.log("tech:recover dry-run. 0 technical writes. 0 score writes.");

  const wines = await loadVerifiedTechWines({
    winerySlug: argValue("winery"),
    wineSlug: argValue("wine"),
  });
  const noFetch = process.argv.includes("--no-fetch");
  const recoveries: WineTechRecovery[] = [];
  const allUrls = wines.flatMap(officialUrlCandidates);
  const fetched = noFetch
    ? { sources: [], stats: { attempted: 0, ok: 0, failed: 0, redirected: 0, htmlInsteadOfPdf: 0, cached: 0 } }
    : await fetchOfficialSources(allUrls);
  const byUrl = new Map(fetched.sources.map((source) => [source.url, source]));

  for (const wine of wines) {
    const urls = officialUrlCandidates(wine);
    const sources = urls
      .map((url) => byUrl.get(url))
      .filter((source): source is NonNullable<typeof source> => Boolean(source));
    recoveries.push(
      sources.length > 0
        ? await recoverWineWithSources(wine, sources)
        : recoverWineFromStored(wine),
    );
  }

  const audit = buildTechAuditReport(wines, recoveries);
  const byWinery = new Map<string, WineTechRecovery[]>();
  for (const row of recoveries) {
    const key = row.winerySlug ?? "unknown";
    const list = byWinery.get(key) ?? [];
    list.push(row);
    byWinery.set(key, list);
  }

  const fieldSafe = { alcohol: 0, acidity: 0, sugar: 0, sweetness: 0, vintage: 0 };
  const evidenceAttach = { alcohol: 0, acidity: 0, sugar: 0, sweetness: 0, vintage: 0 };
  const conflicts: Array<{ slug: string; field: string; code?: string }> = [];
  const review: Array<{ slug: string; class: string; fields: string[] }> = [];

  for (const row of recoveries) {
    for (const field of row.fields) {
      if (field.safeAutomatic && field.candidate != null) {
        if (field.action === "EVIDENCE_ATTACH") {
          if (field.field in evidenceAttach) {
            evidenceAttach[field.field as keyof typeof evidenceAttach] += 1;
          }
        }
        if (field.action === "VALUE_WRITE" && field.field in fieldSafe) {
          fieldSafe[field.field as keyof typeof fieldSafe] += 1;
        }
      }
      if (
        field.candidateClass === "SOURCE_CONFLICT" ||
        field.storedClass === "OFFICIAL_CONFLICT"
      ) {
        conflicts.push({ slug: row.slug, field: field.field, code: field.conflictCode });
      }
    }
    if (row.wineClass === "HUMAN_REVIEW" || row.wineClass === "SOURCE_CONFLICT") {
      review.push({
        slug: row.slug,
        class: row.wineClass,
        fields: row.fields
          .filter((field) => field.action === "HUMAN_REVIEW")
          .map((field) => field.field),
      });
    }
  }

  const after = {
    alcohol: audit.alcoholPresent + fieldSafe.alcohol,
    acidity: audit.acidityPresent + fieldSafe.acidity,
    sugar: audit.sugarPresent + fieldSafe.sugar,
    sweetness: audit.sweetnessPresent + fieldSafe.sweetness,
  };

  console.log(
    JSON.stringify(
      {
        wines: wines.length,
        fetch: fetched.stats,
        baseline: audit,
        byWinery: [...byWinery.entries()].map(([winery, rows]) => ({
          winery,
          wines: rows.length,
          classes: rows.reduce<Record<string, number>>((acc, row) => {
            acc[row.wineClass] = (acc[row.wineClass] ?? 0) + 1;
            return acc;
          }, {}),
          safePatches: rows.filter((row) => Object.keys(simulatedSafePatch(row)).length > 0).length,
          invalidPdfs: rows.filter(
            (row) =>
              row.pdfClass &&
              row.pdfClass !== "WINE_TASTING_SHEET" &&
              row.pdfClass !== "WINE_TECHNICAL_SHEET",
          ).length,
        })),
        safeAutomaticValueWrites: fieldSafe,
        evidenceAttachOnly: evidenceAttach,
        simulatedCoverageAfterSafeApply: after,
        officialConflicts: conflicts,
        humanReviewTop30: review.slice(0, 30),
        productionWrites: {
          technical: 0,
          value: 0,
          gift: 0,
          food: 0,
          pairing: 0,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
