import { Building2, ChevronRight, Grape, MapPin } from "lucide-react";
import Link from "next/link";
import { WineBuyingDecision } from "@/components/wines/wine-buying-decision";
import { WineImage } from "@/components/wines/wine-image";
import { Badge } from "@/components/ui/badge";
import {
  getWineSweetnessLabel,
  getWineTypeLabel,
} from "@/lib/format";
import { localizedHref } from "@/i18n/paths";
import { grapeGuidesForWine } from "@/lib/oenology";
import {
  getVerifiedTechnicalValue,
  type PublicTechnicalTrust,
} from "@/lib/tech-facts/public-trust";
import { resolveWineVintage, stripEmbeddedVintageFromName } from "@/lib/wine-vintage";
import type { WineSweetness, WineWithRelations } from "@/types";
import { getLocale, getTranslations } from "next-intl/server";

export async function WineHero({
  wine,
  technicalTrust,
}: {
  wine: WineWithRelations;
  technicalTrust: PublicTechnicalTrust;
}) {
  const locale = await getLocale();
  const t = await getTranslations("Wine.hero");
  const displayVintage = resolveWineVintage(wine);
  const displayName = stripEmbeddedVintageFromName(wine.name, displayVintage);
  const grapeGuides = grapeGuidesForWine(wine);
  const verifiedSweetness = getVerifiedTechnicalValue(
    technicalTrust,
    "sweetness",
  );

  return (
    <section className="border-b border-border/60 bg-secondary/20">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-10 lg:py-12">
        <div className="relative order-2 mx-auto w-full max-w-[260px] sm:max-w-xs lg:order-1 lg:mx-0 lg:max-w-sm">
          <WineImage
            slug={wine.slug}
            name={wine.name}
            type={wine.type}
            imageUrl={wine.imageUrl}
            imageSource={wine.imageSource}
            imageAlt={wine.imageAlt}
            vintage={displayVintage}
            wineryName={wine.winery?.name}
            priority
            variant="hero"
            sizes="(max-width: 1024px) 72vw, 320px"
            aspectClassName="relative aspect-[3/4] w-full max-h-[min(52vh,420px)]"
          />
        </div>

        <div className="order-1 flex flex-col justify-center lg:order-2">
          <nav
            aria-label={t("breadcrumb")}
            className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"
          >
            <Link href={localizedHref(locale, "home")} className="hover:text-wine">
              {t("home")}
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <Link href={localizedHref(locale, "wines")} className="hover:text-wine">
              {t("wines")}
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="text-foreground">{displayName}</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-wine/30 text-wine">
              {getWineTypeLabel(wine.type, locale)}
            </Badge>
            {typeof verifiedSweetness === "string" ? (
              <Badge variant="outline">
                {getWineSweetnessLabel(
                  verifiedSweetness as WineSweetness,
                  locale,
                )}
              </Badge>
            ) : null}
            {displayVintage ? (
              <Badge variant="secondary">{displayVintage}</Badge>
            ) : null}
          </div>

          <h1 className="mt-4 font-serif text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
            {displayName}
            {displayVintage ? (
              <span className="text-muted-foreground"> {displayVintage}</span>
            ) : null}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-muted-foreground">
            {wine.winery ? (
              <Link
                href={localizedHref(locale, "winery", {
                  slug: wine.winery.slug,
                })}
                className="inline-flex items-center gap-1.5 font-medium text-foreground transition-colors hover:text-wine"
              >
                <Building2 className="h-4 w-4" aria-hidden="true" />
                {wine.winery.name}
              </Link>
            ) : null}
            {wine.region ? (
              <Link
                href={localizedHref(locale, "region", {
                  slug: wine.region.slug,
                })}
                className="inline-flex items-center gap-1.5 transition-colors hover:text-wine"
              >
                <MapPin className="h-4 w-4" aria-hidden="true" />
                {wine.region.name}
              </Link>
            ) : null}
            {grapeGuides.map((guide) => (
              <Link
                key={guide.slug}
                href={localizedHref(locale, "grapeVariety", {
                  slug: guide.slug,
                })}
                className="inline-flex items-center gap-1.5 transition-colors hover:text-wine"
              >
                <Grape className="h-4 w-4" aria-hidden="true" />
                {guide.copy[locale].name}
              </Link>
            ))}
          </div>

          <WineBuyingDecision wine={wine} />
        </div>
      </div>
    </section>
  );
}
