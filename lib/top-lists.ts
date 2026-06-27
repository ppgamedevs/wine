import { formatRon, wineTypeLabel } from "@/lib/format";
import type { FaqEntry } from "@/lib/seo";
import {
  getOccasion,
  OCCASIONS,
  recommendWines,
  type OccasionId,
} from "@/lib/sommelier";
import type { WineType, WineWithRelations } from "@/types";

export interface ResolvedTopList {
  slug: string;
  heading: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  wines: WineWithRelations[];
  faq: FaqEntry[];
  breadcrumbName: string;
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

const BUDGETS = [30, 50, 75, 100, 150];
const COMBO_BUDGETS = [...BUDGETS];
const COMBO_OCCASIONS: OccasionId[] = OCCASIONS.map((o) => o.id).filter(
  (id): id is OccasionId => id !== "oricare",
);

const CURATED_SLUGS = [
  "cele-mai-bune-vinuri-romanesti",
  "vinuri-cadou",
] as const;

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
    if (resolveTopList(slug, allWines) !== null) {
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

function byGiftScore(a: WineWithRelations, b: WineWithRelations): number {
  return (b.giftScore ?? 0) - (a.giftScore ?? 0);
}

function rankForOccasion(
  wines: WineWithRelations[],
  budgetMax: number,
  occasion: OccasionId,
  limit: number,
): WineWithRelations[] {
  const subset = wines.filter(
    (w) => w.priceAvg !== null && w.priceAvg !== undefined && w.priceAvg <= budgetMax,
  );
  const recs = recommendWines(
    subset,
    {
      budgetMin: 0,
      budgetMax,
      occasion,
      color: "any",
      sweetness: "any",
      preferredWinerySlugs: [],
    },
    limit,
  );
  return recs.map((r) => r.wine);
}

export function resolveTopList(
  slug: string,
  allWines: WineWithRelations[],
): ResolvedTopList | null {
  // Best overall by value score.
  if (slug === "cele-mai-bune-vinuri-romanesti") {
    const wines = [...allWines].sort(byValueScore).slice(0, 12);
    return {
      slug,
      heading: "Cele mai bune vinuri romanesti",
      metaTitle: "Cele mai bune vinuri romanesti in 2026",
      metaDescription:
        "Top vinuri romanesti dupa Value Score: cel mai bun raport calitate-pret, cu preturi in RON, scoruri si pairing-uri.",
      intro:
        "Am ordonat cele mai bune vinuri romanesti dupa Value Score, indicatorul nostru care masoara raportul calitate-pret. Fiecare vin de mai jos a fost evaluat pe baza pretului mediu, a calitatii si a potrivirii cu mancarea romaneasca.",
      wines,
      faq: buildGenericFaq("cele mai bune vinuri romanesti", wines),
      breadcrumbName: "Cele mai bune vinuri romanesti",
    };
  }

  // Gift wines.
  if (slug === "vinuri-cadou") {
    const wines = [...allWines].sort(byGiftScore).slice(0, 12);
    return {
      slug,
      heading: "Cele mai bune vinuri cadou",
      metaTitle: "Cele mai bune vinuri romanesti pentru cadou",
      metaDescription:
        "Vinuri romanesti ideale ca dar, ordonate dupa Gift Score: prezentare premium, prestigiu si siguranta la orice ocazie.",
      intro:
        "Cauti un vin pe care sa il oferi cadou? Lista de mai jos este ordonata dupa Gift Score, indicatorul care masoara cat de bine se prezinta un vin ca dar: ambalaj, prestigiul cramei si impresia generala.",
      wines,
      faq: buildGenericFaq("vinuri cadou", wines),
      breadcrumbName: "Vinuri cadou",
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
      faq: buildGenericFaq(`vinuri ${plural} romanesti`, wines),
      breadcrumbName: `Vinuri ${plural}`,
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
      faq: buildGenericFaq(`vinuri ${grapeName}`, wines),
      breadcrumbName: grapeName,
    };
  }

  // Budget + occasion: vinuri-sub-50-lei-pentru-sarmale
  const comboMatch = slug.match(/^vinuri-sub-(\d+)-lei-pentru-(.+)$/);
  if (comboMatch) {
    const budget = Number(comboMatch[1]);
    const occasionId = comboMatch[2] as OccasionId;
    const occasion = OCCASIONS.find((o) => o.id === occasionId);
    if (!occasion || occasionId === "oricare") return null;

    const wines = rankForOccasion(allWines, budget, occasionId, 10);
    if (wines.length === 0) return null;

    const occLabel = occasion.label.toLowerCase();
    return {
      slug,
      heading: `Cele mai bune vinuri sub ${budget} lei pentru ${occLabel}`,
      metaTitle: `Cele mai bune vinuri sub ${budget} lei pentru ${occLabel}`,
      metaDescription: `Vinuri romanesti sub ${budget} RON, alese pentru ${occLabel}. Recomandari cu scoruri, explicatii si preturi actuale.`,
      intro: `Cauti un vin bun sub ${budget} lei pentru ${occLabel}? Am combinat bugetul tau cu cerintele acestei ocazii (${occasion.description.toLowerCase()}) si am ordonat vinurile dupa potrivire. Toate optiunile de mai jos costa cel mult ${budget} RON.`,
      wines,
      faq: buildComboFaq(budget, occLabel, wines),
      breadcrumbName: `Sub ${budget} lei pentru ${occLabel}`,
    };
  }

  // Budget only: vinuri-sub-50-lei
  const budgetMatch = slug.match(/^vinuri-sub-(\d+)-lei$/);
  if (budgetMatch) {
    const budget = Number(budgetMatch[1]);
    const wines = allWines
      .filter(
        (w) =>
          w.priceAvg !== null &&
          w.priceAvg !== undefined &&
          w.priceAvg <= budget,
      )
      .sort(byValueScore)
      .slice(0, 12);

    if (wines.length === 0) return null;

    return {
      slug,
      heading: `Cele mai bune vinuri sub ${budget} lei`,
      metaTitle: `Cele mai bune vinuri romanesti sub ${budget} lei`,
      metaDescription: `Vinuri romanesti sub ${budget} RON cu cel mai bun raport calitate-pret, ordonate dupa Value Score.`,
      intro: `Valoare maxima la buget mic: cele mai bune vinuri romanesti care costa cel mult ${budget} lei, ordonate dupa Value Score. Dovedim ca un vin bun nu inseamna neaparat un pret mare.`,
      wines,
      faq: buildBudgetFaq(budget, wines),
      breadcrumbName: `Sub ${budget} lei`,
    };
  }

  return null;
}

function buildGenericFaq(
  topic: string,
  wines: WineWithRelations[],
): FaqEntry[] {
  const top = wines[0];
  return [
    {
      question: `Care sunt cele mai bune ${topic}?`,
      answer: top
        ? `In acest moment, ${top.name}${top.winery?.name ? ` de la ${top.winery.name}` : ""} conduce clasamentul, cu Value Score ${top.valueScore ?? "N/A"}/100 la un pret de ${formatRon(top.priceAvg)}.`
        : `Lista este actualizata periodic in functie de preturi si evaluari.`,
    },
    {
      question: "Cum se calculeaza clasamentul?",
      answer:
        "Folosim Value Score, un indicator de la 0 la 100 care masoara raportul calitate-pret, combinat cu date despre preturi actuale in RON si potrivirea cu mancarea romaneasca.",
    },
    {
      question: "Cat de des se actualizeaza lista?",
      answer:
        "Reimprospatam datele periodic, pe masura ce preturile si evaluarile se schimba, pentru ca recomandarile sa ramana relevante.",
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
        "Folosim preturi medii in RON urmarite in mai multe magazine din Romania, actualizate periodic.",
    },
  ];
}

function buildComboFaq(
  budget: number,
  occasionLabel: string,
  wines: WineWithRelations[],
): FaqEntry[] {
  const top = wines[0];
  return [
    {
      question: `Ce vin sub ${budget} lei se potriveste pentru ${occasionLabel}?`,
      answer: top
        ? `Recomandam ${top.name}${top.winery?.name ? ` de la ${top.winery.name}` : ""}, la ${formatRon(top.priceAvg)}. Se potriveste bine pentru ${occasionLabel} si are Value Score ${top.valueScore ?? "N/A"}/100.`
        : `Actualizam selectia pentru ${occasionLabel} in functie de disponibilitate.`,
    },
    {
      question: `Cum alegem vinurile pentru ${occasionLabel}?`,
      answer: `Combinam bugetul (sub ${budget} lei) cu un scor de potrivire specific pentru ${occasionLabel}, bazat pe tipul vinului, pairing-uri si Value Score.`,
    },
    {
      question: "Pot vedea detalii despre fiecare vin?",
      answer:
        "Da, fiecare vin are o pagina dedicata cu analiza completa, specificatii tehnice, pairing-uri si unde il gasesti.",
    },
  ];
}
