import type { Metadata } from "next";
import { WineAdminPanel } from "@/components/admin/wine-admin-panel";
import { requireAdmin } from "@/lib/admin-auth";
import {
  getAdminStats,
  getAdminWineById,
  getAdminWines,
  getAdminWinesWithReports,
  getRecentReports,
  type AdminWineStatusFilter,
} from "@/lib/admin-queries";

export const metadata: Metadata = {
  title: "Admin vinuri",
  robots: { index: false, follow: false },
};

export default async function AdminWinesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; tab?: string; wineId?: string }>;
}) {
  await requireAdmin();

  const { status, q, tab, wineId: wineIdParam } = await searchParams;
  const allowed: AdminWineStatusFilter[] = [
    "all",
    "user_submitted",
    "verified",
    "rejected",
  ];
  const statusFilter = allowed.includes(status as AdminWineStatusFilter)
    ? (status as AdminWineStatusFilter)
    : "user_submitted";

  const highlightWineId = Number(wineIdParam);
  const parsedHighlightWineId =
    Number.isInteger(highlightWineId) && highlightWineId > 0
      ? highlightWineId
      : null;

  const [wines, winesWithReports, reports, stats, highlightWine] =
    await Promise.all([
      getAdminWines(statusFilter, q ?? ""),
      getAdminWinesWithReports(),
      getRecentReports(),
      getAdminStats(),
      parsedHighlightWineId
        ? getAdminWineById(parsedHighlightWineId)
        : Promise.resolve(null),
    ]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <WineAdminPanel
        wines={wines}
        winesWithReports={winesWithReports}
        reports={reports}
        stats={stats}
        initialStatus={statusFilter}
        initialSearch={q ?? ""}
        initialTab={
          tab === "reports" || parsedHighlightWineId ? "reports" : "wines"
        }
        highlightWine={highlightWine}
      />
    </main>
  );
}
