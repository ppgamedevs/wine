import type { IntelligenceReport } from "@/lib/intelligence/types";

/** Evidence JSON should contain claim evidence, not megabytes of raw source HTML. */
export function serializeEvidenceReport(report: IntelligenceReport): IntelligenceReport {
  return {
    ...report,
    sources: report.sources.map((source) => ({
      ...source,
      source: {
        ...source.source,
        fixture: source.source.fixture
          ? {
              ...source.source.fixture,
              body: `[source body omitted from evidence report; ${source.source.fixture.body.length} chars]`,
            }
          : null,
      },
    })),
  };
}
