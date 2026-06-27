import "server-only";
import {
  buildQueryText,
  embedText,
  filterWinesByRules,
  loadWinesByIds,
  searchSimilarWines,
} from "@/lib/embeddings";
import { getWinesForSommelier } from "@/lib/queries";
import {
  recommendWines,
  type SommelierInput,
} from "@/lib/sommelier";
import type { WineWithRelations } from "@/types";

/**
 * Hybrid RAG retrieval: vector similarity (Turso) + rule-based re-ranking.
 * Falls back to pure rule-based scoring when embeddings unavailable.
 */
export async function hybridRetrieve(
  input: SommelierInput,
  limit = 8,
): Promise<WineWithRelations[]> {
  const filters = {
    budgetMin: input.budgetMin,
    budgetMax: input.budgetMax,
    color: input.color,
    sweetness: input.sweetness,
    preferredWinerySlugs: input.preferredWinerySlugs,
    limit: limit + 4,
  };

  let candidates: WineWithRelations[] = [];

  try {
    const queryText = buildQueryText({
      occasion: input.occasion,
      color: input.color,
      sweetness: input.sweetness,
      budgetMin: input.budgetMin,
      budgetMax: input.budgetMax,
      preferredWinerySlugs: input.preferredWinerySlugs,
    });

    const queryEmbedding = await embedText(queryText);
    const vectorHits = await searchSimilarWines(queryEmbedding, filters);

    if (vectorHits.length > 0) {
      const ids = vectorHits.map((h) => h.wineId);
      candidates = await loadWinesByIds(ids);
    }
  } catch (error) {
    console.warn("Vector retrieval unavailable, using rule fallback", error);
  }

  if (candidates.length === 0) {
    candidates = await filterWinesByRules(filters);
  }

  if (candidates.length === 0) {
    const all = await getWinesForSommelier();
    const ruleRanked = recommendWines(all, input, limit);
    return ruleRanked.map((r) => r.wine);
  }

  const ruleRanked = recommendWines(candidates, input, limit);
  if (ruleRanked.length >= 3) {
    return ruleRanked.map((r) => r.wine);
  }

  const all = await getWinesForSommelier();
  const merged = new Map<string, WineWithRelations>();
  for (const w of [...ruleRanked.map((r) => r.wine), ...all]) {
    merged.set(w.slug, w);
  }
  return recommendWines([...merged.values()], input, limit).map((r) => r.wine);
}
