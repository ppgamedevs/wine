import Link from "next/link";
import { Flame, Star } from "lucide-react";
import type { AppLocale } from "@/i18n/locale";
import { localizedHref } from "@/i18n/paths";
import { formatJournalDate, type JournalArticle } from "@/lib/journal";

interface JournalSidebarProps {
  topArticles: JournalArticle[];
  popularArticles: JournalArticle[];
  locale: AppLocale;
  labels: {
    ariaLabel: string;
    top: string;
    popular: string;
    reads: string;
  };
}

function SidebarList({
  title,
  icon: Icon,
  articles,
  locale,
  readsLabel,
}: {
  title: string;
  icon: typeof Star;
  articles: JournalArticle[];
  locale: AppLocale;
  readsLabel: string;
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
                href={localizedHref(locale, "journalArticle", {
                  slug: article.slug,
                })}
                className="block font-medium leading-snug text-foreground transition-colors hover:text-wine"
              >
                {article.title}
              </Link>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatJournalDate(article.publishedAt, locale)}
                {article.readCount > 0
                  ? ` · ${article.readCount.toLocaleString(
                      locale === "en" ? "en-GB" : "ro-RO",
                    )} ${readsLabel}`
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
  locale,
  labels,
}: JournalSidebarProps) {
  return (
    <aside className="space-y-6" aria-label={labels.ariaLabel}>
      <SidebarList
        title={labels.top}
        icon={Star}
        articles={topArticles}
        locale={locale}
        readsLabel={labels.reads}
      />
      <SidebarList
        title={labels.popular}
        icon={Flame}
        articles={popularArticles}
        locale={locale}
        readsLabel={labels.reads}
      />
    </aside>
  );
}
