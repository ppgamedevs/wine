import { isAutochthonousGrapeMix } from "@/lib/scoring";
import type { WineMedal } from "@/lib/schema";
import {
  M1_MAX,
  M1_PRESTIGE_GRAPE_PATTERNS,
  M2_MAX,
  M2_PREMIUM_REGIONS,
  M3_MAX,
  M3_REFERENCE_WINERY_PATTERNS,
  M4_MAX,
  M5_MAX,
  M5_TIER1_COMPETITION_PATTERNS,
} from "@/lib/scoring-v2/constants";
import {
  normalizeGrapeHaystack,
  normalizeRegionLabel,
  normalizeWineType,
  normalizeWineryName,
} from "@/lib/scoring-v2/normalize";

export interface ModifierBreakdownItem {
  label: string;
  detail: string;
  points: number;
}

export interface QualityModifiersResult {
  m1: number;
  m2: number;
  m3: number;
  m4: number;
  m5: number;
  total: number;
  items: ModifierBreakdownItem[];
}

export function calculateQualityModifiers(input: {
  qHat: number;
  grapeVarieties?: string[];
  region?: string;
  wineryName?: string;
  wineType?: string;
  cellarPotential?: number | null;
  acidity?: number | null;
  tasteProfile?: string | null;
  wineMedals?: WineMedal[];
}): QualityModifiersResult {
  const items: ModifierBreakdownItem[] = [];

  const m1 = calculateM1Autochthonous(
    input.grapeVarieties,
    input.qHat,
    items,
  );
  const m2 = calculateM2Region(input.region, items);
  const m3 = calculateM3Winery(input.wineryName, items);
  const m4 = calculateM4Aging(input, items);
  const m5 = calculateM5Medals(input.wineMedals, items);

  return {
    m1,
    m2,
    m3,
    m4,
    m5,
    total: m1 + m2 + m3 + m4 + m5,
    items,
  };
}

function calculateM1Autochthonous(
  grapeVarieties: string[] | undefined,
  qHat: number,
  items: ModifierBreakdownItem[],
): number {
  const grapes = grapeVarieties ?? [];
  if (!grapes.length) return 0;

  const haystack = normalizeGrapeHaystack(grapes);
  let points = 0;

  const hasPrestige = M1_PRESTIGE_GRAPE_PATTERNS.some(({ pattern, requiresQuality }) => {
    if (!pattern.test(haystack)) return false;
    if (requiresQuality && qHat < 72) return false;
    return true;
  });

  if (hasPrestige) {
    points = M1_MAX;
    items.push({
      label: "M1 Soi autohton de prestigiu",
      detail: "Feteasca, Negru de Dragasani, Grasa, Busuioaca sau Tamaioasa de calitate",
      points,
    });
  } else if (isAutochthonousGrapeMix(grapes)) {
    points = 1;
    items.push({
      label: "M1 Soi autohton",
      detail: "Componenta autohtona in cupaj",
      points,
    });
  }

  return Math.min(points, M1_MAX);
}

function calculateM2Region(
  region: string | undefined,
  items: ModifierBreakdownItem[],
): number {
  const normalized = normalizeRegionLabel(region ?? "");
  if (!normalized) return 0;

  const isPremium = M2_PREMIUM_REGIONS.some(
    (name) => normalized === name || normalized.includes(name),
  );
  if (!isPremium) return 0;

  items.push({
    label: "M2 Regiune premium",
    detail: region ?? "Regiune viticola recunoscuta",
    points: M2_MAX,
  });
  return M2_MAX;
}

function calculateM3Winery(
  wineryName: string | undefined,
  items: ModifierBreakdownItem[],
): number {
  if (!wineryName?.trim()) return 0;
  const normalized = normalizeWineryName(wineryName);
  const isReference = M3_REFERENCE_WINERY_PATTERNS.some((pattern) =>
    pattern.test(normalized),
  );
  if (!isReference) return 0;

  items.push({
    label: "M3 Crama de referinta",
    detail: wineryName,
    points: M3_MAX,
  });
  return M3_MAX;
}

function calculateM4Aging(
  input: {
    wineType?: string;
    cellarPotential?: number | null;
    acidity?: number | null;
    tasteProfile?: string | null;
  },
  items: ModifierBreakdownItem[],
): number {
  const cellarYears = input.cellarPotential ?? 0;
  const fromCellar =
    cellarYears > 0 ? Math.round(cellarYears / 2) : 0;

  const wineType = normalizeWineType(input.wineType);
  const isRed = wineType === "red" || wineType === "rosu";
  const taste = (input.tasteProfile ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const hasStructure =
    /tanin|structur|barrique|stejar|corpolent|persistent/.test(taste) ||
    (input.acidity != null && input.acidity >= 4.5);

  let structuralBonus = 0;
  if (isRed && hasStructure) {
    structuralBonus = 1.5;
  }

  const raw = Math.max(fromCellar, structuralBonus);
  const points = Math.min(raw, M4_MAX);
  if (points <= 0) return 0;

  items.push({
    label: "M4 Potential de invechire",
    detail:
      cellarYears > 0
        ? `Cellar potential ${cellarYears} ani (max ${M4_MAX})`
        : "Rosii structurate, taninuri sau aciditate",
    points: Math.round(points * 10) / 10,
  });

  return points;
}

function isTier1Competition(competition: string): boolean {
  return M5_TIER1_COMPETITION_PATTERNS.some((pattern) =>
    pattern.test(competition),
  );
}

function medalWeight(medal: WineMedal): number {
  const tier1 = isTier1Competition(medal.competition);
  const level = medal.medal;

  if (tier1) {
    if (level === "gold" || level === "double_gold" || level === "best_in_class") {
      return 5;
    }
    if (level === "silver") return 3;
    if (level === "bronze") return 1;
    return 1;
  }

  if (level === "gold" || level === "double_gold" || level === "best_in_class") {
    return 2.5;
  }
  if (level === "silver") return 1.5;
  if (level === "bronze") return 0.5;
  return 0.5;
}

function calculateM5Medals(
  wineMedals: WineMedal[] | null | undefined,
  items: ModifierBreakdownItem[],
): number {
  const medals = wineMedals ?? [];
  if (medals.length === 0) return 0;

  let weight = 0;
  for (const medal of medals) {
    weight += medalWeight(medal);
  }

  const raw = Math.round(3 * Math.log2(1 + weight));
  const points = Math.min(raw, M5_MAX);

  items.push({
    label: "M5 Medalii si premii",
    detail: `${medals.length} medalii, pondere ${Math.round(weight * 10) / 10}, log2 cap ${M5_MAX}`,
    points,
  });

  return points;
}
