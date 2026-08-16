import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { PairingCurationWorkbench } from "@/components/admin/pairing-curation-workbench";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { normalizeWineRows } from "@/lib/normalize-wine";
import { buildCurationCard } from "@/lib/pairing-curation-cards";
import { selectBalancedCurationBatch } from "@/lib/pairing-curation";
import { wines } from "@/lib/schema";
import type { WineWithRelations } from "@/types";

export const metadata: Metadata = {
  title: "Admin pairing curation",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPairingCurationPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>;
}) {
  await requireAdmin();
  const { slug } = await searchParams;
  const rows = await db.query.wines.findMany({
    with: { winery: true, region: true },
    where: eq(wines.status, "verified"),
  });
  const catalog = normalizeWineRows(rows as WineWithRelations[]);
  const batch = selectBalancedCurationBatch(catalog, 30);
  const cards = batch.map(buildCurationCard);
  const currentSlug =
    slug && cards.some((card) => card.slug === slug) ? slug : cards[0]?.slug;

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">Pairing curation</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Drafturile nu sunt curate. Aprobarea este umana, per vin. Scorurile
            stocate nu se schimba.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/wines">Admin vinuri</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/data-quality">Data quality</Link>
          </Button>
        </div>
      </div>
      <PairingCurationWorkbench cards={cards} currentSlug={currentSlug} />
    </main>
  );
}
