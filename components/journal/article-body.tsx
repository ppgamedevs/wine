import { CalendarDays, Clock3 } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import type { AppLocale } from "@/i18n/locale";
import { localizedHref } from "@/i18n/paths";
import { formatJournalDate, type JournalArticle } from "@/lib/journal";

export function estimateReadingMinutes(body: string): number {
  const words = body.trim().split(/\s+/).length;
  return Math.max(3, Math.round(words / 180));
}

function renderInlineContent(text: string): ReactNode {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const token = match[0];
    const index = match.index ?? 0;

    if (index > lastIndex) {
      nodes.push(text.slice(lastIndex, index));
    }

    if (token.startsWith("**") && token.endsWith("**")) {
      nodes.push(
        <strong key={`${index}-strong`}>{token.slice(2, -2)}</strong>,
      );
    } else {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        const [, label, href] = linkMatch;
        if (href.startsWith("http")) {
          nodes.push(
            <a
              key={`${index}-link`}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-wine underline-offset-4 hover:underline"
            >
              {label}
            </a>,
          );
        } else {
          nodes.push(
            <Link
              key={`${index}-link`}
              href={href}
              className="font-medium text-wine underline-offset-4 hover:underline"
            >
              {label}
            </Link>,
          );
        }
      } else {
        nodes.push(token);
      }
    }

    lastIndex = index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length === 1 ? nodes[0] : nodes;
}

function renderBlock(paragraph: string, index: number) {
  if (paragraph.startsWith("## ")) {
    return (
      <h2
        key={`h2-${index}`}
        className="pt-4 font-serif text-2xl font-semibold tracking-tight text-foreground"
      >
        {renderInlineContent(paragraph.slice(3))}
      </h2>
    );
  }

  if (paragraph.startsWith("### ")) {
    return (
      <h3
        key={`h3-${index}`}
        className="pt-2 font-serif text-xl font-semibold text-foreground"
      >
        {renderInlineContent(paragraph.slice(4))}
      </h3>
    );
  }

  return (
    <p key={`p-${index}`} className="leading-relaxed text-foreground/90">
      {renderInlineContent(paragraph)}
    </p>
  );
}

function renderParagraphs(body: string) {
  return body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph, index) => renderBlock(paragraph, index));
}

interface ArticleBodyProps {
  article: JournalArticle;
  locale: AppLocale;
  readingLabel: string;
}

export function ArticleBody({
  article,
  locale,
  readingLabel,
}: ArticleBodyProps) {
  const journalHref = localizedHref(locale, "journal");

  return (
    <article className="mx-auto max-w-3xl">
      <header className="border-b border-border/60 pb-8">
        <Link
          href={`${journalHref}?category=${article.category}#articole`}
          className="text-sm font-medium text-wine hover:underline"
        >
          {article.categoryLabel}
        </Link>
        <h1 className="mt-4 font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
          {article.title}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          {article.excerpt}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Badge
            variant="outline"
            className="border-wine/20 bg-wine/5 text-wine"
          >
            Wine Journal
          </Badge>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            <time dateTime={article.publishedAt}>
              {formatJournalDate(article.publishedAt, locale)}
            </time>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="h-4 w-4" aria-hidden="true" />
            {readingLabel}
          </span>
        </div>
      </header>

      <div className="prose-spacing mt-8 space-y-5 text-base">
        {renderParagraphs(article.body)}
      </div>
    </article>
  );
}
