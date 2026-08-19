import Link from "next/link";
import type { JournalCategorySlug } from "@/lib/journal-categories";
import { cn } from "@/lib/utils";

interface JournalCategoryNavProps {
  activeCategory?: string;
  query?: string;
  journalHref: string;
  allLabel: string;
  ariaLabel: string;
  categories: Array<{
    slug: JournalCategorySlug;
    label: string;
  }>;
}

export function JournalCategoryNav({
  activeCategory,
  query,
  journalHref,
  allLabel,
  ariaLabel,
  categories,
}: JournalCategoryNavProps) {
  function hrefForCategory(category?: string) {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (query?.trim()) params.set("q", query.trim());
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return `${journalHref}${suffix}#articole`;
  }

  return (
    <nav aria-label={ariaLabel} className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Link
          href={hrefForCategory()}
          className={cn(
            "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
            !activeCategory
              ? "border-wine bg-wine text-wine-foreground"
              : "border-border/70 bg-card text-muted-foreground hover:border-wine/30 hover:text-wine",
          )}
        >
          {allLabel}
        </Link>
        {categories.map((category) => (
          <Link
            key={category.slug}
            href={hrefForCategory(category.slug)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              activeCategory === category.slug
                ? "border-wine bg-wine text-wine-foreground"
                : "border-border/70 bg-card text-muted-foreground hover:border-wine/30 hover:text-wine",
            )}
          >
            {category.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
