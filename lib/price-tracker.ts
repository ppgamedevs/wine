import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { recalculateSingleWineValueScore } from "@/lib/recalculate-value-scores";
import { wines, type PriceHistoryEntry } from "@/lib/schema";

const HISTORY_RETENTION_DAYS = 90;
const LOWEST_PRICE_WINDOW_DAYS = 30;

function normalizePrice(price: number): number {
  const rounded = Math.round(price);
  if (!Number.isFinite(rounded) || rounded <= 0) {
    throw new Error("Pret invalid. Trebuie sa fie un numar intreg pozitiv.");
  }
  return rounded;
}

function normalizeSourceUrl(sourceUrl: string): string {
  const trimmed = sourceUrl.trim();
  if (!trimmed) {
    throw new Error("Sursa pretului (URL) este obligatorie.");
  }
  try {
    return new URL(trimmed).toString();
  } catch {
    throw new Error("URL sursa invalid.");
  }
}

function toIsoDate(date: Date): string {
  return date.toISOString();
}

function parseEntryDate(value: string): Date | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function cutoffDate(days: number, from = new Date()): Date {
  const cutoff = new Date(from);
  cutoff.setUTCDate(cutoff.getUTCDate() - days);
  return cutoff;
}

function prunePriceHistory(
  history: PriceHistoryEntry[],
  referenceDate = new Date(),
): PriceHistoryEntry[] {
  const cutoff = cutoffDate(HISTORY_RETENTION_DAYS, referenceDate);
  return history.filter((entry) => {
    const date = parseEntryDate(entry.date);
    return date !== null && date >= cutoff;
  });
}

export function computeLowestPrice30d(
  history: PriceHistoryEntry[],
  currentPrice: number,
  referenceDate = new Date(),
): number {
  const cutoff = cutoffDate(LOWEST_PRICE_WINDOW_DAYS, referenceDate);
  const recentPrices = history
    .filter((entry) => {
      const date = parseEntryDate(entry.date);
      return date !== null && date >= cutoff;
    })
    .map((entry) => entry.price);

  if (recentPrices.length === 0) {
    return currentPrice;
  }

  return Math.min(currentPrice, ...recentPrices);
}

export interface UpdatePriceResult {
  wineId: number;
  currentPrice: number;
  lowestPrice30d: number;
  priceHistory: PriceHistoryEntry[];
}

export async function updatePrice(
  wineId: number,
  newPrice: number,
  sourceUrl: string,
): Promise<UpdatePriceResult> {
  const normalizedPrice = normalizePrice(newPrice);
  const source = normalizeSourceUrl(sourceUrl);
  const observedAt = new Date();

  const wine = await db.query.wines.findFirst({
    where: eq(wines.id, wineId),
    columns: {
      id: true,
      priceHistory: true,
    },
  });

  if (!wine) {
    throw new Error("Vin negasit.");
  }

  const entry: PriceHistoryEntry = {
    date: toIsoDate(observedAt),
    price: normalizedPrice,
    source,
  };

  const history = prunePriceHistory(
    [...wine.priceHistory, entry],
    observedAt,
  );
  const lowestPrice30d = computeLowestPrice30d(
    history,
    normalizedPrice,
    observedAt,
  );

  await db
    .update(wines)
    .set({
      currentPrice: normalizedPrice,
      lowestPrice30d,
      priceHistory: history,
      priceAvg: normalizedPrice,
    })
    .where(eq(wines.id, wineId));

  // Value Score depinde de pret (eficienta pret). Fara aceasta recalculare,
  // scorul stocat ar ramane calculat pe pretul vechi, in contradictie cu
  // pretul nou afisat pe pagina - exact tipul de neconcordanta interzis.
  try {
    await recalculateSingleWineValueScore(wineId, {
      priceOverride: normalizedPrice,
      changeReason: "price_update",
    });
  } catch (error) {
    console.error("recalculateSingleWineValueScore failed after price update", error);
  }

  return {
    wineId,
    currentPrice: normalizedPrice,
    lowestPrice30d,
    priceHistory: history,
  };
}
