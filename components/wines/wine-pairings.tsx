import { UtensilsCrossed } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { FoodPairing } from "@/lib/schema";
import type { WineWithRelations } from "@/types";

const defaultRomanianPairings: FoodPairing[] = [
  { dish: "Sarmale", score: 85, note: "Aciditatea si taninurile echilibreaza grasimea." },
  { dish: "Mititei", score: 88, note: "Fructele rosii si condimentele completeaza gratarul." },
  { dish: "Tochitura moldoveneasca", score: 82, note: "Corpolent, ideal pentru mancaruri consistente." },
  { dish: "Ciorba de burta", score: 78, note: "Prospetimea vinului taie grasimea ciorbei." },
];

function pairingTone(score: number | undefined): string {
  if (!score) return "bg-muted text-muted-foreground";
  if (score >= 90) return "bg-wine text-wine-foreground";
  if (score >= 80) return "bg-wine/15 text-wine";
  return "bg-secondary text-secondary-foreground";
}

export function WinePairings({ wine }: { wine: WineWithRelations }) {
  const pairings =
    (wine.foodPairings?.length ?? 0) > 0
      ? wine.foodPairings
      : defaultRomanianPairings;

  return (
    <section aria-labelledby="pairings-heading">
      <h2
        id="pairings-heading"
        className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
      >
        Pairing-uri cu mancare romaneasca
      </h2>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Asocieri testate pentru bucataria de acasa: de la sarmale si mititei la
        tochitura si ciorbe traditionale.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {pairings.map((pairing) => (
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
                  <h3 className="font-medium text-foreground">{pairing.dish}</h3>
                  {pairing.score ? (
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${pairingTone(pairing.score)}`}
                    >
                      {pairing.score}/100
                    </span>
                  ) : null}
                </div>
                {pairing.note ? (
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {pairing.note}
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
