import { Wine } from "lucide-react";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/language-switcher";
import { MobileNav } from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export function SiteHeader() {
  const t = useTranslations("Navigation");
  const navLinks = [
    { label: t("wines"), href: "/vinuri" as const },
    { label: t("wineries"), href: "/crame" as const },
    { label: t("journal"), href: "/journal" as const },
    { label: t("topWines"), href: "/topuri" as const },
  ];

  return (
    <header className="sticky top-0 z-50 w-full overflow-x-clip border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/65">
      <div className="mx-auto flex h-16 w-full min-w-0 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
        <Link
          href="/"
          className="flex min-w-0 shrink-0 items-center gap-2"
          aria-label={t("home")}
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-wine text-wine-foreground shadow-sm">
            <Wine className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="font-serif text-xl font-bold tracking-tight text-foreground">
            Vin<span className="text-wine">Intel</span>
          </span>
        </Link>

        <nav
          aria-label={t("primaryLabel")}
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

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <LanguageSwitcher />
          <Button
            asChild
            className="hidden bg-wine text-wine-foreground hover:bg-wine/90 md:inline-flex"
          >
            <Link href="/ai-sommelier">{t("sommelier")}</Link>
          </Button>
          <MobileNav links={navLinks} />
        </div>
      </div>
    </header>
  );
}
