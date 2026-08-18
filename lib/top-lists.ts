import { formatRon, wineTypeLabel } from "@/lib/format";
import { calculateGiftScore } from "@/lib/scoring-v2/gift-score";
import { usesPublicOccasionMatch } from "@/lib/recommendation/occasion-match-mode";
import { usesSecondaryV2Ranking } from "@/lib/scoring-v2/secondary-scoring-mode";
import { giftScoreInputFromWine } from "@/lib/scoring-v2/wine-score-inputs";
import type { FaqEntry } from "@/lib/seo";
import {
  getOccasion,
  OCCASIONS,
  recommendWines,
  recommendWinesLive,
  type OccasionId,
  type Recommendation,
} from "@/lib/sommelier";
import type { WineType, WineWithRelations } from "@/types";

export type TopListRankMetric = "value" | "gift" | "relevance";

/** Minimum wines required for indexable pSEO top list pages. */
export const MIN_INDEXABLE_TOP_LIST_WINES = 8;

export interface ResolvedTopList {
  slug: string;
  heading: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  wines: WineWithRelations[];
  /** Scorul exact folosit la sortare, in aceeasi ordine ca `wines`. */
  rankScores: number[];
  faq: FaqEntry[];
  breadcrumbName: string;
  /** Metric used to order wines in this list (shown in the summary table). */
  rankMetric: TopListRankMetric;
}

/** Romanian plural slug -> wine type enum. */
export const TYPE_SLUG_MAP: Record<string, WineType> = {
  rosii: "red",
  albe: "white",
  roze: "rose",
  spumante: "sparkling",
  dulci: "dessert",
  orange: "orange",
};

/** Wine type enum -> Romanian plural slug for /topuri/vinuri-{slug}. */
export const WINE_TYPE_TO_TOP_SLUG: Record<WineType, string> = {
  red: "rosii",
  white: "albe",
  rose: "roze",
  sparkling: "spumante",
  dessert: "dulci",
  orange: "orange",
};

const CURATED_SLUGS = [
  "cele-mai-bune-vinuri-romanesti",
  "vinuri-cadou",
  "vinuri-bune-din-supermarket",
] as const;

export const BUDGET_THRESHOLDS = [30, 50, 75, 100, 150] as const;
const BUDGETS = [...BUDGET_THRESHOLDS];
const COMBO_BUDGETS = [...BUDGETS];
const COMBO_OCCASIONS: OccasionId[] = OCCASIONS.map((o) => o.id).filter(
  (id): id is OccasionId => id !== "oricare",
);

const SUPERMARKET_HOSTS = [
  "emag.ro",
  "kaufland.ro",
  "auchan.ro",
  "carrefour.ro",
  "mega-image.ro",
  "lidl.ro",
  "profi.ro",
];

/**
 * All programmatic slug candidates before DB resolution filtering.
 * Grape slugs should come from grape_varieties in the database.
 */
export function buildAllTopListSlugCandidates(grapeSlugs: string[] = []): string[] {
  const typeSlugs = Object.keys(TYPE_SLUG_MAP).map((t) => `vinuri-${t}`);
  const budgetSlugs = BUDGETS.map((b) => `vinuri-sub-${b}-lei`);
  const comboSlugs = COMBO_BUDGETS.flatMap((b) =>
    COMBO_OCCASIONS.map((o) => `vinuri-sub-${b}-lei-pentru-${o}`),
  );
  const grapeTopSlugs = grapeSlugs.map((g) => `cele-mai-bune-${g}`);

  return [
    ...CURATED_SLUGS,
    ...typeSlugs,
    ...budgetSlugs,
    ...comboSlugs,
    ...grapeTopSlugs,
  ];
}

/**
 * Slugs that resolve to a real top list with at least one wine.
 * Use for generateStaticParams, sitemap and related links.
 */
export function getResolvableTopListSlugs(
  allWines: WineWithRelations[],
  grapeSlugs: string[] = [],
): string[] {
  const seen = new Set<string>();
  const resolved: string[] = [];

  for (const slug of buildAllTopListSlugCandidates(grapeSlugs)) {
    if (seen.has(slug)) continue;
    seen.add(slug);
    const list = resolveTopList(slug, allWines);
    if (!list) continue;
    const isCuratedHub = slug === "cele-mai-bune-vinuri-romanesti";
    if (isCuratedHub || list.wines.length >= MIN_INDEXABLE_TOP_LIST_WINES) {
      resolved.push(slug);
    }
  }

  return resolved;
}

/**
 * Featured subset for homepage cross-links. Always includes curated slugs
 * even if the full resolver list is larger.
 */
export const TOP_LIST_SLUGS: string[] = [
  "cele-mai-bune-vinuri-romanesti",
  "vinuri-cadou",
  "cele-mai-bune-feteasca-neagra",
  ...Object.keys(TYPE_SLUG_MAP).map((t) => `vinuri-${t}`),
  ...BUDGETS.map((b) => `vinuri-sub-${b}-lei`),
  ...COMBO_BUDGETS.flatMap((b) =>
    COMBO_OCCASIONS.map((o) => `vinuri-sub-${b}-lei-pentru-${o}`),
  ),
];

/** Lightweight label for a slug without touching the database (cross-links). */
export function slugToLabel(slug: string): string {
  if (slug === "cele-mai-bune-vinuri-romanesti")
    return "Cele mai bune vinuri romanesti";
  if (slug === "vinuri-cadou") return "Vinuri cadou";

  const typeMatch = slug.match(/^vinuri-([a-z]+)$/);
  if (typeMatch && TYPE_SLUG_MAP[typeMatch[1]]) {
    return `Vinuri ${typeMatch[1]}`;
  }

  const comboMatch = slug.match(/^vinuri-sub-(\d+)-lei-pentru-(.+)$/);
  if (comboMatch) {
    const occasion = getOccasion(comboMatch[2] as OccasionId);
    return `Vinuri sub ${comboMatch[1]} lei pentru ${occasion.label.toLowerCase()}`;
  }

  const budgetMatch = slug.match(/^vinuri-sub-(\d+)-lei$/);
  if (budgetMatch) return `Vinuri sub ${budgetMatch[1]} lei`;

  const grapeMatch = slug.match(/^cele-mai-bune-(.+)$/);
  if (grapeMatch) return `Cele mai bune ${deslugify(grapeMatch[1])}`;

  return deslugify(slug);
}

function deslugify(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function byValueScore(a: WineWithRelations, b: WineWithRelations): number {
  return (b.valueScore ?? 0) - (a.valueScore ?? 0);
}

/** Limit wines per winery so top lists are not dominated by one producer. */
export function diversifyByWinery(
  wines: WineWithRelations[],
  maxPerWinery: number,
  limit?: number,
): WineWithRelations[] {
  const counts = new Map<number, number>();
  const result: WineWithRelations[] = [];

  for (const wine of wines) {
    const wineryId = wine.wineryId ?? -1;
    const count = counts.get(wineryId) ?? 0;
    if (count >= maxPerWinery) continue;
    counts.set(wineryId, count + 1);
    result.push(wine);
    if (limit !== undefined && result.length >= limit) break;
  }

  return result;
}

export function filterWinesByBudget(
  wines: WineWithRelations[],
  budget: number,
): WineWithRelations[] {
  return wines.filter(
    (w) =>
      w.priceAvg !== null &&
      w.priceAvg !== undefined &&
      w.priceAvg <= budget,
  );
}

export function filterWinesByType(
  wines: WineWithRelations[],
  type: WineType,
): WineWithRelations[] {
  return wines.filter((w) => w.type === type);
}

export function isSupermarketWine(wine: WineWithRelations): boolean {
  const urls = [
    wine.sourceUrl,
    wine.producerPageUrl,
    ...(wine.availability ?? []).map((a) => a.url),
    ...(wine.affiliateLinks ?? []).map((a) => a.url),
  ].filter(Boolean) as string[];

  return urls.some((url) => {
    try {
      const host = new URL(url).hostname.toLowerCase();
      return SUPERMARKET_HOSTS.some(
        (h) => host === h || host.endsWith(`.${h}`),
      );
    } catch {
      return false;
    }
  });
}

export function getTopWinesByValue(
  wines: WineWithRelations[],
  limit: number,
  diversify = true,
): WineWithRelations[] {
  const sorted = [...wines].sort(byValueScore);
  return diversify
    ? diversifyByWinery(sorted, 2, limit)
    : sorted.slice(0, limit);
}

function liveGiftScore(wine: WineWithRelations): number {
  return calculateGiftScore(giftScoreInputFromWine(wine)).score;
}

function publicGiftScore(wine: WineWithRelations): number {
  if (usesSecondaryV2Ranking()) return liveGiftScore(wine);
  return wine.giftScore ?? 0;
}

function byPublicGiftScore(a: WineWithRelations, b: WineWithRelations): number {
  const giftDelta = publicGiftScore(b) - publicGiftScore(a);
  if (giftDelta !== 0) return giftDelta;
  if ((b.valueScore ?? 0) !== (a.valueScore ?? 0)) {
    return (b.valueScore ?? 0) - (a.valueScore ?? 0);
  }
  return a.slug.localeCompare(b.slug);
}

function legacyOccasionDisplayScore(wine: WineWithRelations): number {
  return wine.foodMatchScore ?? wine.valueScore ?? 0;
}

function valueScores(wines: WineWithRelations[]): number[] {
  return wines.map((wine) => wine.valueScore ?? 0);
}

function rankForOccasion(
  wines: WineWithRelations[],
  budgetMax: number,
  occasion: OccasionId,
  limit: number,
): Recommendation[] {
  const subset = wines.filter(
    (w) => w.priceAvg !== null && w.priceAvg !== undefined && w.priceAvg <= budgetMax,
  );
  const input = {
    budgetMin: 0,
    budgetMax,
    budgetSpecified: true,
    budgetConstraint: "hard" as const,
    occasion,
    color: "any" as const,
    sweetness: "any" as const,
    preferredWinerySlugs: [],
    absurdRequest: false,
  };
  return usesSecondaryV2Ranking() && usesPublicOccasionMatch()
    ? recommendWinesLive(subset, input, limit)
    : recommendWines(subset, input, limit);
}

export function resolveTopList(
  slug: string,
  allWines: WineWithRelations[],
): ResolvedTopList | null {
  // Best overall by value score.
  if (slug === "cele-mai-bune-vinuri-romanesti") {
    const wines = getTopWinesByValue(allWines, 12);
    return {
      slug,
      heading: "Cele mai bune vinuri romanesti",
      metaTitle: "Cele mai bune vinuri romanesti in 2026 – top pe bugete",
      metaDescription:
        "Top vinuri romanesti dupa Value Score: cel mai bun raport calitate-pret, cu preturi in RON, scoruri si pairing-uri.",
      intro:
        "Am ordonat cele mai bune vinuri romanesti dupa Value Score, indicatorul nostru care masoara raportul calitate-pret. Fiecare vin de mai jos a fost evaluat pe baza pretului mediu, a calitatii si a potrivirii cu mancarea romaneasca.",
      wines,
      rankScores: valueScores(wines),
      faq: buildGenericFaq("cele mai bune vinuri romanesti", wines, "value"),
      breadcrumbName: "Cele mai bune vinuri romanesti",
      rankMetric: "value",
    };
  }

  if (slug === "vinuri-bune-din-supermarket") {
    const wines = getTopWinesByValue(
      allWines.filter(isSupermarketWine),
      12,
    );
    if (wines.length < MIN_INDEXABLE_TOP_LIST_WINES) return null;

    return {
      slug,
      heading: "Vinuri bune din supermarket",
      metaTitle: "Vinuri bune din supermarket: top romanesc sub 50 lei",
      metaDescription:
        "Cele mai bune vinuri romanesti gasite in supermarket si magazine online, ordonate dupa Value Score si pret in RON.",
      intro:
        "Selectie de vinuri romanesti disponibile in supermarket si magazine online (eMag, Kaufland, Auchan etc.), ordonate dupa raport calitate-pret.",
      wines,
      rankScores: valueScores(wines),
      faq: buildGenericFaq("vinuri bune din supermarket", wines, "value"),
      breadcrumbName: "Vinuri din supermarket",
      rankMetric: "value",
    };
  }

  // Gift wines.
  if (slug === "vinuri-cadou") {
    const wines = [...allWines].sort(byPublicGiftScore).slice(0, 12);
    const rankScores = wines.map(publicGiftScore);
    return {
      slug,
      heading: "Cele mai bune vinuri cadou",
      metaTitle: "Cele mai bune vinuri romanesti pentru cadou",
      metaDescription:
        "Vinuri romanesti potrivite ca dar, ordonate dupa Gift Score: calitate estimata, incredere in date, valoare si caracter distinctiv.",
      intro:
        "Cauti un vin pe care sa il oferi cadou? Lista de mai jos este ordonata dupa Gift Score, care masoara cat de sigura si convingatoare este sticla ca alegere de cadou, din calitatea estimata, increderea in date, valoare si caracterul distinctiv. Nu evaluam ambalajul.",
      wines,
      rankScores,
      faq: buildGenericFaq("vinuri cadou", wines, "gift", rankScores),
      breadcrumbName: "Vinuri cadou",
      rankMetric: "gift",
    };
  }

  // Type pages: vinuri-rosii, vinuri-albe, ...
  const typeMatch = slug.match(/^vinuri-([a-z]+)$/);
  if (typeMatch && TYPE_SLUG_MAP[typeMatch[1]]) {
    const type = TYPE_SLUG_MAP[typeMatch[1]];
    const plural = typeMatch[1];
    const wines = allWines
      .filter((w) => w.type === type)
      .sort(byValueScore)
      .slice(0, 12);
    return {
      slug,
      heading: `Cele mai bune vinuri ${plural} romanesti`,
      metaTitle: `Cele mai bune vinuri ${plural} romanesti`,
      metaDescription: `Top vinuri ${plural} romanesti dupa Value Score, cu preturi in RON, scoruri si recomandari de pairing.`,
      intro: `Selectia noastra de vinuri ${plural} romanesti, ordonata dupa Value Score. ${wineTypeLabel[type]} de calitate, evaluate transparent dupa raportul calitate-pret.`,
      wines,
      rankScores: valueScores(wines),
      faq: buildGenericFaq(`vinuri ${plural} romanesti`, wines, "value"),
      breadcrumbName: `Vinuri ${plural}`,
      rankMetric: "value",
    };
  }

  // Grape pages: cele-mai-bune-feteasca-neagra
  const grapeMatch = slug.match(/^cele-mai-bune-(.+)$/);
  if (grapeMatch && grapeMatch[1] !== "vinuri-romanesti") {
    const grapeSlug = grapeMatch[1];
    const grapeName = deslugify(grapeSlug);
    const wines = allWines
      .filter((w) =>
        w.grapeVarieties.some(
          (g) =>
            g.slug === grapeSlug ||
            g.name.toLowerCase() === grapeName.toLowerCase(),
        ),
      )
      .sort(byValueScore)
      .slice(0, 12);

    if (wines.length === 0) return null;

    return {
      slug,
      heading: `Cele mai bune vinuri ${grapeName}`,
      metaTitle: `Cea mai buna ${grapeName}: top vinuri romanesti`,
      metaDescription: `Cele mai bune vinuri ${grapeName} din Romania, ordonate dupa Value Score, cu preturi in RON si pairing-uri.`,
      intro: `${grapeName} este unul dintre soiurile reprezentative pentru vinul romanesc. Mai jos gasesti cele mai bune vinuri ${grapeName}, ordonate dupa raportul calitate-pret.`,
      wines,
      rankScores: valueScores(wines),
      faq: buildGenericFaq(`vinuri ${grapeName}`, wines, "value"),
      breadcrumbName: grapeName,
      rankMetric: "value",
    };
  }

  // Budget + occasion: vinuri-sub-50-lei-pentru-sarmale
  const comboMatch = slug.match(/^vinuri-sub-(\d+)-lei-pentru-(.+)$/);
  if (comboMatch) {
    const budget = Number(comboMatch[1]);
    const occasionId = comboMatch[2] as OccasionId;
    const occasion = OCCASIONS.find((o) => o.id === occasionId);
    if (!occasion || occasionId === "oricare") return null;

    const recs = rankForOccasion(allWines, budget, occasionId, 10);
    if (recs.length === 0) return null;
    const wines = recs.map((rec) => rec.wine);
    const rankScores = usesSecondaryV2Ranking() && usesPublicOccasionMatch()
      ? recs.map((rec) => rec.matchScore)
      : wines.map(legacyOccasionDisplayScore);

    const occLabel = occasion.label.toLowerCase();
    return {
      slug,
      heading: `Cele mai bune vinuri sub ${budget} lei pentru ${occLabel}`,
      metaTitle: `Cele mai bune vinuri sub ${budget} lei pentru ${occLabel}`,
      metaDescription: `Vinuri romanesti sub ${budget} RON, alese pentru ${occLabel}. Recomandari cu scoruri, explicatii si preturi actuale.`,
      intro: `Cauti un vin bun sub ${budget} lei pentru ${occLabel}? Am combinat bugetul tau cu cerintele acestei ocazii (${occasion.description.toLowerCase()}) si am ordonat vinurile dupa potrivirea contextuala. Toate optiunile de mai jos costa cel mult ${budget} RON.`,
      wines,
      rankScores,
      faq: buildComboFaq(budget, occLabel, wines, rankScores),
      breadcrumbName: `Sub ${budget} lei pentru ${occLabel}`,
      rankMetric: "relevance",
    };
  }

  // Budget only: vinuri-sub-50-lei
  const budgetMatch = slug.match(/^vinuri-sub-(\d+)-lei$/);
  if (budgetMatch) {
    const budget = Number(budgetMatch[1]);
    const isSub50 = budget === 50;

    const wines = filterWinesByBudget(allWines, budget)
      .sort(byValueScore)
      .slice(0, 12);

    if (wines.length === 0) return null;

    return {
      slug,
      heading: isSub50
        ? "Vinuri ieftine si bune: cele mai bune optiuni sub 50 lei"
        : `Cele mai bune vinuri sub ${budget} lei`,
      metaTitle: isSub50
        ? "Vinuri ieftine si bune: top romanesc sub 50 lei in 2026"
        : `Cele mai bune vinuri romanesti sub ${budget} lei`,
      metaDescription: isSub50
        ? "Cauti un vin ieftin si bun? Top vinuri romanesti sub 50 lei, comparate dupa Value Score, medalii si disponibilitate."
        : `Vinuri romanesti sub ${budget} RON cu cel mai bun raport calitate-pret, ordonate dupa Value Score.`,
      intro: isSub50
        ? "Cauti un vin ieftin si bun, nu doar cea mai ieftina sticla de pe raft? Am comparat vinurile romanesti sub 50 lei dupa pret, calitate, medalii si disponibilitate."
        : `Valoare maxima la buget mic: cele mai bune vinuri romanesti care costa cel mult ${budget} lei, ordonate dupa Value Score.`,
      wines,
      rankScores: valueScores(wines),
      faq: isSub50 ? buildCheapWineFaq(wines) : buildBudgetFaq(budget, wines),
      breadcrumbName: isSub50 ? "Vinuri ieftine si bune" : `Sub ${budget} lei`,
      rankMetric: "value",
    };
  }

  return null;
}

export function topListRankSummary(list: ResolvedTopList): string {
  switch (list.rankMetric) {
    case "gift":
      return `Top ${list.wines.length} optiuni, ordonate dupa Gift Score (cat de bine functioneaza ca dar).`;
    case "relevance":
      return `Top ${list.wines.length} optiuni, ordonate dupa potrivirea pentru ocazia aleasa.`;
    default:
      return `Top ${list.wines.length} optiuni, ordonate dupa Value Score (raport calitate-pret).`;
  }
}

export function topListRankColumnLabel(
  rankMetric: TopListRankMetric,
): string {
  switch (rankMetric) {
    case "gift":
      return "Gift";
    case "relevance":
      return "Potrivire";
    default:
      return "Value";
  }
}

export function topListRankScore(
  wine: WineWithRelations,
  rankMetric: TopListRankMetric,
  displayedScore?: number | null,
): number | null {
  if (displayedScore != null) return displayedScore;
  switch (rankMetric) {
    case "gift":
      return publicGiftScore(wine);
    case "relevance":
      return usesSecondaryV2Ranking() && usesPublicOccasionMatch()
        ? null
        : legacyOccasionDisplayScore(wine);
    default:
      return wine.valueScore ?? null;
  }
}

function buildGenericFaq(
  topic: string,
  wines: WineWithRelations[],
  rankMetric: TopListRankMetric,
  rankScores?: number[],
): FaqEntry[] {
  const top = wines[0];
  const scoreLabel =
    rankMetric === "gift"
      ? "Gift Score"
      : rankMetric === "relevance"
        ? "scor de potrivire"
        : "Value Score";
  const scoreValue =
    rankScores?.[0] ??
    (rankMetric === "gift"
        ? top
        ? publicGiftScore(top)
        : undefined
      : top?.valueScore);

  return [
    {
      question: `Care sunt cele mai bune ${topic}?`,
      answer: top
        ? `In acest moment, ${top.name}${top.winery?.name ? ` de la ${top.winery.name}` : ""} conduce clasamentul, cu ${scoreLabel} ${scoreValue ?? "N/A"}/100 la un pret de ${formatRon(top.priceAvg)}.`
        : `Lista este actualizata periodic in functie de preturi si evaluari.`,
    },
    {
      question: "Cum se calculeaza clasamentul?",
      answer:
        rankMetric === "gift"
          ? "Folosim Gift Score (0-100): cat de sigura si convingatoare este sticla ca alegere de cadou, din calitatea estimata, increderea in date, valoare si caracterul distinctiv. Nu evaluam ambalajul."
          : rankMetric === "relevance"
            ? "Ordonam dupa Occasion Match, scorul contextual folosit si in tabelul de potrivire. Nu folosim Food Match sau Value Score ca inlocuitor de afisare."
            : "Folosim Value Score, un indicator de la 0 la 100 care masoara raportul calitate-pret, combinat cu date despre preturi actuale in RON si potrivirea cu mancarea romaneasca.",
    },
    {
      question: "Cat de des se actualizeaza lista?",
      answer:
        "Reimprospatam datele periodic, pe masura ce preturile si evaluarile se schimba, pentru ca recomandarile sa ramana relevante.",
    },
  ];
}

function buildCheapWineFaq(wines: WineWithRelations[]): FaqEntry[] {
  const top = wines[0];
  return [
    {
      question: "Care este cel mai bun vin ieftin si bun sub 50 lei?",
      answer: top
        ? `${top.name} ofera cel mai bun raport calitate-pret sub 50 lei, cu Value Score ${top.valueScore ?? "N/A"}/100 la ${formatRon(top.priceAvg)}.`
        : "Actualizam constant selectia de vinuri ieftine si bune sub 50 lei.",
    },
    {
      question: "Merita vinurile ieftine romanesti?",
      answer:
        "Da. Multe vinuri romanesti sub 50 lei au Value Score peste 75. Le comparam dupa pret, medalii si disponibilitate, nu doar dupa eticheta.",
    },
    {
      question: "Ce trebuie evitat la un vin foarte ieftin?",
      answer:
        "Evita vinurile fara informatii clare despre crama, regiune sau vintage. Un pret foarte mic fara Value Score sau recenzii poate ascunde calitate slaba.",
    },
  ];
}

function buildBudgetFaq(
  budget: number,
  wines: WineWithRelations[],
): FaqEntry[] {
  const top = wines[0];
  return [
    {
      question: `Care este cel mai bun vin romanesc sub ${budget} lei?`,
      answer: top
        ? `${top.name} ofera cel mai bun raport calitate-pret sub ${budget} lei, cu Value Score ${top.valueScore ?? "N/A"}/100 la ${formatRon(top.priceAvg)}.`
        : `Actualizam constant selectia de vinuri sub ${budget} lei.`,
    },
    {
      question: `Merita vinurile sub ${budget} lei?`,
      answer: `Da. Multe vinuri romanesti sub ${budget} lei au un raport calitate-pret excelent. Le ordonam dupa Value Score ca sa gasesti rapid cele mai bune optiuni.`,
    },
    {
      question: "Preturile sunt actualizate?",
      answer:
        "Afisam preturi in RON ca pret actual verificat sau pret aproximativ, in functie de sursa disponibila pentru fiecare vin.",
    },
  ];
}

function buildComboFaq(
  budget: number,
  occasionLabel: string,
  wines: WineWithRelations[],
  rankScores: number[],
): FaqEntry[] {
  const top = wines[0];
  const topMatch = rankScores[0];
  return [
    {
      question: `Ce vin sub ${budget} lei se potriveste pentru ${occasionLabel}?`,
      answer: top
        ? `Recomandam ${top.name}${top.winery?.name ? ` de la ${top.winery.name}` : ""}, la ${formatRon(top.priceAvg)}. Scorul de potrivire pentru ${occasionLabel} este ${topMatch ?? "N/A"}/100.`
        : `Actualizam selectia pentru ${occasionLabel} in functie de disponibilitate.`,
    },
    {
      question: `Cum alegem vinurile pentru ${occasionLabel}?`,
      answer: `Bugetul sub ${budget} lei este o constrangere ferma. Ordonarea foloseste Occasion Match, acelasi scor afisat in coloana Potrivire.`,
    },
    {
      question: "Pot vedea detalii despre fiecare vin?",
      answer:
        "Da, fiecare vin are o pagina dedicata cu analiza completa, specificatii tehnice, pairing-uri si unde il gasesti.",
    },
  ];
}
