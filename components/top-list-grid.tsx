"use client";

import {
  Award,
  ChevronRight,
  Gift,
  Grape,
  UtensilsCrossed,
  Wallet,
  Wine,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { AppLocale } from "@/i18n/locale";
import { localizedHref } from "@/i18n/paths";
import {
  TOP_LIST_INDEX_LINKS,
  type TopListLink,
} from "@/lib/top-list-links";

const ICON_BY_SLUG: Record<string, LucideIcon> = {
  "cele-mai-bune-vinuri-romanesti": Award,
  "vinuri-sub-50-lei": Wallet,
  "vinuri-sub-50-lei-pentru-sarmale": UtensilsCrossed,
  "cele-mai-bune-feteasca-neagra": Grape,
  "vinuri-cadou": Gift,
  "vinuri-sub-100-lei-pentru-cina-romantica": Wine,
  "best-romanian-wines": Award,
  "wines-under-50-ron": Wallet,
  "wines-under-50-ron-for-sarmale": UtensilsCrossed,
  "best-feteasca-neagra-wines": Grape,
  "best-wines-for-gifts": Gift,
  "wines-under-100-ron-for-romantic-dinners": Wine,
};

function iconForLink(link: TopListLink): LucideIcon {
  return ICON_BY_SLUG[link.slug] ?? Wine;
}

interface TopListGridProps {
  links?: TopListLink[];
  locale?: AppLocale;
  className?: string;
}

export function TopListGrid({
  links = TOP_LIST_INDEX_LINKS,
  locale = "ro",
  className = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
}: TopListGridProps) {
  return (
    <div className={className}>
      {links.map((link) => {
        const Icon = iconForLink(link);
        return (
          <Link
            key={link.slug}
            href={localizedHref(locale, "topWine", { slug: link.slug })}
            className="group flex items-center gap-4 rounded-2xl border border-border/70 bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-wine/30 hover:shadow-md"
          >
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-wine/10 text-wine transition-colors group-hover:bg-wine group-hover:text-wine-foreground">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="flex flex-1 flex-col">
              <span className="font-medium text-foreground">{link.title}</span>
              <span className="text-sm text-muted-foreground">
                {link.description}
              </span>
            </span>
            <ChevronRight
              className="h-5 w-5 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-wine"
              aria-hidden="true"
            />
          </Link>
        );
      })}
    </div>
  );
}
