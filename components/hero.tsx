"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { Variants } from "framer-motion";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import {
  SmartSearchClient,
  type SmartSearchCopy,
} from "@/components/smart-search-client";
import type { AppLocale } from "@/i18n/locale";
import { localizedHref } from "@/i18n/paths";
import { EASE_OUT, staggerContainer } from "@/lib/motion";

export interface HeroCopy {
  badge: string;
  title: string;
  titleAccent: string;
  description: string;
  frequentSearches: string;
  links: {
    catalog: string;
    best: string;
    budget: string;
    wineries: string;
    sarmale: string;
    sommelier: string;
  };
  search: SmartSearchCopy;
}

export function Hero({
  copy,
  locale,
}: {
  copy: HeroCopy;
  locale: AppLocale;
}) {
  const reduceMotion = useReducedMotion();

  const container = staggerContainer;
  const pivotLinks = [
    {
      label: copy.links.catalog,
      href: localizedHref(locale, "wines"),
    },
    {
      label: copy.links.best,
      href: localizedHref(locale, "topWine", {
        slug: "cele-mai-bune-vinuri-romanesti",
      }),
    },
    {
      label: copy.links.budget,
      href: localizedHref(locale, "topWine", { slug: "vinuri-sub-50-lei" }),
    },
    {
      label: copy.links.wineries,
      href: localizedHref(locale, "wineries"),
    },
  ];
  const suggestions = [
    {
      label: copy.links.sarmale,
      href: localizedHref(locale, "wineFor", { dish: "sarmale" }),
    },
    {
      label: copy.links.sommelier,
      href: localizedHref(locale, "aiSommelier"),
    },
  ];

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

      <div className="mx-auto flex w-full min-w-0 max-w-4xl flex-col items-center px-4 pb-20 pt-20 text-center sm:px-6 sm:pt-28">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="flex w-full flex-col items-center"
        >
          <motion.div variants={item}>
            <span className="inline-flex items-center gap-2 rounded-full border border-wine/20 bg-wine/5 px-4 py-1.5 text-sm font-medium text-wine">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {copy.badge}
            </span>
          </motion.div>

          <motion.h1
            variants={item}
            className="mt-6 font-serif text-5xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-6xl md:text-7xl"
          >
            {copy.title}
            <br />
            <span className="text-wine">{copy.titleAccent}</span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-6 max-w-2xl text-balance text-lg text-muted-foreground sm:text-xl"
          >
            {copy.description}
          </motion.p>

          <motion.div variants={item} className="mt-9 w-full min-w-0 max-w-2xl">
            <SmartSearchClient copy={copy.search} locale={locale} />
          </motion.div>

          <motion.div
            variants={item}
            className="mt-6 flex flex-wrap items-center justify-center gap-2"
          >
            {pivotLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-wine/30 bg-wine/5 px-4 py-2 text-sm font-medium text-wine transition-colors hover:bg-wine/10"
              >
                {link.label}
              </Link>
            ))}
          </motion.div>

          <motion.div
            variants={item}
            className="mt-4 flex flex-wrap items-center justify-center gap-2"
          >
            <span className="text-sm text-muted-foreground">
              {copy.frequentSearches}
            </span>
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
