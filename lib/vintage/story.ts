import type { AppLocale } from "@/i18n/locale";
import type { WineWithRelations } from "@/types";
import type {
  VintageAssessment,
  VintageClassification,
  VintageEvidenceType,
  VintageFamily,
  MaturityStatus,
} from "@/lib/vintage/types";

const CLASSIFICATION_LABELS: Record<VintageClassification, Record<AppLocale, string>> = {
  exceptional: { ro: "Excepțională", en: "Exceptional" },
  favorable: { ro: "Favorabilă", en: "Favorable" },
  mixed: { ro: "Mixtă", en: "Mixed" },
  difficult: { ro: "Dificilă", en: "Difficult" },
  insufficient: { ro: "Dovezi insuficiente", en: "Insufficient evidence" },
};

export function classificationLabel(
  classification: VintageClassification,
  locale: AppLocale,
): string {
  return CLASSIFICATION_LABELS[classification][locale];
}

const MATURITY_LABELS: Record<MaturityStatus, Record<AppLocale, string>> = {
  drink_now: { ro: "De băut acum", en: "Drink now" },
  can_age: { ro: "Poate evolua în sticlă", en: "Can age further" },
  approaching_maturity: { ro: "Se apropie de maturitate", en: "Approaching maturity" },
  past_peak: { ro: "Posibil trecut de apogeu", en: "Potentially past peak" },
  insufficient: { ro: "Informații insuficiente", en: "Insufficient information" },
};

const EVENT_LABELS: Record<VintageEvidenceType, Record<AppLocale, string>> = {
  winter_water: { ro: "Iarnă și rezerve de apă", en: "Winter and water reserves" },
  spring_frost: { ro: "Frost de primăvară", en: "Spring frost" },
  flowering: { ro: "Înflorire", en: "Flowering" },
  rain_drought: { ro: "Ploaie și secetă", en: "Rain and drought" },
  heat: { ro: "Caniculă și temperaturi", en: "Heat and temperatures" },
  disease_hail: { ro: "Boli și grindină", en: "Disease and hail" },
  veraison_ripening: { ro: "Veraison și coacere", en: "Veraison and ripening" },
  harvest_timing_weather: { ro: "Momentul și vremea recoltei", en: "Harvest timing and weather" },
  sugar_acidity: { ro: "Zahăr și aciditate", en: "Sugar and acidity" },
  phenolic_ripeness: { ro: "Maturitate fenolică", en: "Phenolic ripeness" },
  yield_selection: { ro: "Randament și selecție", en: "Yield and selection" },
  producer_note: { ro: "Notă oficială a producătorului", en: "Official producer note" },
  critic_review: { ro: "Evaluare independentă", en: "Independent assessment" },
  official_report: { ro: "Raport oficial", en: "Official report" },
  maturity_guidance: { ro: "Ghid de maturitate", en: "Maturity guidance" },
};

export interface VintageStory {
  classification: VintageClassification;
  classificationLabel: string;
  summary: string;
  facts: string[];
  interpretation: string[];
  strengths: string[];
  challenges: string[];
  unknowns: string[];
  maturityLabel: string;
  maturityText: string | null;
  grapeSuitability: string | null;
  sources: VintageAssessment["sources"];
  timeline: Array<{ label: string; excerpt: string; impact: string; eventDate: string | null }>;
}

export function vintageLabel(vintage: number | null, locale: AppLocale): string {
  if (vintage != null) return String(vintage);
  return locale === "ro" ? "Fără an" : "Non-vintage";
}

export function buildVintageStory(input: {
  wine: WineWithRelations;
  assessment: VintageAssessment;
  locale: AppLocale;
}): VintageStory {
  const { assessment, wine, locale } = input;
  const label = vintageLabel(wine.vintage, locale);
  const family = wine.name;
  const t = (ro: string, en: string) => (locale === "ro" ? ro : en);
  const classificationLabel = CLASSIFICATION_LABELS[assessment.classification][locale];

  const summary =
    assessment.classification === "insufficient"
      ? t(
          `Nu avem încă suficiente dovezi independente pentru a caracteriza recolta ${label} la ${family}.`,
          `We do not yet have enough independent evidence to characterise the ${label} harvest for ${family}.`,
        )
      : t(
          `Recolta ${label} este evaluată ca ${classificationLabel.toLowerCase()} pentru ${family}, pe baza a ${assessment.evidenceCount} dovezi (${assessment.independentSourceCount} independente).`,
          `The ${label} harvest is assessed as ${classificationLabel.toLowerCase()} for ${family}, based on ${assessment.evidenceCount} evidence items (${assessment.independentSourceCount} independent).`,
        );

  const interpretation =
    assessment.classification === "insufficient"
      ? []
      : [
          t(
            "Clasificarea descrie recolta și contextul de creștere, nu calitatea sticlei individuale.",
            "This classification describes the harvest and growing context, not the quality of the individual bottle.",
          ),
          ...(assessment.weaknesses.length > 0 && assessment.strengths.length > 0
            ? [
                t(
                  "Există atât semnale favorabile, cât și limitări; Nu transformăm această tensiune într-un scor numeric.",
                  "There are both favourable signals and limitations; we do not turn that tension into a numeric score.",
                ),
              ]
            : []),
        ];

  return {
    classification: assessment.classification,
    classificationLabel,
    summary,
    facts: assessment.summaryFacts,
    interpretation,
    strengths: assessment.strengths,
    challenges: assessment.weaknesses,
    unknowns: assessment.unknowns,
    maturityLabel: MATURITY_LABELS[assessment.maturity][locale],
    maturityText: assessment.maturityText,
    grapeSuitability: assessment.grapeSuitability,
    sources: assessment.sources,
    timeline: assessment.timeline.map((item) => ({
      label: EVENT_LABELS[item.evidenceType]?.[locale] ?? item.label,
      excerpt: item.excerpt,
      impact: item.impact,
      eventDate: item.eventDate ?? null,
    })),
  };
}

export function buildVintageComparisonCopy(
  family: VintageFamily,
  locale: AppLocale,
): string {
  if (family.differences.length === 0) {
    return locale === "ro"
      ? "Recoltele din aceeași familie, comparate fără a amesteca sticlele."
      : "Vintages from the same family, compared without merging the bottles.";
  }
  return locale === "ro"
    ? "Atenție: între recoltări există diferențe de blend sau format; comparația nu este identică."
    : "Note: blend or bottle-format differences exist between releases; the comparison is not like-for-like.";
}
