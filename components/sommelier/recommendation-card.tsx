import { ArrowRight, Check, Sparkles, Wine as WineIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  formatRon,
  valueScoreTone,
  wineTypeGradient,
  wineTypeLabel,
} from "@/lib/format";
import type { Recommendation } from "@/lib/sommelier";
import { cn } from "@/lib/utils";

const budgetLabel = {
  under: "Sub buget",
  ideal: "In buget",
  over: "Putin peste buget",
} as const;

export function RecommendationCard({
  recommendation,
  rank,
}: {
  recommendation: Recommendation;
  rank: number;
}) {
  const { wine, matchScore, reasons, budgetFit } = recommendation;
  const lightLabel = wine.type !== "red";

  return (
    <article className="group relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-border/70 bg-card p-5 transition-all duration-300 hover:border-wine/30 hover:shadow-lg sm:flex-row sm:p-6">
      <div className="relative h-44 w-full shrink-0 overflow-hidden rounded-xl sm:h-auto sm:w-40">
        {wine.imageUrl ? (
          <Image
            src={wine.imageUrl}
            alt={wine.name}
            fill
            sizes="(max-width: 640px) 100vw, 160px"
            className="object-cover"
          />
        ) : (
          <div
            className={cn(
              "flex h-full min-h-44 w-full items-center justify-center bg-gradient-to-br",
              wineTypeGradient[wine.type],
            )}
          >
            <WineIcon
              className={cn(
                "h-12 w-12",
                lightLabel ? "text-wine/35" : "text-wine-foreground/70",
              )}
              aria-hidden="true"
            />
          </div>
        )}
        <span className="absolute left-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-wine text-sm font-bold text-wine-foreground shadow">
          {rank}
        </span>
      </div>

      <div className="flex flex-1 flex-col">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{wineTypeLabel[wine.type]}</span>
              {wine.winery?.name ? (
                <>
                  <span aria-hidden="true">.</span>
                  <span>{wine.winery.name}</span>
                </>
              ) : null}
            </div>
            <h3 className="mt-1 font-serif text-xl font-semibold text-foreground">
              <Link
                href={`/wines/${wine.slug}`}
                className="transition-colors hover:text-wine"
              >
                {wine.name}
                {wine.vintage ? (
                  <span className="text-muted-foreground"> {wine.vintage}</span>
                ) : null}
              </Link>
            </h3>
          </div>

          <span
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-wine/10 px-3 py-1 text-sm font-semibold text-wine"
            title="Potrivire cu cererea ta"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            {matchScore}% potrivire
          </span>
        </div>

        <ul className="mt-3 space-y-1.5">
          {reasons.map((reason) => (
            <li
              key={reason}
              className="flex items-start gap-2 text-sm leading-relaxed text-foreground/90"
            >
              <Check
                className="mt-0.5 h-4 w-4 shrink-0 text-wine"
                aria-hidden="true"
              />
              {reason}
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-wrap items-center gap-3 pt-1">
          <span className="text-lg font-semibold text-foreground">
            {formatRon(wine.priceAvg)}
          </span>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium",
              budgetFit === "over"
                ? "bg-gold/15 text-gold"
                : "bg-wine/10 text-wine",
            )}
          >
            {budgetLabel[budgetFit]}
          </span>
          {wine.valueScore !== null && wine.valueScore !== undefined ? (
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                valueScoreTone(wine.valueScore),
              )}
            >
              Value {wine.valueScore}/100
            </span>
          ) : null}

          <Button
            asChild
            size="sm"
            variant="ghost"
            className="group/btn ml-auto text-wine hover:bg-wine/10 hover:text-wine"
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
