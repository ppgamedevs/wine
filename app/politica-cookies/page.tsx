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
import { localizedHref } from "@/i18n/paths";
import {
  getContentLocale,
  getContentTranslator,
  localizedDate,
} from "@/lib/i18n/content";
import { LEGAL } from "@/lib/legal";
import { absoluteUrl, SITE } from "@/lib/seo";
import { localizedRobots } from "@/lib/i18n/indexing";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getContentLocale();
  const t = getContentTranslator(locale);
  const href = localizedHref(locale, "cookiePolicy");

  return {
    title: t("Cookies.metadata.title"),
    description: t("Cookies.metadata.description"),
    alternates: {
      canonical: absoluteUrl(href),
      languages: {
        ro: absoluteUrl(localizedHref("ro", "cookiePolicy")),
        en: absoluteUrl(localizedHref("en", "cookiePolicy")),
        "x-default": absoluteUrl(localizedHref("ro", "cookiePolicy")),
      },
    },
    openGraph: {
      type: "article",
      locale: locale === "en" ? "en_US" : SITE.locale,
      url: absoluteUrl(href),
      siteName: SITE.name,
      title: `${t("Cookies.metadata.title")} | VinIntel`,
      description: t("Cookies.metadata.ogDescription"),
    },
    robots: localizedRobots(locale),
  };
}

export default async function CookiePolicyPage() {
  const locale = await getContentLocale();
  const t = getContentTranslator(locale);
  const path = localizedHref(locale, "cookiePolicy");
  const cookieRows = [
    {
      name: "vinintel_cookie_consent",
      provider: "VinIntel",
      purpose: t("Cookies.sections.consentPurpose"),
      type: t("Cookies.sections.consentType"),
      duration: t("Cookies.sections.twelveMonths"),
    },
    {
      name: "_ga",
      provider: "Google Analytics",
      purpose: t("Cookies.sections.gaPurpose"),
      type: t("Cookies.sections.analyticsType"),
      duration: t("Cookies.sections.twoYears"),
    },
    {
      name: "_ga_*",
      provider: "Google Analytics",
      purpose: t("Cookies.sections.gaSessionPurpose"),
      type: t("Cookies.sections.analyticsType"),
      duration: t("Cookies.sections.twoYears"),
    },
    {
      name: "vinintel_admin",
      provider: "VinIntel",
      purpose: t("Cookies.sections.adminPurpose"),
      type: t("Cookies.sections.functionalType"),
      duration: t("Cookies.sections.session"),
    },
  ];

  return (
    <LegalPageShell
      path={path}
      title={t("Cookies.title")}
      description={t("Cookies.description")}
    >
      <p className="text-sm text-muted-foreground">
        {t("Cookies.lastUpdated", {
          date:
            locale === "ro"
              ? LEGAL.lastUpdated
              : localizedDate("2026-07-06", locale),
        })}
      </p>

      <h2>{t("Cookies.sections.whatTitle")}</h2>
      <p>{t("Cookies.sections.what", { siteUrl: LEGAL.siteUrl })}</p>

      <h2>{t("Cookies.sections.consentTitle")}</h2>
      <p>{t("Cookies.sections.consent")}</p>
      <p>{t("Cookies.sections.essential")}</p>

      <h2>{t("Cookies.sections.listTitle")}</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("Cookies.sections.cookieHead")}</TableHead>
            <TableHead>{t("Cookies.sections.providerHead")}</TableHead>
            <TableHead>{t("Cookies.sections.purposeHead")}</TableHead>
            <TableHead>{t("Cookies.sections.typeHead")}</TableHead>
            <TableHead>{t("Cookies.sections.durationHead")}</TableHead>
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

      <h2>{t("Cookies.sections.analyticsTitle")}</h2>
      <p>{t("Cookies.sections.analytics")}</p>
      <p>{t("Cookies.sections.google")}</p>

      <h2>{t("Cookies.sections.controlTitle")}</h2>
      <ul>
        <li>{t("Cookies.sections.controlDelete")}</li>
        <li>{t("Cookies.sections.controlBlock")}</li>
        <li>
          {t("Cookies.sections.controlConsentBefore")}{" "}
          <code>vinintel_cookie_consent</code>{" "}
          {t("Cookies.sections.controlConsentAfter")}
        </li>
      </ul>

      <h2>{t("Cookies.sections.privacyTitle")}</h2>
      <p>
        {t("Cookies.sections.privacyBefore")}{" "}
        <Link href={localizedHref(locale, "privacyPolicy")}>
          {t("Cookies.sections.privacyLink")}
        </Link>
        .
      </p>

      <h2>{t("Cookies.sections.contactTitle")}</h2>
      <p>
        {t("Cookies.sections.contact")}{" "}
        <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
      </p>
    </LegalPageShell>
  );
}
