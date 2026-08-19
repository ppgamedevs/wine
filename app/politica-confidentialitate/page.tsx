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
  const href = localizedHref(locale, "privacyPolicy");

  return {
    title: t("Privacy.metadata.title"),
    description: t("Privacy.metadata.description"),
    alternates: {
      canonical: absoluteUrl(href),
      languages: {
        ro: absoluteUrl(localizedHref("ro", "privacyPolicy")),
        en: absoluteUrl(localizedHref("en", "privacyPolicy")),
        "x-default": absoluteUrl(localizedHref("ro", "privacyPolicy")),
      },
    },
    openGraph: {
      type: "article",
      locale: locale === "en" ? "en_US" : SITE.locale,
      url: absoluteUrl(href),
      siteName: SITE.name,
      title: `${t("Privacy.metadata.title")} | VinIntel`,
      description: t("Privacy.metadata.ogDescription"),
    },
    robots: localizedRobots(locale),
  };
}

export default async function PrivacyPolicyPage() {
  const locale = await getContentLocale();
  const t = getContentTranslator(locale);
  const path = localizedHref(locale, "privacyPolicy");

  return (
    <LegalPageShell
      path={path}
      title={t("Privacy.title")}
      description={t("Privacy.description")}
    >
      <p className="text-sm text-muted-foreground">
        {t("Privacy.lastUpdated", {
          date:
            locale === "ro"
              ? LEGAL.lastUpdated
              : localizedDate("2026-07-06", locale),
        })}
      </p>

      <h2>{t("Privacy.sections.identityTitle")}</h2>
      <p>
        {t("Privacy.sections.identityBefore", { siteUrl: LEGAL.siteUrl })}{" "}
        <strong>{LEGAL.operatorName}</strong>.{" "}
        {t("Privacy.sections.identityAfter")}{" "}
        <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
      </p>

      <h2>{t("Privacy.sections.dataTitle")}</h2>
      <p>{t("Privacy.sections.dataIntro")}</p>
      <ul>
        <li>
          <strong>{t("Privacy.sections.technicalLabel")}</strong>{" "}
          {t("Privacy.sections.technical")}
        </li>
        <li>
          <strong>{t("Privacy.sections.voluntaryLabel")}</strong>{" "}
          {t("Privacy.sections.voluntary")}
        </li>
        <li>
          <strong>{t("Privacy.sections.preferencesLabel")}</strong>{" "}
          {t("Privacy.sections.preferences")}
        </li>
      </ul>
      <p>{t("Privacy.sections.sensitive")}</p>

      <h2>{t("Privacy.sections.purposesTitle")}</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("Privacy.sections.purposeHead")}</TableHead>
            <TableHead>{t("Privacy.sections.basisHead")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>{t("Privacy.sections.purposeSite")}</TableCell>
            <TableCell>{t("Privacy.sections.basisSite")}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>{t("Privacy.sections.purposeAi")}</TableCell>
            <TableCell>{t("Privacy.sections.basisAi")}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>{t("Privacy.sections.purposeAnalytics")}</TableCell>
            <TableCell>{t("Privacy.sections.basisAnalytics")}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>{t("Privacy.sections.purposeForms")}</TableCell>
            <TableCell>{t("Privacy.sections.basisForms")}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>{t("Privacy.sections.purposeModeration")}</TableCell>
            <TableCell>{t("Privacy.sections.basisModeration")}</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <h2>{t("Privacy.sections.cookiesTitle")}</h2>
      <p>
        {t("Privacy.sections.cookiesBefore")}{" "}
        <Link href={localizedHref(locale, "cookiePolicy")}>
          {t("Privacy.sections.cookiePolicy")}
        </Link>
        .
      </p>

      <h2>{t("Privacy.sections.recipientsTitle")}</h2>
      <p>{t("Privacy.sections.recipientsIntro")}</p>
      <ul>
        <li>{t("Privacy.sections.recipientHosting")}</li>
        <li>{t("Privacy.sections.recipientDatabase")}</li>
        <li>{t("Privacy.sections.recipientEmail")}</li>
        <li>{t("Privacy.sections.recipientAnalytics")}</li>
        <li>{t("Privacy.sections.recipientAi")}</li>
      </ul>
      <p>{t("Privacy.sections.transfers")}</p>

      <h2>{t("Privacy.sections.retentionTitle")}</h2>
      <ul>
        <li>{t("Privacy.sections.retentionConsent")}</li>
        <li>{t("Privacy.sections.retentionAnalytics")}</li>
        <li>{t("Privacy.sections.retentionEmail")}</li>
        <li>{t("Privacy.sections.retentionLogs")}</li>
      </ul>

      <h2>{t("Privacy.sections.rightsTitle")}</h2>
      <p>{t("Privacy.sections.rightsIntro")}</p>
      <ul>
        <li>{t("Privacy.sections.rightAccess")}</li>
        <li>{t("Privacy.sections.rightCorrection")}</li>
        <li>{t("Privacy.sections.rightDeletion")}</li>
        <li>{t("Privacy.sections.rightRestriction")}</li>
        <li>{t("Privacy.sections.rightPortability")}</li>
        <li>{t("Privacy.sections.rightObjection")}</li>
        <li>{t("Privacy.sections.rightWithdraw")}</li>
        <li>{t("Privacy.sections.rightComplaint")}</li>
      </ul>
      <p>
        {t("Privacy.sections.rightsContactBefore")}{" "}
        <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.{" "}
        {t("Privacy.sections.rightsContactAfter")}
      </p>

      <h2>{t("Privacy.sections.authorityTitle")}</h2>
      <p>
        {t("Privacy.sections.authority")}{" "}
        <a
          href={LEGAL.anspdcpUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          ANSPDCP
        </a>
        .
      </p>

      <h2>{t("Privacy.sections.minorsTitle")}</h2>
      <p>{t("Privacy.sections.minors")}</p>

      <h2>{t("Privacy.sections.changesTitle")}</h2>
      <p>{t("Privacy.sections.changes")}</p>
    </LegalPageShell>
  );
}
