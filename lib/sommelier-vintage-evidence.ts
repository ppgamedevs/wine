import "server-only";
import { libsqlClient } from "@/lib/db";

export interface VintageSignal {
  wineSlug: string;
  vintage: number;
  classification: string;
  sourceUrl: string | null;
  sourceTitle: string | null;
  confidence: number;
}

export interface VintageEvidenceResult {
  available: boolean;
  bySlug: Map<string, VintageSignal>;
}

/**
 * Read the optional, bottle-specific vintage evidence ledger without assuming
 * the current production schema has it. Regional or national entries are not
 * applied to a bottle. A missing table, a different column set, or a network
 * error becomes "vintage evidence unavailable", never an invented rating.
 */
export async function loadVintageSignals(): Promise<VintageEvidenceResult> {
  try {
    const table = await libsqlClient.execute({
      sql: "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'vintage_evidence' LIMIT 1",
      args: [],
    });
    if (table.rows.length === 0) {
      return { available: false, bySlug: new Map() };
    }

    const result = await libsqlClient.execute({
      sql: `SELECT vintage, scope, scope_key, classification, source_url, source_title, confidence
            FROM vintage_evidence
            WHERE scope = 'wine'
            ORDER BY confidence DESC
            LIMIT 200`,
      args: [],
    });

    const bySlug = new Map<string, VintageSignal>();
    for (const row of result.rows) {
      const wineSlug = row.scope_key == null ? "" : String(row.scope_key);
      const vintage = Number(row.vintage);
      if (!wineSlug || !Number.isInteger(vintage) || bySlug.has(wineSlug)) continue;
      bySlug.set(wineSlug, {
        wineSlug,
        vintage,
        classification: String(row.classification ?? "insufficient evidence"),
        sourceUrl: row.source_url == null ? null : String(row.source_url),
        sourceTitle: row.source_title == null ? null : String(row.source_title),
        confidence: Number(row.confidence ?? 0),
      });
    }
    return { available: true, bySlug };
  } catch (error) {
    console.warn("Vintage evidence unavailable for comparison", error);
    return { available: false, bySlug: new Map() };
  }
}
