import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/i18n/locale";
import { localizedHref } from "@/i18n/paths";
import type { GrapeGuide } from "@/lib/oenology";
import type { PseoMessages } from "@/lib/i18n/pseo";

function colorLabel(
  color: GrapeGuide["color"],
  copy: PseoMessages["grape"],
): string {
  if (color === "red") return copy.colorRed;
  if (color === "rose") return copy.colorRose;
  return copy.colorWhite;
}

function GrapeGuideCard({
  locale,
  guide,
  wineCount,
  grapeCopy,
}: {
  locale: AppLocale;
  guide: GrapeGuide;
  wineCount: number;
  grapeCopy: PseoMessages["grape"];
}) {
  const copy = guide.copy[locale];
  return (
    <Link
      href={localizedHref(locale, "grapeVariety", { slug: guide.slug })}
      className="group flex h-full flex-col rounded-2xl border border-border/70 bg-card p-5 transition-colors hover:border-wine/30 hover:bg-wine/5 sm:p-6"
    >
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full border border-border/70 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {colorLabel(guide.color, grapeCopy)}
        </span>
        {guide.isIndigenous ? (
          <span className="rounded-full border border-wine/20 bg-wine/8 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-wine">
            {grapeCopy.indigenousBadge}
          </span>
        ) : null}
      </div>
      <h3 className="mt-4 font-serif text-xl font-semibold text-foreground group-hover:text-wine">
        {copy.name}
      </h3>
      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
        {copy.answer}
      </p>
      {wineCount > 0 ? (
        <p className="mt-4 text-xs text-muted-foreground">
          {grapeCopy.winesInCatalog.replace("{count}", String(wineCount))}
        </p>
      ) : null}
    </Link>
  );
}

export function GrapeHub({
  locale,
  indigenous,
  international,
  wineCounts,
  messages,
}: {
  locale: AppLocale;
  indigenous: GrapeGuide[];
  international: GrapeGuide[];
  wineCounts: Record<string, number>;
  messages: PseoMessages;
}) {
  const grapeCopy = messages.grape;

  return (
    <main className="flex-1">
      <section className="border-b border-border/60 bg-[radial-gradient(ellipse_at_top,_rgba(124,45,18,0.07),_transparent_55%)]">
        <div className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
          <nav
            aria-label="Breadcrumb"
            className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"
          >
            <Link href={localizedHref(locale, "home")} className="hover:text-wine">
              {messages.common.home}
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="text-foreground">{grapeCopy.breadcrumbGrapes}</span>
          </nav>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-wine">
            {grapeCopy.hubEyebrow}
          </p>
          <h1 className="mt-4 font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {grapeCopy.hubTitle}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {grapeCopy.hubIntro}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-16 px-6 py-12 sm:py-16">
        <section aria-labelledby="indigenous-heading">
          <h2
            id="indigenous-heading"
            className="font-serif text-2xl font-semibold text-foreground"
          >
            {grapeCopy.indigenous}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {grapeCopy.indigenousLead}
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {indigenous.map((guide) => (
              <GrapeGuideCard
                key={guide.slug}
                locale={locale}
                guide={guide}
                wineCount={wineCounts[guide.slug] ?? 0}
                grapeCopy={grapeCopy}
              />
            ))}
          </div>
        </section>

        <section aria-labelledby="international-heading">
          <h2
            id="international-heading"
            className="font-serif text-2xl font-semibold text-foreground"
          >
            {grapeCopy.international}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {grapeCopy.internationalLead}
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {international.map((guide) => (
              <GrapeGuideCard
                key={guide.slug}
                locale={locale}
                guide={guide}
                wineCount={wineCounts[guide.slug] ?? 0}
                grapeCopy={grapeCopy}
              />
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-wine/15 bg-wine/5 px-6 py-8 sm:px-8">
          <h2 className="font-serif text-2xl font-semibold text-foreground">
            {grapeCopy.sommelierTitle}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {grapeCopy.sommelierBody}
          </p>
          <Button
            asChild
            className="mt-6 bg-wine text-wine-foreground hover:bg-wine/90"
          >
            <Link href={localizedHref(locale, "aiSommelier")}>
              {grapeCopy.sommelierCta}
            </Link>
          </Button>
        </section>
      </div>
    </main>
  );
}
