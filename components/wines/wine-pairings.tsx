import { UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { matchDishPairingSlug } from "@/lib/dish-pairing-pages";
import { buildGenericPairingGuidance } from "@/lib/generic-pairing-guidance";
import {
  isVinIntelCuratedPairing,
  publicPairingAttribution,
  publicProducerAttribution,
} from "@/lib/pairing-curation";
import { sanitizeCulinaryText } from "@/lib/culinary-extract";
import {
  getVerifiedTechnicalValue,
  type PublicTechnicalTrust,
} from "@/lib/tech-facts/public-trust";
import type { WineSweetness, WineWithRelations } from "@/types";

function pairingTone(score: number | undefined): string {
  if (!score) return "bg-muted text-muted-foreground";
  if (score >= 90) return "bg-wine text-wine-foreground";
  if (score >= 80) return "bg-wine/15 text-wine";
  return "bg-secondary text-secondary-foreground";
}

export function WinePairings({
  wine,
  technicalTrust,
}: {
  wine: WineWithRelations;
  technicalTrust: PublicTechnicalTrust;
}) {
  const evaluatedPairings = wine.foodPairings ?? [];
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
          Pairing-uri cu mancare
        </h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Nu avem inca o evaluare de pairing specifica acestui vin. Iata o
          orientare generala pentru acest tip de vin, nu o recomandare
          verificata pentru aceasta sticla.
        </p>
        {sanitizeCulinaryText(wine.producerContent?.culinaryPairings) ? (
          <p className="mt-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {publicProducerAttribution()}
            </span>
            {": "}
            {sanitizeCulinaryText(wine.producerContent?.culinaryPairings)}
          </p>
        ) : null}
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
        Pairing-uri cu mancare romaneasca
      </h2>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Asocieri evaluate pentru acest vin.
      </p>
      {sanitizeCulinaryText(wine.producerContent?.culinaryPairings) ? (
        <p className="mt-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {publicProducerAttribution()}
          </span>
          {": "}
          {sanitizeCulinaryText(wine.producerContent?.culinaryPairings)}
        </p>
      ) : null}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {evaluatedPairings.map((pairing) => {
          const dishSlug = matchDishPairingSlug(pairing.dish);
          const dishHeading = (
            <h3 className="font-medium text-foreground">
              {dishSlug ? (
                <Link
                  href={`/vin-pentru/${dishSlug}`}
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
                  <div className="flex items-center justify-between gap-2">
                    {dishHeading}
                    {pairing.score && !isVinIntelCuratedPairing(pairing) ? (
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${pairingTone(pairing.score)}`}
                      >
                        {pairing.score}/100
                      </span>
                    ) : (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {publicPairingAttribution(pairing)}
                      </span>
                    )}
                  </div>
                  {pairing.note ? (
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {pairing.note}
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
