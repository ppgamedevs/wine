import Link from "next/link";
import { Flame, Star } from "lucide-react";
import { formatJournalDate, type JournalArticle } from "@/lib/journal";

interface JournalSidebarProps {
  topArticles: JournalArticle[];
  popularArticles: JournalArticle[];
}

function SidebarList({
  title,
  icon: Icon,
  articles,
}: {
  title: string;
  icon: typeof Star;
  articles: JournalArticle[];
}) {
  if (articles.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-wine/10 text-wine">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <h2 className="font-serif text-lg font-semibold text-foreground">
          {title}
        </h2>
      </div>

      <ol className="mt-4 space-y-4">
        {articles.map((article, index) => (
          <li key={article.slug} className="flex gap-3">
            <span className="mt-0.5 font-serif text-lg font-semibold text-wine/70">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <Link
                href={`/journal/${article.slug}`}
                className="block font-medium leading-snug text-foreground transition-colors hover:text-wine"
              >
                {article.title}
              </Link>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatJournalDate(article.publishedAt)}
                {article.readCount > 0
                  ? ` · ${article.readCount.toLocaleString("ro-RO")} citiri`
                  : null}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function JournalSidebar({
  topArticles,
  popularArticles,
}: JournalSidebarProps) {
  return (
    <aside className="space-y-6" aria-label="Articole recomandate">
      <SidebarList title="Top articole" icon={Star} articles={topArticles} />
      <SidebarList
        title="Cele mai citite"
        icon={Flame}
        articles={popularArticles}
      />
    </aside>
  );
}
