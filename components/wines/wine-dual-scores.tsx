import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { VinScoreBadge } from "@/components/wines/vin-score-badge";
import { WineCommunityVoteButton } from "@/components/wines/wine-community-vote-button";
import {
  getCommunityScoreDisplay,
} from "@/lib/community-score";
import { splitValueExplanation, sanitizeEditorialText } from "@/lib/editorial-text";
import {
  buildValueScoreBreakdown,
  valueScoreInputFromWine,
} from "@/lib/scoring";
import { sanitizePublicSecondaryCopy } from "@/lib/scoring-v2/public-secondary-display";
import { cn } from "@/lib/utils";
import type { WineWithRelations } from "@/types";
import { Users } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { localizedHref } from "@/i18n/paths";

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

type BreakdownMessageKey =
  | "modelQuality"
  | "peerPrior"
  | "estimatedQuality"
  | "expectedQuality"
  | "segmentDelta"
  | "priceEfficiency"
  | "rawScore"
  | "qualityLimit"
  | "confidenceLimit";

function breakdownMessageKey(label: string): BreakdownMessageKey | null {
  const labels: Record<string, BreakdownMessageKey> = {
    "Q model (calitate intrinseca)": "modelQuality",
    "Q prior (vinuri similare)": "peerPrior",
    "Calitate estimata (Q)": "estimatedQuality",
    "Calitate asteptata la pret (E)": "expectedQuality",
    "Delta fata de segment (Q - E)": "segmentDelta",
    "Eficienta pret": "priceEfficiency",
    "Scor brut combinat": "rawScore",
    "Plafonare calitate": "qualityLimit",
    "Plafon incredere date": "confidenceLimit",
  };
  return labels[label] ?? null;
}

async function BreakdownTable({
  wine,
}: {
  wine: WineWithRelations;
}) {
  const locale = await getLocale();
  const t = await getTranslations("Wine.valueBreakdown");
  const input = valueScoreInputFromWine(wine);
  const breakdown = buildValueScoreBreakdown(input);
  const storedScore = wine.valueScore;
  const editorialSummary = wine.valueExplanation?.trim()
    ? sanitizePublicSecondaryCopy(
        splitValueExplanation(wine.valueExplanation).summary,
        wine,
        locale,
      )
    : null;

  return (
    <div className="space-y-4">
      <h3 className="font-serif text-xl font-semibold text-foreground">
        {t("heading")}
      </h3>
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        {t("intro")}
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {breakdown.quality != null ? (
          <MetricPill label={t("quality")} value={breakdown.quality} />
        ) : null}
        {breakdown.priceEfficiency != null ? (
          <MetricPill
            label={t("priceEfficiency")}
            value={breakdown.priceEfficiency}
          />
        ) : null}
        <MetricPill
          label={t("valueScore")}
          value={storedScore ?? breakdown.finalScore}
        />
        {breakdown.confidencePercent != null ? (
          <div className="rounded-lg border border-border/70 bg-secondary/30 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              {t("dataConfidence")}
            </p>
            <p className="font-medium text-foreground">
              {t("confidenceValue", {
                percent: breakdown.confidencePercent,
                provisional: breakdown.provisional ? t("provisional") : "",
              })}
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
                {t("factor")}
              </th>
              <th className="hidden px-4 py-3 text-left font-medium text-foreground sm:table-cell">
                {t("detail")}
              </th>
              <th className="px-4 py-3 text-right font-medium text-foreground">
                {t("points")}
              </th>
            </tr>
          </thead>
          <tbody>
            {breakdown.items.map((item) => {
              const messageKey = breakdownMessageKey(item.label);
              return (
                <tr
                  key={item.label}
                  className="border-b border-border/50 last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    {locale === "en" && messageKey
                      ? t(`item.${messageKey}`)
                      : item.label}
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                    {locale === "en" && messageKey
                      ? t(`detailText.${messageKey}`)
                      : item.detail}
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
              );
            })}
            <tr className="bg-secondary/30">
              <td className="px-4 py-3 font-medium text-foreground" colSpan={2}>
                {t("subtotal")}
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
                  {locale === "en"
                    ? t("provisionalNote")
                    : breakdown.penaltyNote}
                </td>
              </tr>
            ) : null}
            <tr className="bg-wine/5">
              <td className="px-4 py-3 font-serif text-base font-semibold text-foreground" colSpan={2}>
                {t("final")}
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

export async function WineDualScores({ wine }: { wine: WineWithRelations }) {
  const locale = await getLocale();
  const t = await getTranslations("Wine.community");
  const breakdown = await getTranslations("Wine.valueBreakdown");
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
        {t("heading")}
      </h2>
      <Card className="mt-5 border-border/70">
        <CardContent className="p-6 sm:p-8">
          <ScoreColumn
              title={t("scoreTitle")}
              badge={
                community.score != null ? (
                  <div className="flex flex-col items-start gap-2">
                    <VinScoreBadge
                      score={community.score}
                      size="lg"
                      showLabel={false}
                    />
                    <Badge
                      variant="secondary"
                      className="gap-1 font-normal"
                    >
                      <Users className="h-3 w-3" aria-hidden="true" />
                      {community.voteCount === 0
                        ? t("noVotesLabel")
                        : community.voteCount === 1
                          ? t("oneVoteLabel")
                          : t("manyVotesLabel", {
                              count: community.voteCount,
                            })}
                    </Badge>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("noVotes")}
                  </p>
                )
              }
              explanation={
                community.isLiveCommunity
                  ? t("explanation")
                  : community.score != null
                    ? `${t("explanation")} ${t("estimatedExplanation")}`
                    : t("explanation")
              }
              footer={
                <WineCommunityVoteButton
                  wineId={wine.id}
                  initialScore={community.isLiveCommunity ? community.score : null}
                  initialVoteCount={
                    community.isLiveCommunity ? community.voteCount : 0
                  }
                  labels={{
                    alreadyVoted: t("alreadyVoted", {
                      score: "__SCORE__",
                    }),
                    editVote: t("editVote"),
                    vote: t("vote"),
                    editTitle: t("editTitle"),
                    voteTitle: t("voteTitle"),
                    editDescription: t("editDescription"),
                    voteDescription: t("voteDescription"),
                    thanks: t("thanks", { score: "__SCORE__" }),
                    currentScore: t("currentScore", {
                      score: "__SCORE__",
                      votes: "__VOTES__",
                    }),
                    oneVote: t("oneVote"),
                    manyVotes: t("manyVotes", { count: "__COUNT__" }),
                    yourScore: t("yourScore"),
                    rangeLabel: t("rangeLabel"),
                    weak: t("weak"),
                    good: t("good"),
                    excellent: t("excellent"),
                    cancel: t("cancel"),
                    sending: t("sending"),
                    save: t("save"),
                    submit: t("submit"),
                    submitError: t("submitError"),
                  }}
                />
              }
            />
        </CardContent>
      </Card>

      {hasVinIntelScore ? (
        <details className="mt-8 rounded-xl border border-border/70 bg-card">
          <summary className="cursor-pointer px-5 py-4 font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {breakdown("summary")}
          </summary>
          <div className="border-t border-border/70 px-5 py-6 sm:px-8">
            <BreakdownTable wine={wine} />
            <a
              href={localizedHref(locale, "howScoresWork")}
              className="mt-5 inline-flex text-sm font-medium text-wine hover:underline"
            >
              {breakdown("methodology")}
            </a>
          </div>
        </details>
      ) : null}
    </section>
  );
}
