import { BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RetailerPurchaseLink } from "@/components/wines/retailer-purchase-link";
import { formatRon } from "@/lib/format";
import { buildWinePriceViewModel } from "@/lib/wine-price";
import { cn } from "@/lib/utils";
import type { WineWithRelations } from "@/types";

interface WinePriceDisplayProps {
  wine: WineWithRelations;
  variant?: "card" | "hero";
  showPurchaseButton?: boolean;
  className?: string;
  trackAnalytics?: {
    onPurchaseClick?: () => void;
  };
}

export function WinePriceDisplay({
  wine,
  variant = "hero",
  showPurchaseButton = true,
  className,
  trackAnalytics,
}: WinePriceDisplayProps) {
  const pricing = buildWinePriceViewModel(wine);
  const isCard = variant === "card";

  if (pricing.status === "unavailable") {
    return (
      <div className={cn("space-y-2", className)}>
        <p
          className={cn(
            "font-medium text-muted-foreground",
            isCard ? "text-sm" : "text-base",
          )}
        >
          Pret indisponibil
        </p>
      </div>
    );
  }

  const isEstimated = pricing.status === "estimated";
  const priceLabel = isCard
    ? "Pret:"
    : isEstimated
      ? "Pret aproximativ:"
      : "Pret actual:";

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
              "font-bold leading-none",
              isCard ? "text-lg" : "text-3xl",
              pricing.isVerifiedRecent ? "text-foreground" : "text-amber-900",
            )}
          >
            <span
              className={cn(
                "mr-1 font-medium",
                isEstimated ? "text-amber-800/80" : "text-muted-foreground",
                isCard ? "text-sm" : "text-base",
              )}
            >
              {priceLabel}
            </span>
            {formatRon(pricing.displayPrice)}
          </p>
        </div>
      </div>

      {isEstimated ? (
        <p className={cn("text-muted-foreground", isCard ? "text-xs" : "text-sm")}>
          {pricing.verifyPriceUrl
            ? "Pret aproximativ. Verifica sursa inainte de cumparare."
            : "Pret aproximativ din datele noastre."}
        </p>
      ) : null}

      {showPurchaseButton && pricing.purchaseLink ? (
        <RetailerPurchaseLink
          url={pricing.purchaseLink.url}
          retailerName={pricing.purchaseLink.retailer}
          size={isCard ? "sm" : "default"}
          showNote={!isCard}
          className={isCard ? "mt-1" : "mt-2"}
          onTrackClick={trackAnalytics?.onPurchaseClick}
        />
      ) : null}
    </div>
  );
}
