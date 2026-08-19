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
import { getTranslations } from "next-intl/server";

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

export async function WineScoreCards({ wine }: { wine: WineWithRelations }) {
  const t = await getTranslations("Wine.scoreCards");
  const { gift, food } = resolvePublicSecondaryScores(wine);
  // Prompt 27A guard keeps "Versatilitate la masă" as the canonical Romanian label.

  return (
    <section aria-labelledby="wine-scores-heading">
      <h2
        id="wine-scores-heading"
        className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
      >
        {t("heading")}
      </h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <ScoreCard
          label={t("gift")}
          score={gift.score}
          emptyLabel={gift.score == null ? t("giftUnavailable") : null}
          description={
            gift.provisional && gift.score != null
              ? t("limitedScore", {
                  label: t("gift"),
                  score: gift.score,
                })
              : t("giftDescription")
          }
          icon={EditorialGiftIcon}
        />
        <ScoreCard
          label={t("food")}
          score={food.score}
          emptyLabel={food.score == null ? t("foodUnavailable") : null}
          description={
            food.provisional && food.score != null
              ? t("limitedScore", {
                  label: t("food"),
                  score: food.score,
                })
              : t("foodDescription")
          }
          icon={EditorialFoodMatchIcon}
        />
      </div>
    </section>
  );
}
