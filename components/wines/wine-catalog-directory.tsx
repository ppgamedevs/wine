"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { WineCard } from "@/components/wine-card";
import { Input } from "@/components/ui/input";
import { wineTypeLabel } from "@/lib/format";
import type { WineWithRelations } from "@/types";

export function WineCatalogDirectory({
  wines,
}: {
  wines: WineWithRelations[];
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return wines;

    return wines.filter((wine) => {
      const grapes = wine.grapeVarieties.map((grape) => grape.name).join(" ");
      const haystack = [
        wine.name,
        wine.winery?.name ?? "",
        wine.region?.name ?? "",
        wineTypeLabel[wine.type],
        wine.vintage?.toString() ?? "",
        grapes,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [query, wines]);

  return (
    <div>
      <div className="relative mx-auto max-w-xl">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cauta dupa nume, crama, regiune sau soi..."
          aria-label="Cauta vinuri"
          className="h-12 rounded-full border-border/70 pl-12 text-base shadow-sm focus-visible:ring-wine/40"
        />
      </div>

      {filtered.length > 0 ? (
        <>
          <p className="mt-6 text-sm text-muted-foreground" aria-live="polite">
            {filtered.length}{" "}
            {filtered.length === 1 ? "vin gasit" : "vinuri gasite"}
          </p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((wine, index) => (
              <WineCard key={wine.id} wine={wine} priority={index < 4} />
            ))}
          </div>
        </>
      ) : (
        <p className="mt-10 rounded-2xl border border-dashed border-border bg-secondary/20 p-10 text-center text-muted-foreground">
          Niciun vin nu corespunde cautarii{" "}
          <span className="font-medium text-foreground">
            &ldquo;{query}&rdquo;
          </span>
          .
        </p>
      )}
    </div>
  );
}
