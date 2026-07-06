"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { Variants } from "framer-motion";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { SmartSearch } from "@/components/smart-search";
import { EASE_OUT, staggerContainer } from "@/lib/motion";

const suggestions = [
  { label: "Sub 50 lei", href: "/topuri/vinuri-sub-50-lei" },
  { label: "Pentru sarmale", href: "/topuri/vinuri-sub-50-lei-pentru-sarmale" },
  { label: "Pentru desert", href: "/ai-sommelier?occasion=pentru-desert" },
  { label: "Feteasca Neagra", href: "/topuri/cele-mai-bune-feteasca-neagra" },
  { label: "Vinuri cadou", href: "/topuri/vinuri-cadou" },
];

export function Hero() {
  const reduceMotion = useReducedMotion();

  const container = staggerContainer;

  const item: Variants = {
    hidden: reduceMotion ? {} : { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: EASE_OUT },
    },
  };

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute left-1/2 top-[-12rem] h-[28rem] w-[48rem] -translate-x-1/2 rounded-full bg-wine/10 blur-3xl" />
        <div className="absolute bottom-[-10rem] right-[-6rem] h-[24rem] w-[24rem] rounded-full bg-gold/10 blur-3xl" />
      </div>

      <div className="mx-auto flex max-w-4xl flex-col items-center px-6 pb-20 pt-20 text-center sm:pt-28">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="flex w-full flex-col items-center"
        >
          <motion.div variants={item}>
            <span className="inline-flex items-center gap-2 rounded-full border border-wine/20 bg-wine/5 px-4 py-1.5 text-sm font-medium text-wine">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Somelier AI hiper-local pentru vinul romanesc
            </span>
          </motion.div>

          <motion.h1
            variants={item}
            className="mt-6 font-serif text-5xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-6xl md:text-7xl"
          >
            Vinuri romanesti.
            <br />
            <span className="text-wine">Clar. Onest. Rapid.</span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-6 max-w-2xl text-balance text-lg text-muted-foreground sm:text-xl"
          >
            Gaseste vinul potrivit in cateva secunde. Recomandari transparente,
            preturi in RON si asocieri gandite pentru mancarea si ocazia ta.
          </motion.p>

          <motion.div variants={item} className="mt-9 w-full max-w-2xl">
            <SmartSearch />
          </motion.div>

          <motion.div
            variants={item}
            className="mt-5 flex flex-wrap items-center justify-center gap-2"
          >
            <span className="text-sm text-muted-foreground">Cauta des:</span>
            {suggestions.map((suggestion) => (
              <Link
                key={suggestion.href}
                href={suggestion.href}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground/80 transition-colors hover:border-wine/40 hover:text-wine"
              >
                {suggestion.label}
              </Link>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
