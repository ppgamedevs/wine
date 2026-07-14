import type { Metadata } from "next";
import { Link2 } from "lucide-react";
import { SmartSearch } from "@/components/smart-search";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { absoluteUrl, SITE } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Adauga un vin romanesc",
  description:
    "Lipeste link-ul unui vin romanesc. VinIntel il analizeaza, genereaza scoruri si il adauga in baza de date pentru comunitate.",
  alternates: { canonical: absoluteUrl("/adauga-vin") },
  openGraph: {
    type: "website",
    locale: SITE.locale,
    url: absoluteUrl("/adauga-vin"),
    siteName: SITE.name,
    title: "Adauga un vin romanesc | VinIntel",
    description:
      "Flywheel comunitate: link, analiza AI, scoruri si pagina de vin in cateva secunde.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Adauga un vin romanesc | VinIntel",
    description:
      "Flywheel comunitate: link, analiza AI, scoruri si pagina de vin in cateva secunde.",
  },
};

export default function AddWinePage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 py-16 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-wine/20 bg-wine/5 px-4 py-1.5 text-sm font-medium text-wine">
            <Link2 className="h-4 w-4" aria-hidden="true" />
            Flywheel comunitate VinIntel
          </span>
          <h1 className="mt-6 font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Adauga un vin romanesc
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Lipeste link-ul produsului. Analizam pagina, generam scoruri si
            explicatii, apoi echipa VinIntel verifica vinul inainte de
            publicare.
          </p>
          <div className="mt-10 text-left">
            <SmartSearch
              placeholder="https://www.emag.ro/... sau link Profitshare / crama"
            />
          </div>
          <ol className="mt-10 space-y-3 text-left text-sm text-muted-foreground">
            <li>1. Verificam daca vinul exista deja in baza VinIntel.</li>
            <li>2. Extragem date factuale din pagina sursa.</li>
            <li>3. Generam analiza editoriala si scorurile Value / Gift / Food.</li>
            <li>
              4. Vinul este trimis spre verificare si apare pe site dupa
              aprobare.
            </li>
          </ol>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
