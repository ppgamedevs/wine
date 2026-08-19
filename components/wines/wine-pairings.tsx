import { UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { getVinScoreMeta } from "@/lib/format";
import { buildGenericPairingGuidance } from "@/lib/generic-pairing-guidance";
import { resolvePublicWinePairings } from "@/lib/public-wine-pairings";
import { sanitizeCulinaryText } from "@/lib/culinary-extract";
import {
  getVerifiedTechnicalValue,
  type PublicTechnicalTrust,
} from "@/lib/tech-facts/public-trust";
import type { WineSweetness, WineWithRelations } from "@/types";

export function WinePairings({
  wine,
  technicalTrust,
}: {
  wine: WineWithRelations;
  technicalTrust: PublicTechnicalTrust;
}) {
  const evaluatedPairings = wine.foodPairings ?? [];
  const visiblePairings = resolvePublicWinePairings(wine);
  const producerGuidance = sanitizeCulinaryText(
    wine.producerContent?.culinaryPairings,
  );
  const hasEvaluatedPairings = evaluatedPairings.length > 0;

  if (!hasEvaluatedPairings) {
    // Nu inventam pairing-uri specifice acestui vin. Aratam doar o orientare
    // generala pe tip de vin + dulceata verificata, marcata explicit ca estimare
    // generica, nu ca evaluare a acestui vin (vezi lib/generic-pairing-guidance.ts).
    const verifiedSweetness = getVerifiedTechnicalValue(
      technicalTrust,
      "sweetness",
    );
    const guidance = buildGenericPairingGuidance({
      type: wine.type,
      sweetness:
        typeof verifiedSweetness === "string"
          ? (verifiedSweetness as WineSweetness)
          : null,
    });

    return (
      <section aria-labelledby="pairings-heading">
        <h2
          id="pairings-heading"
          className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
        >
          Cu ce se potrivește
        </h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Nu avem încă suficiente date pentru recomandări specifice. Îți
          arătăm o orientare generală pentru acest stil de vin.
        </p>
        <Card className="mt-6 border-border/70 bg-secondary/20">
          <CardContent className="flex items-start gap-4 p-5">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-wine/10 text-wine">
              <UtensilsCrossed className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="flex-1">
              <ul className="list-inside list-disc text-sm text-foreground/90">
                {guidance.categories.map((category) => (
                  <li key={category}>{category}</li>
                ))}
              </ul>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {guidance.note}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section aria-labelledby="pairings-heading">
      <h2
        id="pairings-heading"
        className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
      >
        Cu ce se potrivește
      </h2>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Cele mai bune asocieri culinare pentru acest vin.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {visiblePairings.map((pairing) => {
          const dishHeading = (
            <h3 className="font-medium text-foreground">
              {pairing.dishSlug ? (
                <Link
                  href={`/vin-pentru/${pairing.dishSlug}`}
                  className="hover:text-wine hover:underline"
                >
                  {pairing.dish}
                </Link>
              ) : (
                pairing.dish
              )}
            </h3>
          );

          return (
            <Card
              key={pairing.dish}
              className="border-border/70 transition-colors hover:border-wine/30"
            >
              <CardContent className="flex items-start gap-4 p-5">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-wine/10 text-wine">
                  <UtensilsCrossed className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {dishHeading}
                    {pairing.score != null ? (
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${getVinScoreMeta(pairing.score).badgeClass}`}
                        title="Scor de compatibilitate culinară"
                      >
                        {pairing.score}/100
                      </span>
                    ) : null}
                  </div>
                  {pairing.rationale ? (
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {pairing.rationale}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs font-medium text-wine">
                    {pairing.attribution}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {producerGuidance ? (
        <details className="mt-5 rounded-xl border border-border/70 bg-secondary/20">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Recomandările culinare ale producătorului
          </summary>
          <p className="border-t border-border/70 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
            {producerGuidance}
          </p>
        </details>
      ) : null}
    </section>
  );
}
