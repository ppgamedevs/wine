import { discoverWineSources } from "@/lib/intelligence/source-discovery";
import type { SourceFixture } from "@/lib/intelligence/types";
import type { QualityWine } from "@/lib/quality/types";
import type { SourceAttemptCache, SourceGap } from "@/lib/quality/source-gaps";

export interface QualitySourceOpportunity {
  url: string;
  classification: string;
  availability: string;
  fields: string[];
  discoveredFrom: string;
}

/**
 * Reuses V2 source discovery but ranks opportunities by information gain for
 * the missing fields. No source is retried while its attempt cache says blocked
 * or cooling down.
 */
export function discoverSourcesForGaps(input: {
  wine: QualityWine;
  gaps: SourceGap[];
  fixtures: SourceFixture[];
  attempted?: SourceAttemptCache;
  now?: Date;
}): QualitySourceOpportunity[] {
  const sources = discoverWineSources({
    wine: {
      id: input.wine.id,
      slug: input.wine.slug,
      name: input.wine.name,
      producer: input.wine.producer ?? "",
      range: null,
      vintage: input.wine.vintage,
      color: input.wine.type,
      sweetness: input.wine.sweetness,
      grapeVarieties: input.wine.grapeVarieties,
      bottleSizeMl: input.wine.volumeMl,
      sourceUrl: input.wine.sourceUrl,
      producerPageUrl: input.wine.producerPageUrl,
      region: input.wine.region,
      country: null,
    },
    fixtures: input.fixtures,
  });
  const opportunities: QualitySourceOpportunity[] = [];
  for (const source of sources) {
    const fields = input.gaps
      .filter((gap) => gap.preferredSources.includes(source.classification))
      .map((gap) => gap.field);
    if (fields.length === 0) continue;
    if (
      input.attempted &&
      !fields.every((field) => input.attempted!.shouldAttempt(source.url, field, input.now))
    ) {
      continue;
    }
    opportunities.push({
      url: source.url,
      classification: source.classification,
      availability: source.availability,
      fields,
      discoveredFrom: source.discoveredFrom,
    });
  }
  return opportunities.sort(
    (left, right) =>
      right.fields.length - left.fields.length ||
      left.url.localeCompare(right.url),
  );
}
