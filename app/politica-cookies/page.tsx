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

const PATH = "/politica-cookies";

export const metadata: Metadata = {
  title: "Politica de cookies",
  description:
    "Politica de cookies VinIntel.ro: ce cookie-uri folosim, cat dureaza si cum iti gestionezi preferintele.",
  alternates: { canonical: absoluteUrl(PATH) },
  openGraph: {
    type: "article",
    locale: SITE.locale,
    url: absoluteUrl(PATH),
    siteName: SITE.name,
    title: "Politica de cookies | VinIntel",
    description:
      "Informatii despre cookie-urile folosite pe VinIntel.ro si consimtamantul tau.",
  },
  robots: { index: true, follow: true },
};

const cookieRows = [
  {
    name: "vinintel_cookie_consent",
    provider: "VinIntel",
    purpose: "Memoreaza faptul ca ai acceptat utilizarea cookie-urilor.",
    type: "Necesar / preferinte",
    duration: "12 luni",
  },
  {
    name: "_ga",
    provider: "Google Analytics",
    purpose: "Distinctie utilizatori pentru statistici agregate de trafic.",
    type: "Analitic (cu consimtamant)",
    duration: "2 ani",
  },
  {
    name: "_ga_*",
    provider: "Google Analytics",
    purpose: "Persistenta sesiune analitica Google Analytics 4.",
    type: "Analitic (cu consimtamant)",
    duration: "2 ani",
  },
  {
    name: "vinintel_admin",
    provider: "VinIntel",
    purpose: "Sesiune administrator (doar zona /admin, daca te autentifici).",
    type: "Necesar (functional)",
    duration: "Sesiune",
  },
] as const;

export default function CookiePolicyPage() {
  return (
    <LegalPageShell
      path={PATH}
      title="Politica de cookies"
      description="Explicam ce sunt cookie-urile, ce folosim pe VinIntel.ro si cum functioneaza acceptarea ta."
    >
      <p className="text-sm text-muted-foreground">
        Ultima actualizare: {LEGAL.lastUpdated}
      </p>

      <h2>1. Ce sunt cookie-urile</h2>
      <p>
        Cookie-urile sunt fisiere mici stocate in browserul tau. Ne ajuta sa
        tinem minte preferinte, sa masuram traficul si sa oferim o experienta
        mai buna pe {LEGAL.siteUrl}.
      </p>

      <h2>2. Cum iti exprimi acordul</h2>
      <p>
        La prima vizita vei vedea un banner cu informatii despre cookie-uri. Prin
        apasarea butonului <strong>Accept</strong> esti de acord cu utilizarea
        cookie-urilor descrise in aceasta politica, inclusiv cookie-urile
        analitice.
      </p>
      <p>
        Cookie-urile strict necesare pentru functionarea site-ului pot fi setate
        inainte de accept, insa Google Analytics se activeaza doar dupa accept.
      </p>

      <h2>3. Cookie-uri pe care le folosim</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cookie</TableHead>
            <TableHead>Furnizor</TableHead>
            <TableHead>Scop</TableHead>
            <TableHead>Tip</TableHead>
            <TableHead>Durata</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cookieRows.map((row) => (
            <TableRow key={row.name}>
              <TableCell className="font-mono text-xs">{row.name}</TableCell>
              <TableCell>{row.provider}</TableCell>
              <TableCell>{row.purpose}</TableCell>
              <TableCell>{row.type}</TableCell>
              <TableCell>{row.duration}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <h2>4. Google Analytics</h2>
      <p>
        Folosim Google Analytics pentru a intelege cum este folosit site-ul
        (pagini populare, surse de trafic, dispozitive). Datele sunt in general
        agregate si nu sunt folosite de noi pentru publicitate comportamentala.
      </p>
      <p>
        Serviciul este furnizat de Google. Poti citi politica Google privind
        confidentialitatea pe site-ul lor oficial.
      </p>

      <h2>5. Cum poti controla cookie-urile</h2>
      <ul>
        <li>
          Sterge cookie-urile din setarile browserului (Chrome, Firefox, Safari,
          Edge).
        </li>
        <li>
          Blocheaza cookie-terte parti din setarile browserului (Analytics nu va
          mai functiona).
        </li>
        <li>
          Daca stergi cookie-ul <code>vinintel_cookie_consent</code>, bannerul
          va aparea din nou la urmatoarea vizita.
        </li>
      </ul>

      <h2>6. Legatura cu confidentialitatea</h2>
      <p>
        Prelucrarea datelor asociate cookie-urilor este descrisa si in{" "}
        <Link href="/politica-confidentialitate">
          Politica de confidentialitate
        </Link>
        .
      </p>

      <h2>7. Contact</h2>
      <p>
        Pentru intrebari despre cookie-uri:{" "}
        <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
      </p>
    </LegalPageShell>
  );
}
