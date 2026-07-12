import type { Metadata } from "next";
import { Building2, Search, Wine } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SmartSearch } from "@/components/smart-search";
import { WineCard } from "@/components/wine-card";
import { Button } from "@/components/ui/button";
import { searchCatalog } from "@/lib/queries";
import { isSommelierQuery, sommelierQueryHref } from "@/lib/search-intent";
import { absoluteUrl, SITE } from "@/lib/seo";

export const revalidate = 300;

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const title = query
    ? `Rezultate pentru "${query}"`
    : "Cauta vinuri si crame";

  return {
    title,
    description:
      "Cauta vinuri si crame romanesti in catalogul VinIntel. Verifica daca un vin exista deja pe site.",
    alternates: { canonical: absoluteUrl("/cauta") },
    openGraph: {
      type: "website",
      locale: SITE.locale,
      url: absoluteUrl("/cauta"),
      siteName: SITE.name,
      title: `${title} | VinIntel`,
    },
    robots: query ? { index: false, follow: true } : undefined,
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const hasQuery = query.length >= 2;

  if (hasQuery && isSommelierQuery(query)) {
    redirect(sommelierQueryHref(query));
  }

  const results = hasQuery ? await searchCatalog(query) : null;
  const totalResults =
    (results?.wines.length ?? 0) + (results?.wineries.length ?? 0);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-secondary/20">
          <div className="mx-auto max-w-4xl px-6 py-12 text-center lg:py-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-wine/30 bg-wine/5 px-4 py-1.5 text-sm font-medium text-wine">
              <Search className="h-4 w-4" aria-hidden="true" />
              Cautare catalog
            </span>
            <h1 className="mt-5 font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              {hasQuery ? `Rezultate pentru „${query}”` : "Cauta in VinIntel"}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Verifica daca un vin sau o crama exista deja in catalog. Pentru
              link-uri de produs, foloseste{" "}
              <Link href="/adauga-vin" className="text-wine underline-offset-4 hover:underline">
                Adauga vin
              </Link>
              .
            </p>
            <div className="mx-auto mt-8 max-w-2xl text-left">
              <SmartSearch enableLinkAnalysis={false} />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 py-10">
          {!hasQuery ? (
            <p className="text-center text-muted-foreground">
              Scrie numele unui vin, al unei crame sau al unui soi, apoi apasa
              Cauta.
            </p>
          ) : totalResults === 0 ? (
            <div className="rounded-2xl border border-border/70 bg-card px-6 py-10 text-center">
              <p className="font-serif text-2xl font-semibold text-foreground">
                Nu am gasit „{query}” in catalog
              </p>
              <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
                Vinul nu pare sa fie inca pe VinIntel. Poti adauga un link de
                produs (eMag, site crama) si il verificam.
              </p>
              <Button asChild className="mt-6 bg-wine text-wine-foreground">
                <Link href="/adauga-vin">Adauga vin prin link</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-10">
              {results!.wineries.length > 0 ? (
                <div>
                  <h2 className="mb-4 flex items-center gap-2 font-serif text-2xl font-semibold text-foreground">
                    <Building2 className="h-5 w-5 text-wine" aria-hidden="true" />
                    Crame ({results!.wineries.length})
                  </h2>
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {results!.wineries.map((winery) => (
                      <li key={winery.slug}>
                        <Link
                          href={`/wineries/${winery.slug}`}
                          className="flex items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 transition-colors hover:border-wine/30 hover:bg-wine/5"
                        >
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gold/15 text-gold">
                            <Building2 className="h-5 w-5" aria-hidden="true" />
                          </span>
                          <span className="font-medium text-foreground">{winery.name}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {results!.wines.length > 0 ? (
                <div>
                  <h2 className="mb-4 flex items-center gap-2 font-serif text-2xl font-semibold text-foreground">
                    <Wine className="h-5 w-5 text-wine" aria-hidden="true" />
                    Vinuri ({results!.wines.length})
                  </h2>
                  <div className="grid gap-5 sm:grid-cols-2">
                    {results!.wines.map((wine, index) => (
                      <WineCard key={wine.slug} wine={wine} priority={index < 2} />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
