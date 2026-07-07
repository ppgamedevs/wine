import type { Metadata } from "next";
import { WineryAdminPanel } from "@/components/admin/winery-admin-panel";
import { requireAdmin } from "@/lib/admin-auth";
import { getAdminWineries, getAdminWineryById } from "@/lib/admin-queries";

export const metadata: Metadata = {
  title: "Admin crame Premium",
  robots: { index: false, follow: false },
};

export default async function AdminWineriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; wineryId?: string }>;
}) {
  await requireAdmin();

  const { q, wineryId: wineryIdParam } = await searchParams;
  const wineryId = Number(wineryIdParam);
  const parsedWineryId =
    Number.isInteger(wineryId) && wineryId > 0 ? wineryId : null;

  const [wineries, highlightWinery] = await Promise.all([
    getAdminWineries(q ?? ""),
    parsedWineryId ? getAdminWineryById(parsedWineryId) : Promise.resolve(null),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <WineryAdminPanel
        wineries={wineries}
        initialSearch={q ?? ""}
        highlightWinery={highlightWinery}
      />
    </main>
  );
}
