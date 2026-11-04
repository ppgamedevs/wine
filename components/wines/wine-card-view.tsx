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
    quality: string;
    qualityInsufficient: string;
    valueNotAvailable: string;
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
    quality: "Calitate",
    qualityInsufficient: "Date insuficiente",
    valueNotAvailable: "Value indisponibil",
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
    quality: "Quality",
    qualityInsufficient: "Insufficient data",
    valueNotAvailable: "Value unavailable",
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
  const copy = CARD_COPY[locale];

  return (
    <div className="mt-auto space-y-3 pt-4">
      <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2 text-xs">
        <span className="text-muted-foreground">{copy.quality}</span>
        {card.qualityScore != null ? (
          <span
            className="font-semibold tabular-nums text-foreground"
            title={`${copy.quality}: ${card.qualityScore}/100`}
          >
            {card.qualityScore}
            <span className="font-normal text-muted-foreground">/100</span>
          </span>
        ) : (
          <span className="text-muted-foreground">{copy.qualityInsufficient}</span>
        )}
      </div>
      {price.status === "unavailable" ? (
        <p className="text-sm font-medium text-muted-foreground">
          {copy.unavailable}
        </p>
      ) : (
        <div className="space-y-2">
          <Badge className="gap-1 bg-emerald-600/10 text-emerald-800 hover:bg-emerald-600/15">
            <BadgeCheck className="h-3 w-3" aria-hidden="true" />
            {copy.verified}
          </Badge>
          <p className="text-lg font-bold leading-none text-foreground">
            <span className="mr-1 text-sm font-medium text-muted-foreground">
              {copy.price}
            </span>
            {formatRon(price.displayPrice, locale)}
          </p>
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
          // The bottle is object-contain inside a 4:3 box, so it paints much
          // narrower than the card. Asking for 100vw downloaded 1080px images
          // for a ~100px bottle on mobile.
          sizes="(max-width: 640px) 40vw, (max-width: 1024px) 24vw, 16vw"
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
