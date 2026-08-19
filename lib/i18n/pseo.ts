import type { Metadata } from "next";
import type { AppLocale } from "@/i18n/locale";
import { localizedHref } from "@/i18n/paths";
import type { DishPairingPageConfig } from "@/lib/dish-pairing-pages";
import { formatRon } from "@/lib/format";
import {
  getDishPresentation,
  hasDishPresentation,
} from "@/lib/i18n/dishes";
import type {
  TopListDefinition,
  TopListOccasionId,
} from "@/lib/i18n/top-list-routes";
import { absoluteUrl, type FaqEntry } from "@/lib/seo";
import type {
  ResolvedTopList,
  TopListRankMetric,
} from "@/lib/top-lists";
import type { WineType, WineWithRelations } from "@/types";
import enPseo from "@/messages/en/pseo.json";
import roPseo from "@/messages/ro/pseo.json";

const PSEO_MESSAGES = {
  ro: roPseo,
  en: enPseo,
} as const;

const ENGLISH_WINE_TYPE_LABELS = {
  red: "red",
  white: "white",
  rose: "rosé",
  sparkling: "sparkling",
  dessert: "dessert",
  orange: "orange",
} as const satisfies Readonly<Record<WineType, string>>;

const ENGLISH_OCCASION_LABELS = {
  nunta: "weddings",
  cadou: "gifts",
  "cadou-business": "business gifts",
  "cina-romantica": "romantic dinners",
  sarmale: "sarmale",
  gratar: "barbecues",
  petrecere: "parties",
  sarbatori: "holidays",
  "pentru-desert": "desserts",
} as const satisfies Readonly<Record<TopListOccasionId, string>>;

export type PseoMessages = (typeof PSEO_MESSAGES)[AppLocale];
export type DishPseoSlug = keyof typeof roPseo.dish.pages;

export interface LocalizedTopListPresentation {
  heading: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  faq: FaqEntry[];
  breadcrumbName: string;
}

export interface LocalizedDishPresentation {
  name: string;
  heading: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
}

export function getPseoMessages(locale: AppLocale): PseoMessages {
  return PSEO_MESSAGES[locale];
}

export function openGraphLocale(locale: AppLocale): "ro_RO" | "en_GB" {
  return locale === "en" ? "en_GB" : "ro_RO";
}

export function buildLocalizedAlternates(
  locale: AppLocale,
  romanianPath: string,
  englishPath: string,
): NonNullable<Metadata["alternates"]> {
  return {
    canonical: absoluteUrl(locale === "en" ? englishPath : romanianPath),
    languages: {
      ro: absoluteUrl(romanianPath),
      en: absoluteUrl(englishPath),
      "x-default": absoluteUrl(romanianPath),
    },
  };
}

function withoutLongDashes(value: string): string {
  return value.replace(/[\u2013\u2014]/g, "-");
}

function cleanFaq(items: FaqEntry[]): FaqEntry[] {
  return items.map(({ question, answer }) => ({
    question: withoutLongDashes(question),
    answer: withoutLongDashes(answer),
  }));
}

function englishTopListIdentity(
  definition: TopListDefinition,
  list: ResolvedTopList,
): {
  subject: string;
  heading: string;
  breadcrumbName: string;
} {
  switch (definition.kind) {
    case "curated": {
      switch (definition.key) {
        case "best-romanian-wines":
          return {
            subject: "Romanian wines",
            heading: "Best Romanian wines",
            breadcrumbName: "Best Romanian wines",
          };
        case "best-wines-for-gifts":
          return {
            subject: "Romanian wines for gifts",
            heading: "Best Romanian wines for gifts",
            breadcrumbName: "Wines for gifts",
          };
        case "best-supermarket-wines":
          return {
            subject: "Romanian supermarket wines",
            heading: "Best Romanian wines from supermarkets",
            breadcrumbName: "Supermarket wines",
          };
      }
    }
    case "type": {
      const type = ENGLISH_WINE_TYPE_LABELS[definition.wineType];
      return {
        subject: `Romanian ${type} wines`,
        heading: `Best Romanian ${type} wines`,
        breadcrumbName: `${type.charAt(0).toUpperCase()}${type.slice(1)} wines`,
      };
    }
    case "budget":
      return {
        subject: `Romanian wines under ${definition.budget} RON`,
        heading:
          definition.budget === 50
            ? "Good affordable wines: best Romanian picks under 50 RON"
            : `Best Romanian wines under ${definition.budget} RON`,
        breadcrumbName: `Under ${definition.budget} RON`,
      };
    case "budget-occasion": {
      const occasion = ENGLISH_OCCASION_LABELS[definition.occasion];
      return {
        subject: `Romanian wines under ${definition.budget} RON for ${occasion}`,
        heading: `Best wines under ${definition.budget} RON for ${occasion}`,
        breadcrumbName: `Under ${definition.budget} RON for ${occasion}`,
      };
    }
    case "grape": {
      const grapeName = list.breadcrumbName;
      return {
        subject: `${grapeName} wines`,
        heading: `Best ${grapeName} wines`,
        breadcrumbName: grapeName,
      };
    }
  }
}

function englishTopListFaq(
  subject: string,
  list: ResolvedTopList,
): FaqEntry[] {
  const top = list.wines[0];
  const rankingMethod =
    list.rankMetric === "gift"
      ? "Gift Score"
      : list.rankMetric === "relevance"
        ? "occasion match"
        : "Value Score";

  return [
    {
      question: `Which ${subject.toLowerCase()} rank first?`,
      answer: top
        ? `${top.name} currently leads this ranking at ${formatRon(top.priceAvg, "en")}.`
        : "We update this ranking as verified wines become available.",
    },
    {
      question: "How is this ranking calculated?",
      answer: `The order uses ${rankingMethod}, verified catalog data and current prices in RON. The underlying wine IDs and ranking order are the same in Romanian and English.`,
    },
    {
      question: "Are prices shown in RON?",
      answer:
        "Yes. Prices are shown in Romanian lei and can vary by retailer or promotion.",
    },
  ];
}

export function buildLocalizedTopListPresentation(
  definition: TopListDefinition,
  list: ResolvedTopList,
  locale: AppLocale,
): LocalizedTopListPresentation {
  if (locale === "ro") {
    return {
      heading: withoutLongDashes(list.heading),
      metaTitle: withoutLongDashes(list.metaTitle),
      metaDescription: withoutLongDashes(list.metaDescription),
      intro: withoutLongDashes(list.intro),
      faq: cleanFaq(list.faq),
      breadcrumbName: withoutLongDashes(list.breadcrumbName),
    };
  }

  const identity = englishTopListIdentity(definition, list);
  const metric =
    list.rankMetric === "gift"
      ? "Gift Score"
      : list.rankMetric === "relevance"
        ? "occasion match"
        : "Value Score";

  return {
    heading: identity.heading,
    metaTitle: `${identity.heading}: VinIntel ranking`,
    metaDescription: `${identity.heading}, ranked by ${metric} with transparent scores, verified catalog data and current prices in RON.`,
    intro: `Explore ${identity.subject.toLowerCase()} selected from the VinIntel catalog. The ranking uses ${metric} while preserving the same wine IDs and order as the Romanian list.`,
    faq: englishTopListFaq(identity.subject, list),
    breadcrumbName: identity.breadcrumbName,
  };
}

export function localizedTopListRankSummary(
  list: ResolvedTopList,
  locale: AppLocale,
): string {
  if (locale === "ro") {
    switch (list.rankMetric) {
      case "gift":
        return `Top ${list.wines.length} optiuni, ordonate dupa Gift Score.`;
      case "relevance":
        return `Top ${list.wines.length} optiuni, ordonate dupa potrivirea pentru ocazia aleasa.`;
      default:
        return `Top ${list.wines.length} optiuni, ordonate dupa Value Score.`;
    }
  }

  switch (list.rankMetric) {
    case "gift":
      return `Top ${list.wines.length} choices, ordered by Gift Score.`;
    case "relevance":
      return `Top ${list.wines.length} choices, ordered by match for the selected occasion.`;
    default:
      return `Top ${list.wines.length} choices, ordered by Value Score.`;
  }
}

export function localizedTopListRankColumnLabel(
  metric: TopListRankMetric,
  locale: AppLocale,
): string {
  if (metric === "gift") return "Gift";
  if (metric === "relevance") {
    return locale === "en" ? "Match" : "Potrivire";
  }
  return "Value";
}

export function buildLocalizedDishPresentation(
  config: DishPairingPageConfig,
  locale: AppLocale,
): LocalizedDishPresentation {
  if (!(config.slug in roPseo.dish.pages)) {
    throw new Error(`Missing pSEO dish copy: ${config.slug}`);
  }

  const slug = config.slug as DishPseoSlug;
  const page = PSEO_MESSAGES[locale].dish.pages[slug];
  const canonicalDish = hasDishPresentation(config.slug)
    ? getDishPresentation(config.slug, locale)
    : null;

  return {
    ...page,
    name: canonicalDish?.displayName ?? page.name,
  };
}

export function buildLocalizedDishFaq(
  presentation: LocalizedDishPresentation,
  wines: WineWithRelations[],
  locale: AppLocale,
): FaqEntry[] {
  const copy = PSEO_MESSAGES[locale].dish;
  const top = wines[0];

  if (locale === "ro") {
    return [
      {
        question: presentation.heading,
        answer: top
          ? `Recomandam ${top.name} la ${formatRon(top.priceAvg, locale)}, cu Value Score ${top.valueScore ?? "N/A"}/100.`
          : "Actualizam recomandarile in functie de disponibilitate si pret.",
      },
      {
        question: `Ce tip de vin se potriveste cu ${presentation.name.toLowerCase()}?`,
        answer: presentation.intro,
      },
      {
        question: copy.faqPriceQuestion,
        answer: copy.faqPriceAnswer,
      },
    ];
  }

  return [
    {
      question: presentation.heading,
      answer: top
        ? `We recommend ${top.name} at ${formatRon(top.priceAvg, locale)}, with a Value Score of ${top.valueScore ?? "N/A"}/100.`
        : "We update these recommendations as availability and prices change.",
    },
    {
      question: `What style of wine suits ${presentation.name.toLowerCase()}?`,
      answer: presentation.intro,
    },
    {
      question: copy.faqPriceQuestion,
      answer: copy.faqPriceAnswer,
    },
  ];
}

export function getTopListIndexCopy(
  locale: AppLocale,
  canonicalId: string,
): { title: string; description: string } {
  const links = PSEO_MESSAGES[locale].topLists.indexLinks;
  if (!(canonicalId in links)) {
    throw new Error(`Missing pSEO top-list index copy: ${canonicalId}`);
  }
  return links[canonicalId as keyof typeof links];
}

export function localizedWineHref(
  locale: AppLocale,
  wine: Pick<WineWithRelations, "slug">,
): string {
  return localizedHref(locale, "wine", { slug: wine.slug });
}
