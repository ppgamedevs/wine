import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { AppLocale } from "@/i18n/locale";
import {
  getJournalCategoryLabel,
  type JournalCategorySlug,
} from "@/lib/journal-categories";

export interface JournalArticle {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  category: JournalCategorySlug;
  categoryLabel: string;
  featured: boolean;
  popular: boolean;
  readCount: number;
  body: string;
}

const CONTENT_DIR = path.join(process.cwd(), "content", "journal");

interface FrontmatterRecord {
  slug?: string;
  title?: string;
  excerpt?: string;
  publishedAt?: string;
  category?: string;
  featured?: boolean;
  popular?: boolean;
  readCount?: number;
}

function parseFrontmatterValue(raw: string): string | boolean | number {
  const trimmed = raw.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseFrontmatter(source: string): FrontmatterRecord {
  const result: FrontmatterRecord = {};

  for (const line of source.split("\n")) {
    const match = line.match(/^([\w-]+):\s*(.+)$/);
    if (!match) continue;
    const [, key, value] = match;
    (result as Record<string, string | boolean | number>)[key] =
      parseFrontmatterValue(value);
  }

  return result;
}

function parseMarkdownFile(filePath: string): JournalArticle | null {
  const raw = fs.readFileSync(filePath, "utf-8");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return null;

  const frontmatter = parseFrontmatter(match[1]);
  const slug = frontmatter.slug?.toString().trim();
  const title = frontmatter.title?.toString().trim();
  const excerpt = frontmatter.excerpt?.toString().trim();
  const publishedAt = frontmatter.publishedAt?.toString().trim();
  const category = frontmatter.category?.toString().trim() as
    | JournalCategorySlug
    | undefined;

  if (!slug || !title || !excerpt || !publishedAt || !category) {
    return null;
  }

  return {
    slug,
    title,
    excerpt,
    publishedAt,
    category,
    categoryLabel: getJournalCategoryLabel(category),
    featured: frontmatter.featured === true,
    popular: frontmatter.popular === true,
    readCount:
      typeof frontmatter.readCount === "number" ? frontmatter.readCount : 0,
    body: match[2].trim(),
  };
}

function loadAllArticlesFromDisk(): JournalArticle[] {
  if (!fs.existsSync(CONTENT_DIR)) {
    return [];
  }

  const files = fs
    .readdirSync(CONTENT_DIR)
    .filter((file) => file.endsWith(".md"))
    .sort();

  return files
    .map((file) => parseMarkdownFile(path.join(CONTENT_DIR, file)))
    .filter((article): article is JournalArticle => article != null)
    .sort(
      (left, right) =>
        new Date(right.publishedAt).getTime() -
        new Date(left.publishedAt).getTime(),
    );
}

export function getAllJournalArticles(): JournalArticle[] {
  return loadAllArticlesFromDisk();
}

export function getJournalArticleBySlug(
  slug: string,
): JournalArticle | undefined {
  return getAllJournalArticles().find((article) => article.slug === slug);
}

export function filterJournalArticles(input: {
  category?: string;
  query?: string;
}): JournalArticle[] {
  const normalizedQuery = input.query?.trim().toLowerCase() ?? "";
  let articles = getAllJournalArticles();

  if (input.category) {
    articles = articles.filter((article) => article.category === input.category);
  }

  if (normalizedQuery) {
    articles = articles.filter((article) => {
      const haystack = [
        article.title,
        article.excerpt,
        article.categoryLabel,
        article.body,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }

  return articles;
}

export function getFeaturedJournalArticles(limit = 3): JournalArticle[] {
  const featured = getAllJournalArticles().filter((article) => article.featured);
  if (featured.length >= limit) return featured.slice(0, limit);
  return getAllJournalArticles().slice(0, limit);
}

export function getPopularJournalArticles(limit = 5): JournalArticle[] {
  const popular = getAllJournalArticles()
    .filter((article) => article.popular)
    .sort((left, right) => right.readCount - left.readCount);

  if (popular.length >= limit) return popular.slice(0, limit);

  return [...getAllJournalArticles()]
    .sort((left, right) => right.readCount - left.readCount)
    .slice(0, limit);
}

export function getTopJournalArticles(limit = 5): JournalArticle[] {
  return getFeaturedJournalArticles(limit);
}

export function formatJournalDate(
  isoDate: string,
  locale: AppLocale = "ro",
): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;

  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
