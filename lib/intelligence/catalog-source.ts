import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { wines } from "@/lib/schema";
import { fetchOfficialSources } from "@/lib/tech-facts/fetch-source";
import type {
  SourceCandidate,
  SourceFixture,
  WineIntelligenceInput,
} from "@/lib/intelligence/types";
import type { WineWithRelations } from "@/types";

function parseVolumeMl(name: string, slug: string): number | null {
  const match = `${name} ${slug}`.match(/(\d+(?:[.,]\d+)?)\s*(ml|l)\b/i);
  if (!match?.[1]) return null;
  const amount = Number.parseFloat(match[1].replace(",", "."));
  return Math.round((match[2] ?? "ml").toLowerCase() === "l" ? amount * 1000 : amount);
}

function colorOf(type: string): string | null {
  if (type === "red") return "rosu";
  if (type === "white") return "alb";
  if (type === "rose") return "rose";
  if (type === "sparkling") return "spumant";
  return null;
}

export function intelligenceInputFromCatalogWine(wine: WineWithRelations): WineIntelligenceInput {
  return {
    id: wine.id,
    slug: wine.slug,
    name: wine.name,
    producer: wine.winery?.name ?? "",
    range: null,
    vintage: wine.vintage ?? null,
    color: colorOf(wine.type),
    sweetness: wine.sweetness ?? null,
    grapeVarieties: (wine.grapeVarieties ?? []).map((grape) => grape.name),
    bottleSizeMl: parseVolumeMl(wine.name, wine.slug),
    sourceUrl: wine.sourceUrl ?? null,
    producerPageUrl: wine.producerPageUrl ?? null,
    region: wine.region?.name ?? null,
    country: "Romania",
    currentFacts: {
      ...(wine.winery?.name ? { producer: wine.winery.name } : {}),
      product_name: wine.name,
      ...(wine.grapeVarieties?.length
        ? { grape_varieties: wine.grapeVarieties.map((grape) => grape.name) }
        : {}),
      ...(wine.vintage ? { vintage: wine.vintage } : {}),
      ...(wine.alcohol != null ? { alcohol: wine.alcohol } : {}),
      ...(wine.sugar != null ? { sugar: wine.sugar } : {}),
      ...(wine.acidity != null ? { acidity: wine.acidity } : {}),
      ...(wine.sweetness ? { sweetness: wine.sweetness } : {}),
      ...(wine.region?.name ? { region: wine.region.name } : {}),
    },
  };
}

export function sourceCandidatesFromCatalogWine(
  wine: WineWithRelations,
): SourceCandidate[] {
  const urls = new Map<string, SourceCandidate>();
  const add = (url: string | null | undefined, title: string) => {
    const clean = url?.trim();
    if (!clean || urls.has(clean) || /profitshare\.ro/i.test(clean)) return;
    urls.set(clean, { url: clean, title });
  };

  add(wine.producerPageUrl, `${wine.name} producer page`);
  add(wine.tastingSheetUrl, `${wine.name} technical sheet`);
  add(wine.sourceUrl, `${wine.name} source`);
  for (const url of wine.producerContent?.sourceUrls ?? []) {
    add(url, `${wine.name} producer source`);
  }
  for (const link of wine.affiliateLinks ?? []) {
    if (link.url && !/profitshare\.ro/i.test(link.url)) {
      add(link.url, `${wine.name} retailer source`);
    }
  }
  return [...urls.values()];
}

export async function loadCatalogWineForIntelligence(
  wineId: number,
): Promise<{ wine: WineWithRelations; input: WineIntelligenceInput; candidates: SourceCandidate[] } | null> {
  const wine = await db.query.wines.findFirst({
    where: eq(wines.id, wineId),
    with: { winery: true, region: true },
  });
  if (!wine) return null;
  return {
    wine,
    input: intelligenceInputFromCatalogWine(wine),
    candidates: sourceCandidatesFromCatalogWine(wine),
  };
}

export async function loadLiveSource(source: {
  url: string;
  title: string;
  contentKind: string | null;
  classification?: string;
}): Promise<SourceFixture | null> {
  if (!/^https?:\/\//i.test(source.url)) return null;
  const fetched = await fetchOfficialSources([source.url]);
  const result = fetched.sources[0];
  if (!result) return null;
  const kind = result.isPdf ? "pdf_text" : "html";
  return {
    url: result.finalUrl || source.url,
    title: result.title ?? source.title,
    kind,
    body: result.html ?? result.text,
    observedAt: new Date().toISOString(),
    classification: source.classification as SourceFixture["classification"],
  };
}
