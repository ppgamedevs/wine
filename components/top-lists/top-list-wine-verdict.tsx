import Link from "next/link";
import { WineImage } from "@/components/wines/wine-image";
import type { AppLocale } from "@/i18n/locale";
import { localizedHref } from "@/i18n/paths";
import { formatRon, valueScoreTone } from "@/lib/format";
import { getPseoMessages } from "@/lib/i18n/pseo";
import { buildWorthItAnalysis } from "@/lib/wine-analysis";
import { resolveWineVintage, stripEmbeddedVintageFromName } from "@/lib/wine-vintage";
import { cn } from "@/lib/utils";
import type { WineWithRelations } from "@/types";

interface TopListWineVerdictProps {
  wine: WineWithRelations;
  position: number;
  /** Prioritize LCP image for first cards in quick answer. */
  priority?: boolean;
  locale?: AppLocale;
}

function buildWhyInTop(
  wine: WineWithRelations,
  locale: AppLocale,
): string {
  const parts: string[] = [];
  if (wine.valueScore && wine.valueScore >= 75) {
    parts.push(`Value Score ${wine.valueScore}/100`);
  }
  if (wine.priceAvg) {
    parts.push(
      locale === "en"
        ? `good value at ${formatRon(wine.priceAvg, locale)}`
        : `pret bun la ${formatRon(wine.priceAvg, locale)}`,
    );
  }
  return parts.length > 0
    ? parts.join(", ")
    : locale === "en"
      ? "solid value in the VinIntel catalog"
      : "raport calitate-pret solid in catalogul nostru";
}

function buildMinus(
  wine: WineWithRelations,
  locale: AppLocale,
): string | null {
  if (!wine.priceAvg) {
    return locale === "en"
      ? "price currently unavailable"
      : "pret indisponibil momentan";
  }
  if (wine.overpricedRisk === "high") {
    return locale === "en"
      ? "some risk of paying above market value"
      : "risc moderat de suprapret";
  }
  if ((wine.availability ?? []).length === 0) {
    return locale === "en"
      ? "limited availability"
      : "disponibilitate limitata";
  }
  return null;
}

function englishVerdict(wine: WineWithRelations): string {
  if ((wine.valueScore ?? 0) >= 80) {
    return "A strong value choice at its current catalog price.";
  }
  if ((wine.valueScore ?? 0) >= 70) {
    return "Worth considering when the style matches your needs.";
  }
  return "Compare the current price before buying.";
}

export function TopListWineVerdict({
  wine,
  position,
  priority = false,
  locale = "ro",
}: TopListWineVerdictProps) {
  const pairing = locale === "ro" ? wine.foodPairings?.[0]?.dish : undefined;
  const minus = buildMinus(wine, locale);
  const worthItHeadline =
    locale === "en"
      ? englishVerdict(wine)
      : buildWorthItAnalysis(wine).headline;
  const copy = getPseoMessages(locale).topLists;
  const displayVintage = resolveWineVintage(wine);
  const displayName = stripEmbeddedVintageFromName(wine.name, displayVintage);
  const wineHref = localizedHref(locale, "wine", { slug: wine.slug });

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card transition-all duration-300 hover:border-wine/30 hover:shadow-lg">
      <Link
        href={wineHref}
        className="relative block shrink-0 bg-gradient-to-b from-secondary/40 to-secondary/10"
        aria-label={
          locale === "en" ? `View ${displayName}` : `Vezi ${displayName}`
        }
      >
        <WineImage
          slug={wine.slug}
          name={wine.name}
          type={wine.type}
          imageUrl={wine.imageUrl}
          imageSource={wine.imageSource}
          imageAlt={wine.imageAlt}
          vintage={displayVintage}
          wineryName={wine.winery?.name}
          priority={priority}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          aspectClassName="relative aspect-[5/4] overflow-hidden"
          objectFit="contain"
          containPaddingClass="p-4 sm:p-5"
        />
        <span className="absolute left-3 top-3 z-10 inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-wine px-2 text-sm font-bold text-wine-foreground shadow-sm">
          #{position}
        </span>
        {wine.valueScore != null ? (
          <span
            className={cn(
              "absolute right-3 top-3 z-10 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur",
              valueScoreTone(wine.valueScore),
            )}
          >
            {wine.valueScore}/100
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-serif text-lg font-semibold leading-snug text-foreground">
              <Link href={wineHref} className="hover:text-wine">
                {displayName}
                {displayVintage ? (
                  <span className="text-muted-foreground"> {displayVintage}</span>
                ) : null}
              </Link>
            </h3>
            {wine.winery?.name ? (
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {wine.winery.name}
              </p>
            ) : null}
          </div>
          <p className="shrink-0 text-right text-sm font-semibold text-foreground">
            {formatRon(wine.priceAvg, locale)}
          </p>
        </div>

        <dl className="mt-4 space-y-2 text-sm">
          <div>
            <dt className="font-medium text-foreground">{copy.whyInTop}</dt>
            <dd className="text-muted-foreground">
              {buildWhyInTop(wine, locale)}
            </dd>
          </div>
          {pairing ? (
            <div>
              <dt className="font-medium text-foreground">{copy.suitableFor}</dt>
              <dd className="text-muted-foreground">{pairing.toLowerCase()}</dd>
            </div>
          ) : null}
          {minus ? (
            <div>
              <dt className="font-medium text-foreground">{copy.minus}</dt>
              <dd className="text-muted-foreground">{minus}</dd>
            </div>
          ) : null}
          <div>
            <dt className="font-medium text-foreground">{copy.verdict}</dt>
            <dd className="text-muted-foreground">{worthItHeadline}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}

export function TopListQuickAnswer({
  wines,
  locale = "ro",
}: {
  wines: WineWithRelations[];
  locale?: AppLocale;
}) {
  const top5 = wines.slice(0, 5);
  const copy = getPseoMessages(locale).topLists;

  return (
    <section aria-labelledby="quick-answer-heading">
      <h2
        id="quick-answer-heading"
        className="font-serif text-2xl font-semibold text-foreground"
      >
        {copy.quickAnswer}
      </h2>
      <p className="mt-2 text-muted-foreground">
        {copy.quickAnswerDescription}
      </p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {top5.map((wine, index) => (
          <TopListWineVerdict
            key={wine.id}
            wine={wine}
            position={index + 1}
            priority={index < 2}
            locale={locale}
          />
        ))}
      </div>
    </section>
  );
}
