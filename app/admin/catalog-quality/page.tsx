import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/admin-auth";
import { loadQualityWinesFromDb } from "@/lib/quality/from-db";
import { runCatalogQualityAudit } from "@/lib/quality/engine";

export const metadata: Metadata = {
  title: "Catalog quality",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface CatalogQualityPageProps {
  searchParams: Promise<{ status?: string; q?: string; gate?: string }>;
}

function statusVariant(status: string) {
  if (status === "complete") return "default" as const;
  if (status === "partial") return "secondary" as const;
  return "destructive" as const;
}

export default async function CatalogQualityPage({
  searchParams,
}: CatalogQualityPageProps) {
  await requireAdmin();
  const filters = await searchParams;
  const wines = await loadQualityWinesFromDb();
  const report = runCatalogQualityAudit(wines);
  const filtered = report.assessments.filter((assessment) => {
    if (filters.status && assessment.status !== filters.status) return false;
    if (
      filters.gate &&
      !assessment.gates.some((gate) => gate.code === filters.gate)
    ) {
      return false;
    }
    if (filters.q) {
      const query = filters.q.toLowerCase();
      if (
        !`${assessment.wine.name} ${assessment.wine.slug} ${assessment.wine.producer ?? ""}`
          .toLowerCase()
          .includes(query)
      ) {
        return false;
      }
    }
    return true;
  });
  const summary = report.summary;

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">
            Wine catalog quality
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Continuous, read-only quality audit. Factual completeness is separate
            from commercial availability: no affiliate offer is not a low-quality
            wine record.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/data-quality">Data quality</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/wines">Admin vinuri</Link>
          </Button>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Total wines", summary.totalWines],
          ["Complete", summary.complete],
          ["Incomplete", summary.incomplete],
          ["Factual average", `${summary.factualCompletenessAverage}%`],
          ["Technical coverage", `${summary.verifiedTechnicalCoverage}%`],
          ["Sensory coverage", `${summary.sensoryEvidenceCoverage}%`],
          ["Identity conflicts", summary.identityConflicts],
          ["Potential duplicates", summary.potentialDuplicates],
          ["Missing producer sources", summary.missingProducerSources],
          ["Qualifying affiliate prices", summary.affiliatePriceCoverage],
          ["No affiliate price", summary.noAffiliatePrice],
          ["Critical gates", summary.criticalGates],
          ["Retry queue", summary.retryQueue],
          ["Recently improved", summary.recentlyImproved],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-serif text-2xl font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="rounded-xl border bg-card p-4">
        <form className="flex flex-wrap items-end gap-3" method="get">
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Search</span>
            <input
              name="q"
              defaultValue={filters.q ?? ""}
              className="h-9 rounded-md border bg-background px-3"
              placeholder="nume, slug, producator"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Status</span>
            <select
              name="status"
              defaultValue={filters.status ?? ""}
              className="h-9 rounded-md border bg-background px-3"
            >
              <option value="">Toate</option>
              <option value="complete">Complete</option>
              <option value="partial">Parțiale</option>
              <option value="incomplete">Incomplete</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Gate</span>
            <select
              name="gate"
              defaultValue={filters.gate ?? ""}
              className="h-9 rounded-md border bg-background px-3"
            >
              <option value="">Toate</option>
              {Object.keys(report.gateCounts)
                .sort()
                .map((gate) => (
                  <option key={gate} value={gate}>
                    {gate}
                  </option>
                ))}
            </select>
          </label>
          <Button type="submit" size="sm">
            Filtrează
          </Button>
        </form>
      </section>

      {report.retryQueue.length > 0 && (
        <section className="rounded-xl border bg-card p-4">
          <h2 className="font-serif text-xl font-semibold">
            Prioritized repair queue
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {report.retryQueue.slice(0, 20).map((item) => (
              <li key={`${item.wineId}-${item.action}`} className="flex gap-2">
                <Badge variant={item.priority === "P0" ? "destructive" : "secondary"}>
                  {item.priority}
                </Badge>
                <Link href={`/admin/wines?q=${encodeURIComponent(item.slug)}`} className="underline">
                  {item.slug}
                </Link>
                <span className="text-muted-foreground">{item.action}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Wine</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Factual</TableHead>
              <TableHead>Commercial</TableHead>
              <TableHead>Gates / missing fields</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.slice(0, 300).map((assessment) => (
              <TableRow key={assessment.wine.id}>
                <TableCell>
                  <Link
                    href={`/admin/wines?q=${encodeURIComponent(assessment.wine.slug)}`}
                    className="font-medium underline"
                  >
                    {assessment.wine.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {assessment.wine.producer ?? "producer missing"} ·{" "}
                    {assessment.wine.slug}
                  </p>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant(assessment.status)}>
                    {assessment.status}
                  </Badge>
                </TableCell>
                <TableCell>{assessment.factualScore}%</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      assessment.commercial.priceCoverage === "affiliate"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {assessment.commercial.priceCoverage}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-xl text-xs">
                  <div className="flex flex-wrap gap-1">
                    {assessment.gates.map((gate) => (
                      <Badge
                        key={gate.code}
                        variant={
                          gate.severity === "critical"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {gate.code}
                      </Badge>
                    ))}
                  </div>
                  {assessment.sourceGaps.length > 0 && (
                    <p className="mt-1 text-muted-foreground">
                      Missing:{" "}
                      {assessment.sourceGaps
                        .slice(0, 8)
                        .map((gap) => gap.field)
                        .join(", ")}
                    </p>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </main>
  );
}
