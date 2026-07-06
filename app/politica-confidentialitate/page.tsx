import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LEGAL } from "@/lib/legal";
import { absoluteUrl, SITE } from "@/lib/seo";

const PATH = "/politica-confidentialitate";

export const metadata: Metadata = {
  title: "Politica de confidentialitate",
  description:
    "Politica de confidentialitate VinIntel.ro: ce date colectam, de ce, cat timp le pastram si care sunt drepturile tale conform GDPR.",
  alternates: { canonical: absoluteUrl(PATH) },
  openGraph: {
    type: "article",
    locale: SITE.locale,
    url: absoluteUrl(PATH),
    siteName: SITE.name,
    title: "Politica de confidentialitate | VinIntel",
    description:
      "Informatii GDPR despre prelucrarea datelor personale pe VinIntel.ro.",
  },
  robots: { index: true, follow: true },
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell
      path={PATH}
      title="Politica de confidentialitate"
      description="Respectam confidentialitatea ta. Aici explicam ce date prelucram, in ce scop si ce drepturi ai conform Regulamentului (UE) 2016/679 (GDPR)."
    >
      <p className="text-sm text-muted-foreground">
        Ultima actualizare: {LEGAL.lastUpdated}
      </p>

      <h2>1. Cine suntem</h2>
      <p>
        Operatorul platformei {LEGAL.siteUrl} este <strong>{LEGAL.operatorName}</strong>.
        Pentru intrebari legate de datele personale ne poti contacta la{" "}
        <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
      </p>

      <h2>2. Ce date prelucram</h2>
      <p>In functie de modul in care folosesti site-ul, putem prelucra:</p>
      <ul>
        <li>
          <strong>Date tehnice:</strong> adresa IP, tip browser, dispozitiv,
          pagini vizitate, sursa traficului, timestamp-uri.
        </li>
        <li>
          <strong>Date furnizate voluntar:</strong> adresa de email (formulare,
          notificari, trimitere vin spre verificare), mesaje catre somelierul AI,
          informatii din formularele de revendicare crama.
        </li>
        <li>
          <strong>Preferinte:</strong> consimtamant cookie-uri (stocat local si
          intr-un cookie propriu).
        </li>
      </ul>
      <p>
        Nu solicitam in mod obisnuit date sensibile. Te rugam sa nu incluzi in
        chat-ul somelierului informatii medicale, financiare sau alte date
        inutile pentru recomandari de vin.
      </p>

      <h2>3. Scopuri si temei legal</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Scop</TableHead>
            <TableHead>Temei legal</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Functionarea site-ului si securitate</TableCell>
            <TableCell>Interes legitim / executarea serviciului</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Recomandari AI Sommelier si cautare vinuri</TableCell>
            <TableCell>Executarea serviciului solicitat</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Analiza traficului (Google Analytics)</TableCell>
            <TableCell>Consimtamant (dupa acceptarea cookie-urilor)</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Raspuns la formulare si notificari email</TableCell>
            <TableCell>Executarea cererii / interes legitim</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Moderare continut si prevenire abuz</TableCell>
            <TableCell>Interes legitim</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <h2>4. Cookie-uri si tehnologii similare</h2>
      <p>
        Folosim cookie-uri esentiale pentru functionarea site-ului si, doar dupa
        ce apesi <strong>Accept</strong> in banner, cookie-uri analitice. Detalii
        complete in{" "}
        <Link href="/politica-cookies">Politica de cookies</Link>.
      </p>

      <h2>5. Destinatari si transferuri</h2>
      <p>Putem apela la furnizori tehnici, de exemplu:</p>
      <ul>
        <li>hosting si infrastructura (ex. Vercel);</li>
        <li>baza de date (ex. Turso);</li>
        <li>email tranzactional (ex. Resend);</li>
        <li>analiza trafic (Google Analytics), doar cu consimtamant;</li>
        <li>servicii AI pentru somelier si continut editorial.</li>
      </ul>
      <p>
        Furnizorii proceseaza datele conform contractelor de prelucrare si, unde
        este cazul, clauzelor standard de transfer in afara SEE.
      </p>

      <h2>6. Durata stocarii</h2>
      <ul>
        <li>Consimtamant cookie-uri: pana la 12 luni sau pana la stergere manuala.</li>
        <li>Date analitice agregate: conform setarilor furnizorului.</li>
        <li>
          Email si mesaje din formulare: cat timp este necesar pentru procesarea
          cererii, apoi arhivare limitata sau stergere.
        </li>
        <li>Loguri tehnice: in general pana la 90 de zile.</li>
      </ul>

      <h2>7. Drepturile tale</h2>
      <p>Conform GDPR, ai dreptul la:</p>
      <ul>
        <li>acces la date;</li>
        <li>rectificare;</li>
        <li>stergere (&quot;dreptul de a fi uitat&quot;);</li>
        <li>restrictie a prelucrarii;</li>
        <li>portabilitate;</li>
        <li>opozitie;</li>
        <li>
          retragerea consimtamantului (fara a afecta legalitatea prelucrarii
          anterioare);
        </li>
        <li>plangere la autoritatea de supraveghere.</li>
      </ul>
      <p>
        Pentru exercitarea drepturilor scrie-ne la{" "}
        <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>. Raspundem
        in termenul legal, de regula in 30 de zile.
      </p>

      <h2>8. Autoritatea de supraveghere</h2>
      <p>
        In Romania, autoritatea competenta este{" "}
        <a
          href={LEGAL.anspdcpUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          ANSPDCP
        </a>
        .
      </p>

      <h2>9. Minori</h2>
      <p>
        VinIntel.ro se adreseaza persoanelor cu varsta de cel putin 18 ani.
        Consumul responsabil de alcool este obligatoriu. Nu colectam in mod
        intentionat date de la minori.
      </p>

      <h2>10. Modificari</h2>
      <p>
        Putem actualiza aceasta politica. Versiunea curenta este publicata pe
        aceasta pagina, cu data ultimei modificari.
      </p>
    </LegalPageShell>
  );
}
