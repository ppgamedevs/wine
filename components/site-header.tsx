import { Wine } from "lucide-react";
import Link from "next/link";
import { MobileNav } from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";

const navLinks = [
  { label: "Vinuri", href: "/vinuri" },
  { label: "Crame", href: "/crame" },
  { label: "Journal", href: "/journal" },
  { label: "Topuri", href: "/topuri" },
  { label: "Adauga vin", href: "/adauga-vin" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/65">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-2"
          aria-label="VinIntel, pagina principala"
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-wine text-wine-foreground shadow-sm">
            <Wine className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="font-serif text-xl font-bold tracking-tight text-foreground">
            Vin<span className="text-wine">Intel</span>
          </span>
        </Link>

        <nav
          aria-label="Navigatie principala"
          className="hidden items-center gap-8 md:flex"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="relative text-sm font-medium text-muted-foreground transition-colors after:absolute after:-bottom-1.5 after:left-0 after:h-0.5 after:w-0 after:bg-wine after:transition-all after:duration-300 hover:text-wine hover:after:w-full"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            asChild
            className="hidden bg-wine text-wine-foreground hover:bg-wine/90 sm:inline-flex"
          >
            <Link href="/ai-sommelier">Intreaba somelierul</Link>
          </Button>
          <MobileNav links={navLinks} />
        </div>
      </div>
    </header>
  );
}
