import { Card, CardContent } from "@/components/ui/card";
import {
  EditorialFoodMatchIcon,
  EditorialGiftIcon,
} from "@/components/wines/editorial-icons";
import { EditorialSectionIcon } from "@/components/wines/editorial-section-icon";
import { VinScoreBadge } from "@/components/wines/vin-score-badge";
import { sanitizeEditorialText } from "@/lib/editorial-text";
import { resolvePublicSecondaryScores } from "@/lib/scoring-v2/public-secondary-display";
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

export function WineScoreCards({ wine }: { wine: WineWithRelations }) {
  const { gift, food } = resolvePublicSecondaryScores(wine);

  return (
    <section aria-labelledby="wine-scores-heading">
      <h2
        id="wine-scores-heading"
        className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
      >
        Pentru ce este potrivit
      </h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <ScoreCard
          label="Gift Score"
          score={gift.score}
          emptyLabel={gift.score == null ? gift.caption : null}
          description={
            gift.caption && gift.score != null
              ? gift.caption
              : "Cât de sigură și convingătoare este sticla ca alegere de cadou, din calitatea estimată, încrederea în date, valoare și caracterul distinctiv. Nu evaluăm ambalajul."
          }
          icon={EditorialGiftIcon}
        />
        <ScoreCard
          label="Versatilitate la masă"
          score={food.score}
          emptyLabel={food.score == null ? food.caption : null}
          description={
            food.caption && food.score != null
              ? food.caption
              : "Cât de versatil este vinul la masă, în general. Nu înseamnă compatibilitate cu un fel anume; potrivirea cu preparatul se evaluează separat."
          }
          icon={EditorialFoodMatchIcon}
        />
      </div>
    </section>
  );
}
