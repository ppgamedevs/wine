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
}

function ScoreCard({ label, score, description, icon: Icon }: ScoreCardProps) {
  if (score === null || score === undefined) return null;

  return (
    <Card className="border-border/70 bg-card">
      <CardContent className="flex flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <EditorialSectionIcon icon={Icon} className="h-10 w-10" />
            <span className="text-sm font-medium text-foreground">{label}</span>
          </div>
          <VinScoreBadge score={score} showLabel={false} />
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
          score={wine.giftScore}
          description="Cat de potrivit este ca dar: ambalaj perceput, prestigiu si impresia lasata la prima degustare."
          icon={EditorialGiftIcon}
        />
        <ScoreCard
          label="Food Match"
          score={wine.foodMatchScore}
          description="Cat de bine se potriveste cu mancarea romaneasca: sarmale, gratar, ciorbe si alte preparate locale."
          icon={EditorialFoodMatchIcon}
        />
      </div>
    </section>
  );
}
