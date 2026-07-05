import { CalendarDays, Clock3 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatJournalDate, type JournalArticle } from "@/lib/journal";

function estimateReadingMinutes(body: string): number {
  const words = body.trim().split(/\s+/).length;
  return Math.max(3, Math.round(words / 180));
}

function renderParagraphs(body: string) {
  return body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => (
      <p key={paragraph.slice(0, 24)} className="leading-relaxed text-foreground/90">
        {paragraph}
      </p>
    ));
}

interface ArticleBodyProps {
  article: JournalArticle;
}

export function ArticleBody({ article }: ArticleBodyProps) {
  const readingMinutes = estimateReadingMinutes(article.body);

  return (
    <article className="mx-auto max-w-3xl">
      <header className="border-b border-border/60 pb-8">
        <Link
          href={`/journal?category=${article.category}#articole`}
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
              {formatJournalDate(article.publishedAt)}
            </time>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="h-4 w-4" aria-hidden="true" />
            {readingMinutes} min citire
          </span>
        </div>
      </header>

      <div className="prose-spacing mt-8 space-y-5 text-base">
        {renderParagraphs(article.body)}
      </div>
    </article>
  );
}
