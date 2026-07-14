import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/admin-auth";
import {
  runIntegrityScan,
  type IntegrityIssue,
  type IntegritySeverity,
} from "@/lib/integrity-scan";

export const metadata: Metadata = {
  title: "Admin data quality",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const SEVERITY_ORDER: IntegritySeverity[] = ["critical", "high", "medium", "low"];

const SEVERITY_LABEL: Record<IntegritySeverity, string> = {
  critical: "Critic",
  high: "Ridicat",
  medium: "Mediu",
  low: "Scazut",
};

const SEVERITY_BADGE_CLASS: Record<IntegritySeverity, string> = {
  critical: "bg-destructive/15 text-destructive",
  high: "bg-orange-500/15 text-orange-600",
  medium: "bg-amber-500/15 text-amber-600",
  low: "bg-secondary text-muted-foreground",
};

function groupBySeverity(
  issues: IntegrityIssue[],
): Record<IntegritySeverity, IntegrityIssue[]> {
  const grouped: Record<IntegritySeverity, IntegrityIssue[]> = {
    critical: [],
    high: [],
    medium: [],
    low: [],
  };
  for (const issue of issues) {
    grouped[issue.severity].push(issue);
  }
  return grouped;
}

export default async function AdminDataQualityPage() {
  await requireAdmin();

  const report = await runIntegrityScan();
  const grouped = groupBySeverity(report.issues);

  return (
    <main className="mx-auto max-w-7xl space-y-10 px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">
            Data quality
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Scan de integritate rulat live la incarcarea paginii. Generat la{" "}
            {new Date(report.generatedAt).toLocaleString("ro-RO")}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/wines">Admin vinuri</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total vinuri" value={report.summary.totalWines} />
        <StatCard label="Publicate" value={report.summary.publishedWines} />
        {SEVERITY_ORDER.map((severity) => (
          <StatCard
            key={severity}
            label={`Probleme ${SEVERITY_LABEL[severity].toLowerCase()}`}
            value={report.summary.issuesBySeverity[severity]}
          />
        ))}
      </div>

      <section aria-labelledby="issues-heading" className="space-y-6">
        <h2 id="issues-heading" className="font-serif text-2xl font-semibold text-foreground">
          Probleme detectate
        </h2>

        {SEVERITY_ORDER.map((severity) => {
          const items = grouped[severity];
          if (items.length === 0) return null;

          return (
            <div key={severity} className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge className={SEVERITY_BADGE_CLASS[severity]}>
                  {SEVERITY_LABEL[severity]}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {items.length} probleme
                </span>
              </div>
              <div className="overflow-hidden rounded-2xl border border-border/70">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vin</TableHead>
                      <TableHead>Tip</TableHead>
                      <TableHead>Detalii</TableHead>
                      <TableHead className="text-right">Actiune</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((issue, index) => (
                      <TableRow key={`${issue.wineId}-${issue.code}-${index}`}>
                        <TableCell className="font-medium text-foreground">
                          {issue.slug}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {issue.code}
                        </TableCell>
                        <TableCell className="max-w-xl text-sm text-muted-foreground">
                          {issue.message}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/admin/wines?wineId=${issue.wineId}`}>
                              Revizuieste
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          );
        })}

        {report.issues.length === 0 ? (
          <p className="rounded-2xl border border-border/70 bg-card p-6 text-sm text-muted-foreground">
            Nicio problema detectata la ultimul scan.
          </p>
        ) : null}
      </section>

      <section aria-labelledby="duplicates-heading" className="space-y-3">
        <h2
          id="duplicates-heading"
          className="font-serif text-2xl font-semibold text-foreground"
        >
          Duplicate candidate ({report.duplicateGroups.length})
        </h2>
        <p className="text-sm text-muted-foreground">
          Perechi cu aceeasi crama, vintage si tip, cu nume foarte similare.
          Nu sunt fuzionate automat: necesita verificare manuala inainte de
          orice actiune (pot fi cuvee-uri sau editii distincte).
        </p>
        {report.duplicateGroups.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-border/70">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vin A</TableHead>
                  <TableHead>Vin B</TableHead>
                  <TableHead>Similaritate</TableHead>
                  <TableHead>Motiv</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.duplicateGroups.map((group, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium text-foreground">
                      <Link
                        className="underline"
                        href={`/admin/wines?wineId=${group.wineIds[0]}`}
                      >
                        {group.slugs[0]}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      <Link
                        className="underline"
                        href={`/admin/wines?wineId=${group.wineIds[1]}`}
                      >
                        {group.slugs[1]}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {Math.round(group.similarity * 100)}%
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {group.reason}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-2xl font-semibold text-foreground">
        {value}
      </p>
    </div>
  );
}
