import {
  BadgeCheck,
  ExternalLink,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRon } from "@/lib/format";
import {
  buildWinePriceViewModel,
  getPriceStatusLabel,
} from "@/lib/wine-price";
import { cn } from "@/lib/utils";
import type { WineWithRelations } from "@/types";

interface WinePriceDisplayProps {
  wine: WineWithRelations;
  variant?: "card" | "hero";
  showPurchaseButton?: boolean;
  className?: string;
}

export function WinePriceDisplay({
  wine,
  variant = "hero",
  showPurchaseButton = true,
  className,
}: WinePriceDisplayProps) {
  const pricing = buildWinePriceViewModel(wine);
  const isCard = variant === "card";
  const comparison = pricing.comparison;
  const change = pricing.priceChange;

  if (pricing.status === "unavailable") {
    return (
      <div className={cn("space-y-2", className)}>
        <p
          className={cn(
            "font-medium text-muted-foreground",
            isCard ? "text-sm" : "text-base",
          )}
        >
          Verifica pret
        </p>
        {pricing.verifyPriceUrl ? (
          <Button
            asChild
            size={isCard ? "sm" : "default"}
            variant="outline"
            className="border-wine/30 text-wine hover:bg-wine/10"
          >
            <a
              href={pricing.verifyPriceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Vezi sursa
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        ) : null}
      </div>
    );
  }

  const priceIsHigh =
    comparison != null &&
    !comparison.isAtLowest &&
    comparison.percentAboveLowest > 0;

  const priceLabel = getPriceStatusLabel(pricing.status);
  const isEstimated = pricing.status === "estimated";

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {pricing.isVerifiedRecent ? (
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
      </div>

      <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
        <div>
          <p
            className={cn(
              isEstimated ? "text-amber-800/80" : "text-muted-foreground",
              isCard ? "text-xs" : "text-sm",
            )}
          >
            {priceLabel}
          </p>
          <p
            className={cn(
              "font-bold leading-none",
              isCard ? "text-lg" : "text-3xl",
              pricing.isVerifiedRecent && priceIsHigh
                ? "text-red-700"
                : pricing.isVerifiedRecent
                  ? "text-foreground"
                  : "text-amber-900",
            )}
          >
            {formatRon(pricing.displayPrice)}
          </p>
        </div>

        {change && change.direction === "up" ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 font-medium text-red-600",
              isCard ? "text-xs" : "text-sm",
            )}
          >
            <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
            +{Math.abs(change.percentChange)}%
          </span>
        ) : null}

        {change && change.direction === "down" ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 font-medium text-emerald-700",
              isCard ? "text-xs" : "text-sm",
            )}
          >
            <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
            {change.percentChange}%
          </span>
        ) : null}

        {pricing.isVerifiedRecent && comparison?.isAtLowest ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 font-medium text-emerald-700",
              isCard ? "text-xs" : "text-sm",
            )}
          >
            <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
            La minim 30z
          </span>
        ) : null}

        {pricing.isVerifiedRecent && priceIsHigh && comparison ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 font-medium text-red-600",
              isCard ? "text-xs" : "text-sm",
            )}
          >
            <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
            +{comparison.percentAboveLowest}% fata de minim
          </span>
        ) : null}
      </div>

      {pricing.isVerifiedRecent && comparison && !comparison.isAtLowest ? (
        <p
          className={cn(
            "inline-flex flex-wrap items-center gap-1 text-emerald-700",
            isCard ? "text-xs" : "text-sm",
          )}
        >
          <span>Cel mai mic in 30z:</span>
          <span className="font-semibold">{formatRon(comparison.lowest)}</span>
          <span className="font-medium">
            (-{comparison.percentAboveLowest}%)
          </span>
        </p>
      ) : null}

      {pricing.isVerifiedRecent && comparison?.isAtLowest && !isCard ? (
        <p className="text-sm text-emerald-700">
          Cel mai mic in 30z: {formatRon(comparison.lowest)}
        </p>
      ) : null}

      {isEstimated ? (
        <p className={cn("text-muted-foreground", isCard ? "text-xs" : "text-sm")}>
          {pricing.verifyPriceUrl
            ? "Pret orientativ. Verifica sursa inainte de cumparare."
            : "Pret orientativ din datele noastre."}
        </p>
      ) : null}

      {showPurchaseButton && pricing.purchaseLink ? (
        <Button
          asChild
          size={isCard ? "sm" : "default"}
          className={cn(
            "bg-wine text-wine-foreground hover:bg-wine/90",
            isCard ? "mt-1" : "mt-2",
          )}
        >
          <a
            href={pricing.purchaseLink.url}
            target="_blank"
            rel="noopener noreferrer sponsored"
          >
            Cumpara
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      ) : null}
    </div>
  );
}

export function WineCardPriceFooter({ wine }: { wine: WineWithRelations }) {
  const pricing = buildWinePriceViewModel(wine);

  return (
    <div className="mt-auto space-y-3 pt-4">
      <WinePriceDisplay wine={wine} variant="card" showPurchaseButton={false} />

      <div className="flex items-center justify-between gap-2">
        {pricing.purchaseLink ? (
          <Button
            asChild
            size="sm"
            className="bg-wine text-wine-foreground hover:bg-wine/90"
          >
            <a
              href={pricing.purchaseLink.url}
              target="_blank"
              rel="noopener noreferrer sponsored"
            >
              Cumpara
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        ) : pricing.verifyPriceUrl ? (
          <Button
            asChild
            size="sm"
            variant="outline"
            className="border-wine/30 text-wine hover:bg-wine/10"
          >
            <a
              href={pricing.verifyPriceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Verifica pret
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        ) : (
          <span />
        )}

        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-mr-2 text-wine hover:bg-wine/10 hover:text-wine"
        >
          <Link href={`/wines/${wine.slug}`}>Vezi detalii</Link>
        </Button>
      </div>
    </div>
  );
}
