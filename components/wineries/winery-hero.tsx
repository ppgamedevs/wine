import {
  CalendarDays,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PremiumBadge } from "@/components/wineries/premium-badge";
import { WineryLogo } from "@/components/wineries/winery-logo";
import {
  WineryVisitLink,
  type WineryVisitLinkCopy,
} from "@/components/wineries/winery-visit-link";
import type { AppLocale } from "@/i18n/locale";
import { formatRon } from "@/lib/format";
import {
  getWineryCatalogEnrichment,
  resolveWineryLogoUrl,
} from "@/lib/winery-catalog";
import { isWineryPremium, resolveWineryStory } from "@/lib/winery-premium";
import type { WineryWithWines } from "@/types";

export interface WineryHeroCopy {
  breadcrumb: string;
  home: string;
  wineries: string;
  verified: string;
  unverified: string;
  founded: string;
  officialWebsite: string;
  listedWines: string;
  averageValueScore: string;
  priceRange: string;
  dashboard: string;
  visit: WineryVisitLinkCopy;
}

export interface WineryHeroLinks {
  home: string;
  wineries: string;
  region: string | null;
  dashboard: string;
}

interface WineryHeroProps {
  winery: WineryWithWines;
  stats: {
    wineCount: number;
    avgValueScore: number | null;
    priceRange: { min: number; max: number } | null;
  };
  locale: AppLocale;
  copy: WineryHeroCopy;
  links: WineryHeroLinks;
  trackAnalytics?: boolean;
}

export function WineryHero({
  winery,
  stats,
  locale,
  copy,
  links,
  trackAnalytics = false,
}: WineryHeroProps) {
  const enrichment = getWineryCatalogEnrichment(winery.slug);
  const premium = isWineryPremium(winery);
  const catalogTagline = locale === "ro" ? enrichment?.tagline : null;
  const catalogStory = locale === "ro" ? enrichment?.story : null;
  const tagline = catalogTagline ?? winery.description;
  const storyParagraphs = resolveWineryStory({
    isPremium: winery.isPremium,
    customStory: winery.customStory,
    description: winery.description,
    catalogStory: catalogStory ?? null,
  });

  return (
    <section className="border-b border-border/60 bg-secondary/20">
      <div className="mx-auto max-w-6xl px-6 py-10 lg:py-14">
        <nav
          aria-label={copy.breadcrumb}
          className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"
        >
          <Link href={links.home} className="hover:text-wine">
            {copy.home}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <Link href={links.wineries} className="hover:text-wine">
            {copy.wineries}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="text-foreground">{winery.name}</span>
        </nav>

        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <WineryLogo
            name={winery.name}
            logoUrl={resolveWineryLogoUrl(winery.slug, winery.logoUrl)}
            size="hero"
            priority
          />

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {premium ? <PremiumBadge /> : null}
              {winery.verified ? (
                <Badge className="gap-1 bg-wine/10 text-wine hover:bg-wine/15">
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                  {copy.verified}
                </Badge>
              ) : (
                <Badge variant="secondary">{copy.unverified}</Badge>
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
                  href={links.region ?? "#"}
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-wine"
                >
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  {winery.region.name}
                </Link>
              ) : null}
              {winery.foundedYear ? (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  {copy.founded}
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
                  {copy.officialWebsite}
                </a>
              ) : null}
            </div>

            {tagline && !premium ? (
              <p className="mt-5 max-w-2xl text-lg font-medium leading-relaxed text-foreground/90">
                {tagline}
              </p>
            ) : null}

            {storyParagraphs.length > 0 ? (
              <div className="mt-5 max-w-3xl space-y-4 border-l-2 border-wine/20 pl-5">
                {storyParagraphs.map((paragraph) => (
                  <p
                    key={paragraph.slice(0, 48)}
                    className="text-base leading-relaxed text-muted-foreground"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            ) : tagline && premium ? (
              <p className="mt-5 max-w-2xl text-lg font-medium leading-relaxed text-foreground/90">
                {tagline}
              </p>
            ) : null}

            {enrichment?.visitUrl ? (
              <div className="mt-6 flex flex-col items-start gap-2">
                <WineryVisitLink
                  wineryId={winery.id}
                  visitUrl={enrichment.visitUrl}
                  verified={winery.verified}
                  trackAnalytics={trackAnalytics}
                  copy={copy.visit}
                />
              </div>
            ) : null}

            <dl className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:max-w-lg">
              <div className="rounded-xl border border-border/70 bg-card p-4">
                <dt className="text-xs text-muted-foreground">
                  {copy.listedWines}
                </dt>
                <dd className="mt-1 text-2xl font-bold text-foreground">
                  {stats.wineCount}
                </dd>
              </div>
              <div className="rounded-xl border border-border/70 bg-card p-4">
                <dt className="text-xs text-muted-foreground">
                  {copy.averageValueScore}
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
                    {copy.priceRange}
                  </dt>
                  <dd className="mt-1 text-2xl font-bold text-foreground">
                    {formatRon(stats.priceRange.min, locale)}
                    <span className="text-sm font-medium text-muted-foreground">
                      {" - "}
                    </span>
                    {formatRon(stats.priceRange.max, locale)}
                  </dd>
                </div>
              ) : null}
            </dl>

            {premium ? (
              <div className="mt-5">
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="h-auto px-0 text-wine hover:bg-transparent hover:text-wine/80"
                >
                  <Link href={links.dashboard}>
                    <BarChart3 className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    {copy.dashboard}
                  </Link>
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
