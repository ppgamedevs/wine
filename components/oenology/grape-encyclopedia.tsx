import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { WineCard } from "@/components/wine-card";
import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/i18n/locale";
import { localizedHref } from "@/i18n/paths";
import { getDishPairingPage } from "@/lib/dish-pairing-pages";
import type { GrapeGuide } from "@/lib/oenology";
import type { DishPseoSlug, PseoMessages } from "@/lib/i18n/pseo";
import type { WineWithRelations } from "@/types";

function colorLabel(
  color: GrapeGuide["color"],
  copy: PseoMessages["grape"],
): string {
  if (color === "red") return copy.colorRed;
  if (color === "rose") return copy.colorRose;
  return copy.colorWhite;
}

function pairingChipName(
  slug: string,
  messages: PseoMessages,
  fallback: string,
): string {
  if (slug in messages.dish.pages) {
    return messages.dish.pages[slug as DishPseoSlug].name;
  }
  return fallback;
}

export async function GrapeEncyclopedia({
  locale,
  guide,
  wines,
  related,
  journalArticles,
  topListPath,
  messages,
}: {
  locale: AppLocale;
  guide: GrapeGuide;
  wines: WineWithRelations[];
  related: GrapeGuide[];
  journalArticles: Array<{ slug: string; title: string }>;
  topListPath: string | null;
  messages: PseoMessages;
}) {
  const copy = guide.copy[locale];
  const grapeCopy = messages.grape;
  const hubHref = localizedHref(locale, "grapeVarieties");
  const pairing = guide.pairingDishSlugs
    .map((slug) => {
      const page = getDishPairingPage(slug);
      if (!page) return null;
      return {
        slug,
        name: pairingChipName(slug, messages, page.dishName),
        href: localizedHref(locale, "wineFor", { dish: slug }),
      };
    })
    .filter((item): item is { slug: string; name: string; href: string } =>
      Boolean(item),
    );

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
            <Link href={hubHref} className="hover:text-wine">
              {grapeCopy.breadcrumbGrapes}
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="text-foreground">{copy.name}</span>
          </nav>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {colorLabel(guide.color, grapeCopy)}
            </span>
            <span className="rounded-full border border-wine/20 bg-wine/8 px-3 py-1 text-xs font-medium uppercase tracking-wide text-wine">
              {guide.isIndigenous
                ? grapeCopy.indigenousBadge
                : grapeCopy.internationalBadge}
            </span>
          </div>

          <h1 className="mt-5 font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {copy.name}
          </h1>

          <aside className="mt-8 max-w-3xl rounded-2xl border border-wine/15 bg-background/90 p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-wine">
              {grapeCopy.answerLabel}
            </p>
            <p className="mt-3 text-base leading-relaxed text-foreground sm:text-lg">
              {copy.answer}
            </p>
          </aside>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-16 px-6 py-12 sm:py-16">
        <section aria-labelledby="facts-heading">
          <h2
            id="facts-heading"
            className="font-serif text-2xl font-semibold text-foreground"
          >
            {grapeCopy.factsHeading}
          </h2>
          <dl className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/70 sm:grid-cols-2">
            {copy.facts.map((fact) => (
              <div
                key={fact.label}
                className="bg-card px-5 py-4 sm:px-6"
              >
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {fact.label}
                </dt>
                <dd className="mt-1 text-sm leading-relaxed text-foreground">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <ProseBlock id="intro" title={copy.name} body={copy.intro} visuallyHideTitle />

        <ProseBlock
          id="glass"
          title={grapeCopy.glassHeading}
          body={copy.inTheGlass}
        />
        <ProseBlock
          id="origin"
          title={grapeCopy.originHeading}
          body={copy.origin}
        />
        <ProseBlock
          id="romania"
          title={grapeCopy.romaniaHeading}
          body={copy.inRomania}
        />

        <section aria-labelledby="pairing-heading">
          <h2
            id="pairing-heading"
            className="font-serif text-2xl font-semibold text-foreground"
          >
            {grapeCopy.pairingHeading}
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
            {copy.pairing}
          </p>
          {pairing.length > 0 ? (
            <ul className="mt-5 flex flex-wrap gap-2">
              {pairing.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={item.href}
                    className="inline-flex rounded-full border border-border/70 bg-card px-3.5 py-1.5 text-sm text-foreground transition-colors hover:border-wine/30 hover:bg-wine/5"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <ProseBlock
          id="choose"
          title={grapeCopy.chooseHeading}
          body={copy.howToChoose}
        />

        <section aria-labelledby="catalog-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2
              id="catalog-heading"
              className="font-serif text-2xl font-semibold text-foreground"
            >
              {grapeCopy.catalogHeading}
            </h2>
            {topListPath ? (
              <Link
                href={topListPath}
                className="text-sm font-medium text-wine hover:underline"
              >
                {grapeCopy.fullRanking}
              </Link>
            ) : null}
          </div>
          {wines.length === 0 ? (
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
              {grapeCopy.catalogEmpty}
            </p>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {wines.map((wine) => (
                <WineCard key={wine.id} wine={wine} minValueScore={null} />
              ))}
            </div>
          )}
        </section>

        {related.length > 0 ? (
          <section aria-labelledby="related-heading">
            <h2
              id="related-heading"
              className="font-serif text-2xl font-semibold text-foreground"
            >
              {grapeCopy.relatedHeading}
            </h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {related.map((item) => {
                const relatedCopy = item.copy[locale];
                return (
                  <li key={item.slug}>
                    <Link
                      href={localizedHref(locale, "grapeVariety", {
                        slug: item.slug,
                      })}
                      className="block rounded-2xl border border-border/70 bg-card p-5 transition-colors hover:border-wine/30 hover:bg-wine/5"
                    >
                      <p className="font-medium text-foreground">
                        {relatedCopy.name}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                        {relatedCopy.answer}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {journalArticles.length > 0 ? (
          <section aria-labelledby="journal-heading">
            <h2
              id="journal-heading"
              className="font-serif text-2xl font-semibold text-foreground"
            >
              {grapeCopy.journalHeading}
            </h2>
            <ul className="mt-6 grid gap-3">
              {journalArticles.map((article) => (
                <li key={article.slug}>
                  <Link
                    href={localizedHref(locale, "journalArticle", {
                      slug: article.slug,
                    })}
                    className="block rounded-2xl border border-border/70 bg-card p-5 transition-colors hover:border-wine/30 hover:bg-wine/5"
                  >
                    <p className="font-medium text-foreground">{article.title}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section aria-labelledby="faq-heading">
          <h2
            id="faq-heading"
            className="font-serif text-2xl font-semibold text-foreground"
          >
            {messages.common.faq}
          </h2>
          <div className="mt-6 space-y-3">
            {copy.faq.map((item) => (
              <div
                key={item.question}
                className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6"
              >
                <h3 className="font-medium text-foreground">{item.question}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </section>

        {copy.sources.length > 0 ? (
          <section aria-labelledby="sources-heading">
            <h2
              id="sources-heading"
              className="font-serif text-2xl font-semibold text-foreground"
            >
              {grapeCopy.sourcesHeading}
            </h2>
            <ul className="mt-4 max-w-3xl list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
              {copy.sources.map((source) => (
                <li key={source.label}>
                  {source.href ? (
                    <a
                      href={source.href}
                      className="text-wine hover:underline"
                      rel="noreferrer"
                    >
                      {source.label}
                    </a>
                  ) : (
                    source.label
                  )}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

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

function ProseBlock({
  id,
  title,
  body,
  visuallyHideTitle = false,
}: {
  id: string;
  title: string;
  body: string;
  visuallyHideTitle?: boolean;
}) {
  return (
    <section aria-labelledby={`${id}-heading`}>
      <h2
        id={`${id}-heading`}
        className={
          visuallyHideTitle
            ? "sr-only"
            : "font-serif text-2xl font-semibold text-foreground"
        }
      >
        {title}
      </h2>
      <p
        className={
          visuallyHideTitle
            ? "max-w-3xl text-base leading-relaxed text-muted-foreground"
            : "mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground"
        }
      >
        {body}
      </p>
    </section>
  );
}
