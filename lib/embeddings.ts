import { and, eq, inArray, sql } from "drizzle-orm";
import { HfInference } from "@huggingface/inference";
import { db, libsqlClient } from "@/lib/db";
import { wines } from "@/lib/schema";
import { andCatalog } from "@/lib/wine-catalog";
import type { WineWithRelations } from "@/types";

/** all-MiniLM-L6-v2 output dimension */
export const EMBEDDING_DIMENSIONS = 384;

const EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2";

function getHfClient(): HfInference | null {
  const token = (
    process.env.HF_TOKEN ??
    process.env.HUGGINGFACE_API_KEY ??
    ""
  ).trim();
  if (!token) return null;
  return new HfInference(token);
}

/** Serialize float array for Turso vector32() SQL function. */
export function vectorToSqlArg(values: number[]): string {
  return JSON.stringify(values);
}

/** Build rich text for embedding a wine document. */
export function buildWineDocumentText(wine: WineWithRelations): string {
  const grapes = wine.grapeVarieties
    .map((g) => `${g.name}${g.percentage ? ` ${g.percentage}%` : ""}`)
    .join(", ");
  const pairings = wine.foodPairings.map((p) => p.dish).join(", ");
  const dessertPairings = wine.dessertPairings.map((p) => p.dish).join(", ");
  const editorialDesserts = wine.foodPairingNotes
    .filter((p) =>
      /cozonac|pasca|gogosi|placinta|desert|prajitur|papana/i.test(p.dish),
    )
    .map((p) => p.dish)
    .join(", ");
  const notes = wine.expertNotes
    ? [
        wine.expertNotes.history,
        wine.expertNotes.pairingScience,
        wine.expertNotes.terroirSecrets,
        wine.expertNotes.thingsYouShouldKnow.join(" "),
      ].join(" ")
    : "";

  return [
    wine.name,
    wine.vintage,
    wine.type,
    wine.sweetness,
    wine.winery?.name,
    wine.region?.name,
    grapes,
    wine.tastingNotes,
    pairings,
    dessertPairings,
    editorialDesserts,
    notes,
    `Value ${wine.valueScore}`,
    `${wine.priceAvg} RON`,
  ]
    .filter(Boolean)
    .join(" | ");
}

/** Build query text from user sommelier preferences. */
export function buildQueryText(params: {
  occasion: string;
  color: string;
  sweetness: string;
  budgetMin: number;
  budgetMax: number;
  preferredWinerySlugs: string[];
}): string {
  return [
    `ocazie ${params.occasion}`,
    params.occasion === "pentru-desert"
      ? "desert cozonac pasca gogosi placinta prajituri"
      : "",
    `tip vin ${params.color}`,
    `dulceata ${params.sweetness}`,
    `buget ${params.budgetMin}-${params.budgetMax} RON`,
    params.preferredWinerySlugs.length
      ? `crame ${params.preferredWinerySlugs.join(" ")}`
      : "",
    "vin romanesc recomandare",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Embed text via Hugging Face Inference (all-MiniLM-L6-v2). */
export async function embedText(text: string): Promise<number[]> {
  const hf = getHfClient();
  if (!hf) {
    throw new Error(
      "HF_TOKEN lipseste sau este gol. Adauga token Hugging Face in Vercel si ruleaza: vercel env pull .env.local --environment=production",
    );
  }

  const result = await hf.featureExtraction({
    model: EMBEDDING_MODEL,
    inputs: text,
  });

  const flat = flattenEmbedding(result);
  if (flat.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Embedding invalid: expected ${EMBEDDING_DIMENSIONS}, got ${flat.length}`,
    );
  }
  return flat;
}

function flattenEmbedding(raw: unknown): number[] {
  if (Array.isArray(raw)) {
    if (typeof raw[0] === "number") return raw as number[];
    if (Array.isArray(raw[0])) return (raw[0] as number[]).flat();
  }
  throw new Error("Format embedding necunoscut de la Hugging Face");
}

export interface VectorSearchFilters {
  budgetMin: number;
  budgetMax: number;
  color?: string;
  sweetness?: string;
  preferredWinerySlugs?: string[];
  limit?: number;
}

const COLOR_TO_TYPES: Record<string, string[]> = {
  red: ["red"],
  white: ["white"],
  rose: ["rose"],
  sparkling: ["sparkling"],
};

/**
 * Vector similarity search on Turso (cosine distance).
 * Falls back to empty array if no embeddings exist.
 */
export async function searchSimilarWines(
  queryEmbedding: number[],
  filters: VectorSearchFilters,
): Promise<{ wineId: number; distance: number }[]> {
  const limit = filters.limit ?? 12;
  const vectorArg = vectorToSqlArg(queryEmbedding);

  const conditions: string[] = [
    "embedding IS NOT NULL",
    "status != 'rejected'",
  ];
  const args: (string | number)[] = [vectorArg];

  if (filters.budgetMax > 0) {
    conditions.push("(price_avg IS NULL OR price_avg <= ?)");
    args.push(filters.budgetMax * 1.25);
  }
  if (filters.budgetMin > 0) {
    conditions.push("(price_avg IS NULL OR price_avg >= ?)");
    args.push(Math.max(0, filters.budgetMin * 0.5));
  }
  if (filters.color && filters.color !== "any") {
    const types = COLOR_TO_TYPES[filters.color];
    if (types?.length) {
      conditions.push(`type IN (${types.map(() => "?").join(", ")})`);
      args.push(...types);
    }
  }
  if (filters.sweetness && filters.sweetness !== "any") {
    conditions.push("sweetness = ?");
    args.push(filters.sweetness);
  }

  args.push(limit);

  const whereClause = conditions.join(" AND ");

  try {
    const result = await libsqlClient.execute({
      sql: `SELECT id, vector_distance_cos(embedding, vector32(?)) AS distance
            FROM wines
            WHERE ${whereClause}
            ORDER BY distance ASC
            LIMIT ?`,
      args,
    });

    return result.rows.map((row) => ({
      wineId: Number(row.id),
      distance: Number(row.distance),
    }));
  } catch (error) {
    console.error("searchSimilarWines failed", error);
    return [];
  }
}

/** Persist embedding for a wine (Turso vector32). */
export async function saveWineEmbedding(
  wineId: number,
  embedding: number[],
): Promise<void> {
  await libsqlClient.execute({
    sql: "UPDATE wines SET embedding = vector32(?) WHERE id = ?",
    args: [vectorToSqlArg(embedding), wineId],
  });
}

/** Create vector index after column is F32_BLOB (Turso only). */
export async function ensureVectorIndex(): Promise<void> {
  try {
    await libsqlClient.execute(
      "CREATE INDEX IF NOT EXISTS wines_embedding_idx ON wines (libsql_vector_idx(embedding, 'metric=cosine'))",
    );
    console.log("Vector index ready.");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("unexpected vector column type")) {
      console.warn(
        "Vector index skipped: embedding column must be F32_BLOB(384). Run: npm run db:migrate",
      );
      return;
    }
    console.warn("ensureVectorIndex skipped:", msg);
  }
}

/** Load full wine rows by IDs, preserving similarity order. */
export async function loadWinesByIds(
  ids: number[],
): Promise<WineWithRelations[]> {
  if (ids.length === 0) return [];

  const rows = await db.query.wines.findMany({
    where: inArray(wines.id, ids),
    with: { winery: true, region: true },
  });

  const byId = new Map(rows.map((r) => [r.id, r as WineWithRelations]));
  return ids
    .map((id) => byId.get(id))
    .filter(
      (w): w is WineWithRelations =>
        w !== undefined && w.status !== "rejected",
    );
}

/** Rule-based SQL pre-filter when vector search unavailable. */
export async function filterWinesByRules(
  filters: VectorSearchFilters,
): Promise<WineWithRelations[]> {
  const conditions = [];

  if (filters.budgetMax > 0) {
    conditions.push(
      sql`(${wines.priceAvg} IS NULL OR ${wines.priceAvg} <= ${filters.budgetMax * 1.25})`,
    );
  }
  if (filters.color && filters.color !== "any") {
    const types = COLOR_TO_TYPES[filters.color];
    if (types?.length) {
      conditions.push(inArray(wines.type, types as WineWithRelations["type"][]));
    }
  }
  if (filters.sweetness && filters.sweetness !== "any") {
    conditions.push(
      eq(wines.sweetness, filters.sweetness as NonNullable<WineWithRelations["sweetness"]>),
    );
  }

  const rows = await db.query.wines.findMany({
    where: conditions.length ? andCatalog(...conditions) : andCatalog(),
    with: { winery: true, region: true },
    limit: filters.limit ?? 20,
    orderBy: (table, { desc }) => [desc(table.valueScore)],
  });

  return rows as WineWithRelations[];
}
