import "server-only";

import type { AppLocale } from "@/i18n/locale";
import {
  getReadyTranslationValue,
  type ContentTranslationSource,
} from "@/lib/i18n/content-translations";
import type { JournalArticle } from "@/lib/journal";

const TRANSLATED_FIELDS = ["title", "excerpt", "body"] as const;

type TranslatedJournalField = (typeof TRANSLATED_FIELDS)[number];

function sourceFor(
  article: JournalArticle,
  field: TranslatedJournalField,
): ContentTranslationSource {
  return {
    entityType: "journal_article",
    entityId: article.slug,
    field,
    sourceLocale: "ro",
    targetLocale: "en",
    sourceValueJson: article[field],
  };
}

function translatedString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

export async function getJournalArticleForLocale(
  article: JournalArticle,
  locale: AppLocale,
): Promise<JournalArticle | null> {
  if (locale === "ro") return article;

  const values = await Promise.all(
    TRANSLATED_FIELDS.map((field) =>
      getReadyTranslationValue(sourceFor(article, field)),
    ),
  );
  const [title, excerpt, body] = values.map(translatedString);

  if (!title || !excerpt || !body) return null;

  return {
    ...article,
    title,
    excerpt,
    body,
  };
}

export async function getJournalArticlesForLocale(
  articles: readonly JournalArticle[],
  locale: AppLocale,
): Promise<JournalArticle[]> {
  const localized = await Promise.all(
    articles.map((article) => getJournalArticleForLocale(article, locale)),
  );
  return localized.filter((article): article is JournalArticle => article !== null);
}

export async function isJournalArticleIndexable(
  article: JournalArticle,
  locale: AppLocale,
): Promise<boolean> {
  return (await getJournalArticleForLocale(article, locale)) !== null;
}
