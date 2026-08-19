import { ArrowRight, Gift, ShoppingBag, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { VinScoreBadge } from "@/components/wines/vin-score-badge";
import { resolvePublicWinePairings } from "@/lib/public-wine-pairings";
import { resolvePublicSecondaryScores } from "@/lib/scoring-v2/public-secondary-display";
import { formatRon } from "@/lib/format";
import { buildWorthItAnalysis } from "@/lib/wine-analysis";
import { buildWinePriceViewModel } from "@/lib/wine-price";
import type { WineWithRelations } from "@/types";

export function WineBuyingDecision({ wine }: { wine: WineWithRelations }) {
  const pricing = buildWinePriceViewModel(wine);
  const analysis = buildWorthItAnalysis(wine);
  const pairing = resolvePublicWinePairings(wine, 1)[0] ?? null;
  const { gift } = resolvePublicSecondaryScores(wine);
  const hasOffer = pricing.purchaseLink != null;

  return (
    <Card className="mt-6 border-wine/20 bg-background shadow-sm">
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {pricing.status === "verified"
              ? "Preț actual"
              : pricing.status === "estimated"
                ? "Preț aproximativ"
                : "Preț"}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
            {formatRon(pricing.displayPrice)}
          </p>
        </div>
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">
              Merită banii?
            </p>
            <p className="mt-1 font-serif text-xl font-semibold text-foreground">
              {analysis.headline}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {analysis.summary}
            </p>
          </div>
          {wine.valueScore != null ? (
            <div className="shrink-0 text-center">
              <VinScoreBadge score={wine.valueScore} size="lg" />
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                Value Score
              </p>
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 border-t border-border/70 pt-4 sm:grid-cols-2">
          {pairing ? (
            <div className="flex items-start gap-2.5">
              <UtensilsCrossed
                className="mt-0.5 h-4 w-4 shrink-0 text-wine"
                aria-hidden="true"
              />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Cel mai bun cu
                </p>
                <p className="text-sm font-medium text-foreground">
                  {pairing.dish}
                </p>
              </div>
            </div>
          ) : null}
          <div className="flex items-start gap-2.5">
            <Gift
              className="mt-0.5 h-4 w-4 shrink-0 text-wine"
              aria-hidden="true"
            />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Pentru cadou
              </p>
              <p className="text-sm font-medium text-foreground">
                {gift.score != null
                  ? `${gift.score}/100${gift.provisional ? ", date limitate" : ""}`
                  : gift.caption ?? "Scor indisponibil"}
              </p>
            </div>
          </div>
        </div>

        <Button
          asChild
          size="lg"
          className="h-11 w-full bg-wine text-wine-foreground hover:bg-wine/90 sm:w-auto"
        >
          <a href={hasOffer ? "#disponibilitate" : "#alternative"}>
            {hasOffer ? (
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            )}
            {hasOffer ? "Vezi unde îl găsești" : "Vezi alternative"}
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
