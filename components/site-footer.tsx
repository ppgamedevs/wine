import { Wine } from "lucide-react";
import Link from "next/link";
import { REGION_HUB_LINKS, SEO_PIVOT_LINKS } from "@/lib/top-list-links";

const footerLinks = [
  { label: "Vinuri", href: "/vinuri" },
  { label: "Crame", href: "/crame" },
  { label: "Topuri", href: "/topuri" },
  { label: "Studii", href: "/studii/cele-mai-bune-vinuri-sub-50-lei-2026" },
  { label: "Wine Journal", href: "/journal" },
  { label: "AI Sommelier", href: "/ai-sommelier" },
  { label: "Cum calculam scorurile", href: "/cum-functioneaza-scorurile" },
  { label: "Confidentialitate", href: "/politica-confidentialitate" },
  { label: "Politica cookies", href: "/politica-cookies" },
  { label: "Revendica crama", href: "/claim-your-winery" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto max-w-6xl px-6 py-10">
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
              Ghid de vinuri romanesti: preturi, Value Score si recomandari oneste.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Pagini pivot
            </p>
            <nav aria-label="Pagini pivot SEO" className="mt-3 flex flex-col gap-2">
              {SEO_PIVOT_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-wine"
                >
                  {link.title}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Regiuni viticole
            </p>
            <nav aria-label="Regiuni viticole" className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2">
              {REGION_HUB_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-wine"
                >
                  {link.title}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <nav
          aria-label="Navigatie footer"
          className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-border/60 pt-8"
        >
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-wine"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <p className="mt-8 text-center text-sm text-muted-foreground sm:text-left">
          {new Date().getFullYear()} VinIntel. Vinuri romanesti, clar si onest.
        </p>
      </div>
    </footer>
  );
}
