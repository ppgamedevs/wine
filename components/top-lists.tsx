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
import { Reveal } from "@/components/reveal";

interface TopLink {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

const topLinks: TopLink[] = [
  {
    title: "Cele mai bune vinuri romanesti",
    description: "Top general dupa Value Score",
    href: "/topuri/cele-mai-bune-vinuri-romanesti",
    icon: Award,
  },
  {
    title: "Cele mai bune vinuri sub 50 lei",
    description: "Valoare maxima la buget mic",
    href: "/topuri/vinuri-sub-50-lei",
    icon: Wallet,
  },
  {
    title: "Vinuri sub 50 lei pentru sarmale",
    description: "Asocieri perfecte cu sarmale, la buget mic",
    href: "/topuri/vinuri-sub-50-lei-pentru-sarmale",
    icon: UtensilsCrossed,
  },
  {
    title: "Cea mai buna Feteasca Neagra",
    description: "Soiul rosu emblematic al Romaniei",
    href: "/topuri/cele-mai-bune-feteasca-neagra",
    icon: Grape,
  },
  {
    title: "Vinuri cadou",
    description: "Alegeri sigure pentru orice ocazie",
    href: "/topuri/vinuri-cadou",
    icon: Gift,
  },
  {
    title: "Vinuri sub 100 lei pentru cina romantica",
    description: "Eleganta pentru o seara in doi",
    href: "/topuri/vinuri-sub-100-lei-pentru-cina-romantica",
    icon: Wine,
  },
];

export function TopLists() {
  return (
    <section className="border-t border-border/60 bg-secondary/30 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-3xl font-semibold text-foreground sm:text-4xl">
            Topuri si ghiduri
          </h2>
          <p className="mt-4 text-balance text-muted-foreground">
            Cele mai cautate selectii de vinuri romanesti, gata sa te ajute sa
            alegi rapid.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topLinks.map((link, index) => {
            const Icon = link.icon;
            return (
              <Reveal key={link.href} delay={(index % 3) * 0.06}>
                <Link
                  href={link.href}
                  className="group flex items-center gap-4 rounded-2xl border border-border/70 bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-wine/30 hover:shadow-md"
                >
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-wine/10 text-wine transition-colors group-hover:bg-wine group-hover:text-wine-foreground">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="flex flex-1 flex-col">
                    <span className="font-medium text-foreground">
                      {link.title}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {link.description}
                    </span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-wine" />
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
