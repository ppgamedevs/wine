import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import type { ProducerPageContent } from "@/lib/schema";
import {
  classifyRecoveryStatus,
  evidenceStatusLabel,
  recommendIssueAction,
  type RecoveryStatus,
} from "@/lib/evidence-recovery-status";
import {
  groupIssuesByWine,
  isPublicationBlockingIssue,
  runIntegrityScan,
  type IntegrityIssue,
  type IntegritySeverity,
  type WineIssueGroup,
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

const RECOVERY_LABEL: Record<RecoveryStatus, string> = {
  evidence_recoverable: "Evidenta recuperabila",
  no_source_evidence: "Fara evidenta de sursa",
  source_conflict: "Conflict de surse",
  ready_for_cleanup: "Gata de cleanup deterministic",
  human_review: "Revizuire umana",
};

interface DataQualityPageProps {
  searchParams: Promise<{
    severity?: string;
    code?: string;
    q?: string;
    status?: string;
  }>;
}

function matchesFilters(
  issue: IntegrityIssue,
  filters: { severity?: string; code?: string; q?: string },
): boolean {
  if (filters.severity && issue.severity !== filters.severity) return false;
  if (filters.code && issue.code !== filters.code) return false;
  if (filters.q) {
    const query = filters.q.trim().toLowerCase();
    const haystack = `${issue.slug} ${issue.code} ${issue.message}`.toLowerCase();
    if (!haystack.includes(query)) return false;
  }
  return true;
}

export default async function AdminDataQualityPage({
  searchParams,
}: DataQualityPageProps) {
  await requireAdmin();

  const filters = await searchParams;
  const report = await runIntegrityScan();
  const wineRows = await db.query.wines.findMany({
    columns: {
      id: true,
      slug: true,
      producerPageUrl: true,
      tastingSheetUrl: true,
      sourceUrl: true,
      tastingNotes: true,
      producerContent: true,
      descriptionEditorial: true,
      tasteProfile: true,
    },
  });
  const wineById = new Map(wineRows.map((row) => [row.id, row]));

  const filteredIssues = report.issues.filter((issue) =>
    matchesFilters(issue, filters),
  );
  const groups = groupIssuesByWine(filteredIssues).filter((group) => {
    if (!filters.status) return true;
    const wine = wineById.get(group.wineId);
    const status = classifyRecoveryStatus({
      producerPageUrl: wine?.producerPageUrl,
      tastingSheetUrl: wine?.tastingSheetUrl,
      sourceUrl: wine?.sourceUrl,
      tastingNotes: wine?.tastingNotes,
      producerContentText: Boolean(
        wine?.producerContent?.tastingNotes || wine?.producerContent?.viticulture,
      ),
      issues: group.issues,
    });
    return status === filters.status;
  });
  const blockingVerified = groupIssuesByWine(
    report.issues.filter(
      (issue) => isPublicationBlockingIssue(issue),
    ),
  ).filter((group) =>
    report.issues.some(
      (issue) => issue.wineId === group.wineId && isPublicationBlockingIssue(issue),
    ),
  );

  const codes = Object.keys(report.summary.issuesByCode).sort();

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
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/pairing-curation">Pairing curation</Link>
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

      <form
        className="grid gap-3 rounded-2xl border border-border/70 bg-card p-5 sm:grid-cols-5"
        method="get"
      >
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Cauta vin</span>
          <Input
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder="slug, cod sau text"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Severitate</span>
          <select
            name="severity"
            defaultValue={filters.severity ?? ""}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">Toate</option>
            {SEVERITY_ORDER.map((severity) => (
              <option key={severity} value={severity}>
                {SEVERITY_LABEL[severity]}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Cod problema</span>
          <select
            name="code"
            defaultValue={filters.code ?? ""}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">Toate</option>
            {codes.map((code) => (
              <option key={code} value={code}>
                {code} ({report.summary.issuesByCode[code]})
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Stare evidenta</span>
          <select
            name="status"
            defaultValue={filters.status ?? ""}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">Toate</option>
            {(Object.keys(RECOVERY_LABEL) as RecoveryStatus[]).map((status) => (
              <option key={status} value={status}>
                {RECOVERY_LABEL[status]}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <Button type="submit" size="sm">
            Filtreaza
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/data-quality">Reseteaza</Link>
          </Button>
        </div>
      </form>

      <section aria-labelledby="blocking-heading" className="space-y-3">
        <h2
          id="blocking-heading"
          className="font-serif text-2xl font-semibold text-foreground"
        >
          Vinuri care nu ar trebui publicate in starea actuala
        </h2>
        <p className="text-sm text-muted-foreground">
          Vinuri cu probleme blocking (contradictii sau claim-uri inventate).
          Nu sunt depublicate automat. Revizuire umana inainte de orice actiune
          distructiva.
        </p>
        {blockingVerified.length === 0 ? (
          <p className="rounded-2xl border border-border/70 bg-card p-6 text-sm text-muted-foreground">
            Niciun vin cu probleme blocking in scanul curent.
          </p>
        ) : (
          <WineGroupTable groups={blockingVerified} wineById={wineById} />
        )}
      </section>

      <section aria-labelledby="issues-heading" className="space-y-3">
        <h2
          id="issues-heading"
          className="font-serif text-2xl font-semibold text-foreground"
        >
          Probleme grupate pe vin ({groups.length})
        </h2>
        {groups.length === 0 ? (
          <p className="rounded-2xl border border-border/70 bg-card p-6 text-sm text-muted-foreground">
            Nicio problema pentru filtrele curente.
          </p>
        ) : (
          <WineGroupTable groups={groups} wineById={wineById} />
        )}
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
          Nu sunt fuzionate automat.
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

type AdminWineRow = {
  id: number;
  slug: string;
  producerPageUrl: string | null;
  tastingSheetUrl: string | null;
  sourceUrl: string | null;
  tastingNotes: string | null;
  producerContent: ProducerPageContent | null;
  descriptionEditorial: string | null;
  tasteProfile: string | null;
};

function IssueRecoveryList({
  group,
  wine,
}: {
  group: WineIssueGroup;
  wine: AdminWineRow | undefined;
}) {
  const official = Boolean(wine?.producerPageUrl || wine?.tastingSheetUrl);
  const evidenceLabel = evidenceStatusLabel({
    producerPageUrl: wine?.producerPageUrl,
    tastingSheetUrl: wine?.tastingSheetUrl,
    producerContentText: Boolean(
      wine?.producerContent?.tastingNotes || wine?.producerContent?.viticulture,
    ),
    tastingNotes: wine?.tastingNotes,
  });
  const recovery = classifyRecoveryStatus({
    producerPageUrl: wine?.producerPageUrl,
    tastingSheetUrl: wine?.tastingSheetUrl,
    sourceUrl: wine?.sourceUrl,
    tastingNotes: wine?.tastingNotes,
    producerContentText: Boolean(
      wine?.producerContent?.tastingNotes || wine?.producerContent?.viticulture,
    ),
    issues: group.issues,
  });
  const legacy = [wine?.tasteProfile, wine?.descriptionEditorial]
    .filter(Boolean)
    .join(" ")
    .slice(0, 180);

  return (
    <ul className="space-y-2">
      <li className="text-xs">
        <Badge variant="outline">{RECOVERY_LABEL[recovery]}</Badge>
      </li>
      {group.issues.slice(0, 4).map((issue, index) => {
        const action = recommendIssueAction({
          issue,
          officialSource: official,
          evidenceResolved: false,
        });
        return (
          <li key={`${issue.code}-${index}`}>
            <span className="font-medium text-foreground">{issue.code}</span>
            {": "}
            {issue.message}
            <span className="block text-xs">
              Text vechi: {legacy || "n/a"}
            </span>
            <span className="block text-xs">Evidenta: {evidenceLabel}</span>
            <span className="block text-xs">
              Sursa: {wine?.tastingSheetUrl || wine?.producerPageUrl || "n/a"}
            </span>
            <span className="block text-xs">Actiune: {action}</span>
          </li>
        );
      })}
    </ul>
  );
}

function WineGroupTable({
  groups,
  wineById,
}: {
  groups: WineIssueGroup[];
  wineById: Map<number, AdminWineRow>;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/70">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vin</TableHead>
            <TableHead>Critic</TableHead>
            <TableHead>High</TableHead>
            <TableHead>Mediu</TableHead>
            <TableHead>Low</TableHead>
            <TableHead>De ce</TableHead>
            <TableHead className="text-right">Actiuni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => (
            <TableRow key={group.wineId}>
              <TableCell className="font-medium text-foreground">
                {group.slug}
                {group.blocking > 0 ? (
                  <Badge className="ml-2 bg-destructive/15 text-destructive">
                    blocking
                  </Badge>
                ) : null}
              </TableCell>
              <TableCell>{group.critical}</TableCell>
              <TableCell>{group.high}</TableCell>
              <TableCell>{group.medium}</TableCell>
              <TableCell>{group.low}</TableCell>
              <TableCell className="max-w-xl text-sm text-muted-foreground">
                <IssueRecoveryList
                  group={group}
                  wine={wineById.get(group.wineId)}
                />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/wines/${group.slug}`} target="_blank">
                      Public
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/wines?wineId=${group.wineId}`}>
                      Revizuieste
                    </Link>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
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
