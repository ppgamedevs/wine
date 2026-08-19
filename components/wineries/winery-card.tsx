import {
  ArrowRight,
  CheckCircle2,
  MapPin,
  Wine as WineIcon,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WineryLogo } from "@/components/wineries/winery-logo";
import { formatLongDate, formatRon } from "@/lib/format";
import { resolveWineryLogoUrl } from "@/lib/winery-catalog";
import type { WineryListItem } from "@/types";
import type { AppLocale } from "@/i18n/locale";
import { localizedHref } from "@/i18n/paths";

export interface WineryCardCopy {
  country: string;
  verified: string;
  unverified: string;
  price: string;
  best: string;
  under50: string;
  grapes: string;
  checked: string;
  wineOne: string;
  wineMany: string;
  value: string;
  view: string;
  viewAria: string;
}

const DEFAULT_COPY: WineryCardCopy = {
  country: "Romania",
  verified: "Verificata",
  unverified: "Neverificata",
  price: "Pret:",
  best: "Cel mai bun:",
  under50: "Sub 50 lei:",
  grapes: "Soiuri:",
  checked: "Verificat:",
  wineOne: "vin",
  wineMany: "vinuri",
  value: "Value",
  view: "Vezi crama",
  viewAria: "Vezi crama {name}",
};

export function WineryCard({
  winery,
  locale = "ro",
  copy = DEFAULT_COPY,
}: {
  winery: WineryListItem;
  locale?: AppLocale;
  copy?: WineryCardCopy;
}) {
  const logoUrl = resolveWineryLogoUrl(winery.slug, winery.logoUrl);
  const wineryHref = localizedHref(locale, "winery", { slug: winery.slug });

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card transition-all duration-300 hover:-translate-y-1 hover:border-wine/30 hover:shadow-xl">
      <div className="flex items-start gap-4 p-5">
        <WineryLogo name={winery.name} logoUrl={logoUrl} size="card" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {winery.region?.name ? (
              <span className="inline-flex items-center gap-0.5">
                <MapPin className="h-3 w-3" aria-hidden="true" />
                {winery.region.name}
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
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-medium">
                {copy.unverified}
              </Badge>
            )}
          </div>

          <h3 className="mt-1 truncate font-serif text-lg font-semibold leading-snug text-foreground">
            <Link
              href={wineryHref}
              className="transition-colors hover:text-wine"
            >
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
                ? ` ${locale === "en" ? "to" : "-"} ${formatRon(winery.priceRange.max, locale)}`
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
            {copy.checked}{" "}
            {formatLongDate(winery.lastPriceCheck, locale)}
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
