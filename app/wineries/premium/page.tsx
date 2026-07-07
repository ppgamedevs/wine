import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  Check,
  Crown,
  ImageIcon,
  Mail,
  ShieldCheck,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { PremiumContactForm } from "@/components/wineries/premium-contact-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";

const PATH = "/wineries/premium";

export const metadata: Metadata = {
  title: "Premium Profile pentru crame",
  description:
    "Profil Premium VinIntel pentru crame romanesti: banner personalizat, calendar evenimente, analytics, lead capture si prioritate in AI Sommelier. De la 99 lei/luna.",
  alternates: { canonical: absoluteUrl(PATH) },
  openGraph: {
    type: "website",
    locale: SITE.locale,
    url: absoluteUrl(PATH),
    siteName: SITE.name,
    title: "Premium Profile pentru crame | VinIntel",
    description:
      "Transforma profilul cramei tale intr-un vitrin premium pe VinIntel.ro.",
  },
};

type PlanValue = boolean | "partial" | "full";

interface ComparisonRow {
  feature: string;
  free: PlanValue;
  premium: PlanValue;
  freeNote?: string;
  premiumNote?: string;
}

const comparisonRows: ComparisonRow[] = [
  {
    feature: "Badge",
    free: "partial",
    premium: "full",
    freeNote: "Crama verificata",
    premiumNote: "Verificata + Premium",
  },
  {
    feature: "Design profil",
    free: "partial",
    premium: "full",
    freeNote: "Sablon standard",
    premiumNote: "Banner custom + layout premium",
  },
  {
    feature: "Poveste editoriala",
    free: "partial",
    premium: "full",
    freeNote: "Tagline din catalog",
    premiumNote: "Text lung personalizat",
  },
  {
    feature: "Calendar evenimente",
    free: false,
    premium: true,
  },
  {
    feature: "Analytics / Statistici",
    free: false,
    premium: true,
  },
  {
    feature: "Lead capture",
    free: false,
    premium: true,
  },
  {
    feature: "Prioritate in AI Sommelier",
    free: false,
    premium: true,
  },
  {
    feature: "Galerie poze + video",
    free: false,
    premium: true,
  },
  {
    feature: "Featured placement",
    free: false,
    premium: true,
  },
  {
    feature: "Suport prioritar",
    free: false,
    premium: true,
  },
];

const benefits = [
  {
    icon: Sparkles,
    title: "Vizibilitate unde conteaza",
    description:
      "Profilul tau apare in sectiuni featured si primeste boost in recomandarile AI Sommelier pentru ocazii si bugete relevante.",
  },
  {
    icon: BarChart3,
    title: "Decizii bazate pe date",
    description:
      "Vezi cate vizualizari, click-uri si lead-uri genereaza fiecare vin si eveniment. Stii ce functioneaza in piata romaneasca.",
  },
  {
    icon: CalendarDays,
    title: "Evenimente care aduc clienti",
    description:
      "Publica degustari, recoltari si tururi direct pe VinIntel. Utilizatorii descopera crama ta in momentul potrivit.",
  },
  {
    icon: Mail,
    title: "Lead-uri calificate",
    description:
      "Formular integrat pe profilul Premium. Primesti contacte de la oameni deja interesati de vinurile tale.",
  },
];

const testimonials = [
  {
    quote:
      "De cand am trecut pe Premium, profilul cramei primeste intrebari concrete despre vizite si degustari. Analytics-ul ne arata exact ce vinuri atrag atentia.",
    name: "Elena M.",
    role: "Director marketing, crama din Dragasani",
    initials: "EM",
  },
  {
    quote:
      "Bannerul personalizat si povestea lunga ne-au ajutat sa transmitem identitatea cramei mult mai bine decat un simplu listing. ROI-ul s-a simtit in primele 6 saptamani.",
    name: "Andrei P.",
    role: "Proprietar, podgorie din Dealu Mare",
    initials: "AP",
  },
  {
    quote:
      "Prioritatea in AI Sommelier ne-a adus recomandari in fata unor clienti care cautau vin romanesc sub un anumit buget. Exact publicul nostru tinta.",
    name: "Ioana R.",
    role: "Export manager, crama din Banat",
    initials: "IR",
  },
];

const faq: FaqEntry[] = [
  {
    question: "Pot incepe cu profilul Free (Verified)?",
    answer:
      "Da. Revendicarea si verificarea cramei sunt gratuite. Premium Profile adauga instrumente de marketing, analytics si promovare activa.",
  },
  {
    question: "Cat dureaza activarea Premium?",
    answer:
      "Dupa confirmarea platii, configuram profilul in 3-5 zile lucratoare: banner, poveste, calendar si tracking analytics.",
  },
  {
    question: "Pot trece de la plan lunar la anual?",
    answer:
      "Da, oricand. Planul anual (990 lei) include echivalentul a 2 luni gratuite fata de plata lunara.",
  },
];

function PlanCell({
  value,
  note,
  highlight = false,
}: {
  value: PlanValue;
  note?: string;
  highlight?: boolean;
}) {
  if (value === true) {
    return (
      <div className="flex flex-col items-center gap-1 sm:items-start">
        <span
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-full",
            highlight ? "bg-wine/15 text-wine" : "bg-emerald-500/10 text-emerald-700",
          )}
        >
          <Check className="h-4 w-4" aria-hidden="true" />
        </span>
        {note ? (
          <span className="text-xs text-muted-foreground">{note}</span>
        ) : null}
      </div>
    );
  }

  if (value === "partial") {
    return (
      <div className="flex flex-col items-center gap-1 sm:items-start">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10 text-amber-700">
          <Check className="h-4 w-4" aria-hidden="true" />
        </span>
        {note ? (
          <span className="text-xs text-muted-foreground">{note}</span>
        ) : (
          <span className="text-xs text-muted-foreground">Limitat</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1 sm:items-start">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <X className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="text-xs text-muted-foreground">Nu este inclus</span>
    </div>
  );
}

export default function WineryPremiumPage() {
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Acasa", path: "/" },
    { name: "Crame", path: "/crame" },
    { name: "Premium Profile", path: PATH },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} id="premium-breadcrumb" />
      <JsonLd data={buildFaqJsonLd(faq)} id="premium-faq" />
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-br from-wine/[0.08] via-background to-secondary/40">
          <div
            className="pointer-events-none absolute -right-20 top-0 h-80 w-80 rounded-full bg-wine/10 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-gold/10 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative mx-auto max-w-5xl px-6 py-16 text-center lg:py-24">
            <span className="inline-flex items-center gap-2 rounded-full border border-wine/30 bg-wine/5 px-4 py-1.5 text-sm font-medium text-wine">
              <Crown className="h-4 w-4" aria-hidden="true" />
              Pentru crame ambitioase
            </span>
            <h1 className="mt-6 font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Premium Profile
              <span className="block text-wine"> pentru crama ta</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Mergi dincolo de listing-ul standard. Banner personalizat, poveste
              editoriala, calendar de evenimente, analytics si lead-uri direct
              pe VinIntel.ro, platforma unde romanii cauta vinuri cu adevarat
              bune.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="bg-wine px-8 text-base text-wine-foreground hover:bg-wine/90"
              >
                <Link href="#contact-premium">Alege Premium</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-wine/30">
                <Link href="/claim-your-winery">Incepe cu Free (Verified)</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Comparison */}
        <section className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
          <div className="text-center">
            <h2 className="font-serif text-3xl font-semibold text-foreground sm:text-4xl">
              Free vs Premium
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Profilul verificat iti ofera incredere. Premium Profile iti
              ofera instrumentele sa transformi vizibilitatea in clienti.
            </p>
          </div>

          <div className="mt-10 hidden overflow-hidden rounded-2xl border border-border/70 md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/40 hover:bg-secondary/40">
                  <TableHead className="w-[40%] py-5 pl-6 font-serif text-base">
                    Functionalitate
                  </TableHead>
                  <TableHead className="py-5 text-center font-serif text-base">
                    <div className="flex flex-col items-center gap-1">
                      <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                      Free (Verified)
                    </div>
                  </TableHead>
                  <TableHead className="bg-wine/[0.04] py-5 text-center font-serif text-base text-wine">
                    <div className="flex flex-col items-center gap-1">
                      <Crown className="h-5 w-5" />
                      Premium
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisonRows.map((row) => (
                  <TableRow key={row.feature}>
                    <TableCell className="py-4 pl-6 font-medium text-foreground">
                      {row.feature}
                    </TableCell>
                    <TableCell className="py-4">
                      <PlanCell value={row.free} note={row.freeNote} />
                    </TableCell>
                    <TableCell className="bg-wine/[0.03] py-4">
                      <PlanCell
                        value={row.premium}
                        note={row.premiumNote}
                        highlight
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile comparison cards */}
          <div className="mt-8 grid gap-4 md:hidden">
            {comparisonRows.map((row) => (
              <Card key={row.feature} className="border-border/70">
                <CardContent className="p-4">
                  <h3 className="font-medium text-foreground">{row.feature}</h3>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Free
                      </p>
                      <div className="mt-2">
                        <PlanCell value={row.free} note={row.freeNote} />
                      </div>
                    </div>
                    <div className="rounded-lg bg-wine/[0.04] p-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-wine">
                        Premium
                      </p>
                      <div className="mt-2">
                        <PlanCell
                          value={row.premium}
                          note={row.premiumNote}
                          highlight
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section className="border-y border-border/60 bg-secondary/20">
          <div className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
            <div className="text-center">
              <h2 className="font-serif text-3xl font-semibold text-foreground sm:text-4xl">
                Preturi clare, fara surprize
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                Alege flexibilitatea lunara sau economiseste cu planul anual.
              </p>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-2 lg:gap-8">
              <Card className="border-border/70">
                <CardContent className="flex h-full flex-col p-8">
                  <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                    Lunar
                  </p>
                  <p className="mt-3 font-serif text-4xl font-bold text-foreground">
                    99 lei
                    <span className="text-lg font-normal text-muted-foreground">
                      /luna
                    </span>
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Ideal pentru testare sau sezon scurt de campanie.
                  </p>
                  <ul className="mt-6 flex-1 space-y-2 text-sm text-foreground/90">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-wine" /> Toate functiile
                      Premium
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-wine" /> Fara angajament
                      pe termen lung
                    </li>
                  </ul>
                  <Button
                    asChild
                    variant="outline"
                    className="mt-8 border-wine/30"
                  >
                    <Link href="#contact-premium">Alege plan lunar</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="relative border-wine/40 bg-gradient-to-br from-wine/[0.06] via-card to-wine/[0.04] shadow-lg ring-1 ring-wine/20">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-wine px-3 py-1 text-xs font-semibold text-wine-foreground">
                  Cel mai popular
                </span>
                <CardContent className="flex h-full flex-col p-8">
                  <p className="text-sm font-medium uppercase tracking-wide text-wine">
                    Anual
                  </p>
                  <p className="mt-3 font-serif text-4xl font-bold text-foreground">
                    990 lei
                    <span className="text-lg font-normal text-muted-foreground">
                      /an
                    </span>
                  </p>
                  <p className="mt-2 text-sm font-medium text-wine">
                    2 luni gratuite (fata de 99 x 12)
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Recomandat pentru crame care investesc constant in
                    vizibilitate si evenimente.
                  </p>
                  <ul className="mt-6 flex-1 space-y-2 text-sm text-foreground/90">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-wine" /> Economie 198 lei
                      pe an
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-wine" /> Onboarding
                      prioritar inclus
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-wine" /> Suport dedicat
                    </li>
                  </ul>
                  <Button
                    asChild
                    className="mt-8 bg-wine py-6 text-base text-wine-foreground hover:bg-wine/90"
                  >
                    <Link href="#contact-premium">Alege Premium anual</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
          <div className="text-center">
            <h2 className="font-serif text-3xl font-semibold text-foreground sm:text-4xl">
              De ce merita Premium
            </h2>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <Card
                  key={benefit.title}
                  className="border-border/70 transition-colors hover:border-wine/30"
                >
                  <CardContent className="p-6">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-wine/25 bg-wine/5 text-wine">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-4 font-serif text-xl font-semibold text-foreground">
                      {benefit.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {benefit.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[ImageIcon, Crown, Star].map((Icon, index) => (
              <div
                key={index}
                className="flex items-center gap-3 rounded-xl border border-dashed border-wine/20 bg-wine/[0.03] px-4 py-3 text-sm text-muted-foreground"
              >
                <Icon className="h-4 w-4 shrink-0 text-wine" aria-hidden="true" />
                {index === 0
                  ? "Galerie foto si video pe profil"
                  : index === 1
                    ? "Badge Premium vizibil pe toate vinurile"
                    : "Featured in catalog si topuri"}
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section className="border-t border-border/60 bg-secondary/20">
          <div className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
            <div className="text-center">
              <h2 className="font-serif text-3xl font-semibold text-foreground sm:text-4xl">
                Ce spun producatorii
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Testimoniale reprezentative (placeholder).
              </p>
            </div>
            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {testimonials.map((item) => (
                <Card key={item.name} className="border-border/70 bg-card">
                  <CardContent className="flex h-full flex-col p-6">
                    <div className="flex gap-1 text-gold">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className="h-4 w-4 fill-current"
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                    <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-foreground/90">
                      &ldquo;{item.quote}&rdquo;
                    </blockquote>
                    <div className="mt-6 flex items-center gap-3 border-t border-border/60 pt-4">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-wine/10 text-sm font-semibold text-wine">
                        {item.initials}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.role}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ + Contact */}
        <section className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div>
              <h2 className="font-serif text-2xl font-semibold text-foreground">
                Intrebari frecvente
              </h2>
              <dl className="mt-6 space-y-6">
                {faq.map((item) => (
                  <div key={item.question}>
                    <dt className="font-medium text-foreground">
                      {item.question}
                    </dt>
                    <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {item.answer}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-8 text-sm text-muted-foreground">
                Ai deja profil verificat?{" "}
                <Link href="/crame" className="text-wine hover:underline">
                  Vezi cramele din catalog
                </Link>
                .
              </p>
            </div>
            <PremiumContactForm />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
