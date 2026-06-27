"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { WineryCard } from "@/components/wineries/winery-card";
import { Input } from "@/components/ui/input";
import type { WineryListItem } from "@/types";

export function WineryDirectory({
  wineries,
}: {
  wineries: WineryListItem[];
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return wineries;
    return wineries.filter((winery) => {
      const haystack = `${winery.name} ${winery.region?.name ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [query, wineries]);

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
          placeholder="Cauta dupa nume sau regiune..."
          aria-label="Cauta crame"
          className="h-12 rounded-full border-border/70 pl-12 text-base shadow-sm focus-visible:ring-wine/40"
        />
      </div>

      {filtered.length > 0 ? (
        <>
          <p className="mt-6 text-sm text-muted-foreground" aria-live="polite">
            {filtered.length}{" "}
            {filtered.length === 1 ? "crama gasita" : "crame gasite"}
          </p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((winery) => (
              <WineryCard key={winery.id} winery={winery} />
            ))}
          </div>
        </>
      ) : (
        <p className="mt-10 rounded-2xl border border-dashed border-border bg-secondary/20 p-10 text-center text-muted-foreground">
          Nicio crama nu corespunde cautarii{" "}
          <span className="font-medium text-foreground">
            &ldquo;{query}&rdquo;
          </span>
          .
        </p>
      )}
    </div>
  );
}
