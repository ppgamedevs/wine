"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  approveWineAction,
  rejectWineAction,
  resolveWineReportsAction,
  updateWineEditorialAction,
  updateWineImageAction,
  adminLogoutAction,
} from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { formatLongDate } from "@/lib/format";
import type {
  AdminReportRow,
  AdminStats,
  AdminWineRow,
  AdminWineStatusFilter,
} from "@/lib/admin-queries";
import type { WineSubmissionStatus } from "@/lib/schema";

const statusLabels: Record<WineSubmissionStatus, string> = {
  user_submitted: "In asteptare",
  verified: "Verificat",
  rejected: "Respins",
};

const statusBadgeClass: Record<WineSubmissionStatus, string> = {
  user_submitted: "bg-gold/15 text-foreground",
  verified: "bg-wine/10 text-wine",
  rejected: "bg-destructive/10 text-destructive",
};

interface WineAdminPanelProps {
  wines: AdminWineRow[];
  winesWithReports: AdminWineRow[];
  reports: AdminReportRow[];
  stats: AdminStats;
  initialStatus: AdminWineStatusFilter;
  initialSearch: string;
  initialTab: "wines" | "reports";
}

export function WineAdminPanel({
  wines,
  winesWithReports,
  reports,
  stats,
  initialStatus,
  initialSearch,
  initialTab,
}: WineAdminPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [statusFilter, setStatusFilter] =
    useState<AdminWineStatusFilter>(initialStatus);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [editWine, setEditWine] = useState<AdminWineRow | null>(null);
  const [imageWine, setImageWine] = useState<AdminWineRow | null>(null);
  const [reportsWine, setReportsWine] = useState<AdminWineRow | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  function buildAdminUrl(options: {
    status?: AdminWineStatusFilter;
    q?: string;
    tab?: "wines" | "reports";
  }) {
    const params = new URLSearchParams();
    const nextStatus = options.status ?? statusFilter;
    const nextQuery = options.q ?? searchQuery;
    const nextTab = options.tab ?? activeTab;

    if (nextStatus !== "user_submitted") {
      params.set("status", nextStatus);
    }
    if (nextQuery.trim().length >= 2) {
      params.set("q", nextQuery.trim());
    }
    if (nextTab === "reports") {
      params.set("tab", "reports");
    }
    const query = params.toString();
    return query ? `/admin/wines?${query}` : "/admin/wines";
  }

  function refresh(options?: {
    status?: AdminWineStatusFilter;
    q?: string;
    tab?: "wines" | "reports";
  }) {
    router.push(buildAdminUrl(options ?? {}));
    router.refresh();
  }

  function runAction(action: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      setMessage(null);
      const result = await action();
      if (!result.ok && result.error) setMessage(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">
            Admin vinuri
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Coada de verificare pentru flywheel-ul comunitatii.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/adauga-vin">Adauga vin (test)</Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => adminLogoutAction()}
          >
            Logout
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Vinuri comunitate" value={stats.totalCommunity} />
        <StatCard label="In asteptare" value={stats.pending} />
        <StatCard label="Total rapoarte" value={stats.totalReports} />
        <StatCard label="Vinuri cu rapoarte" value={stats.winesWithReports} />
      </div>

      {message ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {message}
        </p>
      ) : null}

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          const next = value as "wines" | "reports";
          setActiveTab(next);
          refresh({ tab: next });
        }}
      >
        <TabsList>
          <TabsTrigger value="wines">Vinuri</TabsTrigger>
          <TabsTrigger value="reports">
            Rapoarte
            {stats.winesWithReports > 0 ? (
              <Badge className="ml-1 bg-wine/10 text-wine">
                {stats.winesWithReports}
              </Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="wines" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <form
              className="flex min-w-[240px] flex-1 flex-wrap items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                refresh({ q: searchQuery, tab: "wines" });
              }}
            >
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Cauta dupa nume sau producator..."
                className="max-w-sm"
              />
              <Button type="submit" variant="outline" size="sm">
                Cauta
              </Button>
              {searchQuery.trim().length >= 2 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    refresh({ q: "", tab: "wines" });
                  }}
                >
                  Sterge
                </Button>
              ) : null}
            </form>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                const next = value as AdminWineStatusFilter;
                setStatusFilter(next);
                refresh({ status: next, tab: "wines" });
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtreaza status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user_submitted">In asteptare</SelectItem>
                <SelectItem value="verified">Verificate</SelectItem>
                <SelectItem value="rejected">Respinse</SelectItem>
                <SelectItem value="all">Toate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <WineTable
            wines={wines}
            pending={pending}
            onApprove={(id) => runAction(() => approveWineAction(id))}
            onReject={(id) => runAction(() => rejectWineAction(id))}
            onEdit={setEditWine}
            onImage={(wine) => {
              setImageWine(wine);
              setImageUrl(wine.imageUrl ?? "");
            }}
            onReports={setReportsWine}
          />
        </TabsContent>

        <TabsContent value="reports">
          <ReportList
            reports={reports}
            pending={pending}
            onResolve={(wineId) =>
              runAction(() => resolveWineReportsAction(wineId))
            }
            onViewWineReports={(wine) => setReportsWine(wine)}
            wines={winesWithReports}
          />
        </TabsContent>
      </Tabs>

      <EditWineDialog
        wine={editWine}
        open={Boolean(editWine)}
        onOpenChange={(open) => !open && setEditWine(null)}
        pending={pending}
        onSave={(payload) =>
          runAction(() => updateWineEditorialAction(payload))
        }
      />

      <Dialog
        open={Boolean(imageWine)}
        onOpenChange={(open) => !open && setImageWine(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schimba imagine</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="imageUrl">URL imagine</Label>
            <Input
              id="imageUrl"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="https://..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImageWine(null)}>
              Anuleaza
            </Button>
            <Button
              className="bg-wine text-wine-foreground hover:bg-wine/90"
              disabled={pending}
              onClick={() => {
                if (!imageWine) return;
                runAction(async () => {
                  const result = await updateWineImageAction(
                    imageWine.id,
                    imageUrl,
                  );
                  if (result.ok) setImageWine(null);
                  return result;
                });
              }}
            >
              Salveaza
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(reportsWine)}
        onOpenChange={(open) => !open && setReportsWine(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Rapoarte: {reportsWine?.name}</DialogTitle>
          </DialogHeader>
          <ul className="space-y-3 text-sm">
            {reportsWine?.reports.map((report) => (
              <li
                key={report.id}
                className="rounded-lg border border-border/70 p-3"
              >
                <p className="text-foreground">{report.reason ?? "Fara motiv"}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {report.submittedBy ?? "anonim"} ·{" "}
                  {formatLongDate(report.createdAt)}
                </p>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => {
                if (!reportsWine) return;
                runAction(async () => {
                  const result = await resolveWineReportsAction(reportsWine.id);
                  if (result.ok) setReportsWine(null);
                  return result;
                });
              }}
            >
              Marcheaza toate rezolvate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WineTable({
  wines,
  pending,
  onApprove,
  onReject,
  onEdit,
  onImage,
  onReports,
}: {
  wines: AdminWineRow[];
  pending: boolean;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onEdit: (wine: AdminWineRow) => void;
  onImage: (wine: AdminWineRow) => void;
  onReports: (wine: AdminWineRow) => void;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nume</TableHead>
            <TableHead>Producator</TableHead>
            <TableHead>Vintage</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Rapoarte</TableHead>
            <TableHead>Adaugat</TableHead>
            <TableHead className="text-right">Actiuni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {wines.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="py-10 text-center text-muted-foreground"
              >
                Niciun vin in aceasta categorie.
              </TableCell>
            </TableRow>
          ) : (
            wines.map((wine) => (
              <TableRow key={wine.id}>
                <TableCell>
                  <Link
                    href={`/wines/${wine.slug}`}
                    className="font-medium text-foreground hover:text-wine"
                    target="_blank"
                  >
                    {wine.name}
                  </Link>
                </TableCell>
                <TableCell>{wine.wineryName ?? "-"}</TableCell>
                <TableCell>{wine.vintage ?? "-"}</TableCell>
                <TableCell>
                  <Badge className={statusBadgeClass[wine.status]}>
                    {statusLabels[wine.status]}
                  </Badge>
                </TableCell>
                <TableCell>{wine.reportCount}</TableCell>
                <TableCell>{formatLongDate(wine.createdAt) ?? "-"}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {wine.status === "user_submitted" ? (
                      <Button
                        size="sm"
                        disabled={pending}
                        className="bg-wine text-wine-foreground hover:bg-wine/90"
                        onClick={() => onApprove(wine.id)}
                      >
                        Aproba
                      </Button>
                    ) : null}
                    {wine.status !== "rejected" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => onReject(wine.id)}
                      >
                        Respinge
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(wine)}
                    >
                      Editeaza
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onImage(wine)}
                    >
                      Imagine
                    </Button>
                    {wine.reportCount > 0 ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onReports(wine)}
                      >
                        Rapoarte
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function ReportList({
  reports,
  wines,
  pending,
  onResolve,
  onViewWineReports,
}: {
  reports: AdminReportRow[];
  wines: AdminWineRow[];
  pending: boolean;
  onResolve: (wineId: number) => void;
  onViewWineReports: (wine: AdminWineRow) => void;
}) {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="font-serif text-xl font-semibold">
          Vinuri cu rapoarte active
        </h2>
        <div className="rounded-2xl border border-border/70 bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vin</TableHead>
                <TableHead>Total rapoarte</TableHead>
                <TableHead className="text-right">Actiuni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wines.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Niciun vin cu rapoarte active.
                  </TableCell>
                </TableRow>
              ) : (
                wines.map((wine) => (
                  <TableRow key={wine.id}>
                    <TableCell>
                      <Link
                        href={`/wines/${wine.slug}`}
                        className="font-medium hover:text-wine"
                        target="_blank"
                      >
                        {wine.name}
                      </Link>
                    </TableCell>
                    <TableCell>{wine.reportCount}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onViewWineReports(wine)}
                        >
                          Vezi motive
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() => onResolve(wine.id)}
                        >
                          Marcheaza rezolvat
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-serif text-xl font-semibold">Rapoarte recente</h2>
        <div className="rounded-2xl border border-border/70 bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vin</TableHead>
                <TableHead>Motiv</TableHead>
                <TableHead>De la</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Actiuni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Niciun raport recent.
                  </TableCell>
                </TableRow>
              ) : (
                reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <Link
                        href={`/wines/${report.wineSlug}`}
                        className="font-medium hover:text-wine"
                        target="_blank"
                      >
                        {report.wineName}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {report.reportCount} total
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs whitespace-normal text-sm">
                      {report.reason ?? "Fara detalii"}
                    </TableCell>
                    <TableCell>{report.submittedBy ?? "anonim"}</TableCell>
                    <TableCell>
                      {formatLongDate(report.createdAt) ?? "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => onResolve(report.wineId)}
                      >
                        Marcheaza rezolvat
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-serif text-3xl font-bold text-foreground">
        {value}
      </p>
    </div>
  );
}

function EditWineDialog({
  wine,
  open,
  onOpenChange,
  pending,
  onSave,
}: {
  wine: AdminWineRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  onSave: (payload: {
    wineId: number;
    descriptionEditorial?: string;
    valueExplanation?: string;
    tasteProfile?: string;
    valueScore?: number;
    giftScore?: number;
    foodMatchScore?: number;
    thingsYouShouldKnow?: string;
  }) => void;
}) {
  if (!wine) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editeaza: {wine.name}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            onSave({
              wineId: wine.id,
              descriptionEditorial: String(
                formData.get("descriptionEditorial") ?? "",
              ),
              valueExplanation: String(formData.get("valueExplanation") ?? ""),
              tasteProfile: String(formData.get("tasteProfile") ?? ""),
              valueScore: Number(formData.get("valueScore") || wine.valueScore),
              giftScore: Number(formData.get("giftScore") || wine.giftScore),
              foodMatchScore: Number(
                formData.get("foodMatchScore") || wine.foodMatchScore,
              ),
              thingsYouShouldKnow: String(
                formData.get("thingsYouShouldKnow") ?? "",
              ),
            });
            onOpenChange(false);
          }}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <ScoreField
              label="Value Score"
              name="valueScore"
              defaultValue={wine.valueScore ?? 70}
            />
            <ScoreField
              label="Gift Score"
              name="giftScore"
              defaultValue={wine.giftScore ?? 60}
            />
            <ScoreField
              label="Food Match"
              name="foodMatchScore"
              defaultValue={wine.foodMatchScore ?? 70}
            />
          </div>
          <Field
            label="Descriere editoriala"
            name="descriptionEditorial"
            defaultValue={wine.descriptionEditorial ?? ""}
            rows={4}
          />
          <Field
            label="Value explanation"
            name="valueExplanation"
            defaultValue={wine.valueExplanation ?? ""}
            rows={3}
          />
          <Field
            label="Profil gustativ"
            name="tasteProfile"
            defaultValue={wine.tasteProfile ?? ""}
            rows={2}
          />
          <Field
            label="Things you should know (cate un insight pe linie)"
            name="thingsYouShouldKnow"
            defaultValue={wine.thingsYouShouldKnow.join("\n")}
            rows={4}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Anuleaza
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className="bg-wine text-wine-foreground hover:bg-wine/90"
            >
              Salveaza
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  name,
  defaultValue,
  rows,
}: {
  label: string;
  name: string;
  defaultValue: string;
  rows: number;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Textarea id={name} name={name} defaultValue={defaultValue} rows={rows} />
    </div>
  );
}

function ScoreField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: number;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type="number"
        min={1}
        max={100}
        defaultValue={defaultValue}
      />
    </div>
  );
}
