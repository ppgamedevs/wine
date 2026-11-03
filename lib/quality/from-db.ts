import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { isQualifyingProfitshareUrl } from "@/lib/retailer-links";
import type { QualityWine } from "@/lib/quality/types";

interface RawRow {
  [key: string]: unknown;
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value.trim()) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseVolume(name: string): number | null {
  const match = name.match(/(\d+(?:[.,]\d+)?)\s*(ml|l)\b/i);
  if (!match?.[1]) return null;
  const amount = Number.parseFloat(match[1].replace(",", "."));
  return Math.round((match[2] ?? "ml").toLowerCase() === "l" ? amount * 1000 : amount);
}

function parseServingTemperature(notes: string | null): string | null {
  const match = notes?.match(
    /temperatura\s+(?:de\s+)?servire\s*:?\s*(\d{1,2})\s*[-–]\s*(\d{1,2})\s*°?c/i,
  );
  return match?.[1] && match?.[2] ? `${match[1]}-${match[2]}` : null;
}

function isFresh(checkedAt: string | undefined): boolean {
  if (!checkedAt) return false;
  const timestamp = Date.parse(checkedAt);
  if (!Number.isFinite(timestamp)) return false;
  return Date.now() - timestamp <= 48 * 60 * 60 * 1000;
}

function hasQualifiedOffer(links: QualityWine["affiliateLinks"]): boolean {
  return links.some(
    (link) =>
      typeof link.url === "string" &&
      isQualifyingProfitshareUrl(link.url) &&
      typeof link.priceRon === "number" &&
      link.priceRon > 0 &&
      isFresh(link.checkedAt) &&
      link.inStock !== false,
  );
}

export async function loadQualityWinesFromDb(): Promise<QualityWine[]> {
  const columnRows = (await db.all(sql.raw("PRAGMA table_info(wines)"))) as Array<{
    name: string;
  }>;
  const available = new Set(columnRows.map((column) => column.name));
  const wanted = [
    "id",
    "slug",
    "name",
    "winery_id",
    "region_id",
    "type",
    "sweetness",
    "vintage",
    "grape_varieties",
    "alcohol",
    "sugar",
    "acidity",
    "price_avg",
    "current_price",
    "tasting_notes",
    "food_pairings",
    "affiliate_links",
    "image_url",
    "updated_at",
    "source_url",
    "producer_page_url",
    "tasting_sheet_url",
    "description_editorial",
    "status",
  ].filter((column) => available.has(column));
  if (!wanted.includes("id")) return [];

  const rows = (await db.all(
    sql.raw(`select ${wanted.join(", ")} from wines order by id`),
  )) as RawRow[];

  const wineries = (await db.all(
    sql.raw("select id, name from wineries"),
  )) as Array<{ id: number; name: string }>;
  const wineryById = new Map(wineries.map((winery) => [winery.id, winery.name]));
  const regions = (await db.all(
    sql.raw("select id, name from regions"),
  )) as Array<{ id: number; name: string }>;
  const regionById = new Map(regions.map((region) => [region.id, region.name]));

  const evidenceByWine = new Map<number, string[]>();
  try {
    const evidenceRows = (await db.all(
      sql.raw("select wine_id, field from wine_fact_evidence"),
    )) as Array<{ wine_id: number; field: string }>;
    for (const row of evidenceRows) {
      const fields = evidenceByWine.get(row.wine_id) ?? [];
      fields.push(row.field);
      evidenceByWine.set(row.wine_id, fields);
    }
  } catch {
    // Legacy snapshots may not have the evidence table; factual coverage still
    // uses stored fields and never invents provenance.
  }

  return rows.map((row) => {
    const name = text(row.name) ?? `Wine ${row.id}`;
    const notes = text(row.tasting_notes);
    const links = parseJson<QualityWine["affiliateLinks"]>(
      row.affiliate_links,
      [],
    );
    const grapes = parseJson<Array<{ name?: string }>>(
      row.grape_varieties,
      [],
    )
      .map((grape) => grape.name ?? "")
      .filter(Boolean);
    const food = parseJson<Array<{ dish?: string; name?: string }>>(
      row.food_pairings,
      [],
    )
      .map((pairing) => pairing.dish ?? pairing.name ?? "")
      .filter(Boolean);

    return {
      id: Number(row.id),
      slug: text(row.slug) ?? `wine-${row.id}`,
      name,
      producer:
        row.winery_id != null
          ? wineryById.get(Number(row.winery_id)) ?? null
          : null,
      region:
        row.region_id != null
          ? regionById.get(Number(row.region_id)) ?? null
          : null,
      type: text(row.type) ?? "unknown",
      sweetness: text(row.sweetness),
      vintage: number(row.vintage),
      grapeVarieties: grapes,
      alcohol: number(row.alcohol),
      sugar: number(row.sugar),
      acidity: number(row.acidity),
      volumeMl: parseVolume(name),
      tastingNotes: notes,
      descriptionEditorial: text(row.description_editorial),
      foodPairings: food,
      servingTemperature: parseServingTemperature(notes),
      sourceUrl: text(row.source_url),
      producerPageUrl: text(row.producer_page_url),
      tastingSheetUrl: text(row.tasting_sheet_url),
      imageUrl: text(row.image_url),
      priceAvg: number(row.price_avg),
      currentPrice: number(row.current_price),
      affiliateLinks: links,
      evidenceFields: evidenceByWine.get(Number(row.id)) ?? [],
      updatedAt: text(row.updated_at),
      hasQualifiedProfitshareOffer: hasQualifiedOffer(links),
    } satisfies QualityWine;
  });
}
