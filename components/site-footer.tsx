"use client";

import { Wine } from "lucide-react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { REGION_HUB_LINKS } from "@/lib/top-list-links";

export interface FooterCopy {
  tagline: string;
  pivotHeading: string;
  pivotAria: string;
  regionsHeading: string;
  regionsAria: string;
  navigationAria: string;
  copyright: string;
  links: {
    wines: string;
    grapes: string;
    wineries: string;
    regions: string;
    top: string;
    studies: string;
    journal: string;
    sommelier: string;
    scores: string;
    privacy: string;
    cookies: string;
    claim: string;
    catalog: string;
    best: string;
    budget: string;
    wineryDirectory: string;
    regionDirectory: string;
    allRegions: string;
  };
}

const FOOTER_COPY: Record<"ro" | "en", FooterCopy> = {
  ro: {
    tagline:
      "Ghid de vinuri romanesti: preturi, Value Score si recomandari oneste.",
    pivotHeading: "Pagini pivot",
    pivotAria: "Pagini pivot SEO",
    regionsHeading: "Regiuni viticole",
    regionsAria: "Regiuni viticole",
    navigationAria: "Navigatie footer",
    copyright: `${new Date().getFullYear()} VinIntel. Vinuri romanesti, clar si onest.`,
    links: {
      wines: "Vinuri",
      grapes: "Soiuri",
      wineries: "Crame",
      regions: "Regiuni",
      top: "Topuri",
      studies: "Studii",
      journal: "Wine Journal",
      sommelier: "AI Sommelier",
      scores: "Cum calculam scorurile",
      privacy: "Confidentialitate",
      cookies: "Politica cookies",
      claim: "Revendica crama",
      catalog: "Vinuri romanesti",
      best: "Cele mai bune vinuri romanesti",
      budget: "Vinuri ieftine si bune",
      wineryDirectory: "Crame din Romania",
      regionDirectory: "Regiuni viticole",
      allRegions: "Toate regiunile",
    },
  },
  en: {
    tagline:
      "A Romanian wine guide with prices, Value Score and honest recommendations.",
    pivotHeading: "Explore",
    pivotAria: "Featured wine pages",
    regionsHeading: "Wine regions",
    regionsAria: "Wine regions",
    navigationAria: "Footer navigation",
    copyright: `${new Date().getFullYear()} VinIntel. Romanian wine, clearly and honestly.`,
    links: {
      wines: "Wines",
      grapes: "Grapes",
      wineries: "Wineries",
      regions: "Regions",
      top: "Top wines",
      studies: "Studies",
      journal: "Wine Journal",
      sommelier: "AI Sommelier",
      scores: "How we calculate scores",
      privacy: "Privacy",
      cookies: "Cookie policy",
      claim: "Claim your winery",
      catalog: "Romanian wines",
      best: "Best Romanian wines",
      budget: "Good value wines",
      wineryDirectory: "Romanian wineries",
      regionDirectory: "Wine regions",
      allRegions: "All regions",
    },
  },
};

function dynamicHref(
  pathname: "/regiuni/[slug]",
  href: string,
) {
  return {
    pathname,
    params: { slug: href.slice(href.lastIndexOf("/") + 1) },
  };
}

export function SiteFooter({ copy }: { copy?: FooterCopy }) {
  const requestedLocale = useLocale();
  const isEnglish = requestedLocale === "en";
  const content =
    copy ?? FOOTER_COPY[isEnglish ? "en" : "ro"];
  const footerLinks = [
    { label: content.links.wines, href: "/vinuri" as const },
    { label: content.links.grapes, href: "/soiuri" as const },
    { label: content.links.wineries, href: "/crame" as const },
    { label: content.links.regions, href: "/regiuni" as const },
    { label: content.links.top, href: "/topuri" as const },
    {
      label: content.links.studies,
      href: {
        pathname: "/studii/[slug]" as const,
        params: { slug: "cele-mai-bune-vinuri-sub-50-lei-2026" },
      },
    },
    { label: content.links.journal, href: "/journal" as const },
    { label: content.links.sommelier, href: "/ai-sommelier" as const },
    {
      label: content.links.scores,
      href: "/cum-functioneaza-scorurile" as const,
    },
    {
      label: content.links.privacy,
      href: "/politica-confidentialitate" as const,
    },
    {
      label: content.links.cookies,
      href: "/politica-cookies" as const,
    },
    {
      label: content.links.claim,
      href: "/claim-your-winery" as const,
    },
  ] as const;
  const pivotLinks = [
    { label: content.links.catalog, href: "/vinuri" as const },
    {
      label: content.links.best,
      href: {
        pathname: "/topuri/[slug]" as const,
        params: {
          slug: isEnglish
            ? "best-romanian-wines"
            : "cele-mai-bune-vinuri-romanesti",
        },
      },
    },
    {
      label: content.links.budget,
      href: {
        pathname: "/topuri/[slug]" as const,
        params: {
          slug: isEnglish ? "wines-under-50-ron" : "vinuri-sub-50-lei",
        },
      },
    },
    {
      label: content.links.wineryDirectory,
      href: "/crame" as const,
    },
    {
      label: content.links.regionDirectory,
      href: "/regiuni" as const,
    },
  ] as const;

  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto w-full min-w-0 max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 lg:flex-row lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-wine text-wine-foreground">
                <Wine className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="font-serif text-lg font-bold text-foreground">
                Vin<span className="text-wine">Intel</span>
              </span>
            </div>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              {content.tagline}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {content.pivotHeading}
            </p>
            <nav
              aria-label={content.pivotAria}
              className="mt-3 flex flex-col gap-2"
            >
              {pivotLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-wine"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {content.regionsHeading}
            </p>
            <nav
              aria-label={content.regionsAria}
              className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2"
            >
              <Link
                href="/regiuni"
                className="col-span-2 text-sm font-medium text-foreground transition-colors hover:text-wine"
              >
                {content.links.allRegions}
              </Link>
              {REGION_HUB_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={dynamicHref("/regiuni/[slug]", link.href)}
                  className="text-sm text-muted-foreground transition-colors hover:text-wine"
                >
                  {link.title}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <nav
          aria-label={content.navigationAria}
          className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-border/60 pt-8"
        >
          {footerLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-wine"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <p className="mt-8 text-center text-sm text-muted-foreground sm:text-left">
          {content.copyright}
        </p>
      </div>
    </footer>
  );
}
