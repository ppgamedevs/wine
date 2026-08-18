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
import { CONFIDENCE_SCORE_CEILINGS } from "@/lib/scoring-v2/constants";
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
  twitter: {
    card: "summary_large_image",
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
      "Cat de sigura si convingatoare este sticla ca alegere de cadou, in general.",
    factors: [
      "Calitate estimata si increderea in date",
      "Value Score ca semnal secundar, nu pret-ca-prestigiu",
      "Identitate distinctiva documentata. Nu evaluam ambalajul.",
    ],
  },
  {
    icon: Utensils,
    name: "Versatilitate la masa",
    range: "0 - 100",
    summary:
      "Cat de versatil este vinul la masa, in general. Nu inseamna compatibilitate cu un fel anume.",
    factors: [
      "Latimea categoriilor de pairing structurate",
      "Asocieri culinare de la producator, cand exista",
      "Utilitate generica de stil, cu incredere mica daca lipsesc fapte",
    ],
  },
];

/**
 * Etichetele trebuie sa corespunda exact pragurilor (`minConfidencePercent`)
 * folosite de `confidenceLabel()` din `lib/scoring-v2/quality-confidence.ts`,
 * ca pagina publica sa nu contrazica logica reala de calcul.
 */
const CONFIDENCE_LABELS: Record<number, string> = {
  85: "Incredere foarte ridicata",
  70: "Incredere ridicata",
  50: "Incredere moderata",
  30: "Incredere scazuta",
  0: "Date insuficiente",
};

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
      "Un scor sub 50 nu inseamna ca vinul este slab, ci ca, la pretul actual, exista alternative cu un raport calitate-pret mai bun. Pentru ocazii, Gift Score si versatilitatea la masa pot conta mai mult decat Value Score.",
  },
  {
    question: "De ce un vin cu date insuficiente nu poate avea scor foarte mare?",
    answer:
      "Increderea datelor este calculata separat de scor si limiteaza plafonul maxim posibil. Un vin fara producator, regiune, soi sau medalii confirmate primeste automat incredere scazuta, iar scorul sau este plafonat (de exemplu maxim 69/100 pentru date insuficiente) si marcat ca provizoriu. Lipsa de date nu poate niciodata sa produca un scor exceptional.",
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

          <section aria-labelledby="confidence-heading">
            <h2
              id="confidence-heading"
              className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
            >
              Increderea datelor, separat de scor
            </h2>
            <p className="mt-3 text-muted-foreground">
              Value Score arata cat de buna e valoarea la pretul curent, dar nu
              spune cat de solide sunt datele din spatele lui. De aceea calculam
              separat un procent de <strong>incredere (0-100%)</strong>, afisat
              alaturi de scor, niciodata combinat intr-un singur numar. Un vin
              cu date sarace (fara producator, regiune, soi, medalii sau note
              verificate) primeste automat o incredere scazuta.
            </p>
            <p className="mt-3 text-muted-foreground">
              Increderea scazuta reduce plafonul maxim al scorului, indiferent
              cat de bine ar iesi calculul de calitate estimata. Practic, un vin
              cu date insuficiente <strong>nu poate ajunge la un scor de 90+</strong>
              doar pentru ca lipsesc informatii, pentru ca lipsa de date nu este
              un semnal pozitiv. Cand increderea este sub pragul de scor
              provizoriu, marcam scorul explicit ca <strong>provizoriu</strong> pe
              pagina vinului.
            </p>
            <div className="mt-6 overflow-hidden rounded-2xl border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-48">Incredere date</TableHead>
                    <TableHead>Scor maxim posibil</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {CONFIDENCE_SCORE_CEILINGS.map((tier) => (
                    <TableRow key={tier.minConfidencePercent}>
                      <TableCell className="font-semibold text-foreground">
                        {CONFIDENCE_LABELS[tier.minConfidencePercent] ??
                          `${tier.minConfidencePercent}%+`}{" "}
                        <span className="text-muted-foreground font-normal">
                          ({tier.minConfidencePercent}%
                          {tier.minConfidencePercent === 85 ? "+" : "-..."})
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {tier.maxScore === 97 ? "Fara plafon suplimentar" : `Maxim ${tier.maxScore}/100`}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Increderea creste odata cu numarul de campuri fiabile disponibile:
              soi, regiune, crama, medalii verificate, scoruri de critic, note
              de degustare confirmate si prospetimea pretului observat. Un
              override manual de scor din admin este intotdeauna vizibil,
              motivat si auditat separat, niciodata silentios.
            </p>
          </section>

          <section
            id="verificarea-datelor"
            aria-labelledby="verification-heading"
            className="scroll-mt-24"
          >
            <h2
              id="verification-heading"
              className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
            >
              Cum verificăm datele despre vin
            </h2>
            <div className="mt-3 max-w-3xl space-y-3 leading-relaxed text-muted-foreground">
              <p>
                Pentru alcool, aciditate, zahăr și alte date tehnice căutăm
                surse oficiale ale producătorului. Fișa tehnică este sursa cea
                mai puternică, iar o pagină sau un catalog oficial poate
                confirma un fapt când identifică exact vinul.
              </p>
              <p>
                O valoare este marcată <strong>Verificat</strong> doar când
                sursa poate fi legată de vinul și, unde este cazul, de recolta
                corectă. Informațiile comercianților nu confirmă automat datele
                de laborator.
              </p>
              <p>
                Dacă nu avem încă dovada necesară, valoarea poate rămâne
                vizibilă în catalog cu mențiunea{" "}
                <strong>Sursă oficială neconfirmată</strong>. Datele lipsă rămân
                lipsă, iar verificarea faptelor este separată de calculul
                scorurilor.
              </p>
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
