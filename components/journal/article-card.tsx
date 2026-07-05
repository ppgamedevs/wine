import { ArrowUpRight, CalendarDays } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatJournalDate, type JournalArticle } from "@/lib/journal";

interface ArticleCardProps {
  article: JournalArticle;
}

export function ArticleCard({ article }: ArticleCardProps) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card transition-all duration-300 hover:-translate-y-0.5 hover:border-wine/30 hover:shadow-lg">
      <div className="flex flex-1 flex-col p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="border-wine/20 bg-wine/5 text-wine hover:bg-wine/10"
          >
            {article.categoryLabel}
          </Badge>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            <time dateTime={article.publishedAt}>
              {formatJournalDate(article.publishedAt)}
            </time>
          </span>
        </div>

        <h3 className="mt-4 font-serif text-xl font-semibold leading-snug text-foreground">
          <Link
            href={`/journal/${article.slug}`}
            className="transition-colors group-hover:text-wine"
          >
            {article.title}
          </Link>
        </h3>

        <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
          {article.excerpt}
        </p>

        <Link
          href={`/journal/${article.slug}`}
          className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-wine transition-colors hover:text-wine/80"
        >
          Citeste articolul
          <ArrowUpRight
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            aria-hidden="true"
          />
        </Link>
      </div>
    </article>
  );
}
