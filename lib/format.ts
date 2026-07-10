import type { WineType } from "@/types";
import {
  MIN_RECOMMENDED_VALUE_SCORE,
  VALUE_SCORE_EXCEPTIONAL_MIN,
  VALUE_SCORE_FAIR_MIN,
  VALUE_SCORE_MODEST_MIN,
  VALUE_SCORE_VERY_GOOD_MIN,
  valueScoreVerdictLabel,
} from "@/lib/value-score-thresholds";

const ronFormatter = new Intl.NumberFormat("ro-RO", {
  style: "currency",
  currency: "RON",
  maximumFractionDigits: 0,
});

export function formatRon(value: number | null | undefined): string {
  if (value === null || value === undefined) return "Pret indisponibil";
  return ronFormatter.format(value);
}

const longDateFormatter = new Intl.DateTimeFormat("ro-RO", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatLongDate(
  value: string | Date | null | undefined,
): string | undefined {
  if (!value) return undefined;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return undefined;
  return longDateFormatter.format(date);
}

const shortDateFormatter = new Intl.DateTimeFormat("ro-RO", {
  month: "short",
  year: "numeric",
});

export function formatShortDate(value: string | Date | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return undefined;
  return shortDateFormatter.format(date);
}

export const wineTypeLabel: Record<WineType, string> = {
  red: "Rosu",
  white: "Alb",
  rose: "Rose",
  sparkling: "Spumant",
  dessert: "Desert",
  orange: "Orange",
};

export const wineTypeGradient: Record<WineType, string> = {
  red: "from-wine/85 via-wine to-[#4a1608]",
  white: "from-amber-200/70 via-amber-100 to-stone-100",
  rose: "from-rose-300/70 via-rose-200 to-stone-100",
  sparkling: "from-amber-100 via-stone-100 to-amber-50",
  dessert: "from-amber-400/70 via-amber-300 to-amber-100",
  orange: "from-orange-300/70 via-orange-200 to-amber-100",
};

export function valueScoreTone(score: number | null | undefined): string {
  return getVinScoreMeta(score).badgeClass;
}

export interface VinScoreMeta {
  badgeClass: string;
  ringClass: string;
  label: string;
}

/** Color-coded score bands for VinIntel 0-100 scale (v2). */
export function getVinScoreMeta(score: number | null | undefined): VinScoreMeta {
  if (score === null || score === undefined) {
    return {
      badgeClass: "bg-muted text-muted-foreground",
      ringClass: "ring-muted/40",
      label: "N/A",
    };
  }

  if (score >= VALUE_SCORE_EXCEPTIONAL_MIN) {
    return {
      badgeClass: "bg-emerald-800 text-white shadow-sm",
      ringClass: "ring-emerald-700/35",
      label: valueScoreVerdictLabel(score),
    };
  }

  if (score >= VALUE_SCORE_VERY_GOOD_MIN) {
    return {
      badgeClass: "bg-emerald-700 text-white shadow-sm",
      ringClass: "ring-emerald-600/30",
      label: valueScoreVerdictLabel(score),
    };
  }

  if (score >= MIN_RECOMMENDED_VALUE_SCORE) {
    return {
      badgeClass: "bg-emerald-600/90 text-white shadow-sm",
      ringClass: "ring-emerald-600/25",
      label: valueScoreVerdictLabel(score),
    };
  }

  if (score >= VALUE_SCORE_FAIR_MIN) {
    return {
      badgeClass: "bg-amber-500/20 text-amber-950 border border-amber-500/35",
      ringClass: "ring-amber-500/30",
      label: valueScoreVerdictLabel(score),
    };
  }

  if (score >= VALUE_SCORE_MODEST_MIN) {
    return {
      badgeClass: "bg-orange-500/15 text-orange-950 border border-orange-500/30",
      ringClass: "ring-orange-500/25",
      label: valueScoreVerdictLabel(score),
    };
  }

  return {
    badgeClass: "bg-red-600/10 text-red-900 border border-red-500/25",
    ringClass: "ring-red-500/20",
    label: valueScoreVerdictLabel(score),
  };
}
