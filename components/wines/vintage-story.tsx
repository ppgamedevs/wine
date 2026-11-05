import Link from "next/link";
import { ArrowUpRight, CalendarDays, Grape, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AppLocale } from "@/i18n/locale";
import { localizedHref } from "@/i18n/paths";
import type { VintageIntelligence } from "@/lib/vintage/query";
import { buildVintageComparisonCopy, classificationLabel } from "@/lib/vintage/story";

const CLASSIFICATION_STYLE: Record<string, string> = {
  exceptional: "border-amber-300/70 bg-amber-50 text-amber-800",
  favorable: "border-emerald-300/70 bg-emerald-50 text-emerald-800",
  mixed: "border-amber-300/60 bg-amber-50/70 text-amber-800",
  difficult: "border-rose-300/60 bg-rose-50 text-rose-800",
  insufficient: "border-border bg-secondary/40 text-muted-foreground",
};

function impactLabel(impact: string, locale: AppLocale) {
  const labels: Record<string, { ro: string; en: string }> = {
    positive: { ro: "Favorabil", en: "Favorable" },
    negative: { ro: "Provocare", en: "Challenge" },
    mixed: { ro: "Mixt", en: "Mixed" },
    neutral: { ro: "Context", en: "Context" },
  };
  return labels[impact]?.[locale] ?? impact;
}

export function VintageStory({
  intelligence,
  locale,
  currentVintage,
}: {
  intelligence: VintageIntelligence;
  locale: AppLocale;
  currentVintage: number | null;
}) {
  const { assessment, story, family, comparisons } = intelligence;
  const t = (ro: string, en: string) => (locale === "ro" ? ro : en);
  const vintage = currentVintage;
  const title =
    vintage != null
      ? t(`Povestea recoltei ${vintage}`, `The ${vintage} harvest story`)
      : t("Povestea recoltei", "The harvest-year story");

  return (
    <section aria-labelledby="vintage-story-heading" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-wine">
            {t("Context de recoltă", "Vintage context")}
          </p>
          <h2
            id="vintage-story-heading"
            className="mt-2 font-serif text-2xl font-semibold text-foreground sm:text-3xl"
          >
            {title}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${CLASSIFICATION_STYLE[assessment.classification] ?? CLASSIFICATION_STYLE.insufficient}`}
          >
            {classificationLabel(assessment.classification, locale)}
          </span>
          <Badge variant="outline" className="gap-1">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {t(
              `Încredere ${Math.round(assessment.confidence * 100)}%`,
              `${Math.round(assessment.confidence * 100)}% confidence`,
            )}
          </Badge>
        </div>
      </div>

      <div className="rounded-3xl border border-border/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.85),rgba(247,242,232,0.45))] p-6 sm:p-8">
        <p className="max-w-4xl font-serif text-xl leading-relaxed text-foreground sm:text-2xl">
          {story.summary}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            {assessment.evidenceCount} {t("dovezi", "evidence items")}
          </span>
          <span>
            {assessment.independentSourceCount} {t("surse independente", "independent sources")}
          </span>
          {family.differences.length > 0 ? (
            <span className="text-amber-700">
              {buildVintageComparisonCopy(family, locale)}
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/70 bg-card p-5">
          <h3 className="font-serif text-lg font-semibold text-foreground">
            {t("Ce a susținut recolta", "What supported the vintage")}
          </h3>
          {story.strengths.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
              {story.strengths.map((item) => (
                <li key={item} className="border-l-2 border-emerald-400/60 pl-3">
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              {t("Nu există suficiente dovezi favorabile.", "No sufficient favourable evidence.")}
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-5">
          <h3 className="font-serif text-lg font-semibold text-foreground">
            {t("Provocări și limite", "Challenges and limits")}
          </h3>
          {story.challenges.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
              {story.challenges.map((item) => (
                <li key={item} className="border-l-2 border-rose-300/60 pl-3">
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              {t("Nu au fost identificate provocări majore în dovezile disponibile.", "No major challenges were identified in the available evidence.")}
            </p>
          )}
        </div>
      </div>

      {assessment.regionalExceptions.length > 0 ? (
        <div className="rounded-2xl border border-amber-300/60 bg-amber-50/60 p-5">
          <h3 className="font-serif text-lg font-semibold text-foreground">
            {t("Excepții regionale", "Regional exceptions")}
          </h3>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            {assessment.regionalExceptions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {story.timeline.length > 0 ? (
        <div className="rounded-2xl border border-border/70 bg-card p-5">
          <h3 className="font-serif text-lg font-semibold text-foreground">
            {t("Cronologia sezonului", "Growing-season timeline")}
          </h3>
          <ol className="mt-4 space-y-3">
            {story.timeline.map((event, index) => (
              <li key={`${event.label}-${index}`} className="flex gap-3 text-sm">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-wine/70" aria-hidden="true" />
                <div>
                  <p className="font-medium text-foreground">{event.label}</p>
                  {event.eventDate ? (
                    <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-wine/80">
                      {event.eventDate}
                    </p>
                  ) : null}
                  <p className="mt-0.5 text-muted-foreground">{event.excerpt}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground/70">
                    {impactLabel(event.impact, locale)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border/70 bg-secondary/20 p-5">
          <h3 className="flex items-center gap-2 font-serif text-lg font-semibold text-foreground">
            <Grape className="h-4 w-4 text-wine" aria-hidden="true" />
            {t("Potrivirea cu soiul", "Grape suitability")}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {story.grapeSuitability ?? t("Nu există dovezi specifice soiului.", "No grape-specific evidence.")}
          </p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-secondary/20 p-5">
          <h3 className="font-serif text-lg font-semibold text-foreground">
            {t("Maturitate", "Maturity")}
          </h3>
          <p className="mt-2 text-sm font-medium text-foreground">{story.maturityLabel}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {story.maturityText ?? t("Nu extrapolăm starea sticlei.", "We do not infer bottle condition.")}
          </p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-secondary/20 p-5">
          <h3 className="font-serif text-lg font-semibold text-foreground">
            {t("Ce nu știm", "What we do not know")}
          </h3>
          {story.unknowns.length > 0 ? (
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              {story.unknowns.map((item) => <li key={item}>{item}</li>)}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              {t("Dovezile acoperă întrebările de bază.", "The evidence covers the basic questions.")}
            </p>
          )}
        </div>
      </div>

      {story.facts.length > 0 || story.interpretation.length > 0 ? (
        <div className="rounded-2xl border border-border/70 bg-card p-5">
          <h3 className="font-serif text-lg font-semibold text-foreground">
            {t("Fapte și interpretare", "Facts and interpretation")}
          </h3>
          {story.facts.length > 0 ? (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("Confirmat de surse", "Source-confirmed")}
              </p>
              <ul className="mt-1 space-y-1.5 text-sm text-muted-foreground">
                {story.facts.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ) : null}
          {story.interpretation.length > 0 ? (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("Interpretare bazată pe dovezi", "Evidence-based interpretation")}
              </p>
              <ul className="mt-1 space-y-1.5 text-sm text-muted-foreground">
                {story.interpretation.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {comparisons.length > 0 ? (
        <div className="rounded-2xl border border-border/70 bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-serif text-lg font-semibold text-foreground">
              {t("Compară recoltele", "Compare vintages")}
            </h3>
            <span className="text-xs text-muted-foreground">
              {t("Aceeași familie, produse distincte", "Same family, distinct products")}
            </span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {comparisons.map((comparison) => (
              <div key={`${comparison.left.wine.id}-${comparison.right.wine.id}`} className="rounded-xl border border-border/60 bg-secondary/20 p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="font-serif text-xl font-semibold text-foreground">
                      {comparison.left.wine.vintage ?? "NV"}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {classificationLabel(comparison.left.assessment.classification, locale)}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {comparison.left.assessment.strengths[0] ?? t("Dovezi insuficiente.", "Insufficient evidence.")}
                    </p>
                  </div>
                  <div>
                    <p className="font-serif text-xl font-semibold text-foreground">
                      {comparison.right.wine.vintage ?? "NV"}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {classificationLabel(comparison.right.assessment.classification, locale)}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {comparison.right.assessment.strengths[0] ?? t("Dovezi insuficiente.", "Insufficient evidence.")}
                    </p>
                  </div>
                </div>
                {comparison.differences.length > 0 ? (
                  <p className="mt-3 text-xs text-amber-700">
                    {t("Diferențe de fișă: ", "Release differences: ")}
                    {comparison.differences.join(", ")}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-secondary/20 p-5 text-sm">
        <div>
          <p className="font-medium text-foreground">{t("Surse și transparență", "Sources and transparency")}</p>
          <p className="mt-1 text-muted-foreground">
            {t(
              "Clasificarea se referă la recoltă, nu la nota unei sticle. Nu folosim scoruri 0–100 fără metodologie publicată.",
              "The classification concerns the harvest, not a bottle score. We do not use 0–100 scores without a published methodology.",
            )}
          </p>
        </div>
        <Link
          href={localizedHref(locale, "vintageGuide")}
          className="inline-flex items-center gap-1 text-sm font-medium text-wine underline-offset-4 hover:underline"
        >
          {t("Ghidul recoltelor", "Vintage guide")}
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      {story.sources.length > 0 ? (
        <ul className="grid gap-2 md:grid-cols-2">
          {story.sources.map((source) => (
            <li key={source.url} className="rounded-lg border border-border/60 bg-background px-3 py-2 text-xs">
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-wine underline-offset-4 hover:underline"
              >
                {source.title}
              </a>
              <p className="mt-1 text-muted-foreground">
                {source.publisher}
                {source.producerClaim ? ` · ${t("producător", "producer")}` : ""}
                {source.independent ? ` · ${t("independent", "independent")}` : ""}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
