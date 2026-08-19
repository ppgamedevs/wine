import { BadgeCheck, MapPin } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrackedWineCardLink,
  WineCardPurchaseAction,
} from "@/components/wines/wine-card-client-actions";
import { WineImage } from "@/components/wines/wine-image";
import { formatRon, valueScoreTone } from "@/lib/format";
import type { PublicWineCardViewModel } from "@/lib/public-wine-card-types";
import { cn } from "@/lib/utils";
import type { AppLocale } from "@/i18n/locale";
import { localizedHref } from "@/i18n/paths";

const CARD_COPY: Record<
  AppLocale,
  {
    unavailable: string;
    verified: string;
    estimated: string;
    price: string;
    verifySource: string;
    internalEstimate: string;
    offer: string;
    verify: string;
    verifyDisabled: string;
    details: string;
  }
> = {
  ro: {
    unavailable: "Pret indisponibil",
    verified: "Pret verificat",
    estimated: "Pret estimativ",
    price: "Pret:",
    verifySource: "Pret aproximativ. Verifica sursa inainte de cumparare.",
    internalEstimate: "Pret aproximativ din datele noastre.",
    offer: "Vezi oferta",
    verify: "Verifica pret",
    verifyDisabled: "disponibil doar pentru cramele verificate",
    details: "Vezi detalii",
  },
  en: {
    unavailable: "Price unavailable",
    verified: "Verified price",
    estimated: "Estimated price",
    price: "Price:",
    verifySource: "Approximate price. Check the source before buying.",
    internalEstimate: "Approximate price from our data.",
    offer: "View offer",
    verify: "Check price",
    verifyDisabled: "available only for verified wineries",
    details: "View details",
  },
};

function WineCardTitle({
  card,
  locale,
}: {
  card: PublicWineCardViewModel;
  locale: AppLocale;
}) {
  const href = localizedHref(locale, "wine", { slug: card.slug });
  const className = "transition-colors hover:text-wine";

  return card.analytics ? (
    <TrackedWineCardLink
      href={href}
      slug={card.slug}
      analytics={card.analytics}
      className={className}
    >
      {card.displayName}
    </TrackedWineCardLink>
  ) : (
    <Link href={href} className={className}>
      {card.displayName}
    </Link>
  );
}

function WineCardPriceFooter({
  card,
  locale,
}: {
  card: PublicWineCardViewModel;
  locale: AppLocale;
}) {
  const { price } = card;
  const isEstimated = price.status === "estimated";
  const copy = CARD_COPY[locale];

  return (
    <div className="mt-auto space-y-3 pt-4">
      {price.status === "unavailable" ? (
        <p className="text-sm font-medium text-muted-foreground">
          {copy.unavailable}
        </p>
      ) : (
        <div className="space-y-2">
          {price.isVerifiedRecent ? (
            <Badge className="gap-1 bg-emerald-600/10 text-emerald-800 hover:bg-emerald-600/15">
              <BadgeCheck className="h-3 w-3" aria-hidden="true" />
              {copy.verified}
            </Badge>
          ) : isEstimated ? (
            <Badge
              variant="outline"
              className="border-amber-500/40 bg-amber-500/10 text-amber-900"
            >
              {copy.estimated}
            </Badge>
          ) : null}
          <p
            className={cn(
              "text-lg font-bold leading-none",
              price.isVerifiedRecent ? "text-foreground" : "text-amber-900",
            )}
          >
            <span
              className={cn(
                "mr-1 text-sm font-medium",
                isEstimated
                  ? "text-amber-800/80"
                  : "text-muted-foreground",
              )}
            >
              {copy.price}
            </span>
            {formatRon(price.displayPrice, locale)}
          </p>
          {isEstimated ? (
            <p className="text-xs text-muted-foreground">
              {price.verifyPriceUrl
                ? copy.verifySource
                : copy.internalEstimate}
            </p>
          ) : null}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <WineCardPurchaseAction
          slug={card.slug}
          price={price}
          analytics={card.analytics}
          offerLabel={copy.offer}
          verifyLabel={copy.verify}
          verifyDisabledTooltip={copy.verifyDisabled}
        />
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-mr-2 text-wine hover:bg-wine/10 hover:text-wine"
        >
          <Link href={localizedHref(locale, "wine", { slug: card.slug })}>
            {copy.details}
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function WineCardView({
  card,
  priority = false,
  locale = "ro",
}: {
  card: PublicWineCardViewModel;
  priority?: boolean;
  locale?: AppLocale;
}) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card transition-all duration-300 hover:-translate-y-1 hover:border-wine/30 hover:shadow-xl">
      <div className="relative">
        <WineImage
          slug={card.slug}
          name={card.name}
          type={card.type}
          imageUrl={card.image.url}
          imageSource={card.image.source}
          imageAlt={card.image.alt}
          vintage={card.vintage}
          wineryName={card.image.wineryName}
          priority={priority}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
          aspectClassName="relative aspect-[4/3] overflow-hidden bg-secondary/20"
          objectFit="contain"
        />

        <span className="absolute left-3 top-3 z-10 rounded-full bg-background/85 px-2.5 py-1 text-xs font-medium text-foreground backdrop-blur">
          {card.typeLabel}
          {card.vintage ? ` ${card.vintage}` : ""}
        </span>

        {card.displayedRankScore != null ? (
          <span
            className={cn(
              "absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm",
              valueScoreTone(card.displayedRankScore),
            )}
            title={card.displayedRankLabel}
          >
            {card.displayedRankScore}
            <span className="opacity-70">/100</span>
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {card.wineryName ? <span>{card.wineryName}</span> : null}
          {card.regionName ? (
            <>
              <span aria-hidden="true">.</span>
              <span className="inline-flex items-center gap-0.5">
                <MapPin className="h-3 w-3" aria-hidden="true" />
                {card.regionName}
              </span>
            </>
          ) : null}
        </div>

        <h3 className="mt-1.5 font-serif text-lg font-semibold leading-snug text-foreground">
          <WineCardTitle card={card} locale={locale} />
        </h3>

        <WineCardPriceFooter card={card} locale={locale} />
      </div>
    </article>
  );
}
