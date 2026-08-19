"use client";

import { ArrowDown, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface JournalHeroProps {
  initialQuery?: string;
  journalHref: string;
  copy: {
    eyebrow: string;
    title: string;
    description: string;
    read: string;
    searchPlaceholder: string;
    searchLabel: string;
  };
}

export function JournalHero({
  initialQuery = "",
  journalHref,
  copy,
}: JournalHeroProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    const params = new URLSearchParams();
    if (trimmed) params.set("q", trimmed);
    const suffix = params.toString() ? `?${params.toString()}` : "";
    router.push(`${journalHref}${suffix}#articole`);
  }

  return (
    <section className="relative overflow-hidden border-b border-wine/10 bg-gradient-to-b from-wine/[0.07] via-secondary/30 to-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-wine/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-gold/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-4xl px-6 py-16 text-center lg:py-24">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-wine">
          {copy.eyebrow}
        </p>
        <h1 className="mt-4 font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          {copy.title}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
          {copy.description}
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            asChild
            size="lg"
            className="rounded-xl bg-wine px-8 text-wine-foreground hover:bg-wine/90"
          >
            <a href="#articole">
              {copy.read}
              <ArrowDown className="h-4 w-4" />
            </a>
          </Button>

          <form
            onSubmit={handleSubmit}
            role="search"
            className="relative w-full max-w-sm"
          >
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.searchPlaceholder}
              aria-label={copy.searchLabel}
              className="h-11 rounded-full border-border/70 bg-background/90 pl-11 shadow-sm focus-visible:ring-wine/40"
            />
          </form>
        </div>
      </div>
    </section>
  );
}
