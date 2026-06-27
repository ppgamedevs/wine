import { ArrowRight, MapPin, Wine as WineIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  formatRon,
  valueScoreTone,
  wineTypeGradient,
  wineTypeLabel,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type { WineWithRelations } from "@/types";

export function WineCard({ wine }: { wine: WineWithRelations }) {
  const lightLabel = wine.type !== "red";

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card transition-all duration-300 hover:-translate-y-1 hover:border-wine/30 hover:shadow-xl">
      <div className="relative aspect-[4/3] overflow-hidden">
        {wine.imageUrl ? (
          <Image
            src={wine.imageUrl}
            alt={wine.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div
            className={cn(
              "flex h-full w-full items-center justify-center bg-gradient-to-br transition-transform duration-500 group-hover:scale-105",
              wineTypeGradient[wine.type],
            )}
          >
            <WineIcon
              className={cn(
                "h-14 w-14",
                lightLabel ? "text-wine/40" : "text-wine-foreground/80",
              )}
              aria-hidden="true"
            />
          </div>
        )}

        <span className="absolute left-3 top-3 rounded-full bg-background/85 px-2.5 py-1 text-xs font-medium text-foreground backdrop-blur">
          {wineTypeLabel[wine.type]}
          {wine.vintage ? ` ${wine.vintage}` : ""}
        </span>

        {wine.valueScore !== null && wine.valueScore !== undefined && (
          <span
            className={cn(
              "absolute right-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm",
              valueScoreTone(wine.valueScore),
            )}
            title="Value Score"
          >
            {wine.valueScore}
            <span className="opacity-70">/100</span>
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {wine.winery?.name ? <span>{wine.winery.name}</span> : null}
          {wine.region?.name ? (
            <>
              <span aria-hidden="true">.</span>
              <span className="inline-flex items-center gap-0.5">
                <MapPin className="h-3 w-3" aria-hidden="true" />
                {wine.region.name}
              </span>
            </>
          ) : null}
        </div>

        <h3 className="mt-1.5 font-serif text-lg font-semibold leading-snug text-foreground">
          <Link
            href={`/wines/${wine.slug}`}
            className="transition-colors hover:text-wine"
          >
            {wine.name}
          </Link>
        </h3>

        <div className="mt-auto flex items-center justify-between pt-4">
          <span className="text-lg font-semibold text-foreground">
            {formatRon(wine.priceAvg)}
          </span>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="group/btn -mr-2 text-wine hover:bg-wine/10 hover:text-wine"
          >
            <Link href={`/wines/${wine.slug}`}>
              Vezi detalii
              <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
