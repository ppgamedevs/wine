import type { WineWithRelations } from "@/types";

/** Label for where factual wine data was sourced. */
export function resolveWineFactualSource(wine: WineWithRelations): string {
  if (wine.winery?.website?.trim()) {
    return "magazinul producătorului";
  }
  return "surse publice";
}
