import "server-only";
import { and, count, desc, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { wineryAnalytics, wines } from "@/lib/schema";

const ANALYTICS_WINDOW_DAYS = 30;

function analyticsSinceSql(): string {
  const since = new Date();
  since.setDate(since.getDate() - ANALYTICS_WINDOW_DAYS);
  return since.toISOString().slice(0, 19).replace("T", " ");
}

export interface WineryTopWineStat {
  wineId: number;
  wineName: string;
  wineSlug: string;
  views: number;
}

export interface WineryDailyViewStat {
  date: string;
  label: string;
  views: number;
}

export interface WineryDashboardStats {
  pageViews30d: number;
  visitClicks30d: number;
  purchaseClicks30d: number;
  topWines: WineryTopWineStat[];
  dailyViews: WineryDailyViewStat[];
}

function formatDayLabel(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  return new Intl.DateTimeFormat("ro-RO", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function fillDailyViews(
  rows: { date: string; views: number }[],
): WineryDailyViewStat[] {
  const byDate = new Map(rows.map((row) => [row.date, row.views]));
  const result: WineryDailyViewStat[] = [];
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  cursor.setDate(cursor.getDate() - (ANALYTICS_WINDOW_DAYS - 1));

  for (let i = 0; i < ANALYTICS_WINDOW_DAYS; i += 1) {
    const iso = cursor.toISOString().slice(0, 10);
    result.push({
      date: iso,
      label: formatDayLabel(iso),
      views: byDate.get(iso) ?? 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}

async function countEvents(
  wineryId: number,
  eventTypes: Array<(typeof wineryAnalytics.$inferSelect)["eventType"]>,
): Promise<number> {
  const since = analyticsSinceSql();
  const [row] = await db
    .select({ total: count() })
    .from(wineryAnalytics)
    .where(
      and(
        eq(wineryAnalytics.wineryId, wineryId),
        inArray(wineryAnalytics.eventType, eventTypes),
        gte(wineryAnalytics.createdAt, since),
      ),
    );

  return row?.total ?? 0;
}

export async function getWineryDashboardStats(
  wineryId: number,
): Promise<WineryDashboardStats> {
  const since = analyticsSinceSql();

  const pageViews30d = await countEvents(wineryId, ["page_view"]);

  const visitClicks30d = await countEvents(wineryId, ["visit_click"]);
  const purchaseClicks30d = await countEvents(wineryId, ["purchase_click"]);

  const topWineRows = await db
    .select({
      wineId: wineryAnalytics.wineId,
      wineName: wines.name,
      wineSlug: wines.slug,
      views: count(),
    })
    .from(wineryAnalytics)
    .innerJoin(wines, eq(wineryAnalytics.wineId, wines.id))
    .where(
      and(
        eq(wineryAnalytics.wineryId, wineryId),
        inArray(wineryAnalytics.eventType, ["wine_click", "purchase_click"]),
        isNotNull(wineryAnalytics.wineId),
        gte(wineryAnalytics.createdAt, since),
      ),
    )
    .groupBy(wineryAnalytics.wineId)
    .orderBy(desc(count()))
    .limit(5);

  const dailyRows = await db
    .select({
      date: sql<string>`date(${wineryAnalytics.createdAt})`.as("day"),
      views: count(),
    })
    .from(wineryAnalytics)
    .where(
      and(
        eq(wineryAnalytics.wineryId, wineryId),
        eq(wineryAnalytics.eventType, "page_view"),
        gte(wineryAnalytics.createdAt, since),
      ),
    )
    .groupBy(sql`date(${wineryAnalytics.createdAt})`)
    .orderBy(sql`date(${wineryAnalytics.createdAt})`);

  return {
    pageViews30d,
    visitClicks30d,
    purchaseClicks30d,
    topWines: topWineRows
      .filter((row) => row.wineId != null)
      .map((row) => ({
        wineId: row.wineId as number,
        wineName: row.wineName,
        wineSlug: row.wineSlug,
        views: row.views,
      })),
    dailyViews: fillDailyViews(
      dailyRows.map((row) => ({ date: row.date, views: row.views })),
    ),
  };
}
