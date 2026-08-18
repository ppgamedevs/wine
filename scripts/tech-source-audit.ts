/**
 * Read-only official-source discovery. Never writes.
 *
 *   npm run tech:source-audit -- --winery=budureasca
 */
import "../lib/load-env";
import { classifyPdfDocument, isRejectedTechnicalDocumentUrl } from "../lib/tech-facts/pdf-classify";
import { refuseApply, runReadOnlyCatalogRecovery } from "../lib/tech-facts/run-recovery";
import { extractSourceIdentityFromHtml, extractSourceIdentityFromText } from "../lib/tech-facts/source-identity";

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  if (refuseApply("tech:source-audit")) process.exit(0);
  const winery = argValue("winery");
  const { wines, recoveries, fetched } = await runReadOnlyCatalogRecovery({
    winerySlug: winery,
    wineSlug: argValue("wine"),
    noFetch: process.argv.includes("--no-fetch"),
  });
  const byUrl = new Map(fetched.sources.map((source) => [source.url, source]));
  const rows = wines.map((wine) => {
    const recovery = recoveries.find((item) => item.wineId === wine.id);
    const urls = [wine.tastingSheetUrl, wine.producerPageUrl, ...(wine.producerContent?.sourceUrls ?? [])].filter(
      (url): url is string => Boolean(url),
    );
    const sources = urls.map((url) => {
      const fetchedSource = byUrl.get(url);
      const identity = fetchedSource?.html
        ? extractSourceIdentityFromHtml(fetchedSource.html)
        : fetchedSource
          ? extractSourceIdentityFromText({
              text: fetchedSource.text,
              title: fetchedSource.title,
              filename: url,
            })
          : null;
      const pdfClass = fetchedSource?.isPdf
        ? classifyPdfDocument({ text: fetchedSource.text, url, title: fetchedSource.title })
        : isRejectedTechnicalDocumentUrl(url)
          ? "PRIVACY_POLICY"
          : null;
      const vintageClass = identity?.vintageClass ?? "SOURCE_VINTAGE_MISSING";
      const discovery =
        !identity?.sourceWineName
          ? "NO_SOURCE"
          : recovery?.ballaStatus === "AMBIGUOUS_MATCH"
            ? "AMBIGUOUS"
            : vintageClass === "SOURCE_VINTAGE_EXPLICIT"
              ? "EXACT_VINTAGE"
              : "UNDATED_EXACT_PRODUCT";
      return {
        url,
        rejected: isRejectedTechnicalDocumentUrl(url),
        fetched: Boolean(fetchedSource),
        isPdf: fetchedSource?.isPdf ?? false,
        pdfClass,
        sourceWineName: identity?.sourceWineName ?? null,
        sourceVintage: identity?.sourceVintage ?? null,
        vintageClass,
        discovery,
        discoveredUrls: fetchedSource?.discoveredUrls ?? [],
      };
    });
    return {
      slug: wine.slug,
      name: wine.name,
      vintage: wine.vintage,
      identity: recovery?.sourceIdentity ?? null,
      sources,
    };
  });
  const discoveryTally = { EXACT_VINTAGE: 0, UNDATED_EXACT_PRODUCT: 0, AMBIGUOUS: 0, NO_SOURCE: 0 };
  for (const row of rows) {
    const best = row.sources.find((source) => source.discovery === "EXACT_VINTAGE")
      ?? row.sources.find((source) => source.discovery === "UNDATED_EXACT_PRODUCT")
      ?? row.sources.find((source) => source.discovery === "AMBIGUOUS")
      ?? row.sources[0];
    const key = (best?.discovery ?? "NO_SOURCE") as keyof typeof discoveryTally;
    discoveryTally[key] += 1;
  }
  console.log(
    JSON.stringify(
      {
        winery: winery ?? "all",
        wines: rows.length,
        fetch: fetched.stats,
        discoveryTally,
        rows,
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
