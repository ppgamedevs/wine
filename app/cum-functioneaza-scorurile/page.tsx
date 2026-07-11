import type { Metadata } from "next";
import {
  Award,
  BookOpen,
  Gift,
  Scale,
  Sparkles,
  TrendingUp,
  Utensils,
} from "lucide-react";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  absoluteUrl,
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  SITE,
  type FaqEntry,
} from "@/lib/seo";
import { VALUE_SCORE_BANDS } from "@/lib/value-score-thresholds";

const PATH = "/cum-functioneaza-scorurile";

export const metadata: Metadata = {
  title: "Cum functioneaza scorurile",
  description:
    "Metodologia transparenta din spatele scorurilor VinIntel: Value Score, Gift Score si Food Match. Cum calculam raportul calitate-pret pentru vinurile romanesti.",
  alternates: { canonical: absoluteUrl(PATH) },
  openGraph: {
    type: "article",
    locale: SITE.locale,
    url: absoluteUrl(PATH),
    siteName: SITE.name,
    title: "Cum functioneaza scorurile | VinIntel",
    description:
      "Metodologia transparenta din spatele scorurilor VinIntel pentru vinurile romanesti.",
  },
};

const scores = [
  {
    icon: Scale,
    name: "Value Score",
    range: "0 - 100",
    summary:
      "Cat de bun este raportul calitate-pret. Cel mai important scor de pe platforma.",
    factors: [
      "Calitate intrinseca estimata (Q): note, medalii validate, regiune, cramă, vintage",
      "Eficienta pretului fata de vinuri similare la acel pret (70 = nivel obisnuit al segmentului)",
      "Combinatie 72% calitate + 28% eficienta pret, cu plafon legat de Q real",
    ],
  },
  {
    icon: Gift,
    name: "Gift Score",
    range: "0 - 100",
    summary:
      "Cat de potrivit este vinul ca si cadou: prestigiu, prezentare si efect garantat.",
    factors: [
      "Recunoasterea numelui si a cramei",
      "Eticheta, ambalaj si aspectul premium",
      "Siguranta ca place majoritatii (stil accesibil, echilibrat)",
    ],
  },
  {
    icon: Utensils,
    name: "Food Match",
    range: "0 - 100",
    summary:
      "Cat de versatil este vinul la masa romaneasca: sarmale, mititei, tochitura si altele.",
    factors: [
      "Aciditate, taninuri, corp si dulceata raportate la mancare",
      "Compatibilitatea cu bucataria romaneasca specifica",
      "Versatilitatea pe mai multe feluri de mancare",
    ],
  },
];

const indicators = [
  {
    icon: BookOpen,
    name: "Prietenos cu incepatorii",
    description:
      "Marcheaza vinurile usor de apreciat, fara note dificile sau taninuri agresive.",
  },
  {
    icon: TrendingUp,
    name: "Potential de invechire",
    description:
      "Estimam cati ani mai poate evolua favorabil un vin in conditii corecte de pastrare.",
  },
  {
    icon: Award,
    name: "Risc de supraevaluare",
    description:
      "Semnalam vinurile al caror pret pare mai mare decat valoarea reala din pahar.",
  },
];

const faq: FaqEntry[] = [
  {
    question: "Cum este calculat Value Score?",
    answer:
      "Value Score combina calitatea intrinseca (Q) cu eficienta pretului. Q estimeaza cat de bun este vinul fara a folosi pretul. Eficienta pretului masoara cat de bine se pozitioneaza fata de nivelul obisnuit al segmentului sau la acel pret. Rezultatul final este 72% Q + 28% eficienta pret.",
  },
  {
    question: "Sunt scorurile influentate de bani sau de crame?",
    answer:
      "Nu. Scorurile sunt independente. Cramele isi pot revendica profilul pentru a corecta date factuale (pret, vintage, specificatii), dar nu pot cumpara sau modifica scorurile. Metodologia este aceeasi pentru toate vinurile.",
  },
  {
    question: "Cat de des sunt actualizate scorurile?",
    answer:
      "Recalculam scorurile periodic, pe masura ce apar preturi noi, recenzii si vintage-uri. Istoricul valorii este pastrat pentru a urmari evolutia in timp.",
  },
  {
    question: "Ce inseamna un scor sub 50?",
    answer:
      "Un scor sub 50 nu inseamna ca vinul este slab, ci ca, la pretul actual, exista alternative cu un raport calitate-pret mai bun. Pentru ocazii speciale, Gift Score si Food Match pot conta mai mult decat Value Score.",
  },
];

export default function ScoringMethodologyPage() {
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Acasa", path: "/" },
    { name: "Cum functioneaza scorurile", path: PATH },
  ]);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Cum functioneaza scorurile VinIntel",
    description: metadata.description,
    inLanguage: SITE.language,
    mainEntityOfPage: absoluteUrl(PATH),
    author: { "@type": "Organization", name: SITE.name },
    publisher: {
      "@type": "Organization",
      name: SITE.name,
      logo: { "@type": "ImageObject", url: absoluteUrl("/icon.svg") },
    },
  };

  return (
    <>
      <JsonLd
        data={[articleJsonLd, breadcrumbJsonLd, buildFaqJsonLd(faq)]}
        id="methodology"
      />
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-secondary/20">
          <div className="mx-auto max-w-4xl px-6 py-14 text-center lg:py-20">
            <span className="inline-flex items-center gap-2 rounded-full border border-wine/30 bg-wine/5 px-4 py-1.5 text-sm font-medium text-wine">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Metodologie transparenta
            </span>
            <h1 className="mt-5 font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Cum functioneaza scorurile VinIntel
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Credem in evaluari clare si oneste. Iata exact ce masuram, cum
              calculam fiecare scor si de ce poti avea incredere in
              recomandarile noastre.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-4xl space-y-16 px-6 py-14">
          <section aria-labelledby="scores-heading">
            <h2
              id="scores-heading"
              className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
            >
              Cele trei scoruri principale
            </h2>
            <p className="mt-3 text-muted-foreground">
              Fiecare vin primeste trei scoruri de la 0 la 100, ca sa stii rapid
              daca merita banii, daca este un cadou bun si cum se descurca la
              masa.
            </p>

            <div className="mt-8 space-y-5">
              {scores.map((score) => (
                <div
                  key={score.name}
                  className="rounded-2xl border border-border/70 bg-card p-6 sm:p-8"
                >
                  <div className="flex items-start gap-4">
                    <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-wine/10 text-wine">
                      <score.icon className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="font-serif text-xl font-semibold text-foreground">
                          {score.name}
                        </h3>
                        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                          {score.range}
                        </span>
                      </div>
                      <p className="mt-2 text-muted-foreground">
                        {score.summary}
                      </p>
                      <ul className="mt-4 space-y-2">
                        {score.factors.map((factor) => (
                          <li
                            key={factor}
                            className="flex gap-2.5 text-sm text-muted-foreground"
                          >
                            <span
                              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-wine"
                              aria-hidden="true"
                            />
                            {factor}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="scale-heading">
            <h2
              id="scale-heading"
              className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
            >
              Cum se citeste scara de scoruri
            </h2>
            <div className="mt-6 overflow-hidden rounded-2xl border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Scor</TableHead>
                    <TableHead>Interpretare</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {VALUE_SCORE_BANDS.map((band) => (
                    <TableRow key={band.label}>
                      <TableCell className="font-semibold text-foreground">
                        {band.min === 0
                          ? `sub ${band.max + 1}`
                          : `${band.min} - ${band.max}`}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {band.label}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>

          <section aria-labelledby="indicators-heading">
            <h2
              id="indicators-heading"
              className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
            >
              Indicatori aditionali
            </h2>
            <p className="mt-3 text-muted-foreground">
              Pe langa cele trei scoruri, adaugam cateva semnale care te ajuta sa
              alegi mai usor.
            </p>
            <div className="mt-8 grid gap-5 sm:grid-cols-3">
              {indicators.map((indicator) => (
                <div
                  key={indicator.name}
                  className="rounded-2xl border border-border/70 bg-card p-6"
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-wine/10 text-wine">
                    <indicator.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-medium text-foreground">
                    {indicator.name}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {indicator.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section
            aria-labelledby="trust-heading"
            className="rounded-3xl border border-wine/20 bg-wine/5 p-8 sm:p-10"
          >
            <h2
              id="trust-heading"
              className="font-serif text-2xl font-semibold text-foreground"
            >
              Independenta editoriala
            </h2>
            <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
              Scorurile nu pot fi cumparate. Cramele isi pot revendica profilul
              pentru a corecta date factuale, dar metodologia ramane aceeasi
              pentru toate vinurile. Unele linkuri catre magazine pot fi
              afiliate, insa acest lucru nu influenteaza in niciun fel scorurile.
            </p>
          </section>

          <section aria-labelledby="faq-heading">
            <h2
              id="faq-heading"
              className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
            >
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

          <section className="flex flex-col items-center gap-4 text-center">
            <h2 className="font-serif text-2xl font-semibold text-foreground">
              Gata sa gasesti vinul potrivit?
            </h2>
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="bg-wine text-wine-foreground hover:bg-wine/90"
              >
                <Link href="/ai-sommelier">Incearca AI Sommelier</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/topuri/vinuri-sub-100-lei">Vezi topurile</Link>
              </Button>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
