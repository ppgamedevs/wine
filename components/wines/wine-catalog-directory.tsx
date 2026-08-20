import Link from "next/link";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WineCardView } from "@/components/wines/wine-card-view";
import type { AppLocale } from "@/i18n/locale";
import type {
  PublicWineCardViewModel,
  PublicWineCatalogFacets,
  PublicWineCatalogFilters,
  PublicWineCatalogPriceBand,
  PublicWineCatalogSort,
  PublicWineCatalogVerdict,
} from "@/lib/public-wine-card-types";
import type { WineSweetness, WineType } from "@/types";

export interface WineCatalogDirectoryCopy {
  searchPlaceholder: string;
  searchAria: string;
  typeLabel: string;
  sweetnessLabel: string;
  sortAria: string;
  priceAria: string;
  scoreAria: string;
  apply: string;
  reset: string;
  foundOne: string;
  foundMany: string;
  noResults: string;
  noResultsHint: string;
  resetFilters: string;
  previous: string;
  next: string;
  page: string;
  types: Record<"all" | WineType, string>;
  sweetness: Record<"all" | WineSweetness, string>;
  sort: Record<PublicWineCatalogSort, string>;
  prices: Record<PublicWineCatalogPriceBand, string>;
  scores: Record<PublicWineCatalogVerdict, string>;
}

const selectClassName =
  "h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

function catalogHref(
  basePath: string,
  filters: PublicWineCatalogFilters,
  page: number,
): string {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.type !== "all") params.set("type", filters.type);
  if (filters.sweetness !== "all") {
    params.set("sweetness", filters.sweetness);
  }
  if (filters.sort !== "value-desc") params.set("sort", filters.sort);
  if (filters.priceBand !== "all") params.set("price", filters.priceBand);
  if (filters.verdict !== "all") params.set("score", filters.verdict);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function WineCatalogDirectory({
  wines,
  filters,
  facets,
  total,
  page,
  totalPages,
  basePath,
  locale,
  copy,
}: {
  wines: PublicWineCardViewModel[];
  filters: PublicWineCatalogFilters;
  facets: PublicWineCatalogFacets;
  total: number;
  page: number;
  totalPages: number;
  basePath: string;
  locale: AppLocale;
  copy: WineCatalogDirectoryCopy;
}) {
  return (
    <div className="space-y-8">
      <form action={basePath} method="get" className="space-y-4">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            name="q"
            defaultValue={filters.query}
            placeholder={copy.searchPlaceholder}
            aria-label={copy.searchAria}
            className="h-12 rounded-2xl border-border/70 bg-background pl-12 text-base shadow-sm focus-visible:ring-wine/40"
          />
        </div>

        <div className="grid gap-3 rounded-2xl border border-border/70 bg-background p-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
            <span>{copy.typeLabel}</span>
            <select
              name="type"
              defaultValue={filters.type}
              className={`${selectClassName} w-full`}
            >
              {facets.types.map((option) => (
                <option key={option.id} value={option.id}>
                  {copy.types[option.id]} ({option.count})
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
            <span>{copy.sweetnessLabel}</span>
            <select
              name="sweetness"
              defaultValue={filters.sweetness}
              className={`${selectClassName} w-full`}
            >
              {facets.sweetness.map((option) => (
                <option key={option.id} value={option.id}>
                  {copy.sweetness[option.id]} ({option.count})
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
            <span>{copy.sortAria}</span>
            <select
              name="sort"
              defaultValue={filters.sort}
              className={`${selectClassName} w-full`}
            >
              {Object.entries(copy.sort).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
            <span>{copy.priceAria}</span>
            <select
              name="price"
              defaultValue={filters.priceBand}
              className={`${selectClassName} w-full`}
            >
              {Object.entries(copy.prices).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
            <span>{copy.scoreAria}</span>
            <select
              name="score"
              defaultValue={filters.verdict}
              className={`${selectClassName} w-full`}
            >
              {Object.entries(copy.scores).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex gap-2 sm:col-span-2 lg:col-span-5">
            <Button type="submit" className="bg-wine hover:bg-wine/90">
              {copy.apply}
            </Button>
            <Button asChild variant="ghost">
              <Link href={basePath}>{copy.reset}</Link>
            </Button>
          </div>
        </div>
      </form>

      <Badge variant="secondary" className="rounded-full px-3 py-1 text-sm">
        {total} {total === 1 ? copy.foundOne : copy.foundMany}
      </Badge>

      {wines.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {wines.map((wine, index) => (
            <WineCardView
              key={wine.slug}
              card={wine}
              priority={index < 4}
              locale={locale}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-border bg-secondary/20 px-6 py-16 text-center">
          <p className="font-serif text-xl text-foreground">{copy.noResults}</p>
          <p className="mx-auto mt-2 max-w-md text-muted-foreground">
            {copy.noResultsHint}
          </p>
          <Button
            asChild
            variant="outline"
            className="mt-6 border-wine/30 text-wine hover:bg-wine/10"
          >
            <Link href={basePath}>{copy.resetFilters}</Link>
          </Button>
        </div>
      )}

      {totalPages > 1 ? (
        <nav
          aria-label={copy.page}
          className="flex items-center justify-center gap-4 border-t border-border/60 pt-6"
        >
          {page > 1 ? (
            <Link
              rel="prev"
              href={catalogHref(basePath, filters, page - 1)}
              className="text-sm font-medium text-wine hover:underline"
            >
              {copy.previous}
            </Link>
          ) : (
            <span className="text-sm text-muted-foreground/60">
              {copy.previous}
            </span>
          )}
          <span className="text-sm text-muted-foreground">
            {copy.page.replace("{page}", String(page)).replace(
              "{totalPages}",
              String(totalPages),
            )}
          </span>
          {page < totalPages ? (
            <Link
              rel="next"
              href={catalogHref(basePath, filters, page + 1)}
              className="text-sm font-medium text-wine hover:underline"
            >
              {copy.next}
            </Link>
          ) : (
            <span className="text-sm text-muted-foreground/60">{copy.next}</span>
          )}
        </nav>
      ) : null}
    </div>
  );
}
