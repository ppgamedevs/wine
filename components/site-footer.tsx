import { Wine } from "lucide-react";
import Link from "next/link";

const footerLinks = [
  { label: "Vinuri", href: "/vinuri" },
  { label: "Crame", href: "/crame" },
  { label: "Wine Journal", href: "/journal" },
  { label: "AI Sommelier", href: "/ai-sommelier" },
  { label: "Topuri", href: "/topuri" },
  { label: "Cum calculam scorurile", href: "/cum-functioneaza-scorurile" },
  { label: "Revendica crama", href: "/claim-your-winery" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 py-10 sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-wine text-wine-foreground">
            <Wine className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="font-serif text-lg font-bold text-foreground">
            Vin<span className="text-wine">Intel</span>
          </span>
        </div>

        <nav aria-label="Navigatie footer" className="flex flex-wrap gap-6">
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

        <p className="text-sm text-muted-foreground">
          {new Date().getFullYear()} VinIntel. Vinuri romanesti, clar si onest.
        </p>
      </div>
    </footer>
  );
}
