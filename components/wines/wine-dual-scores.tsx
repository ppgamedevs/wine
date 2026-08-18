import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { VinScoreBadge } from "@/components/wines/vin-score-badge";
import { WineCommunityVoteButton } from "@/components/wines/wine-community-vote-button";
import {
  COMMUNITY_SCORE_EXPLANATION,
  formatCommunityVoteLabel,
  getCommunityScoreDisplay,
} from "@/lib/community-score";
import { splitValueExplanation, sanitizeEditorialText } from "@/lib/editorial-text";
import {
  buildValueScoreBreakdown,
  valueScoreInputFromWine,
} from "@/lib/scoring";
import { cn } from "@/lib/utils";
import type { WineWithRelations } from "@/types";
import { Users } from "lucide-react";

function ScoreColumn({
  title,
  badge,
  explanation,
  footer,
}: {
  title: string;
  badge: React.ReactNode;
  explanation: string;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <div className="flex items-center gap-2">
        <h3 className="font-serif text-lg font-semibold text-foreground">
          {title}
        </h3>
      </div>
      {badge}
      {explanation.trim() ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {explanation}
        </p>
      ) : null}
      {footer ? <div className="mt-auto pt-2">{footer}</div> : null}
    </div>
  );
}

function MetricPill({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-secondary/30 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-serif text-lg font-semibold tabular-nums text-foreground">
        {value}
        {suffix ?? "/100"}
      </p>
    </div>
  );
}

function BreakdownTable({
  wine,
}: {
  wine: WineWithRelations;
}) {
  const input = valueScoreInputFromWine(wine);
  const breakdown = buildValueScoreBreakdown(input);
  const storedScore = wine.valueScore;
  const editorialSummary = wine.valueExplanation?.trim()
    ? splitValueExplanation(wine.valueExplanation).summary
    : null;

  return (
    <div className="space-y-4">
      <h3 className="font-serif text-xl font-semibold text-foreground">
        Cum am calculat Value Score
      </h3>
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        VinIntel Value Score separa calitatea intrinseca (Q) de eficienta
        pretului. Q foloseste date de degustare, medalii validate, regiune,
        crama si vintage, fara a infera calitatea din pret. Eficienta pretului
        masoara cat de bine se pozitioneaza vinul fata de nivelul obisnuit al
        segmentului sau la acel pret.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {breakdown.quality != null ? (
          <MetricPill label="Calitate estimata (Q)" value={breakdown.quality} />
        ) : null}
        {breakdown.priceEfficiency != null ? (
          <MetricPill
            label="Eficienta pret"
            value={breakdown.priceEfficiency}
          />
        ) : null}
        <MetricPill
          label="VinIntel Value Score"
          value={storedScore ?? breakdown.finalScore}
        />
        {breakdown.confidenceLabel ? (
          <div className="rounded-lg border border-border/70 bg-secondary/30 px-3 py-2">
            <p className="text-xs text-muted-foreground">Increderea datelor</p>
            <p className="font-medium text-foreground">
              {breakdown.confidenceLabel}
              {breakdown.confidencePercent != null
                ? ` (${breakdown.confidencePercent}%)`
                : ""}
              {breakdown.provisional ? " · scor provizoriu" : ""}
            </p>
          </div>
        ) : null}
      </div>

      {editorialSummary ? (
        <p className="max-w-3xl text-base leading-relaxed text-foreground/90">
          {sanitizeEditorialText(editorialSummary)}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border/70">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/70 bg-secondary/40">
              <th className="px-4 py-3 text-left font-medium text-foreground">
                Factor
              </th>
              <th className="hidden px-4 py-3 text-left font-medium text-foreground sm:table-cell">
                Detaliu
              </th>
              <th className="px-4 py-3 text-right font-medium text-foreground">
                Puncte
              </th>
            </tr>
          </thead>
          <tbody>
            {breakdown.items.map((item) => (
              <tr
                key={item.label}
                className="border-b border-border/50 last:border-0"
              >
                <td className="px-4 py-3 font-medium text-foreground">
                  {item.label}
                </td>
                <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                  {item.detail}
                </td>
                <td
                  className={cn(
                    "px-4 py-3 text-right font-semibold tabular-nums",
                    item.points >= 0 ? "text-wine" : "text-destructive",
                  )}
                >
                  {item.points >= 0 ? "+" : ""}
                  {item.points}
                </td>
              </tr>
            ))}
            <tr className="bg-secondary/30">
              <td className="px-4 py-3 font-medium text-foreground" colSpan={2}>
                Scor brut combinat
              </td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                {breakdown.subtotal}
              </td>
            </tr>
            {breakdown.penaltyNote ? (
              <tr>
                <td
                  className="px-4 py-3 text-sm text-muted-foreground"
                  colSpan={3}
                >
                  {breakdown.penaltyNote}
                </td>
              </tr>
            ) : null}
            <tr className="bg-wine/5">
              <td className="px-4 py-3 font-serif text-base font-semibold text-foreground" colSpan={2}>
                VinIntel Value Score final
              </td>
              <td className="px-4 py-3 text-right">
                <span className="font-serif text-lg font-bold text-wine">
                  {storedScore ?? breakdown.finalScore}/100
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function WineDualScores({ wine }: { wine: WineWithRelations }) {
  const community = getCommunityScoreDisplay(wine);
  const hasVinIntelScore = wine.valueScore != null;

  if (!hasVinIntelScore && community.score == null) {
    return null;
  }

  return (
    <section aria-labelledby="wine-dual-scores-heading" className="scroll-mt-24">
      <h2
        id="wine-dual-scores-heading"
        className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
      >
        Ce spun utilizatorii
      </h2>
      <Card className="mt-5 border-border/70">
        <CardContent className="p-6 sm:p-8">
          <ScoreColumn
              title="Scorul comunității"
              badge={
                community.score != null ? (
                  <div className="flex flex-col items-start gap-2">
                    <VinScoreBadge score={community.score} size="lg" />
                    <Badge
                      variant="secondary"
                      className="gap-1 font-normal"
                    >
                      <Users className="h-3 w-3" aria-hidden="true" />
                      {formatCommunityVoteLabel(community.voteCount)}
                    </Badge>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Inca nu exista voturi. Fii primul care noteaza acest vin.
                  </p>
                )
              }
              explanation={
                community.isLiveCommunity
                  ? COMMUNITY_SCORE_EXPLANATION
                  : community.score != null
                    ? `${COMMUNITY_SCORE_EXPLANATION} Date estimate din surse externe până la primele voturi VinIntel.`
                    : COMMUNITY_SCORE_EXPLANATION
              }
              footer={
                <WineCommunityVoteButton
                  wineId={wine.id}
                  initialScore={community.isLiveCommunity ? community.score : null}
                  initialVoteCount={
                    community.isLiveCommunity ? community.voteCount : 0
                  }
                />
              }
            />
        </CardContent>
      </Card>

      {hasVinIntelScore ? (
        <details className="mt-8 rounded-xl border border-border/70 bg-card">
          <summary className="cursor-pointer px-5 py-4 font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Cum am calculat Value Score
          </summary>
          <div className="border-t border-border/70 px-5 py-6 sm:px-8">
            <BreakdownTable wine={wine} />
            <a
              href="/cum-functioneaza-scorurile"
              className="mt-5 inline-flex text-sm font-medium text-wine hover:underline"
            >
              Vezi metodologia completă
            </a>
          </div>
        </details>
      ) : null}
    </section>
  );
}
