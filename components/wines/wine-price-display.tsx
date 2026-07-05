import { BadgeCheck, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
}

export function WinePriceDisplay({
  wine,
  variant = "hero",
  showPurchaseButton = true,
  className,
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
        />
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
          <RetailerPurchaseLink
            url={pricing.purchaseLink.url}
            retailerName={pricing.purchaseLink.retailer}
            size="sm"
          />
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
