"use client";

import { motion } from "framer-motion";
import { ArrowUpDown, Search, Sparkles, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
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
import { WineCardView } from "@/components/wines/wine-card-view";
import type { AppLocale } from "@/i18n/locale";
import { wineTypeGradient } from "@/lib/format";
import { EASE_OUT } from "@/lib/motion";
import type { PublicWineCatalogItem } from "@/lib/public-wine-card-types";
import {
  MIN_RECOMMENDED_VALUE_SCORE,
  VALUE_SCORE_EXCEPTIONAL_MIN,
} from "@/lib/value-score-thresholds";
import {
  countWinesBySweetness,
  countWinesByType,
  DEFAULT_CATALOG_FILTERS,
  filterCatalogWines,
  groupCatalogWinesByType,
  hasActiveCatalogFilters,
  type CatalogFilterState,
  type CatalogPriceBand,
  type CatalogSort,
  type CatalogSweetnessFilter,
  type CatalogTypeFilter,
  type CatalogVerdictFilter,
} from "@/lib/wine-catalog-filters";
import { cn } from "@/lib/utils";
import type { WineType } from "@/types";

type FilterKey = "type" | "sweetness" | "priceBand" | "verdict" | "query";

export interface WineCatalogDirectoryCopy {
  searchPlaceholder: string;
  searchAria: string;
  typeLabel: string;
  sweetnessLabel: string;
  sortAria: string;
  sortPlaceholder: string;
  priceAria: string;
  pricePlaceholder: string;
  scoreAria: string;
  scorePlaceholder: string;
  reset: string;
  foundOne: string;
  foundMany: string;
  removeFilter: string;
  recommendedNote: string;
  exceptionalNote: string;
  noResults: string;
  noResultsHint: string;
  resetFilters: string;
  viewOnly: string;
  types: Record<CatalogTypeFilter, string>;
  sweetness: Record<CatalogSweetnessFilter, string>;
  sort: Record<CatalogSort, string>;
  prices: Record<CatalogPriceBand, string>;
  scores: {
    all: string;
    recommended: string;
    exceptional: string;
    recommendedChip: string;
    exceptionalChip: string;
  };
  sections: Record<WineType, string>;
  sectionDescriptions: {
    sparkling: string;
    orange: string;
    default: string;
  };
}

function FilterChip({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all",
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

function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
    </div>
  );
}

function WineGrid({
  wines,
  locale,
  priorityCount = 4,
}: {
  wines: PublicWineCatalogItem[];
  locale: AppLocale;
  priorityCount?: number;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {wines.map((wine, index) => (
        <WineCardView
          key={wine.id}
          card={wine.card}
          priority={index < priorityCount}
          locale={locale}
        />
      ))}
    </div>
  );
}

function replaceToken(template: string, token: string, value: string | number) {
  return template.replace(`{${token}}`, String(value));
}

function TypeSectionHeader({
  type,
  count,
  copy,
  onViewAll,
}: {
  type: WineType;
  count: number;
  copy: WineCatalogDirectoryCopy;
  onViewAll: () => void;
}) {
  const typeLabel = copy.types[type].toLocaleLowerCase();
  const description =
    type === "sparkling"
      ? copy.sectionDescriptions.sparkling
      : type === "orange"
        ? copy.sectionDescriptions.orange
        : replaceToken(copy.sectionDescriptions.default, "type", typeLabel);

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
            {copy.sections[type]} · {count}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-wine hover:bg-wine/10 hover:text-wine"
        onClick={onViewAll}
      >
        {replaceToken(copy.viewOnly, "type", typeLabel)}
      </Button>
    </div>
  );
}

export function WineCatalogDirectory({
  wines,
  locale,
  copy,
}: {
  wines: PublicWineCatalogItem[];
  locale: AppLocale;
  copy: WineCatalogDirectoryCopy;
}) {
  const [filters, setFilters] = useState<CatalogFilterState>(
    DEFAULT_CATALOG_FILTERS,
  );
  const typeOptions = useMemo(
    () => countWinesByType(wines, filters),
    [wines, filters],
  );
  const sweetnessOptions = useMemo(
    () => countWinesBySweetness(wines, filters),
    [wines, filters],
  );
  const filtered = useMemo(
    () => filterCatalogWines(wines, filters),
    [wines, filters],
  );
  const grouped = useMemo(
    () => (filters.type === "all" ? groupCatalogWinesByType(filtered) : []),
    [filtered, filters.type],
  );
  const active = hasActiveCatalogFilters(filters);
  const activeChips: Array<{ key: FilterKey; label: string }> = [];

  if (filters.query.trim()) {
    activeChips.push({ key: "query", label: `"${filters.query.trim()}"` });
  }
  if (filters.type !== "all") {
    activeChips.push({ key: "type", label: copy.types[filters.type] });
  }
  if (filters.sweetness !== "all") {
    activeChips.push({
      key: "sweetness",
      label: copy.sweetness[filters.sweetness],
    });
  }
  if (filters.priceBand !== "all") {
    activeChips.push({
      key: "priceBand",
      label: copy.prices[filters.priceBand],
    });
  }
  if (filters.verdict === "recommended") {
    activeChips.push({
      key: "verdict",
      label: copy.scores.recommendedChip,
    });
  }
  if (filters.verdict === "exceptional") {
    activeChips.push({
      key: "verdict",
      label: copy.scores.exceptionalChip,
    });
  }

  function patchFilters(patch: Partial<CatalogFilterState>) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function resetFilters() {
    setFilters(DEFAULT_CATALOG_FILTERS);
  }

  function clearChip(key: FilterKey) {
    if (key === "type") patchFilters({ type: "all" });
    if (key === "sweetness") patchFilters({ sweetness: "all" });
    if (key === "priceBand") patchFilters({ priceBand: "all" });
    if (key === "verdict") patchFilters({ verdict: "all" });
    if (key === "query") patchFilters({ query: "" });
  }

  const sortOptions: Array<{ id: CatalogSort; label: string }> = [
    { id: "value-desc", label: copy.sort["value-desc"] },
    { id: "price-asc", label: copy.sort["price-asc"] },
    { id: "price-desc", label: copy.sort["price-desc"] },
    { id: "name-asc", label: copy.sort["name-asc"] },
  ];

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
          placeholder={copy.searchPlaceholder}
          aria-label={copy.searchAria}
          className="h-12 rounded-2xl border-border/70 bg-background pl-12 text-base shadow-sm focus-visible:ring-wine/40"
        />
      </div>

      <div className="sticky top-[4.25rem] z-40 -mx-6 border-y border-border/60 bg-background/95 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto max-w-6xl space-y-3">
          <ChipRow label={copy.typeLabel}>
            {typeOptions.map((option) => (
              <FilterChip
                key={option.id}
                active={filters.type === option.id}
                count={option.count}
                onClick={() =>
                  patchFilters({ type: option.id as CatalogTypeFilter })
                }
              >
                {copy.types[option.id]}
              </FilterChip>
            ))}
          </ChipRow>

          <ChipRow label={copy.sweetnessLabel}>
            {sweetnessOptions.map((option) => (
              <FilterChip
                key={option.id}
                active={filters.sweetness === option.id}
                count={option.count}
                onClick={() =>
                  patchFilters({
                    sweetness: option.id as CatalogSweetnessFilter,
                  })
                }
              >
                {copy.sweetness[option.id]}
              </FilterChip>
            ))}
          </ChipRow>

          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={filters.sort}
              onValueChange={(value) =>
                patchFilters({ sort: value as CatalogSort })
              }
            >
              <SelectTrigger
                size="sm"
                className="min-w-[10rem]"
                aria-label={copy.sortAria}
              >
                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder={copy.sortPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.priceBand}
              onValueChange={(value) =>
                patchFilters({ priceBand: value as CatalogPriceBand })
              }
            >
              <SelectTrigger
                size="sm"
                className="min-w-[8rem]"
                aria-label={copy.priceAria}
              >
                <SelectValue placeholder={copy.pricePlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{copy.prices.all}</SelectItem>
                <SelectItem value="under50">{copy.prices.under50}</SelectItem>
                <SelectItem value="50-100">
                  {copy.prices["50-100"]}
                </SelectItem>
                <SelectItem value="over100">{copy.prices.over100}</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.verdict}
              onValueChange={(value) =>
                patchFilters({ verdict: value as CatalogVerdictFilter })
              }
            >
              <SelectTrigger
                size="sm"
                className="min-w-[9rem]"
                aria-label={copy.scoreAria}
              >
                <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder={copy.scorePlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{copy.scores.all}</SelectItem>
                <SelectItem value="recommended">
                  {replaceToken(
                    copy.scores.recommended,
                    "score",
                    MIN_RECOMMENDED_VALUE_SCORE,
                  )}
                </SelectItem>
                <SelectItem value="exceptional">
                  {replaceToken(
                    copy.scores.exceptional,
                    "score",
                    VALUE_SCORE_EXCEPTIONAL_MIN,
                  )}
                </SelectItem>
              </SelectContent>
            </Select>

            {active ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
                {copy.reset}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div aria-live="polite" className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="rounded-full px-3 py-1 text-sm">
          {filtered.length}{" "}
          {filtered.length === 1 ? copy.foundOne : copy.foundMany}
        </Badge>
        {activeChips.map((chip) => (
          <button
            key={`${chip.key}-${chip.label}`}
            type="button"
            onClick={() => clearChip(chip.key)}
            className="inline-flex items-center gap-1 rounded-full border border-wine/30 bg-wine/5 px-2.5 py-1 text-xs font-medium text-wine"
          >
            {chip.label}
            <X className="h-3 w-3" aria-hidden="true" />
            <span className="sr-only">
              {replaceToken(copy.removeFilter, "label", chip.label)}
            </span>
          </button>
        ))}
        {filters.verdict === "recommended" ? (
          <span className="text-sm text-muted-foreground">
            {replaceToken(
              copy.recommendedNote,
              "score",
              MIN_RECOMMENDED_VALUE_SCORE,
            )}
          </span>
        ) : null}
        {filters.verdict === "exceptional" ? (
          <span className="text-sm text-muted-foreground">
            {replaceToken(
              copy.exceptionalNote,
              "score",
              VALUE_SCORE_EXCEPTIONAL_MIN,
            )}
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
                transition={{
                  duration: 0.45,
                  ease: EASE_OUT,
                  delay: sectionIndex * 0.04,
                }}
                aria-labelledby={`catalog-section-${section.type}`}
                className="space-y-6"
              >
                <TypeSectionHeader
                  type={section.type}
                  count={section.wines.length}
                  copy={copy}
                  onViewAll={() => patchFilters({ type: section.type })}
                />
                <WineGrid
                  wines={section.wines}
                  locale={locale}
                  priorityCount={sectionIndex === 0 ? 4 : 0}
                />
              </motion.section>
            ))}
          </div>
        ) : (
          <WineGrid wines={filtered} locale={locale} />
        )
      ) : (
        <div className="rounded-3xl border border-dashed border-border bg-secondary/20 px-6 py-16 text-center">
          <p className="font-serif text-xl text-foreground">{copy.noResults}</p>
          <p className="mx-auto mt-2 max-w-md text-muted-foreground">
            {copy.noResultsHint}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-6 border-wine/30 text-wine hover:bg-wine/10"
            onClick={resetFilters}
          >
            {copy.resetFilters}
          </Button>
        </div>
      )}
    </div>
  );
}
