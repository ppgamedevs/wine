import { BadgeCheck, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RetailerPurchaseLink } from "@/components/wines/retailer-purchase-link";
import { formatRon } from "@/lib/format";
import { buildWinePriceViewModel } from "@/lib/wine-price";
import type { WineWithRelations } from "@/types";

export function WineAvailability({ wine }: { wine: WineWithRelations }) {
  const pricing = buildWinePriceViewModel(wine);
  const isVerified = pricing.isVerifiedRecent;
  const priceLabel = isVerified ? "Pret actual" : "Pret aproximativ";
  const retailer =
    pricing.purchaseLink?.retailer ??
    wine.availability?.find((entry) => entry.retailer.trim())?.retailer ??
    "retailer";

  return (
    <section aria-labelledby="price-heading">
      <h2
        id="price-heading"
        className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
      >
        Pret si disponibilitate
      </h2>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Informatii preluate din sursa principala a vinului. Comanda se
        finalizeaza direct la magazinul partener.
      </p>

      <Card className="mt-6 border-border/70">
        <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
              <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {isVerified ? (
                  <Badge className="gap-1 bg-emerald-600/10 text-emerald-800 hover:bg-emerald-600/15">
                    <BadgeCheck className="h-3 w-3" aria-hidden="true" />
                    Pret verificat
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-amber-500/40 bg-amber-500/10 text-amber-900"
                  >
                    Pret estimativ
                  </Badge>
                )}
              </div>
              <p className="mt-3 text-3xl font-bold leading-none text-foreground">
                <span className="mr-2 text-base font-medium text-muted-foreground">
                  {priceLabel}:
                </span>
                {formatRon(pricing.displayPrice)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Sursa principala: {retailer}
              </p>
            </div>
          </div>

          {pricing.purchaseLink ? (
            <RetailerPurchaseLink
              url={pricing.purchaseLink.url}
              retailerName={pricing.purchaseLink.retailer}
              showNote
            />
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
