import "server-only";

import { createTranslator } from "next-intl";
import { getLocale } from "next-intl/server";
import {
  DEFAULT_LOCALE,
  isAppLocale,
  type AppLocale,
} from "@/i18n/locale";
import { localizedHref } from "@/i18n/paths";
import { getReadyTranslationValue } from "@/lib/i18n/content-translations";
import { localeMayBeIndexed } from "@/lib/i18n/indexing";
import { absoluteUrl, buildBreadcrumbJsonLd, buildFaqJsonLd } from "@/lib/seo";
import {
  buildWineProductNode,
  resolveWineOfferPrice,
} from "@/lib/wine-json-ld";
import type { ContentTranslationJson } from "@/lib/schema";
import type { FaqEntry } from "@/lib/seo";
import type { WineryEvent, WineryWithWines } from "@/types";
import englishMessages from "@/messages/en/winery-profile.json";
import romanianMessages from "@/messages/ro/winery-profile.json";

export type WineryProfileMessages = typeof romanianMessages;

const checkedEnglishMessages: WineryProfileMessages = englishMessages;
const WINERY_PROFILE_MESSAGES = {
  ro: romanianMessages,
  en: checkedEnglishMessages,
} as const;

const WINERY_FIELDS = ["description", "customStory"] as const;
const EVENT_FIELDS = ["title", "description", "location"] as const;

export type WineryProfileTranslationField =
  | `winery.${(typeof WINERY_FIELDS)[number]}`
  | `event.${number}.${(typeof EVENT_FIELDS)[number]}`;

export interface WineryProfileTranslationValues {
  winery?: Partial<
    Record<(typeof WINERY_FIELDS)[number], ContentTranslationJson>
  >;
  events?: Readonly<
    Record<
      string,
      Partial<Record<(typeof EVENT_FIELDS)[number], ContentTranslationJson>>
    >
  >;
}

export interface LocalizedWineryProfile {
  winery: WineryWithWines;
  events: WineryEvent[];
  limitedData: boolean;
  missingFields: WineryProfileTranslationField[];
}

export interface WineryProfileStructuredDataCopy {
  home: string;
  wineries: string;
  wineList: string;
}

export function getWineryProfileMessages(
  locale: AppLocale,
): WineryProfileMessages {
  return WINERY_PROFILE_MESSAGES[locale];
}

export async function getWineryProfileI18n() {
  const requestedLocale = await getLocale();
  const locale: AppLocale = isAppLocale(requestedLocale)
    ? requestedLocale
    : DEFAULT_LOCALE;
  const messages = getWineryProfileMessages(locale);
  const t = createTranslator({ locale, messages });

  return { locale, t };
}

function sourceText(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? value : null;
}

function translatedText(
  value: ContentTranslationJson | undefined,
): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function applyEnglishWineryProfileTranslations(
  winery: WineryWithWines,
  events: WineryEvent[],
  translations: WineryProfileTranslationValues,
): LocalizedWineryProfile {
  const missingFields: WineryProfileTranslationField[] = [];
  const sourceDescription = sourceText(winery.description);
  const description = translatedText(translations.winery?.description);
  const sourceCustomStory = sourceText(winery.customStory);
  const customStory = translatedText(translations.winery?.customStory);

  if (sourceDescription === null || description === null) {
    missingFields.push("winery.description");
  }
  if (sourceCustomStory !== null && customStory === null) {
    missingFields.push("winery.customStory");
  }

  const localizedEvents = events.map((event) => {
    const eventTranslations = translations.events?.[String(event.id)];
    const title = translatedText(eventTranslations?.title);
    const descriptionTranslation = translatedText(eventTranslations?.description);
    const locationTranslation = translatedText(eventTranslations?.location);

    if (title === null) {
      missingFields.push(`event.${event.id}.title`);
    }
    if (
      sourceText(event.description) !== null &&
      descriptionTranslation === null
    ) {
      missingFields.push(`event.${event.id}.description`);
    }
    if (sourceText(event.location) !== null && locationTranslation === null) {
      missingFields.push(`event.${event.id}.location`);
    }

    return {
      ...event,
      title: title ?? "",
      description: descriptionTranslation,
      location: locationTranslation,
    };
  });

  return {
    winery: {
      ...winery,
      description,
      customStory,
      wines: winery.wines.map((wine) => ({
        ...wine,
        tastingNotes: null,
        imageAlt: `Bottle of ${wine.name}.`,
      })),
    },
    events: localizedEvents,
    limitedData: missingFields.length > 0,
    missingFields,
  };
}

async function readyWineryField(
  winery: WineryWithWines,
  field: (typeof WINERY_FIELDS)[number],
): Promise<ContentTranslationJson | undefined> {
  const value = sourceText(winery[field]);
  if (value === null) return undefined;

  const translation = await getReadyTranslationValue({
    entityType: "winery",
    entityId: String(winery.id),
    field,
    sourceLocale: "ro",
    targetLocale: "en",
    sourceValueJson: value,
    sourceUpdatedAt: winery.updatedAt,
  });
  return translation ?? undefined;
}

async function readyEventField(
  event: WineryEvent,
  field: (typeof EVENT_FIELDS)[number],
): Promise<ContentTranslationJson | undefined> {
  const value = sourceText(event[field]);
  if (value === null) return undefined;

  const translation = await getReadyTranslationValue({
    entityType: "winery_event",
    entityId: String(event.id),
    field,
    sourceLocale: "ro",
    targetLocale: "en",
    sourceValueJson: value,
    sourceUpdatedAt: event.updatedAt,
  });
  return translation ?? undefined;
}

export async function localizeWineryProfileForEnglish(
  winery: WineryWithWines,
  events: WineryEvent[],
): Promise<LocalizedWineryProfile> {
  const wineryEntries = await Promise.all(
    WINERY_FIELDS.map(async (field) => {
      const value = await readyWineryField(winery, field);
      return [field, value] as const;
    }),
  );
  const eventEntries = await Promise.all(
    events.map(async (event) => {
      const fields = await Promise.all(
        EVENT_FIELDS.map(async (field) => {
          const value = await readyEventField(event, field);
          return [field, value] as const;
        }),
      );
      return [String(event.id), Object.fromEntries(fields)] as const;
    }),
  );

  return applyEnglishWineryProfileTranslations(winery, events, {
    winery: Object.fromEntries(wineryEntries),
    events: Object.fromEntries(eventEntries),
  });
}

export function localizeWineryProfile(
  winery: WineryWithWines,
  events: WineryEvent[],
  locale: AppLocale,
): Promise<LocalizedWineryProfile> | LocalizedWineryProfile {
  if (locale === "en") {
    return localizeWineryProfileForEnglish(winery, events);
  }
  return {
    winery,
    events,
    limitedData: false,
    missingFields: [],
  };
}

export function isWineryProfileIndexable(
  wineCount: number,
  locale: AppLocale,
  limitedData: boolean,
): boolean {
  return (
    wineCount > 0 &&
    localeMayBeIndexed(locale) &&
    !(locale === "en" && limitedData)
  );
}

function buildLocalizedOffer(
  wine: WineryWithWines["wines"][number],
  locale: AppLocale,
): Record<string, unknown> {
  const url = absoluteUrl(localizedHref(locale, "wine", { slug: wine.slug }));
  const price = resolveWineOfferPrice(wine);
  const product = buildWineProductNode(wine, locale);

  return {
    "@type": "Offer",
    url,
    priceCurrency: "RON",
    availability: "https://schema.org/InStock",
    ...(price != null ? { price } : {}),
    itemOffered: {
      ...product,
      url,
      ...(locale === "en"
        ? { description: `Romanian wine ${wine.name}.` }
        : {}),
      offers: {
        "@type": "Offer",
        url,
        priceCurrency: "RON",
        availability: "https://schema.org/InStock",
        ...(price != null ? { price } : {}),
      },
    },
  };
}

export function buildWineryProfileJsonLd(
  winery: WineryWithWines,
  faq: FaqEntry[],
  locale: AppLocale,
  logoUrl: string | null,
  copy: WineryProfileStructuredDataCopy,
): Record<string, unknown>[] {
  const path = localizedHref(locale, "winery", { slug: winery.slug });
  const url = absoluteUrl(path);
  const wineryJsonLd = {
    "@context": "https://schema.org",
    "@type": "Winery",
    inLanguage: locale === "en" ? "en-GB" : "ro-RO",
    name: winery.name,
    description: winery.description ?? undefined,
    url,
    logo: logoUrl ?? undefined,
    foundingDate: winery.foundedYear ? String(winery.foundedYear) : undefined,
    sameAs:
      winery.verified && winery.website ? [winery.website] : undefined,
    address: winery.region
      ? {
          "@type": "PostalAddress",
          addressRegion: winery.region.name,
          addressCountry: "RO",
        }
      : undefined,
    makesOffer: winery.wines
      .slice(0, 10)
      .map((wine) => buildLocalizedOffer(wine, locale)),
  };
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    inLanguage: locale === "en" ? "en-GB" : "ro-RO",
    name: copy.wineList,
    numberOfItems: winery.wines.length,
    itemListElement: winery.wines.map((wine, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(localizedHref(locale, "wine", { slug: wine.slug })),
      name: wine.name,
    })),
  };
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: copy.home, path: localizedHref(locale, "home") },
    { name: copy.wineries, path: localizedHref(locale, "wineries") },
    { name: winery.name, path },
  ]);

  return [
    wineryJsonLd,
    itemListJsonLd,
    breadcrumbJsonLd,
    buildFaqJsonLd(faq),
  ];
}
