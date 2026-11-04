import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  loadFlywheelReport,
  loadPseoDraftsForAdmin,
} from "@/lib/pseo-flywheel-service";
import {
  generatePseoDraftsAction,
  reviewPseoDraftAction,
} from "./actions";

export const metadata: Metadata = {
  title: "PSEO question flywheel",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function recommendationVariant(value: string) {
  if (value === "publish") return "default" as const;
  if (value === "review") return "secondary" as const;
  return "destructive" as const;
}

function statusVariant(value: string) {
  if (value === "approved" || value === "published") return "default" as const;
  if (value === "rejected") return "destructive" as const;
  return "secondary" as const;
}

export default async function PseoDraftsPage() {
  await requireAdmin();
  const [report, drafts] = await Promise.all([
    loadFlywheelReport(),
    loadPseoDraftsForAdmin(),
  ]);
  const publishable = report.clusters.filter(
    (item) => item.gate.publishRecommendation === "publish",
  ).length;
  const reviewable = report.clusters.filter(
    (item) => item.gate.publishRecommendation === "review",
  ).length;
  const rejected = report.clusters.filter(
    (item) => item.gate.publishRecommendation === "reject",
  ).length;

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">
            PSEO question flywheel
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Real sommelier demand, clustered deterministically and gated before
            any draft is created. Drafts stay noindex until explicit review.
            Nothing is published automatically.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/catalog-quality">Catalog quality</Link>
          </Button>
          <form action={generatePseoDraftsAction}>
            <Button type="submit" size="sm">
              Generate eligible drafts
            </Button>
          </form>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Logged intents", report.intents.length],
          ["Eligible clusters", report.clusters.length],
          ["Publishable", publishable],
          ["Need review", reviewable],
          ["Rejected", rejected],
          ["Blocked intents", report.blockedCount],
          ["Drafts", report.draftCount],
          ["Approved", report.approvedCount],
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

      <section className="space-y-3">
        <h2 className="font-serif text-2xl font-semibold">
          Cluster quality gates
        </h2>
        <p className="text-sm text-muted-foreground">
          Demand uses unique normalized questions. A page is only eligible when
          repeated demand, answer quality, catalog support, evidence coverage,
          duplication risk and confidence all pass.
        </p>
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cluster</TableHead>
                <TableHead>Demand</TableHead>
                <TableHead>Wines</TableHead>
                <TableHead>Coverage</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Decision</TableHead>
                <TableHead>Draft</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.clusters.map((item) => (
                <TableRow key={item.cluster.key}>
                  <TableCell>
                    <p className="font-medium">{item.cluster.canonicalQuestion}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.cluster.key} · {item.cluster.languages.join(", ")}
                    </p>
                  </TableCell>
                  <TableCell>
                    {item.cluster.demandCount} total /{" "}
                    {item.cluster.uniqueDemandCount} unique
                  </TableCell>
                  <TableCell>{item.gate.supportingWineCount}</TableCell>
                  <TableCell>{Math.round(item.gate.coverage * 100)}%</TableCell>
                  <TableCell>{Math.round(item.gate.confidence * 100)}%</TableCell>
                  <TableCell>
                    <Badge
                      variant={recommendationVariant(
                        item.gate.publishRecommendation,
                      )}
                    >
                      {item.gate.publishRecommendation}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {item.existingDraft ? (
                      <div className="space-y-1">
                        <Badge variant={statusVariant(item.existingDraft.status)}>
                          {item.existingDraft.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          {item.existingDraft.slug}
                        </p>
                      </div>
                    ) : item.draft ? (
                      <span className="text-xs text-muted-foreground">
                        eligible, not generated
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        not eligible
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl font-semibold">Draft review</h2>
        <p className="text-sm text-muted-foreground">
          Every generated page starts as <strong>draft</strong> with{" "}
          <strong>noindexUntilApproved</strong>. There is no public route until a
          reviewer explicitly approves and a separate publishing step is
          implemented.
        </p>
        {drafts.length === 0 ? (
          <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
            No drafts yet. Generate eligible drafts only after repeated demand
            clears the gates above.
          </div>
        ) : (
          <div className="space-y-4">
            {drafts.map((draft) => (
              <article
                key={draft.id}
                className="rounded-xl border bg-card p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-serif text-xl font-semibold">
                      {draft.title}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {draft.slug} · {draft.locale} · {draft.pageType}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={statusVariant(draft.status)}>
                      {draft.status}
                    </Badge>
                    <Badge
                      variant={recommendationVariant(
                        draft.publishRecommendation,
                      )}
                    >
                      {draft.publishRecommendation}
                    </Badge>
                    <Badge
                      variant={
                        draft.noindexUntilApproved ? "destructive" : "default"
                      }
                    >
                      {draft.noindexUntilApproved ? "noindex" : "index eligible"}
                    </Badge>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                  <p>
                    Demand: <strong>{draft.demandCount}</strong>
                  </p>
                  <p>
                    Supporting wines:{" "}
                    <strong>{draft.supportingWineCount}</strong>
                  </p>
                  <p>
                    Confidence:{" "}
                    <strong>{Math.round(draft.confidence * 100)}%</strong>
                  </p>
                </div>
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-wine">
                    Preview grounded draft
                  </summary>
                  <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border bg-background p-4 text-xs leading-relaxed">
                    {draft.contentMarkdown}
                  </pre>
                </details>
                <form
                  action={reviewPseoDraftAction}
                  className="mt-4 flex flex-wrap items-end gap-2"
                >
                  <input type="hidden" name="id" value={draft.id} />
                  <label className="text-xs">
                    <span className="mb-1 block text-muted-foreground">
                      Review note
                    </span>
                    <input
                      name="notes"
                      className="h-9 min-w-64 rounded-md border bg-background px-3 text-sm"
                      placeholder="What needs checking?"
                    />
                  </label>
                  <Button
                    type="submit"
                    name="status"
                    value="approved"
                    size="sm"
                  >
                    Approve
                  </Button>
                  <Button
                    type="submit"
                    name="status"
                    value="rejected"
                    size="sm"
                    variant="destructive"
                  >
                    Reject
                  </Button>
                </form>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
