import { Building2, CheckCircle2, ChevronRight, MapPin } from "lucide-react";
import Link from "next/link";
import { WineImage } from "@/components/wines/wine-image";
import { WinePriceDisplay } from "@/components/wines/wine-price-display";
import { SourceBadge } from "@/components/wines/source-badge";
import { CommunityBadge } from "@/components/wines/community-badge";
import { Badge } from "@/components/ui/badge";
import { formatLongDate, wineTypeLabel } from "@/lib/format";
import { resolveWineFactualSource } from "@/lib/wine-source";
import type { WineWithRelations } from "@/types";

export function WineHero({ wine }: { wine: WineWithRelations }) {
  return (
    <section className="border-b border-border/60 bg-secondary/20">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-12 lg:py-14">
        <div className="space-y-3">
          <div className="group relative aspect-[4/5] max-h-[520px] overflow-hidden rounded-3xl border border-border/70 shadow-lg lg:max-h-none">
            <WineImage
              slug={wine.slug}
              name={wine.name}
              type={wine.type}
              imageUrl={wine.imageUrl}
              imageSource={wine.imageSource}
              imageAlt={wine.imageAlt}
              vintage={wine.vintage}
              wineryName={wine.winery?.name}
              priority
              sizes="(max-width: 1024px) 100vw, 45vw"
              aspectClassName="relative h-full w-full overflow-hidden"
              imageClassName="object-cover object-center"
            />
          </div>
        </div>

        <div className="flex flex-col justify-center">
          <nav
            aria-label="Breadcrumb"
            className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"
          >
            <Link href="/" className="hover:text-wine">
              Acasa
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <Link href="/vinuri" className="hover:text-wine">
              Vinuri
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="text-foreground">{wine.name}</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-wine/30 text-wine">
              {wineTypeLabel[wine.type]}
            </Badge>
            {wine.vintage ? (
              <Badge variant="secondary">{wine.vintage}</Badge>
            ) : null}
            {wine.sweetness ? (
              <Badge variant="secondary" className="capitalize">
                {wine.sweetness}
              </Badge>
            ) : null}
            {wine.winery?.verified ? (
              <Badge className="gap-1 bg-wine/10 text-wine hover:bg-wine/15">
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                Crama verificata
              </Badge>
            ) : null}
            <CommunityBadge status={wine.status} />
          </div>

          <h1 className="mt-4 font-serif text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
            {wine.name}
            {wine.vintage ? (
              <span className="text-muted-foreground"> {wine.vintage}</span>
            ) : null}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-muted-foreground">
            {wine.winery ? (
              <Link
                href={`/wineries/${wine.winery.slug}`}
                className="inline-flex items-center gap-1.5 font-medium text-foreground transition-colors hover:text-wine"
              >
                <Building2 className="h-4 w-4" aria-hidden="true" />
                {wine.winery.name}
              </Link>
            ) : null}
            {wine.region ? (
              <Link
                href={`/regiuni/${wine.region.slug}`}
                className="inline-flex items-center gap-1.5 transition-colors hover:text-wine"
              >
                <MapPin className="h-4 w-4" aria-hidden="true" />
                {wine.region.name}
              </Link>
            ) : null}
          </div>

          {wine.tastingNotes ? (
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
              {wine.tastingNotes}
            </p>
          ) : null}

          <div className="mt-6">
            <WinePriceDisplay wine={wine} variant="hero" />
          </div>

          <div className="mt-4">
            <SourceBadge
              source={resolveWineFactualSource(wine)}
              lastUpdated={formatLongDate(wine.updatedAt)}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
