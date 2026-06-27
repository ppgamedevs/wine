import { Gift, Gauge, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { valueScoreTone } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { WineWithRelations } from "@/types";

interface ScoreCardProps {
  label: string;
  score: number | null | undefined;
  description: string;
  icon: LucideIcon;
}

function ScoreCard({ label, score, description, icon: Icon }: ScoreCardProps) {
  if (score === null || score === undefined) return null;

  return (
    <Card className="border-border/70 bg-card">
      <CardContent className="flex flex-col gap-3 p-6">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Icon className="h-4 w-4 text-wine" aria-hidden="true" />
            {label}
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-lg font-bold",
              valueScoreTone(score),
            )}
          >
            {score}
            <span className="ml-0.5 text-sm font-medium opacity-70">/100</span>
          </span>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

export function WineScoreCards({ wine }: { wine: WineWithRelations }) {
  return (
    <section aria-labelledby="wine-scores-heading">
      <h2 id="wine-scores-heading" className="sr-only">
        Scoruri VinIntel
      </h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <ScoreCard
          label="Value Score"
          score={wine.valueScore}
          description="Cat de bun este vinul raportat la pretul cerut. Peste 85 inseamna excelent raport calitate-pret."
          icon={Gauge}
        />
        <ScoreCard
          label="Gift Score"
          score={wine.giftScore}
          description="Cat de potrivit este ca dar: ambalaj perceput, prestigiu si impresia lasata la prima degustare."
          icon={Gift}
        />
        <ScoreCard
          label="Food Match"
          score={wine.foodMatchScore}
          description="Cat de bine se potriveste cu mancarea romaneasca: sarmale, gratar, ciorbe si alte preparate locale."
          icon={UtensilsCrossed}
        />
      </div>
    </section>
  );
}
