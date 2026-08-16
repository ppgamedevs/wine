import type { ProducerExtractedFacts, ProducerPageContent } from "@/lib/schema";

function uniqueStrings(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

function mergeFacts(
  current: ProducerExtractedFacts | undefined,
  incoming: ProducerExtractedFacts | undefined,
): ProducerExtractedFacts | undefined {
  if (!current && !incoming) return undefined;
  const merged: ProducerExtractedFacts = { ...current };
  if (!incoming) return merged;

  if (incoming.alcohol != null) merged.alcohol = incoming.alcohol;
  if (incoming.acidity != null) merged.acidity = incoming.acidity;
  if (incoming.sugar != null) merged.sugar = incoming.sugar;
  if (incoming.sweetness) merged.sweetness = incoming.sweetness;
  if (incoming.vintage != null) merged.vintage = incoming.vintage;
  if (incoming.type) merged.type = incoming.type;
  if (incoming.oakAged) merged.oakAged = true;
  if (incoming.oakDurationMonths != null) {
    merged.oakDurationMonths = incoming.oakDurationMonths;
  }
  if (incoming.tanninMentioned) merged.tanninMentioned = true;
  if (incoming.cellarPotentialYears != null) {
    merged.cellarPotentialYears = incoming.cellarPotentialYears;
  }
  if (incoming.drinkabilityStart != null) {
    merged.drinkabilityStart = incoming.drinkabilityStart;
  }
  if (incoming.drinkabilityEnd != null) {
    merged.drinkabilityEnd = incoming.drinkabilityEnd;
  }
  if (incoming.grapes?.length) {
    merged.grapes = uniqueStrings([...(current?.grapes ?? []), ...incoming.grapes]);
  }
  if (incoming.descriptors?.length) {
    merged.descriptors = uniqueStrings([
      ...(current?.descriptors ?? []),
      ...incoming.descriptors,
    ]);
  }
  return merged;
}

function mergeText(current: string | undefined, incoming: string | undefined): string | undefined {
  const left = current?.trim() ?? "";
  const right = incoming?.trim() ?? "";
  if (!left) return right || undefined;
  if (!right) return left;
  if (left.includes(right) || right.includes(left)) {
    return left.length >= right.length ? left : right;
  }
  return `${left}\n${right}`;
}

export function mergeProducerContent(
  current: ProducerPageContent | null | undefined,
  incoming: ProducerPageContent,
): ProducerPageContent {
  return {
    viticulture: mergeText(current?.viticulture, incoming.viticulture),
    tastingNotes: mergeText(current?.tastingNotes, incoming.tastingNotes),
    culinaryPairings: mergeText(current?.culinaryPairings, incoming.culinaryPairings),
    sourceUrls: uniqueStrings([
      ...(current?.sourceUrls ?? []),
      ...(incoming.sourceUrls ?? []),
    ]),
    extractedAt: incoming.extractedAt ?? current?.extractedAt,
    sourceType: incoming.sourceType ?? current?.sourceType,
    extractionMethod: incoming.extractionMethod ?? current?.extractionMethod,
    facts: mergeFacts(current?.facts, incoming.facts),
  };
}

export function mergeTastingNotes(
  current: string | null | undefined,
  incoming: string | null | undefined,
): string | null {
  const merged = mergeText(current ?? undefined, incoming ?? undefined);
  return merged ?? null;
}
