import { Card, CardContent } from "@/components/ui/card";
import {
  EditorialFoodMatchIcon,
  EditorialGiftIcon,
  EditorialValueIcon,
} from "@/components/wines/editorial-icons";
import { EditorialSectionIcon } from "@/components/wines/editorial-section-icon";
import { VinScoreBadge } from "@/components/wines/vin-score-badge";
import { splitValueExplanation, sanitizeEditorialText } from "@/lib/editorial-text";
import {
  publicFoodScoreDisplay,
  publicGiftScoreDisplay,
} from "@/lib/scoring-v2/public-secondary-display";
import {
  MIN_RECOMMENDED_VALUE_SCORE,
  VALUE_SCORE_NEUTRAL_MIN,
} from "@/lib/value-score-thresholds";
import type { WineWithRelations } from "@/types";
import type { ComponentType, SVGProps } from "react";

interface ScoreCardProps {
  label: string;
  score: number | null | undefined;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  emptyLabel?: string | null;
}

function ScoreCard({
  label,
  score,
  description,
  icon: Icon,
  emptyLabel,
}: ScoreCardProps) {
  if ((score === null || score === undefined) && !emptyLabel) return null;

  return (
    <Card className="border-border/70 bg-card">
      <CardContent className="flex flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <EditorialSectionIcon icon={Icon} className="h-10 w-10" />
            <span className="text-sm font-medium text-foreground">{label}</span>
          </div>
          {score != null ? (
            <VinScoreBadge score={score} showLabel={false} />
          ) : (
            <span className="text-xs font-medium text-muted-foreground">
              {emptyLabel}
            </span>
          )}
        </div>
        <p className="break-words text-sm leading-relaxed text-muted-foreground">
          {sanitizeEditorialText(description)}
        </p>
      </CardContent>
    </Card>
  );
}

function valueScoreFallbackDescription(): string {
  return `Cat de bun este vinul raportat la pretul cerut. Peste ${MIN_RECOMMENDED_VALUE_SCORE} inseamna ca merita banii; ${VALUE_SCORE_NEUTRAL_MIN}-${MIN_RECOMMENDED_VALUE_SCORE - 1} este pret mediu; sub ${VALUE_SCORE_NEUTRAL_MIN} recomandam alternative.`;
}

function valueScoreDescription(wine: WineWithRelations): string {
  const raw = wine.valueExplanation?.trim();
  if (!raw) {
    return valueScoreFallbackDescription();
  }

  const { summary } = splitValueExplanation(raw);
  return summary || valueScoreFallbackDescription();
}

export function WineScoreCards({ wine }: { wine: WineWithRelations }) {
  const gift = publicGiftScoreDisplay(wine);
  const food = publicFoodScoreDisplay(wine);

  return (
    <section aria-labelledby="wine-scores-heading">
      <h2 id="wine-scores-heading" className="sr-only">
        Scoruri VinIntel
      </h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <ScoreCard
          label="VinIntel Score"
          score={wine.valueScore}
          description={valueScoreDescription(wine)}
          icon={EditorialValueIcon}
        />
        <ScoreCard
          label="Gift Score"
          score={gift.score}
          emptyLabel={gift.score == null ? gift.caption : null}
          description={
            gift.caption && gift.score != null
              ? gift.caption
              : "Cat de sigura si convingatoare este sticla ca alegere de cadou, din calitatea estimata, increderea in date, valoare si caracterul distinctiv. Nu evaluam ambalajul."
          }
          icon={EditorialGiftIcon}
        />
        <ScoreCard
          label="Versatilitate la masa"
          score={food.score}
          emptyLabel={food.score == null ? food.caption : null}
          description={
            food.caption && food.score != null
              ? food.caption
              : "Cat de versatil este vinul la masa, in general. Nu inseamna compatibilitate cu un fel anume; potrivirea de fel se calculeaza separat."
          }
          icon={EditorialFoodMatchIcon}
        />
      </div>
    </section>
  );
}
