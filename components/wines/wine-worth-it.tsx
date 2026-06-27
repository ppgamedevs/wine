import { CheckCircle2, MinusCircle, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buildWorthItAnalysis } from "@/lib/wine-analysis";
import { cn } from "@/lib/utils";
import type { WineWithRelations } from "@/types";

const verdictConfig = {
  da: {
    icon: CheckCircle2,
    className: "border-wine/30 bg-wine/5",
    iconClass: "text-wine",
  },
  partial: {
    icon: MinusCircle,
    className: "border-gold/40 bg-gold/5",
    iconClass: "text-gold",
  },
  nu: {
    icon: XCircle,
    className: "border-destructive/30 bg-destructive/5",
    iconClass: "text-destructive",
  },
} as const;

export function WineWorthIt({ wine }: { wine: WineWithRelations }) {
  const analysis = buildWorthItAnalysis(wine);
  const config = verdictConfig[analysis.verdict];
  const Icon = config.icon;

  return (
    <section aria-labelledby="worth-it-heading">
      <h2
        id="worth-it-heading"
        className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
      >
        Merita banii?
      </h2>
      <Card className={cn("mt-6 border", config.className)}>
        <CardContent className="p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span
              className={cn(
                "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-background",
                config.iconClass,
              )}
            >
              <Icon className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="flex-1">
              <h3 className="font-serif text-xl font-semibold text-foreground">
                {analysis.headline}
              </h3>
              <p className="mt-2 text-base leading-relaxed text-muted-foreground">
                {analysis.summary}
              </p>
              <ul className="mt-5 space-y-2.5">
                {analysis.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="flex items-start gap-2 text-sm leading-relaxed text-foreground/90"
                  >
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-wine"
                      aria-hidden="true"
                    />
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
