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

function WineCardTitle({ card }: { card: PublicWineCardViewModel }) {
  const href = `/wines/${card.slug}`;
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

function WineCardPriceFooter({ card }: { card: PublicWineCardViewModel }) {
  const { price } = card;
  const isEstimated = price.status === "estimated";

  return (
    <div className="mt-auto space-y-3 pt-4">
      {price.status === "unavailable" ? (
        <p className="text-sm font-medium text-muted-foreground">
          Pret indisponibil
        </p>
      ) : (
        <div className="space-y-2">
          {price.isVerifiedRecent ? (
            <Badge className="gap-1 bg-emerald-600/10 text-emerald-800 hover:bg-emerald-600/15">
              <BadgeCheck className="h-3 w-3" aria-hidden="true" />
              Pret verificat
            </Badge>
          ) : isEstimated ? (
            <Badge
              variant="outline"
              className="border-amber-500/40 bg-amber-500/10 text-amber-900"
            >
              Pret estimativ
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
              Pret:
            </span>
            {formatRon(price.displayPrice)}
          </p>
          {isEstimated ? (
            <p className="text-xs text-muted-foreground">
              {price.verifyPriceUrl
                ? "Pret aproximativ. Verifica sursa inainte de cumparare."
                : "Pret aproximativ din datele noastre."}
            </p>
          ) : null}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <WineCardPurchaseAction
          slug={card.slug}
          price={price}
          analytics={card.analytics}
        />
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-mr-2 text-wine hover:bg-wine/10 hover:text-wine"
        >
          <Link href={`/wines/${card.slug}`}>Vezi detalii</Link>
        </Button>
      </div>
    </div>
  );
}

export function WineCardView({
  card,
  priority = false,
}: {
  card: PublicWineCardViewModel;
  priority?: boolean;
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
          <WineCardTitle card={card} />
        </h3>

        <WineCardPriceFooter card={card} />
      </div>
    </article>
  );
}
