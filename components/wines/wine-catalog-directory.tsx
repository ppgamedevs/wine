"use client";

import { motion } from "framer-motion";
import {
  ArrowUpDown,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { WineCard } from "@/components/wine-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { wineTypeGradient, wineTypeLabel } from "@/lib/format";
import { EASE_OUT } from "@/lib/motion";
import {
  catalogSectionHeading,
  countWinesByType,
  DEFAULT_CATALOG_FILTERS,
  filterCatalogWines,
  groupCatalogWinesByType,
  type CatalogFilterState,
  type CatalogPriceBand,
  type CatalogSort,
  type CatalogTypeFilter,
  type CatalogVerdictFilter,
} from "@/lib/wine-catalog-filters";
import { cn } from "@/lib/utils";
import type { WineType, WineWithRelations } from "@/types";

function FilterChip({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all",
        active
          ? "border-wine bg-wine text-wine-foreground shadow-sm"
          : "border-border/70 bg-background text-muted-foreground hover:border-wine/40 hover:text-foreground",
      )}
    >
      {children}
      {count != null ? (
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
            active ? "bg-white/20" : "bg-secondary text-muted-foreground",
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

function WineGrid({
  wines,
  priorityCount = 4,
}: {
  wines: WineWithRelations[];
  priorityCount?: number;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {wines.map((wine, index) => (
        <WineCard
          key={wine.id}
          wine={wine}
          priority={index < priorityCount}
          minValueScore={null}
        />
      ))}
    </div>
  );
}

function TypeSectionHeader({
  type,
  count,
  onViewAll,
}: {
  type: WineType;
  count: number;
  onViewAll: () => void;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/60 pb-4">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className={cn(
            "h-10 w-1 rounded-full bg-gradient-to-b",
            wineTypeGradient[type],
          )}
        />
        <div>
          <h2 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
            {catalogSectionHeading(type, count)}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {type === "sparkling"
              ? "Metoda traditionala, brut si ocazii festive"
              : type === "orange"
                ? "Vinuri macerate, expresie moderna romaneasca"
                : `Selectie ${wineTypeLabel[type].toLowerCase()} din catalogul VinIntel`}
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-wine hover:bg-wine/10 hover:text-wine"
        onClick={onViewAll}
      >
        Vezi doar {wineTypeLabel[type].toLowerCase()}
      </Button>
    </div>
  );
}

export function WineCatalogDirectory({
  wines,
}: {
  wines: WineWithRelations[];
}) {
  const [filters, setFilters] = useState<CatalogFilterState>(
    DEFAULT_CATALOG_FILTERS,
  );

  const typeOptions = useMemo(
    () =>
      countWinesByType(wines, {
        query: filters.query,
        sort: filters.sort,
        verdict: filters.verdict,
        priceBand: filters.priceBand,
      }),
    [wines, filters.query, filters.sort, filters.verdict, filters.priceBand],
  );

  const filtered = useMemo(
    () => filterCatalogWines(wines, filters),
    [wines, filters],
  );

  const grouped = useMemo(
    () => (filters.type === "all" ? groupCatalogWinesByType(filtered) : []),
    [filtered, filters.type],
  );

  const hasActiveFilters =
    filters.query.trim().length > 0 ||
    filters.type !== "all" ||
    filters.verdict !== "all" ||
    filters.priceBand !== "all" ||
    filters.sort !== "value-desc";

  function patchFilters(patch: Partial<CatalogFilterState>) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function resetFilters() {
    setFilters(DEFAULT_CATALOG_FILTERS);
  }

  return (
    <div className="space-y-8">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={filters.query}
          onChange={(event) => patchFilters({ query: event.target.value })}
          placeholder="Cauta dupa nume, crama, regiune sau soi..."
          aria-label="Cauta vinuri"
          className="h-12 rounded-2xl border-border/70 bg-background pl-12 text-base shadow-sm focus-visible:ring-wine/40"
        />
      </div>

      <div className="sticky top-[4.25rem] z-40 -mx-6 border-y border-border/60 bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <SlidersHorizontal className="h-4 w-4 text-wine" aria-hidden="true" />
            Tip vin
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {typeOptions.map((option) => (
              <FilterChip
                key={option.id}
                active={filters.type === option.id}
                count={option.count}
                onClick={() =>
                  patchFilters({ type: option.id as CatalogTypeFilter })
                }
              >
                {option.label}
              </FilterChip>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={filters.sort}
              onValueChange={(value) =>
                patchFilters({ sort: value as CatalogSort })
              }
            >
              <SelectTrigger size="sm" className="min-w-[10rem]">
                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Sortare" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="value-desc">Value Score (cel mai bun)</SelectItem>
                <SelectItem value="price-asc">Pret crescator</SelectItem>
                <SelectItem value="price-desc">Pret descrescator</SelectItem>
                <SelectItem value="name-asc">Nume A-Z</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.verdict}
              onValueChange={(value) =>
                patchFilters({ verdict: value as CatalogVerdictFilter })
              }
            >
              <SelectTrigger size="sm" className="min-w-[9rem]">
                <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Recomandare" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate scorurile</SelectItem>
                <SelectItem value="recommended">Merita banii (75+)</SelectItem>
                <SelectItem value="exceptional">Exceptionale (90+)</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.priceBand}
              onValueChange={(value) =>
                patchFilters({ priceBand: value as CatalogPriceBand })
              }
            >
              <SelectTrigger size="sm" className="min-w-[8rem]">
                <SelectValue placeholder="Pret" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Orice pret</SelectItem>
                <SelectItem value="under50">Sub 50 RON</SelectItem>
                <SelectItem value="50-100">50-100 RON</SelectItem>
                <SelectItem value="over100">Peste 100 RON</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
                Reseteaza
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div aria-live="polite" className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="rounded-full px-3 py-1 text-sm">
          {filtered.length}{" "}
          {filtered.length === 1 ? "vin gasit" : "vinuri gasite"}
        </Badge>
        {filters.verdict === "recommended" ? (
          <span className="text-sm text-muted-foreground">
            Afisam vinuri cu Value Score 75+ (merita banii)
          </span>
        ) : null}
        {filters.verdict === "exceptional" ? (
          <span className="text-sm text-muted-foreground">
            Afisam vinuri cu Value Score 90+ (valoare exceptionala)
          </span>
        ) : null}
      </div>

      {filtered.length > 0 ? (
        filters.type === "all" && !filters.query.trim() ? (
          <div className="space-y-14">
            {grouped.map((section, sectionIndex) => (
              <motion.section
                key={section.type}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, ease: EASE_OUT, delay: sectionIndex * 0.04 }}
                aria-labelledby={`catalog-section-${section.type}`}
                className="space-y-6"
              >
                <TypeSectionHeader
                  type={section.type}
                  count={section.wines.length}
                  onViewAll={() => patchFilters({ type: section.type })}
                />
                <WineGrid wines={section.wines} priorityCount={sectionIndex === 0 ? 4 : 0} />
              </motion.section>
            ))}
          </div>
        ) : (
          <WineGrid wines={filtered} />
        )
      ) : (
        <div className="rounded-3xl border border-dashed border-border bg-secondary/20 px-6 py-16 text-center">
          <p className="font-serif text-xl text-foreground">
            Niciun vin nu corespunde filtrelor
          </p>
          <p className="mx-auto mt-2 max-w-md text-muted-foreground">
            Incearca alt tip de vin, relaxeaza filtrele de pret sau cauta dupa
            nume, crama ori regiune.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-6 border-wine/30 text-wine hover:bg-wine/10"
            onClick={resetFilters}
          >
            Reseteaza filtrele
          </Button>
        </div>
      )}
    </div>
  );
}
