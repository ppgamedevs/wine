import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { buildSub50Study2026 } from "@/lib/data-insights";
import { formatRon } from "@/lib/format";
import { getWinesForSommelier } from "@/lib/queries";
import {
  absoluteUrl,
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  SITE,
  type FaqEntry,
} from "@/lib/seo";

export const revalidate = 86400;

const STUDY_SLUG = "cele-mai-bune-vinuri-sub-50-lei-2026";

interface StudiiPageProps {
  params: Promise<{ slug: string }>;
}

function buildStudyFaq(data: ReturnType<typeof buildSub50Study2026>): FaqEntry[] {
  const top = data.top50[0];
  return [
    {
      question: "Care este cel mai bun vin romanesc sub 50 lei in 2026?",
      answer: top
        ? `${top.name} de la ${top.winery?.name ?? "crama necunoscuta"} conduce cu Value Score ${top.valueScore ?? "N/A"}/100 la ${formatRon(top.priceAvg)}.`
        : "Actualizam studiul periodic pe masura ce apar vinuri noi in catalog.",
    },
    {
      question: "Cate vinuri sub 50 lei sunt in studiu?",
      answer: `Am analizat ${data.totalWinesAnalyzed} vinuri in catalog; ${data.winesUnder50} au pret sub 50 lei.`,
    },
    {
      question: "Cum calculati Value Score?",
      answer:
        "Value Score combina calitatea estimata, pretul in RON, disponibilitatea si semnale de piata. Detalii pe pagina Cum functioneaza scorurile.",
    },
  ];
}

export async function generateStaticParams() {
  return [{ slug: STUDY_SLUG }];
}

export async function generateMetadata({ params }: StudiiPageProps): Promise<Metadata> {
  const { slug } = await params;
  if (slug !== STUDY_SLUG) return { title: "Studiu negasit" };

  const title = "Cele mai bune vinuri romanesti sub 50 lei in 2026";
  const description =
    "Studiu VinIntel: pret mediu, Value Score si top 50 vinuri ieftine si bune din Romania, actualizat din catalog.";
  const url = absoluteUrl(`/studii/${slug}`);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      locale: SITE.locale,
      url,
      siteName: SITE.name,
      title: `${title} | VinIntel`,
      description,
    },
  };
}

export default async function StudiiPage({ params }: StudiiPageProps) {
  const { slug } = await params;
  if (slug !== STUDY_SLUG) notFound();

  const allWines = await getWinesForSommelier();
  const study = buildSub50Study2026(allWines);
  const faq = buildStudyFaq(study);
  const updatedLabel = new Date(study.generatedAt).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Cele mai bune vinuri romanesti sub 50 lei in 2026",
    datePublished: "2026-01-01",
    dateModified: study.generatedAt,
    author: { "@type": "Organization", name: "VinIntel" },
    publisher: { "@type": "Organization", name: "VinIntel", url: SITE.url },
    mainEntityOfPage: absoluteUrl(`/studii/${slug}`),
  };

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Acasa", path: "/" },
    { name: "Studii", path: `/studii/${slug}` },
  ]);

  return (
    <>
      <JsonLd data={[articleJsonLd, breadcrumbJsonLd, buildFaqJsonLd(faq)]} id="studii" />
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-secondary/20">
          <div className="mx-auto max-w-5xl px-6 py-12 sm:py-14">
            <nav
              aria-label="Breadcrumb"
              className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"
            >
              <Link href="/" className="hover:text-wine">
                Acasa
              </Link>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="text-foreground">Studiu 2026</span>
            </nav>
            <h1 className="font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Cele mai bune vinuri romanesti sub 50 lei in 2026
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Analiza VinIntel pe {study.totalWinesAnalyzed} vinuri din catalog: pret mediu,
              Value Score si top 50 optiuni ieftine si bune.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Actualizat la {updatedLabel}
            </p>
            <p className="mt-4">
              <Link
                href="/topuri/vinuri-sub-50-lei"
                className="font-medium text-wine hover:underline"
              >
                Vezi topul interactiv sub 50 lei
              </Link>
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-5xl space-y-14 px-6 py-12">
          <section aria-labelledby="stats-heading">
            <h2 id="stats-heading" className="font-serif text-2xl font-semibold text-foreground">
              Rezumat date
            </h2>
            <div className="mt-6 overflow-x-auto rounded-2xl border border-border/70">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="border-b border-border/70 bg-secondary/30">
                  <tr>
                    <th className="px-4 py-3 font-medium">Indicator</th>
                    <th className="px-4 py-3 font-medium">Valoare</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="px-4 py-3">Vinuri sub 50 lei</td>
                    <td className="px-4 py-3 font-medium">{study.winesUnder50}</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="px-4 py-3">Pret mediu sub 50 lei</td>
                    <td className="px-4 py-3 font-medium">{formatRon(study.avgPriceUnder50)}</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="px-4 py-3">Value Score mediu (recomandate)</td>
                    <td className="px-4 py-3 font-medium">{study.avgValueScoreUnder50}/100</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="top-table-heading">
            <h2 id="top-table-heading" className="font-serif text-2xl font-semibold text-foreground">
              Top 50 vinuri sub 50 lei
            </h2>
            <div className="mt-6 overflow-x-auto rounded-2xl border border-border/70">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-border/70 bg-secondary/30">
                  <tr>
                    <th className="px-4 py-3 font-medium">#</th>
                    <th className="px-4 py-3 font-medium">Vin</th>
                    <th className="px-4 py-3 font-medium">Crama</th>
                    <th className="px-4 py-3 font-medium">Pret</th>
                    <th className="px-4 py-3 font-medium">Value Score</th>
                  </tr>
                </thead>
                <tbody>
                  {study.top50.map((wine, index) => (
                    <tr key={wine.id} className="border-b border-border/50">
                      <td className="px-4 py-3">{index + 1}</td>
                      <td className="px-4 py-3">
                        <Link href={`/wines/${wine.slug}`} className="text-wine hover:underline">
                          {wine.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{wine.winery?.name ?? "—"}</td>
                      <td className="px-4 py-3">{formatRon(wine.priceAvg)}</td>
                      <td className="px-4 py-3">{wine.valueScore ?? "—"}/100</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="faq-heading">
            <h2 id="faq-heading" className="font-serif text-2xl font-semibold text-foreground">
              Intrebari frecvente
            </h2>
            <div className="mt-6 space-y-3">
              {faq.map((item) => (
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
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
