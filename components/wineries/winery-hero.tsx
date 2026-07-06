import {
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  MapPin,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  getWineryCatalogEnrichment,
  splitWineryStory,
} from "@/lib/winery-catalog";
import type { WineryWithWines } from "@/types";

interface WineryHeroProps {
  winery: WineryWithWines;
  stats: {
    wineCount: number;
    avgValueScore: number | null;
    priceRange: { min: number; max: number } | null;
  };
}

export function WineryHero({ winery, stats }: WineryHeroProps) {
  const enrichment = getWineryCatalogEnrichment(winery.slug);
  const tagline = enrichment?.tagline ?? winery.description;
  const storyParagraphs = enrichment?.story
    ? splitWineryStory(enrichment.story)
    : winery.description
      ? [winery.description]
      : [];

  return (
    <section className="border-b border-border/60 bg-secondary/20">
      <div className="mx-auto max-w-6xl px-6 py-10 lg:py-14">
        <nav
          aria-label="Breadcrumb"
          className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"
        >
          <Link href="/" className="hover:text-wine">
            Acasa
          </Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <Link href="/crame" className="hover:text-wine">
            Crame
          </Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="text-foreground">{winery.name}</span>
        </nav>

        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-wine/15 bg-gradient-to-br from-wine/[0.08] via-white to-wine/[0.12] shadow-md ring-1 ring-wine/10 sm:h-28 sm:w-28">
            {winery.logoUrl ? (
              <Image
                src={winery.logoUrl}
                alt={winery.name}
                fill
                priority
                sizes="112px"
                className="object-contain p-2.5"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-wine/10 text-wine">
                <Building2 className="h-10 w-10" aria-hidden="true" />
              </div>
            )}
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {winery.verified ? (
                <Badge className="gap-1 bg-wine/10 text-wine hover:bg-wine/15">
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                  Crama verificata
                </Badge>
              ) : (
                <Badge variant="secondary">Neverificata</Badge>
              )}
              {winery.region ? (
                <Badge variant="outline" className="border-wine/30 text-wine">
                  {winery.region.name}
                </Badge>
              ) : null}
            </div>

            <h1 className="mt-3 font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              {winery.name}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {winery.region ? (
                <Link
                  href={`/regiuni/${winery.region.slug}`}
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-wine"
                >
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  {winery.region.name}
                </Link>
              ) : null}
              {winery.foundedYear ? (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  Fondata in {winery.foundedYear}
                </span>
              ) : null}
              {winery.verified && winery.website ? (
                <a
                  href={winery.website}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-wine"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  Website oficial
                </a>
              ) : null}
            </div>

            {tagline ? (
              <p className="mt-5 max-w-2xl text-lg font-medium leading-relaxed text-foreground/90">
                {tagline}
              </p>
            ) : null}

            {storyParagraphs.length > 0 ? (
              <div className="mt-4 max-w-3xl space-y-4 border-l-2 border-wine/20 pl-5">
                {storyParagraphs.map((paragraph) => (
                  <p
                    key={paragraph.slice(0, 48)}
                    className="text-base leading-relaxed text-muted-foreground"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            ) : null}

            <dl className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:max-w-lg">
              <div className="rounded-xl border border-border/70 bg-card p-4">
                <dt className="text-xs text-muted-foreground">Vinuri listate</dt>
                <dd className="mt-1 text-2xl font-bold text-foreground">
                  {stats.wineCount}
                </dd>
              </div>
              <div className="rounded-xl border border-border/70 bg-card p-4">
                <dt className="text-xs text-muted-foreground">
                  Value Score mediu
                </dt>
                <dd className="mt-1 text-2xl font-bold text-foreground">
                  {stats.avgValueScore ?? "N/A"}
                  {stats.avgValueScore ? (
                    <span className="text-sm font-medium text-muted-foreground">
                      /100
                    </span>
                  ) : null}
                </dd>
              </div>
              {stats.priceRange ? (
                <div className="col-span-2 rounded-xl border border-border/70 bg-card p-4 sm:col-span-1">
                  <dt className="text-xs text-muted-foreground">
                    Interval de pret
                  </dt>
                  <dd className="mt-1 text-2xl font-bold text-foreground">
                    {stats.priceRange.min}
                    <span className="text-sm font-medium text-muted-foreground">
                      {" "}
                      -{" "}
                    </span>
                    {stats.priceRange.max}
                    <span className="text-sm font-medium text-muted-foreground">
                      {" "}
                      RON
                    </span>
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
