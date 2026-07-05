import Link from "next/link";
import { JOURNAL_CATEGORIES } from "@/lib/journal-categories";
import { cn } from "@/lib/utils";

interface JournalCategoryNavProps {
  activeCategory?: string;
  query?: string;
}

export function JournalCategoryNav({
  activeCategory,
  query,
}: JournalCategoryNavProps) {
  function hrefForCategory(category?: string) {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (query?.trim()) params.set("q", query.trim());
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return `/journal${suffix}#articole`;
  }

  return (
    <nav aria-label="Categorii Wine Journal" className="space-y-4">
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
          Toate
        </Link>
        {JOURNAL_CATEGORIES.map((category) => (
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
