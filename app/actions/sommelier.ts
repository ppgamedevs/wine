"use server";

import { getWinesForSommelier } from "@/lib/queries";
import {
  OCCASIONS,
  recommendWines,
  type ColorPreference,
  type OccasionId,
  type Recommendation,
  type SommelierInput,
  type SweetnessPreference,
} from "@/lib/sommelier";

export interface SommelierState {
  status: "idle" | "success" | "error";
  recommendations: Recommendation[];
  input?: SommelierInput;
  message?: string;
}

const COLORS: ColorPreference[] = ["any", "red", "white", "rose", "sparkling"];
const SWEETNESS: SweetnessPreference[] = [
  "any",
  "sec",
  "demisec",
  "demidulce",
  "dulce",
];

function parseColor(value: FormDataEntryValue | null): ColorPreference {
  const v = String(value ?? "any");
  return (COLORS as string[]).includes(v) ? (v as ColorPreference) : "any";
}

function parseSweetness(value: FormDataEntryValue | null): SweetnessPreference {
  const v = String(value ?? "any");
  return (SWEETNESS as string[]).includes(v)
    ? (v as SweetnessPreference)
    : "any";
}

function parseOccasion(value: FormDataEntryValue | null): OccasionId {
  const v = String(value ?? "oricare");
  return OCCASIONS.some((o) => o.id === v) ? (v as OccasionId) : "oricare";
}

export async function getSommelierRecommendations(
  _prev: SommelierState,
  formData: FormData,
): Promise<SommelierState> {
  try {
    const budgetMax = Number(formData.get("budgetMax") ?? 150);
    const budgetMinRaw = Number(formData.get("budgetMin") ?? 0);
    const budgetMin = Number.isFinite(budgetMinRaw) ? budgetMinRaw : 0;

    const preferredWinerySlugs = formData
      .getAll("winery")
      .map((v) => String(v))
      .filter(Boolean);

    const input: SommelierInput = {
      budgetMin: Math.max(0, Math.min(budgetMin, budgetMax)),
      budgetMax: Number.isFinite(budgetMax) ? Math.max(20, budgetMax) : 150,
      budgetSpecified: true,
      occasion: parseOccasion(formData.get("occasion")),
      color: parseColor(formData.get("color")),
      sweetness: parseSweetness(formData.get("sweetness")),
      preferredWinerySlugs,
      absurdRequest: false,
    };

    const allWines = await getWinesForSommelier();
    const recommendations = recommendWines(allWines, input, 5);

    if (recommendations.length === 0) {
      return {
        status: "success",
        recommendations: [],
        input,
        message:
          "Nu am gasit potriviri in bugetul ales. Incearca sa cresti bugetul sau sa alegi oricare tip de vin.",
      };
    }

    return { status: "success", recommendations, input };
  } catch (error) {
    console.error("getSommelierRecommendations failed", error);
    return {
      status: "error",
      recommendations: [],
      message: "A aparut o eroare. Te rugam sa incerci din nou.",
    };
  }
}
