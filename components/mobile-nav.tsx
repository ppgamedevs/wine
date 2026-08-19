"use client";

import { Menu, Wine } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ComponentProps, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Link } from "@/i18n/navigation";

interface NavLink {
  label: string;
  href: ComponentProps<typeof Link>["href"];
}

export function MobileNav({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("Navigation");

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label={t("openMenu")}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 font-serif text-xl">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-wine text-wine-foreground">
              <Wine className="h-4 w-4" aria-hidden="true" />
            </span>
            Vin<span className="-ml-1 text-wine">Intel</span>
          </SheetTitle>
        </SheetHeader>
        <nav
          className="mt-4 flex flex-col gap-1 px-4"
          aria-label={t("mobileLabel")}
        >
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-base font-medium text-foreground/80 transition-colors hover:bg-secondary hover:text-wine"
            >
              {link.label}
            </Link>
          ))}
          <Button
            asChild
            className="mt-3 bg-wine text-wine-foreground hover:bg-wine/90"
          >
            <Link href="/ai-sommelier" onClick={() => setOpen(false)}>
              {t("sommelier")}
            </Link>
          </Button>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
