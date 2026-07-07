"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { updateWineryPremiumAction } from "@/app/admin/actions";
import { PremiumBadge } from "@/components/wineries/premium-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { AdminWineryRow } from "@/lib/admin-queries";

interface WineryAdminPanelProps {
  wineries: AdminWineryRow[];
  initialSearch: string;
  highlightWinery: AdminWineryRow | null;
}

export function WineryAdminPanel({
  wineries,
  initialSearch,
  highlightWinery,
}: WineryAdminPanelProps) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [selected, setSelected] = useState<AdminWineryRow | null>(
    highlightWinery,
  );
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function applySearch(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (selected) params.set("wineryId", String(selected.id));
    router.push(`/admin/wineries?${params.toString()}`);
  }

  async function savePremium(formData: FormData) {
    if (!selected) return;
    setPending(true);
    setMessage(null);
    setError(null);

    const result = await updateWineryPremiumAction({
      wineryId: selected.id,
      isPremium: formData.get("isPremium") === "on",
      customBannerUrl: String(formData.get("customBannerUrl") ?? ""),
      customStory: String(formData.get("customStory") ?? ""),
      analyticsEnabled: formData.get("analyticsEnabled") === "on",
      leadCaptureEnabled: formData.get("leadCaptureEnabled") === "on",
      featuredPlacement: formData.get("featuredPlacement") === "on",
    });

    setPending(false);
    if (result.ok) {
      setMessage(result.message ?? "Salvat.");
      router.refresh();
      return;
    }
    setError(result.error ?? "Eroare la salvare.");
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">
            Admin crame
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Activeaza Premium Profile, banner, poveste si optiuni avansate.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/wines">Inapoi la vinuri</Link>
        </Button>
      </div>

      <form onSubmit={applySearch} className="flex max-w-md gap-2">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cauta crama..."
        />
        <Button type="submit" variant="secondary">
          Cauta
        </Button>
      </form>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Crama</TableHead>
                  <TableHead>Regiune</TableHead>
                  <TableHead>Vinuri</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wineries.map((winery) => (
                  <TableRow
                    key={winery.id}
                    className={
                      selected?.id === winery.id ? "bg-wine/5" : undefined
                    }
                    onClick={() => setSelected(winery)}
                  >
                    <TableCell className="font-medium">
                      <button
                        type="button"
                        className="text-left hover:text-wine"
                        onClick={() => setSelected(winery)}
                      >
                        {winery.name}
                      </button>
                    </TableCell>
                    <TableCell>{winery.regionName ?? "-"}</TableCell>
                    <TableCell>{winery.wineCount}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {winery.isPremium ? <PremiumBadge size="sm" /> : null}
                        {winery.verified ? (
                          <span className="text-xs text-wine">Verificata</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Neverificata
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            {selected ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-serif text-xl font-semibold">
                    {selected.name}
                  </h2>
                  {selected.isPremium ? <PremiumBadge size="sm" /> : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  <Link
                    href={`/wineries/${selected.slug}`}
                    className="text-wine hover:underline"
                    target="_blank"
                  >
                    Vezi profil public
                  </Link>
                </p>

                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void savePremium(new FormData(event.currentTarget));
                  }}
                  className="mt-6 space-y-4"
                >
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="isPremium"
                      defaultChecked={selected.isPremium}
                      className="rounded border-input"
                    />
                    <span className="font-medium">Profil Premium activ</span>
                  </label>

                  <div className="space-y-2">
                    <Label htmlFor="customBannerUrl">Banner URL</Label>
                    <Input
                      id="customBannerUrl"
                      name="customBannerUrl"
                      defaultValue={selected.customBannerUrl ?? ""}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customStory">Poveste editoriala</Label>
                    <Textarea
                      id="customStory"
                      name="customStory"
                      rows={6}
                      defaultValue={selected.customStory ?? ""}
                      placeholder="Paragrafe separate prin linie goala..."
                    />
                  </div>

                  <div className="space-y-2 rounded-lg border border-border/70 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Optiuni Premium
                    </p>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="analyticsEnabled"
                        defaultChecked={selected.analyticsEnabled}
                        className="rounded border-input"
                      />
                      Analytics activ
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="leadCaptureEnabled"
                        defaultChecked={selected.leadCaptureEnabled}
                        className="rounded border-input"
                      />
                      Lead capture activ
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="featuredPlacement"
                        defaultChecked={selected.featuredPlacement}
                        className="rounded border-input"
                      />
                      Featured placement
                    </label>
                  </div>

                  {message ? (
                    <p className="text-sm text-wine">{message}</p>
                  ) : null}
                  {error ? (
                    <p className="text-sm text-destructive">{error}</p>
                  ) : null}

                  <Button
                    type="submit"
                    disabled={pending}
                    className="w-full bg-wine text-wine-foreground hover:bg-wine/90"
                  >
                    {pending ? "Se salveaza..." : "Salveaza Premium"}
                  </Button>
                </form>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Selecteaza o crama din lista pentru a edita profilul Premium.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
