import { ArrowUpRight, ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { MarketingWineryIcon } from "@/components/marketing-icons";
import { Button } from "@/components/ui/button";
import type { WineWithRelations } from "@/types";

interface WineWineryLinkProps {
  wine: WineWithRelations;
  wineCount: number;
}

export function WineWineryLink({ wine, wineCount }: WineWineryLinkProps) {
  const winery = wine.winery;
  if (!winery) return null;

  return (
    <section aria-labelledby="winery-link-heading">
      <h2 id="winery-link-heading" className="sr-only">
        Crama producatoare
      </h2>

      <Link
        href={`/wineries/${winery.slug}`}
        className="group block overflow-hidden rounded-3xl border border-border/70 bg-card transition-all duration-300 hover:border-wine/35 hover:shadow-lg"
      >
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex min-w-0 items-start gap-4 sm:items-center">
            <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-wine/20 bg-gradient-to-br from-wine/[0.08] via-background to-wine/[0.14] shadow-sm ring-1 ring-wine/10">
              {winery.logoUrl ? (
                <Image
                  src={winery.logoUrl}
                  alt=""
                  width={56}
                  height={56}
                  className="h-full w-full object-contain p-2"
                />
              ) : (
                <MarketingWineryIcon className="h-6 w-6 text-wine" />
              )}
            </span>

            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Crama producatoare
              </p>
              <p className="mt-1 font-serif text-2xl font-semibold text-foreground transition-colors group-hover:text-wine sm:text-3xl">
                {winery.name}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {wineCount > 1
                  ? `${wineCount} vinuri listate pe VinIntel de la aceasta crama.`
                  : "Vezi profilul cramei, vinurile din portofoliu si scorurile VinIntel."}
              </p>
            </div>
          </div>

          <Button
            asChild
            variant="outline"
            className="shrink-0 border-wine/25 bg-background group-hover:border-wine/40 group-hover:bg-wine/[0.04]"
          >
            <span className="inline-flex items-center gap-2">
              Vezi crama
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </span>
          </Button>
        </div>
      </Link>

      {wine.tastingSheetUrl || wine.producerPageUrl ? (
        <div className="mt-3 flex flex-wrap justify-end gap-4">
          {wine.producerPageUrl ? (
            <a
              href={wine.producerPageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-wine hover:underline"
            >
              Pagina oficiala a vinului
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          ) : null}
          {wine.tastingSheetUrl ? (
            <a
              href={wine.tastingSheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-wine hover:underline"
            >
              Fisa de degustare PDF
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
