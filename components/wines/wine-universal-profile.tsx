import Link from "next/link";
import { ExternalLink, Grape, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AppLocale } from "@/i18n/locale";
import { localizedHref } from "@/i18n/paths";
import type {
  UniversalProfile,
  UniversalProfileField,
} from "@/lib/wine-universal-profile";

const VERIFICATION_LABELS: Record<string, { ro: string; en: string }> = {
  verified_official: { ro: "Verificat oficial", en: "Verified official" },
  corroborated: { ro: "Corroborat", en: "Corroborated" },
  attributed_retailer: { ro: "Sursă retailer", en: "Retailer-attributed" },
  attributed_specialist: { ro: "Sursă specialist", en: "Specialist-attributed" },
  attributed_editorial: { ro: "Sursă editorială", en: "Editorial-attributed" },
  conflict: { ro: "Conflict", en: "Conflict" },
  unverified: { ro: "Nespecificat", en: "Unspecified" },
};

function verificationLabel(field: UniversalProfileField, locale: AppLocale): string {
  if (field.conflict) return locale === "en" ? "Conflict" : "Conflict";
  return VERIFICATION_LABELS[field.verification]?.[locale] ?? field.verification;
}

function FieldRow({
  field,
  locale,
}: {
  field: UniversalProfileField;
  locale: AppLocale;
}) {
  const conflict = field.conflict || field.verification === "conflict";
  return (
    <div className="border-b border-border/40 py-3 last:border-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {field.label}
      </dt>
      <dd className="mt-1 text-sm leading-relaxed text-foreground">
        {field.value}
      </dd>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        {conflict || field.sourceUrl || field.verification !== "unverified" ? (
          <Badge variant={conflict ? "destructive" : "secondary"}>
            {verificationLabel(field, locale)}
          </Badge>
        ) : null}
        {field.sourceUrl && /^https?:\/\//i.test(field.sourceUrl) ? (
          <a
            href={field.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-wine underline-offset-4 hover:underline"
          >
            {field.sourceTitle ?? (locale === "en" ? "Source" : "Sursă")}
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        ) : null}
      </div>
    </div>
  );
}

export function WineUniversalProfile({
  profile,
  locale,
}: {
  profile: UniversalProfile;
  locale: AppLocale;
}) {
  const t = {
    ro: {
      heading: "Profil universal",
      intro:
        "Date structurate, cu sursă pentru fiecare afirmație. Câmpurile fără dovezi structurate rămân explicit necompletate.",
      identity: "Identitate și clasificare",
      technical: "Profil tehnic",
      sensory: "Profil senzorial structurat",
      serving: "Servire și masă",
      grapes: "Soiuri și context",
      noSensory:
        "Nu există încă dovezi senzoriale structurate pentru acest vin. Nu afișăm descrieri generice ca fapte.",
      noTechnical:
        "Nu există încă valori tehnice structurate și atribuite.",
      noServing:
        "Temperatura de servire și asocierile culinare nu sunt încă structurate cu sursă.",
      evidence: "afirmații structurate",
      noEvidence: "fără dovezi structurate",
      grapeLink: "Ghidul soiului",
    },
    en: {
      heading: "Universal profile",
      intro:
        "Structured, source-backed facts. Fields without structured evidence are explicitly left empty.",
      identity: "Identity and classification",
      technical: "Technical profile",
      sensory: "Structured sensory profile",
      serving: "Serving and table",
      grapes: "Grapes and context",
      noSensory:
        "No structured sensory evidence for this wine yet. We do not present generic descriptions as facts.",
      noTechnical: "No structured, attributed technical values yet.",
      noServing:
        "Serving temperature and food pairings are not yet structured with a source.",
      evidence: "structured claims",
      noEvidence: "no structured evidence",
      grapeLink: "Grape guide",
    },
  }[locale];

  const renderSection = (
    section: UniversalProfile["sections"][number],
    empty: string,
  ) => (
    <div className="rounded-2xl border border-border/70 bg-card p-5">
      <h3 className="font-serif text-lg font-semibold text-foreground">
        {section.title}
      </h3>
      {section.fields.length > 0 ? (
        <dl className="mt-2">
          {section.fields.map((field) => (
            <FieldRow key={field.key} field={field} locale={locale} />
          ))}
        </dl>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {empty}
        </p>
      )}
    </div>
  );

  const identity = profile.sections.find((section) => section.id === "identity")!;
  const technical = profile.sections.find((section) => section.id === "technical")!;
  const sensory = profile.sections.find((section) => section.id === "sensory")!;
  const serving = profile.sections.find((section) => section.id === "serving")!;

  return (
    <section aria-labelledby="universal-profile-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="universal-profile-heading"
            className="font-serif text-2xl font-semibold text-foreground sm:text-3xl"
          >
            {t.heading}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {t.intro}
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {profile.hasStructuredClaims
            ? `${profile.evidenceCount} ${t.evidence}`
            : t.noEvidence}
        </Badge>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">{renderSection(identity, t.noSensory)}</div>
        {renderSection(technical, t.noTechnical)}
        {renderSection(serving, t.noServing)}
        <div className="sm:col-span-2">{renderSection(sensory, t.noSensory)}</div>
      </div>

      <div className="mt-4 rounded-2xl border border-border/70 bg-secondary/15 p-5">
        <h3 className="flex items-center gap-2 font-serif text-lg font-semibold text-foreground">
          <Grape className="h-4 w-4 text-wine" aria-hidden="true" />
          {t.grapes}
        </h3>
        {profile.grapes.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {profile.grapes.map((grape) => (
              <li
                key={`${grape.name}-${grape.percentage ?? ""}`}
                className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1.5 text-sm"
              >
                <span>
                  {grape.name}
                  {grape.percentage != null ? ` · ${grape.percentage}%` : ""}
                </span>
                {grape.guideSlug ? (
                  <Link
                    href={localizedHref(locale, "grapeVariety", {
                      slug: grape.guideSlug,
                    })}
                    className="text-xs font-medium text-wine underline-offset-4 hover:underline"
                  >
                    {t.grapeLink}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">{t.noTechnical}</p>
        )}
      </div>
    </section>
  );
}
