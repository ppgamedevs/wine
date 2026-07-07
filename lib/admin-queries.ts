import "server-only";
import { count, desc, eq, gt, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  wineReports,
  wineries,
  wines,
  type WineImageSource,
  type WineSubmissionStatus,
} from "@/lib/schema";

export type AdminWineStatusFilter = WineSubmissionStatus | "all";

export interface AdminWineRow {
  id: number;
  slug: string;
  name: string;
  vintage: number | null;
  status: WineSubmissionStatus;
  reportCount: number;
  createdAt: string;
  sourceUrl: string | null;
  imageUrl: string | null;
  imageSource: WineImageSource | null;
  valueScore: number | null;
  giftScore: number | null;
  foodMatchScore: number | null;
  descriptionEditorial: string | null;
  valueExplanation: string | null;
  tasteProfile: string | null;
  thingsYouShouldKnow: string[];
  wineryName: string | null;
  regionName: string | null;
  reports: {
    id: number;
    reason: string | null;
    submittedBy: string | null;
    createdAt: string;
  }[];
}

export interface AdminStats {
  totalCommunity: number;
  pending: number;
  totalReports: number;
  winesWithReports: number;
}

export interface AdminReportRow {
  id: number;
  wineId: number;
  wineName: string;
  wineSlug: string;
  reason: string | null;
  submittedBy: string | null;
  createdAt: string;
  reportCount: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  const [communityRow] = await db
    .select({ total: count() })
    .from(wines)
    .where(isNotNull(wines.submittedBy));

  const [pendingRow] = await db
    .select({ total: count() })
    .from(wines)
    .where(eq(wines.status, "user_submitted"));

  const reportRows = await db
    .select({ reportCount: wines.reportCount })
    .from(wines);
  const totalReports = reportRows.reduce(
    (sum, row) => sum + row.reportCount,
    0,
  );

  const [withReportsRow] = await db
    .select({ total: count() })
    .from(wines)
    .where(gt(wines.reportCount, 0));

  return {
    totalCommunity: communityRow?.total ?? 0,
    pending: pendingRow?.total ?? 0,
    totalReports,
    winesWithReports: withReportsRow?.total ?? 0,
  };
}

export async function getAdminWines(
  statusFilter: AdminWineStatusFilter = "user_submitted",
  searchQuery = "",
): Promise<AdminWineRow[]> {
  const trimmedSearch = searchQuery.trim().toLowerCase();

  const rows = await db.query.wines.findMany({
    with: {
      winery: true,
      region: true,
      reports: {
        orderBy: (table, { desc: orderDesc }) => [orderDesc(table.createdAt)],
        limit: 5,
      },
    },
    where:
      statusFilter === "all"
        ? undefined
        : (table, { eq: eqOp }) => eqOp(table.status, statusFilter),
    orderBy: (table, { desc: orderDesc }) => [orderDesc(table.createdAt)],
    limit: 200,
  });

  const filtered =
    trimmedSearch.length >= 2
      ? rows.filter((wine) => {
          const haystack = [
            wine.name,
            wine.winery?.name ?? "",
            wine.region?.name ?? "",
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(trimmedSearch);
        })
      : rows;

  return filtered.map((wine) => ({
    id: wine.id,
    slug: wine.slug,
    name: wine.name,
    vintage: wine.vintage,
    status: wine.status,
    reportCount: wine.reportCount,
    createdAt: wine.createdAt,
    sourceUrl: wine.sourceUrl,
    imageUrl: wine.imageUrl,
    imageSource: wine.imageSource,
    valueScore: wine.valueScore,
    giftScore: wine.giftScore,
    foodMatchScore: wine.foodMatchScore,
    descriptionEditorial: wine.descriptionEditorial,
    valueExplanation: wine.valueExplanation,
    tasteProfile: wine.tasteProfile,
    thingsYouShouldKnow: wine.thingsYouShouldKnow,
    wineryName: wine.winery?.name ?? null,
    regionName: wine.region?.name ?? null,
    reports: wine.reports.map((report) => ({
      id: report.id,
      reason: report.reason,
      submittedBy: report.submittedBy,
      createdAt: report.createdAt,
    })),
  }));
}

export async function getAdminWinesWithReports(): Promise<AdminWineRow[]> {
  const rows = await db.query.wines.findMany({
    with: {
      winery: true,
      region: true,
      reports: {
        orderBy: (table, { desc: orderDesc }) => [orderDesc(table.createdAt)],
        limit: 5,
      },
    },
    where: (table, { gt: gtOp }) => gtOp(table.reportCount, 0),
    orderBy: (table, { desc: orderDesc }) => [orderDesc(table.reportCount)],
    limit: 100,
  });

  return rows.map((wine) => ({
    id: wine.id,
    slug: wine.slug,
    name: wine.name,
    vintage: wine.vintage,
    status: wine.status,
    reportCount: wine.reportCount,
    createdAt: wine.createdAt,
    sourceUrl: wine.sourceUrl,
    imageUrl: wine.imageUrl,
    imageSource: wine.imageSource,
    valueScore: wine.valueScore,
    giftScore: wine.giftScore,
    foodMatchScore: wine.foodMatchScore,
    descriptionEditorial: wine.descriptionEditorial,
    valueExplanation: wine.valueExplanation,
    tasteProfile: wine.tasteProfile,
    thingsYouShouldKnow: wine.thingsYouShouldKnow,
    wineryName: wine.winery?.name ?? null,
    regionName: wine.region?.name ?? null,
    reports: wine.reports.map((report) => ({
      id: report.id,
      reason: report.reason,
      submittedBy: report.submittedBy,
      createdAt: report.createdAt,
    })),
  }));
}

export async function getAdminWineById(
  wineId: number,
): Promise<AdminWineRow | null> {
  const wine = await db.query.wines.findFirst({
    where: (table, { eq: eqOp }) => eqOp(table.id, wineId),
    with: {
      winery: true,
      region: true,
      reports: {
        orderBy: (table, { desc: orderDesc }) => [orderDesc(table.createdAt)],
        limit: 10,
      },
    },
  });

  if (!wine) return null;

  return {
    id: wine.id,
    slug: wine.slug,
    name: wine.name,
    vintage: wine.vintage,
    status: wine.status,
    reportCount: wine.reportCount,
    createdAt: wine.createdAt,
    sourceUrl: wine.sourceUrl,
    imageUrl: wine.imageUrl,
    imageSource: wine.imageSource,
    valueScore: wine.valueScore,
    giftScore: wine.giftScore,
    foodMatchScore: wine.foodMatchScore,
    descriptionEditorial: wine.descriptionEditorial,
    valueExplanation: wine.valueExplanation,
    tasteProfile: wine.tasteProfile,
    thingsYouShouldKnow: wine.thingsYouShouldKnow,
    wineryName: wine.winery?.name ?? null,
    regionName: wine.region?.name ?? null,
    reports: wine.reports.map((report) => ({
      id: report.id,
      reason: report.reason,
      submittedBy: report.submittedBy,
      createdAt: report.createdAt,
    })),
  };
}

export async function getRecentReports(limit = 20): Promise<AdminReportRow[]> {
  const rows = await db.query.wineReports.findMany({
    with: {
      wine: {
        columns: {
          id: true,
          name: true,
          slug: true,
          reportCount: true,
        },
      },
    },
    orderBy: (table, { desc: orderDesc }) => [orderDesc(table.createdAt)],
    limit,
  });

  return rows
    .filter((row) => row.wine)
    .map((row) => ({
      id: row.id,
      wineId: row.wineId,
      wineName: row.wine!.name,
      wineSlug: row.wine!.slug,
      reason: row.reason,
      submittedBy: row.submittedBy,
      createdAt: row.createdAt,
      reportCount: row.wine!.reportCount,
    }));
}

export interface AdminWineryRow {
  id: number;
  slug: string;
  name: string;
  verified: boolean;
  isPremium: boolean;
  premiumSince: string | null;
  customBannerUrl: string | null;
  customStory: string | null;
  analyticsEnabled: boolean;
  leadCaptureEnabled: boolean;
  featuredPlacement: boolean;
  regionName: string | null;
  wineCount: number;
}

export async function getAdminWineries(searchQuery = ""): Promise<AdminWineryRow[]> {
  const trimmedSearch = searchQuery.trim().toLowerCase();

  const rows = await db.query.wineries.findMany({
    with: {
      region: true,
      wines: {
        columns: { id: true, status: true },
      },
    },
    orderBy: (table, { asc }) => [asc(table.name)],
    limit: 500,
  });

  const filtered =
    trimmedSearch.length >= 2
      ? rows.filter((winery) => {
          const haystack = [winery.name, winery.slug, winery.region?.name ?? ""]
            .join(" ")
            .toLowerCase();
          return haystack.includes(trimmedSearch);
        })
      : rows;

  return filtered.map((winery) => ({
    id: winery.id,
    slug: winery.slug,
    name: winery.name,
    verified: winery.verified,
    isPremium: winery.isPremium,
    premiumSince: winery.premiumSince,
    customBannerUrl: winery.customBannerUrl,
    customStory: winery.customStory,
    analyticsEnabled: winery.analyticsEnabled,
    leadCaptureEnabled: winery.leadCaptureEnabled,
    featuredPlacement: winery.featuredPlacement,
    regionName: winery.region?.name ?? null,
    wineCount: winery.wines.filter((w) => w.status !== "rejected").length,
  }));
}

export async function getAdminWineryById(
  wineryId: number,
): Promise<AdminWineryRow | null> {
  const list = await getAdminWineries();
  return list.find((w) => w.id === wineryId) ?? null;
}
