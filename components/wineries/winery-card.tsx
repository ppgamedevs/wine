import {
  ArrowRight,
  Building2,
  CheckCircle2,
  MapPin,
  Wine as WineIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { WineryListItem } from "@/types";

export function WineryCard({ winery }: { winery: WineryListItem }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card transition-all duration-300 hover:-translate-y-1 hover:border-wine/30 hover:shadow-xl">
      <div className="flex items-start gap-4 p-5">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-wine/15 bg-gradient-to-br from-wine/[0.08] via-white to-wine/[0.12] shadow-sm ring-1 ring-wine/10">
          {winery.logoUrl ? (
            <Image
              src={winery.logoUrl}
              alt={winery.name}
              fill
              sizes="64px"
              className="object-contain p-1.5"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-wine/10 text-wine">
              <Building2 className="h-7 w-7" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {winery.region?.name ? (
              <span className="inline-flex items-center gap-0.5">
                <MapPin className="h-3 w-3" aria-hidden="true" />
                {winery.region.name}
              </span>
            ) : (
              <span>Romania</span>
            )}
            {winery.verified ? (
              <span className="inline-flex items-center gap-0.5 text-wine">
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                Verificata
              </span>
            ) : (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-medium">
                Neverificata
              </Badge>
            )}
          </div>

          <h3 className="mt-1 truncate font-serif text-lg font-semibold leading-snug text-foreground">
            <Link
              href={`/wineries/${winery.slug}`}
              className="transition-colors hover:text-wine"
            >
              {winery.name}
            </Link>
          </h3>
        </div>
      </div>

      {winery.description ? (
        <p className="line-clamp-2 px-5 text-sm leading-relaxed text-muted-foreground">
          {winery.description}
        </p>
      ) : null}

      <div className="mt-auto flex items-center justify-between gap-3 px-5 pb-5 pt-4">
        <div className="flex items-center gap-4 text-sm">
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <WineIcon className="h-4 w-4 text-wine" aria-hidden="true" />
            {winery.wineCount}{" "}
            {winery.wineCount === 1 ? "vin" : "vinuri"}
          </span>
          {winery.avgValueScore !== null ? (
            <span className="text-muted-foreground">
              Value{" "}
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
          <Link href={`/wineries/${winery.slug}`} aria-label={`Vezi crama ${winery.name}`}>
            Vezi crama
            <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" />
          </Link>
        </Button>
      </div>
    </article>
  );
}
