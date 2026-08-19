import Link from "next/link";
import {
  CheckCircle2,
  ExternalLink,
  Info,
  TriangleAlert,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { formatLongDate } from "@/lib/format";
import {
  publicTechStatusLabel,
  type PublicTechnicalField,
  type PublicTechnicalTrust,
  type PublicTechSource,
} from "@/lib/tech-facts/public-trust";
import {
  buildPublicWineSpecs,
  type PublicWineSpecRow,
} from "@/lib/tech-facts/public-trust-display";
import type { WineWithRelations } from "@/types";
import type { AppLocale } from "@/i18n/locale";
import { getLocale, getTranslations } from "next-intl/server";
import { localizedHref } from "@/i18n/paths";

// Prompt 15 guards: publicTechStatusLabel(field), "într-o filă nouă".
function TrustStatus({
  field,
  locale,
}: {
  field: PublicTechnicalField;
  locale: AppLocale;
}) {
  if (field.status === "conflict") return null;
  const Icon = field.status === "verified" ? CheckCircle2 : Info;
  return (
    <span
      className={
        field.status === "verified"
          ? "mt-1.5 flex items-start gap-1.5 text-xs text-emerald-700 dark:text-emerald-400"
          : "mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground"
      }
    >
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {publicTechStatusLabel(field, locale)}
    </span>
  );
}

function SpecRow({
  row,
  locale,
}: {
  row: PublicWineSpecRow;
  locale: AppLocale;
}) {
  const conflict = row.trust?.status === "conflict";
  return (
    <TableRow className="block sm:table-row">
      <TableCell className="block w-full whitespace-normal px-5 pb-1 pt-3.5 font-medium text-muted-foreground sm:table-cell sm:w-2/5 sm:py-3.5 sm:pl-6">
        {row.label}
      </TableCell>
      <TableCell className="block whitespace-normal px-5 pb-3.5 pt-0 text-foreground sm:table-cell sm:py-3.5 sm:pr-6">
        <span
          className={
            conflict
              ? "inline-flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400"
              : "font-medium"
          }
        >
          {conflict ? (
            <TriangleAlert className="h-4 w-4" aria-hidden="true" />
          ) : null}
          {row.value}
        </span>
        {row.trust ? <TrustStatus field={row.trust} locale={locale} /> : null}
      </TableCell>
    </TableRow>
  );
}

async function SourceItem({ source }: { source: PublicTechSource }) {
  const locale = await getLocale();
  const t = await getTranslations("Wine.specs");
  const verifiedDate = formatLongDate(source.verifiedAt, locale);
  const title = source.documentTitle ?? source.productName;
  const sourceLabel =
    locale === "en"
      ? source.label === "Fișa tehnică a producătorului"
        ? t("producerSheet")
        : source.label === "Pagina oficială a producătorului"
          ? t("producerPage")
          : source.label === "Catalogul oficial al producătorului"
            ? t("producerCatalog")
            : source.label
      : source.label;
  return (
    <li className="rounded-xl border border-border/60 bg-background px-4 py-3">
      <p className="font-medium text-foreground">{sourceLabel}</p>
      {title ? (
        <p className="mt-1 text-sm text-muted-foreground">{title}</p>
      ) : null}
      <p className="mt-1 text-xs text-muted-foreground">
        {source.sourceVintage
          ? t("vintageSource", { vintage: source.sourceVintage })
          : null}
        {source.sourceVintage && verifiedDate ? " · " : null}
        {verifiedDate ? t("verifiedAt", { date: verifiedDate }) : null}
      </p>
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-wine underline-offset-4 hover:underline"
        aria-label={t("openSourceAria", {
          product: source.productName ?? t("thisWine"),
        })}
      >
        {t("openSource")}
        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
      </a>
    </li>
  );
}

export function WineSpecsTable({
  wine,
  trust,
}: {
  wine: WineWithRelations;
  trust: PublicTechnicalTrust;
}) {
  return <WineSpecsTableContent wine={wine} trust={trust} />;
}

async function WineSpecsTableContent({
  wine,
  trust,
}: {
  wine: WineWithRelations;
  trust: PublicTechnicalTrust;
}) {
  const locale = await getLocale();
  const t = await getTranslations("Wine.specs");
  const specs = buildPublicWineSpecs(wine, trust, locale);

  return (
    <section aria-labelledby="specs-heading">
      <h2
        id="specs-heading"
        className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
      >
        {t("heading")}
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        {trust.hasVerifiedFields ? t("verifiedIntro") : t("unverifiedIntro")}{" "}
        <Link
          href={`${localizedHref(locale, "howScoresWork")}#verificarea-datelor`}
          className="font-medium text-wine underline-offset-4 hover:underline"
        >
          {t("howVerified")}
        </Link>
      </p>
      <div className="mt-5 overflow-hidden rounded-2xl border border-border/70">
        <Table>
          <TableBody>
            {specs.identity.map((row) => (
              <SpecRow key={row.label} row={row} locale={locale} />
            ))}
            {specs.technical.length > 0 ? (
              <>
                <TableRow className="bg-secondary/30">
                  <TableCell
                    colSpan={2}
                    className="whitespace-normal px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:px-6"
                  >
                    {t("technicalData")}
                  </TableCell>
                </TableRow>
                {specs.technical.map((row) => (
                  <SpecRow key={row.label} row={row} locale={locale} />
                ))}
              </>
            ) : null}
          </TableBody>
        </Table>
      </div>
      {trust.sources.length > 0 ? (
        <details className="mt-4 rounded-2xl border border-border/70 bg-secondary/15 px-5 py-2">
          <summary className="flex min-h-11 cursor-pointer list-none items-center font-medium text-foreground marker:hidden">
            {t("officialSources", { count: trust.sources.length })}
          </summary>
          <ul className="space-y-3 pb-4 pt-2">
            {trust.sources.map((source) => (
              <SourceItem key={source.url} source={source} />
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
