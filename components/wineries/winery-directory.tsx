import {
  ArrowRight,
  CheckCircle2,
  MapPin,
  Search,
  Wine as WineIcon,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WineryLogo } from "@/components/wineries/winery-logo";
import type { WineryCardCopy } from "@/components/wineries/winery-card";
import type { AppLocale } from "@/i18n/locale";
import { localizedHref } from "@/i18n/paths";
import { formatLongDate, formatRon } from "@/lib/format";
import type { PublicWineryDirectoryItem } from "@/lib/public-wine-card-types";
import { resolveWineryLogoUrl } from "@/lib/winery-catalog";

export interface WineryDirectoryCopy {
  searchPlaceholder: string;
  searchAria: string;
  apply: string;
  reset: string;
  foundOne: string;
  foundMany: string;
  noResults: string;
  previous: string;
  next: string;
  page: string;
  card: WineryCardCopy;
}

function directoryHref(basePath: string, query: string, page: number): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `${basePath}?${search}` : basePath;
}

function WineryDirectoryCard({
  winery,
  locale,
  copy,
}: {
  winery: PublicWineryDirectoryItem;
  locale: AppLocale;
  copy: WineryCardCopy;
}) {
  const logoUrl = resolveWineryLogoUrl(winery.slug, winery.logoUrl);
  const wineryHref = localizedHref(locale, "winery", { slug: winery.slug });

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card transition-all duration-300 hover:-translate-y-1 hover:border-wine/30 hover:shadow-xl">
      <div className="flex items-start gap-4 p-5">
        <WineryLogo name={winery.name} logoUrl={logoUrl} size="card" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {winery.regionName ? (
              <span className="inline-flex items-center gap-0.5">
                <MapPin className="h-3 w-3" aria-hidden="true" />
                {winery.regionName}
              </span>
            ) : (
              <span>{copy.country}</span>
            )}
            {winery.verified ? (
              <span className="inline-flex items-center gap-0.5 text-wine">
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                {copy.verified}
              </span>
            ) : (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                {copy.unverified}
              </Badge>
            )}
          </div>
          <h3 className="mt-1 truncate font-serif text-lg font-semibold leading-snug text-foreground">
            <Link href={wineryHref} className="transition-colors hover:text-wine">
              {winery.name}
            </Link>
          </h3>
        </div>
      </div>

      {winery.description && locale === "ro" ? (
        <p className="line-clamp-2 px-5 text-sm leading-relaxed text-muted-foreground">
          {winery.description}
        </p>
      ) : null}

      <div className="space-y-2 px-5 pt-3 text-sm text-muted-foreground">
        {winery.priceRange ? (
          <p>
            {copy.price}{" "}
            <span className="font-medium text-foreground">
              {formatRon(winery.priceRange.min, locale)}
              {winery.priceRange.max !== winery.priceRange.min
                ? ` ${locale === "en" ? "to" : "-"} ${formatRon(
                    winery.priceRange.max,
                    locale,
                  )}`
                : ""}
            </span>
          </p>
        ) : null}
        {winery.bestWine ? (
          <p>
            {copy.best}{" "}
            <Link
              href={localizedHref(locale, "wine", {
                slug: winery.bestWine.slug,
              })}
              className="font-medium text-wine hover:underline"
            >
              {winery.bestWine.name}
            </Link>
            {winery.bestWine.valueScore != null ? (
              <span> ({winery.bestWine.valueScore}/100)</span>
            ) : null}
          </p>
        ) : null}
        {winery.bestUnder50 ? (
          <p>
            {copy.under50}{" "}
            <Link
              href={localizedHref(locale, "wine", {
                slug: winery.bestUnder50.slug,
              })}
              className="font-medium text-foreground hover:text-wine hover:underline"
            >
              {winery.bestUnder50.name}
            </Link>
          </p>
        ) : null}
        {winery.topGrapes.length > 0 ? (
          <p className="line-clamp-1">
            {copy.grapes}{" "}
            <span className="text-foreground">{winery.topGrapes.join(", ")}</span>
          </p>
        ) : null}
        {winery.lastPriceCheck ? (
          <p className="text-xs">
            {copy.checked} {formatLongDate(winery.lastPriceCheck, locale)}
          </p>
        ) : null}
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 px-5 pb-5 pt-4">
        <div className="flex items-center gap-4 text-sm">
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <WineIcon className="h-4 w-4 text-wine" aria-hidden="true" />
            {winery.wineCount}{" "}
            {winery.wineCount === 1 ? copy.wineOne : copy.wineMany}
          </span>
          {winery.avgValueScore !== null ? (
            <span className="text-muted-foreground">
              {copy.value}{" "}
              <span className="font-semibold text-foreground">
                {winery.avgValueScore}
              </span>
            </span>
          ) : null}
        </div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="group/btn -mr-2 text-wine hover:bg-wine/10 hover:text-wine"
        >
          <Link
            href={wineryHref}
            aria-label={copy.viewAria.replace("{name}", winery.name)}
          >
            {copy.view}
            <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" />
          </Link>
        </Button>
      </div>
    </article>
  );
}

export function WineryDirectory({
  wineries,
  query,
  total,
  page,
  totalPages,
  basePath,
  locale,
  copy,
}: {
  wineries: PublicWineryDirectoryItem[];
  query: string;
  total: number;
  page: number;
  totalPages: number;
  basePath: string;
  locale: AppLocale;
  copy: WineryDirectoryCopy;
}) {
  return (
    <div>
      <form
        action={basePath}
        method="get"
        className="mx-auto flex max-w-xl gap-2"
      >
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            name="q"
            defaultValue={query}
            placeholder={copy.searchPlaceholder}
            aria-label={copy.searchAria}
            className="h-12 rounded-full border-border/70 pl-12 text-base shadow-sm focus-visible:ring-wine/40"
          />
        </div>
        <Button type="submit" className="h-12 bg-wine hover:bg-wine/90">
          {copy.apply}
        </Button>
        {query ? (
          <Button asChild variant="ghost" className="h-12">
            <Link href={basePath}>{copy.reset}</Link>
          </Button>
        ) : null}
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        {total} {total === 1 ? copy.foundOne : copy.foundMany}
      </p>

      {wineries.length > 0 ? (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {wineries.map((winery) => (
            <WineryDirectoryCard
              key={winery.slug}
              winery={winery}
              locale={locale}
              copy={copy.card}
            />
          ))}
        </div>
      ) : (
        <p className="mt-10 rounded-2xl border border-dashed border-border bg-secondary/20 p-10 text-center text-muted-foreground">
          {copy.noResults}
          {query ? (
            <>
              {" "}
              <span className="font-medium text-foreground">
                &ldquo;{query}&rdquo;
              </span>
              .
            </>
          ) : null}
        </p>
      )}

      {totalPages > 1 ? (
        <nav
          aria-label={copy.page}
          className="mt-8 flex items-center justify-center gap-4 border-t border-border/60 pt-6"
        >
          {page > 1 ? (
            <Link
              rel="prev"
              href={directoryHref(basePath, query, page - 1)}
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
              href={directoryHref(basePath, query, page + 1)}
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
