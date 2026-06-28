import type { ComponentType, ReactNode } from "react";
import {
  CalendarHeart,
  Gauge,
  Lightbulb,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { valueScoreTone } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { WineWithRelations } from "@/types";

function EditorialBlock({
  id,
  title,
  icon: Icon,
  children,
}: {
  id: string;
  title: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="scroll-mt-24">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-wine/10 text-wine">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <h2
          id={id}
          className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
        >
          {title}
        </h2>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function pairingTone(score: number | undefined): string {
  if (!score) return "bg-muted text-muted-foreground";
  if (score >= 90) return "bg-wine text-wine-foreground";
  if (score >= 80) return "bg-wine/15 text-wine";
  return "bg-secondary text-secondary-foreground";
}

export function WineEditorial({ wine }: { wine: WineWithRelations }) {
  const hasDescription = Boolean(wine.descriptionEditorial?.trim());
  const hasValueBlock =
    wine.valueScore != null || Boolean(wine.valueExplanation?.trim());
  const hasThings = wine.thingsYouShouldKnow.length > 0;
  const hasTaste = Boolean(wine.tasteProfile?.trim());
  const hasPairingNotes = wine.foodPairingNotes.length > 0;
  const hasOccasions = wine.recommendedOccasions.length > 0;

  const hasEditorialContent =
    hasDescription ||
    hasValueBlock ||
    hasThings ||
    hasTaste ||
    hasPairingNotes ||
    hasOccasions;

  return (
    <div className="space-y-12">
      {!hasEditorialContent ? (
        <Card className="border-dashed border-border/80 bg-secondary/20">
          <CardContent className="p-6 text-sm leading-relaxed text-muted-foreground">
            Analiza editoriala pentru acest vin este in pregatire. Datele
            factuale (pret, soiuri, crama) sunt afisate mai jos; scorurile
            VinIntel vor fi completate curand.
          </CardContent>
        </Card>
      ) : null}

      {hasDescription ? (
        <EditorialBlock
          id="wine-description-editorial"
          title="Despre acest vin"
          icon={Sparkles}
        >
          <p className="max-w-3xl text-base leading-relaxed text-muted-foreground">
            {wine.descriptionEditorial}
          </p>
        </EditorialBlock>
      ) : null}

      {hasValueBlock ? (
        <EditorialBlock
          id="wine-value-editorial"
          title="Value Score explicat"
          icon={Gauge}
        >
          <Card className="border-border/70">
            <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:gap-6">
              {wine.valueScore != null ? (
                <div className="flex shrink-0 flex-col items-center gap-2 sm:items-start">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-2xl px-5 py-3 text-3xl font-bold",
                      valueScoreTone(wine.valueScore),
                    )}
                  >
                    {wine.valueScore}
                    <span className="ml-1 text-base font-medium opacity-70">
                      /100
                    </span>
                  </span>
                  <Badge variant="outline" className="border-wine/30 text-wine">
                    Scor VinIntel
                  </Badge>
                </div>
              ) : null}
              {wine.valueExplanation?.trim() ? (
                <p className="flex-1 text-base leading-relaxed text-muted-foreground">
                  {wine.valueExplanation}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </EditorialBlock>
      ) : null}

      {hasTaste ? (
        <EditorialBlock
          id="wine-taste-profile"
          title="Profil gustativ"
          icon={Sparkles}
        >
          <p className="max-w-3xl text-base leading-relaxed text-muted-foreground">
            {wine.tasteProfile}
          </p>
        </EditorialBlock>
      ) : null}

      {hasThings ? (
        <EditorialBlock
          id="wine-things-to-know"
          title="Ce ar trebui sa stii"
          icon={Lightbulb}
        >
          <ul className="grid gap-3 sm:grid-cols-2">
            {wine.thingsYouShouldKnow.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-xl border border-border/70 bg-card p-4 text-sm leading-relaxed text-foreground/90"
              >
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-wine"
                  aria-hidden="true"
                />
                {item}
              </li>
            ))}
          </ul>
        </EditorialBlock>
      ) : null}

      {hasPairingNotes ? (
        <EditorialBlock
          id="wine-pairing-notes"
          title="Pairing-uri recomandate"
          icon={UtensilsCrossed}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {wine.foodPairingNotes.map((pairing) => (
              <Card
                key={pairing.dish}
                className="border-border/70 transition-colors hover:border-wine/30"
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-medium text-foreground">
                      {pairing.dish}
                    </h3>
                    {pairing.score != null ? (
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          pairingTone(pairing.score),
                        )}
                      >
                        {pairing.score}/100
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {pairing.note}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </EditorialBlock>
      ) : null}

      {hasOccasions ? (
        <EditorialBlock
          id="wine-occasions"
          title="Ocazii recomandate"
          icon={CalendarHeart}
        >
          <ul className="flex flex-wrap gap-2">
            {wine.recommendedOccasions.map((occasion) => (
              <li key={occasion}>
                <Badge
                  variant="secondary"
                  className="px-3 py-1.5 text-sm font-normal"
                >
                  {occasion}
                </Badge>
              </li>
            ))}
          </ul>
        </EditorialBlock>
      ) : null}
    </div>
  );
}
