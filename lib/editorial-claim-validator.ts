import type { ExpertNotes } from "@/lib/schema";
import {
  buildWineEditorialEvidence,
  evidenceHasDescriptor,
  normalizeEditorialText,
  type WineEditorialEvidence,
  type WineEvidenceInput,
  type WineTypeKey,
} from "@/lib/wine-editorial-evidence";

export const TRUTH_ISSUE_CODES = {
  UNSUPPORTED_TANNIN_CLAIM: "UNSUPPORTED_TANNIN_CLAIM",
  UNSUPPORTED_OAK_CLAIM: "UNSUPPORTED_OAK_CLAIM",
  UNSUPPORTED_OAK_DETAIL: "UNSUPPORTED_OAK_DETAIL",
  UNSUPPORTED_ACIDITY_CLAIM: "UNSUPPORTED_ACIDITY_CLAIM",
  UNSUPPORTED_SENSORY_CLAIM: "UNSUPPORTED_SENSORY_CLAIM",
  TYPE_EDITORIAL_CONTRADICTION: "TYPE_EDITORIAL_CONTRADICTION",
  SWEETNESS_EDITORIAL_CONTRADICTION: "SWEETNESS_EDITORIAL_CONTRADICTION",
  AGEING_EDITORIAL_CONTRADICTION: "AGEING_EDITORIAL_CONTRADICTION",
  SPECIFIC_CLAIM_WITHOUT_EVIDENCE: "SPECIFIC_CLAIM_WITHOUT_EVIDENCE",
  NO_DATA_BUT_SPECIFIC_CLAIMS: "NO_DATA_BUT_SPECIFIC_CLAIMS",
  EXPERT_NOTE_UNSUPPORTED: "EXPERT_NOTE_UNSUPPORTED",
  EDITORIAL_PAIRING_UNSUPPORTED: "EDITORIAL_PAIRING_UNSUPPORTED",
  PAIRING_REASON_UNSUPPORTED: "PAIRING_REASON_UNSUPPORTED",
  PAIRING_SCORE_WITHOUT_BASIS: "PAIRING_SCORE_WITHOUT_BASIS",
  PAIRING_CONTRADICTS_WINE_TYPE: "PAIRING_CONTRADICTS_WINE_TYPE",
  PAIRING_DUPLICATE_OR_BOILERPLATE: "PAIRING_DUPLICATE_OR_BOILERPLATE",
  AI_TEXT_USED_AS_QUALITY_EVIDENCE: "AI_TEXT_USED_AS_QUALITY_EVIDENCE",
  INFERRED_CELLAR_USED_AS_QUALITY_EVIDENCE:
    "INFERRED_CELLAR_USED_AS_QUALITY_EVIDENCE",
} as const;

export type TruthIssueCode =
  (typeof TRUTH_ISSUE_CODES)[keyof typeof TRUTH_ISSUE_CODES];

export type ClaimSeverity = "critical" | "high" | "medium" | "low";

export interface EditorialClaimIssue {
  code: TruthIssueCode;
  severity: ClaimSeverity;
  message: string;
  explanation: string;
  blocksPublication: boolean;
}

export interface EditorialTextBundle {
  descriptionEditorial?: string | null;
  valueExplanation?: string | null;
  tasteProfile?: string | null;
  thingsYouShouldKnow?: string[] | null;
  foodPairingNotes?: { dish: string; note: string; score?: number }[] | null;
  dessertPairings?: { dish: string; note: string; score?: number }[] | null;
  recommendedOccasions?: string[] | null;
  expertNotes?: ExpertNotes | null;
  foodPairings?: { dish: string; note?: string; score?: number }[] | null;
}

const GENERAL_MARKERS = [
  "in general",
  "de regula",
  "de obicei",
  "tipic pentru",
  "in mod tipic",
  "vinurile albe",
  "vinurile rosii",
  "vinurile roze",
  "vinurile spumante",
  "un vin alb",
  "un vin rosu",
  "soiurile de",
  "ca categorie",
  "orientare generala",
];

const SPECIFIC_MARKERS = [
  "acest vin",
  "vinul are",
  "are tanin",
  "are o aciditate",
  "note de",
  "arome de",
  "gust de",
  "final de",
  "se simt",
  "dezvaluie",
];

const QUALITY_ADJECTIVES = /complex|elegant|mineral|persistent|structur/;

const TANNIN_SPECIFIC =
  /\b(tanin(?:uri|ul|urile)?|tannin)\b.{0,40}(ferme|puternic|robust|echilibr|fine|catifel|prezent|structura)/;
const TANNIN_ANY = /\btanin(?:uri|ul|urile)?\b|\btannin\b/;
const OAK_SPECIFIC =
  /\b(barrique|baric|stejar|butoi|invechit in lemn|maturat in lemn)\b/;
const OAK_DURATION = /(\d{1,2})\s*(?:de\s+)?luni/;
const OAK_ORIGIN =
  /\b(stejar francez|baric francez|barrique francez|prima folosinta|primul ciclu)\b/;
const ACIDITY_SPECIFIC =
  /\baciditate\b.{0,24}(ridicat|vie|ascutit|scazut|proaspet|buna|excelent|marcata)/;
const RED_FRUIT_SPECIFIC =
  /\b(fructe(?:le)? rosii|fructe(?:le)? negre|cirese|visine|prune|mure|zmeura)\b/;
const WHITE_FRUIT_SPECIFIC = /\b(fructe albe|piersic|caise|gutuie)\b/;
const CITRUS_SPECIFIC = /\b(citrice|lamaie|grepfrut|lime)\b/;
const FLORAL_SPECIFIC = /\b(floral|flori de|tei|salcam|trandafir)\b/;
const SPICE_SPECIFIC = /\b(piper negru|note de piper|condimente de stejar)\b/;
const SMOKE_SPECIFIC = /\b(fum(?:at|e)|note afumate)\b/;
const EXACT_AGEING_YEARS =
  /\b(\d{1,2})\s*(?:de\s+)?ani\s+(?:de\s+)?(?:invechire|barrique|stejar|pivnita)\b/;
const DRINK_YOUNG =
  /\b(consumat tanar|beat tanar|de baut tanar|bea tanar|pentru consum imediat)\b/;
const LONG_AGEING =
  /\b(invechire lunga|evolutie lunga|potential (?:mare |lung )?(?:de )?(?:pivnita|invechire)|zeci de ani)\b/;
const RED_GRILL_DISH =
  /\b(mititei|mici\b|sarmale|carne rosie|vita la gratar|friptura de vita)\b/;
const TYPE_LABELS: Record<Exclude<WineTypeKey, "unknown">, RegExp> = {
  red: /\b(acest vin rosu|vinul rosu)\b/,
  white: /\b(acest vin alb|vinul alb)\b/,
  rose: /\b(acest vin (?:roze|rose)|vinul (?:roze|rose))\b/,
  sparkling: /\b(acest (?:spumant|vin spumant)|vinul spumant)\b/,
  dessert: /\b(acest vin de desert|vinul de desert)\b/,
  orange: /\b(acest vin orange|vinul orange)\b/,
};

function isGeneralContext(text: string): boolean {
  return GENERAL_MARKERS.some((marker) => text.includes(marker));
}

function isWineSpecific(text: string): boolean {
  if (SPECIFIC_MARKERS.some((marker) => text.includes(marker))) return true;
  if (isGeneralContext(text) && !SPECIFIC_MARKERS.some((m) => text.includes(m))) {
    return false;
  }
  return false;
}

function collectBundleText(bundle: EditorialTextBundle): string {
  const parts: string[] = [
    bundle.descriptionEditorial ?? "",
    bundle.valueExplanation ?? "",
    bundle.tasteProfile ?? "",
    ...(bundle.thingsYouShouldKnow ?? []),
    ...(bundle.recommendedOccasions ?? []),
    ...(bundle.foodPairingNotes ?? []).flatMap((item) => [item.dish, item.note]),
    ...(bundle.dessertPairings ?? []).flatMap((item) => [item.dish, item.note]),
    ...(bundle.foodPairings ?? []).flatMap((item) => [
      item.dish,
      item.note ?? "",
    ]),
  ];
  const expert = bundle.expertNotes;
  if (expert) {
    parts.push(
      expert.history,
      expert.terroirSecrets,
      expert.vintageQuirks,
      expert.pairingScience,
      expert.commonMistakes,
      expert.agingPotential,
      expert.valueInsight,
      ...expert.thingsYouShouldKnow,
    );
  }
  return normalizeEditorialText(parts.join(" \n "));
}

function issue(
  code: TruthIssueCode,
  severity: ClaimSeverity,
  message: string,
  explanation: string,
  blocksPublication: boolean,
): EditorialClaimIssue {
  return { code, severity, message, explanation, blocksPublication };
}

function typeContradicts(text: string, type: WineTypeKey): boolean {
  if (type === "unknown") return false;
  for (const [label, pattern] of Object.entries(TYPE_LABELS)) {
    if (label === type) continue;
    if (pattern.test(text) && !isGeneralContext(text)) {
      return true;
    }
  }
  return false;
}

function sweetnessContradicts(
  text: string,
  sweetness: string | null,
): boolean {
  if (!sweetness) return false;
  const mentionsSweet = /\bdulce\b/.test(text);
  const mentionsOffDry = /\b(demidulce|demisec)\b/.test(text);
  const mentionsDry = /\bsec\b/.test(text);

  if (sweetness === "sec" && (mentionsSweet || mentionsOffDry) && !mentionsDry) {
    return true;
  }
  if (
    (sweetness === "dulce" || sweetness === "demidulce") &&
    mentionsDry &&
    !mentionsSweet &&
    !mentionsOffDry
  ) {
    return true;
  }
  return false;
}

function tanninImpossible(type: WineTypeKey): boolean {
  return type === "white" || type === "rose" || type === "sparkling";
}

function countSpecificSensoryHits(text: string): number {
  return [
    TANNIN_ANY,
    OAK_SPECIFIC,
    ACIDITY_SPECIFIC,
    RED_FRUIT_SPECIFIC,
    WHITE_FRUIT_SPECIFIC,
    CITRUS_SPECIFIC,
    FLORAL_SPECIFIC,
    SPICE_SPECIFIC,
    SMOKE_SPECIFIC,
  ].filter((pattern) => pattern.test(text)).length;
}

export function validateEditorialClaims(
  bundle: EditorialTextBundle,
  evidenceInput: WineEvidenceInput,
): EditorialClaimIssue[] {
  const evidence = buildWineEditorialEvidence(evidenceInput);
  const text = collectBundleText(bundle);
  const taste = normalizeEditorialText(bundle.tasteProfile ?? "");
  const issues: EditorialClaimIssue[] = [];

  if (!text.trim()) {
    return issues;
  }

  if (typeContradicts(text, evidence.type)) {
    issues.push(
      issue(
        TRUTH_ISSUE_CODES.TYPE_EDITORIAL_CONTRADICTION,
        "high",
        `Textul descrie un alt tip de vin decat cel inregistrat (${evidence.type}).`,
        "O mentiune de identitate (acest vin alb/rosu/spumant) contrazice campul type.",
        true,
      ),
    );
  }

  if (sweetnessContradicts(text, evidence.sweetness)) {
    issues.push(
      issue(
        TRUTH_ISSUE_CODES.SWEETNESS_EDITORIAL_CONTRADICTION,
        "high",
        `Textul contrazice dulceata inregistrata (${evidence.sweetness}).`,
        "Descrierea prezinta vinul ca sec sau dulce in contradictie cu campul sweetness.",
        true,
      ),
    );
  }

  const tanninHit = TANNIN_ANY.test(text) || TANNIN_SPECIFIC.test(text);
  const tanninSpecific =
    TANNIN_SPECIFIC.test(text) ||
    isWineSpecific(text) ||
    TANNIN_ANY.test(taste);
  if (tanninHit && tanninSpecific && !isGeneralContext(text.split("tanin")[0] ?? text)) {
    if (tanninImpossible(evidence.type)) {
      issues.push(
        issue(
          TRUTH_ISSUE_CODES.UNSUPPORTED_TANNIN_CLAIM,
          "high",
          "Afirmatie de taninuri incompatibile cu tipul vinului.",
          "Vinurile albe, roze sau spumante nu primesc claim-uri de tanin specifice sticlei, decat daca exista evidenta de maceratie.",
          true,
        ),
      );
    } else if (!evidenceHasDescriptor(evidence, "tannin") && !evidence.hasTastingEvidence) {
      issues.push(
        issue(
          TRUTH_ISSUE_CODES.UNSUPPORTED_TANNIN_CLAIM,
          "high",
          "Afirmatie specifica de taninuri fara evidenta de degustare sau fisa tehnica.",
          "Taninurile acestui vin nu apar in tastingNotes / producerContent.",
          true,
        ),
      );
    }
  }

  const oakMentioned =
    OAK_SPECIFIC.test(text) && (isWineSpecific(text) || OAK_SPECIFIC.test(taste));
  const oakSupported =
    evidenceHasDescriptor(evidence, "oak") ||
    evidence.productionMethods.has("oak_ageing");

  if (oakMentioned && !oakSupported) {
    issues.push(
      issue(
        TRUTH_ISSUE_CODES.UNSUPPORTED_OAK_CLAIM,
        "high",
        "Afirmatie de stejar/barrique nesustinuta de evidenta.",
        "Stejarul trebuie sa apara in notele producatorului, fisa tehnica sau tastingNotes.",
        true,
      ),
    );
  } else if (oakMentioned && oakSupported) {
    const source = evidence.sourceText;
    if (OAK_DURATION.test(text) && !OAK_DURATION.test(source)) {
      issues.push(
        issue(
          TRUTH_ISSUE_CODES.UNSUPPORTED_OAK_DETAIL,
          "high",
          "Durata de stejar este pretinsa, dar sursa confirma doar prezenta stejarului.",
          "Mentiunea de stejar nu valideaza luni exacte, originea baricului sau vanilia.",
          true,
        ),
      );
    }
    if (OAK_ORIGIN.test(text) && !OAK_ORIGIN.test(source)) {
      issues.push(
        issue(
          TRUTH_ISSUE_CODES.UNSUPPORTED_OAK_DETAIL,
          "high",
          "Originea sau ciclul baricului nu apare in sursa.",
          "Stejar confirmat nu inseamna baric francez de prima folosinta.",
          true,
        ),
      );
    }
    if (
      /\bvanilie\b/.test(text) &&
      !evidenceHasDescriptor(evidence, "vanilla") &&
      !/\bvanilie\b/.test(source)
    ) {
      issues.push(
        issue(
          TRUTH_ISSUE_CODES.UNSUPPORTED_OAK_DETAIL,
          "high",
          "Vanilia este pretinsa fara sa apara in evidenta de degustare.",
          "Un claim de stejar nu autorizeaza automat vanilie.",
          true,
        ),
      );
    }
  }

  if (
    ACIDITY_SPECIFIC.test(text) &&
    (isWineSpecific(text) || ACIDITY_SPECIFIC.test(taste)) &&
    !evidence.acidity.present &&
    !evidenceHasDescriptor(evidence, "acidity")
  ) {
    issues.push(
      issue(
        TRUTH_ISSUE_CODES.UNSUPPORTED_ACIDITY_CLAIM,
        "medium",
        "Afirmatie specifica de aciditate fara valoare tehnica sau nota de degustare.",
        "Aciditatea numerica sau un descriptor de aciditate din sursa lipsesc.",
        false,
      ),
    );
  }

  const sensoryChecks: Array<{
    pattern: RegExp;
    key: string;
    label: string;
  }> = [
    { pattern: RED_FRUIT_SPECIFIC, key: "red_fruit", label: "fructe rosii" },
    { pattern: WHITE_FRUIT_SPECIFIC, key: "white_fruit", label: "fructe albe" },
    { pattern: CITRUS_SPECIFIC, key: "citrus", label: "citrice" },
    { pattern: FLORAL_SPECIFIC, key: "floral", label: "profil floral" },
    { pattern: SPICE_SPECIFIC, key: "spice", label: "condimente" },
    { pattern: SMOKE_SPECIFIC, key: "smoke", label: "note afumate" },
  ];

  for (const check of sensoryChecks) {
    if (!check.pattern.test(text)) continue;
    const specific = isWineSpecific(text) || check.pattern.test(taste);
    if (!specific) continue;
    if (evidenceHasDescriptor(evidence, check.key)) continue;

    const impossibleRedFruitOnWhite =
      check.key === "red_fruit" &&
      (evidence.type === "white" ||
        evidence.type === "rose" ||
        evidence.type === "sparkling");

    issues.push(
      issue(
        TRUTH_ISSUE_CODES.UNSUPPORTED_SENSORY_CLAIM,
        impossibleRedFruitOnWhite ? "high" : "medium",
        `Afirmatie senzoriala nesustinuta: ${check.label}.`,
        impossibleRedFruitOnWhite
          ? "Fructele rosii nu sunt un descriptor plauzibil pentru acest tip de vin, in lipsa evidentei."
          : "Descriptorul nu apare in tastingNotes sau in textul producatorului.",
        impossibleRedFruitOnWhite,
      ),
    );
  }

  if (DRINK_YOUNG.test(text) && LONG_AGEING.test(text)) {
    issues.push(
      issue(
        TRUTH_ISSUE_CODES.AGEING_EDITORIAL_CONTRADICTION,
        "high",
        "Textul combina consum tanar cu evolutie lunga la pivnita.",
        "Cele doua afirmatii de invechire se contrazic si nu pot fi publicate impreuna.",
        true,
      ),
    );
  }

  const ageingMatch = text.match(EXACT_AGEING_YEARS);
  if (
    ageingMatch &&
    !evidence.ageingClaims.size &&
    !evidence.productionMethods.has("oak_ageing")
  ) {
    issues.push(
      issue(
        TRUTH_ISSUE_CODES.AGEING_EDITORIAL_CONTRADICTION,
        "high",
        `Ani exacti de invechire nesustinuti (${ageingMatch[1]} ani).`,
        "Un numar exact de ani de invechire necesita fisa tehnica sau text de producator.",
        true,
      ),
    );
  }

  const specificHits = countSpecificSensoryHits(text);
  if (!evidence.hasTastingEvidence && specificHits >= 2 && (isWineSpecific(text) || taste.length > 0)) {
    issues.push(
      issue(
        TRUTH_ISSUE_CODES.NO_DATA_BUT_SPECIFIC_CLAIMS,
        "high",
        "Textul face afirmatii senzoriale specifice desi nu exista evidenta de degustare.",
        "Fara tastingNotes, producerContent sau fisa tehnica, claim-urile specifice sticlei sunt inventate.",
        true,
      ),
    );
  } else if (
    !evidence.hasTastingEvidence &&
    specificHits === 1 &&
    (isWineSpecific(text) || taste.length > 0)
  ) {
    issues.push(
      issue(
        TRUTH_ISSUE_CODES.SPECIFIC_CLAIM_WITHOUT_EVIDENCE,
        "medium",
        "O afirmatie specifica despre sticla nu are evidenta de suport.",
        "Claim-ul poate ramane doar daca este etichetat ca orientare generala sau este atribuit producatorului.",
        false,
      ),
    );
  }

  issues.push(...validatePairingClaims(bundle, evidence, text));
  issues.push(...validateExpertNotes(bundle.expertNotes ?? null, evidence));

  return dedupeIssues(issues);
}

function validatePairingClaims(
  bundle: EditorialTextBundle,
  evidence: WineEditorialEvidence,
  fullText: string,
): EditorialClaimIssue[] {
  const issues: EditorialClaimIssue[] = [];
  const editorialPairings = bundle.foodPairingNotes ?? [];

  if (editorialPairings.length === 0) {
    return issues;
  }

  const notes = editorialPairings.map((item) =>
    normalizeEditorialText(item.note),
  );
  const uniqueNotes = new Set(notes.filter((note) => note.length > 12));
  if (uniqueNotes.size > 0 && uniqueNotes.size < notes.length) {
    issues.push(
      issue(
        TRUTH_ISSUE_CODES.PAIRING_DUPLICATE_OR_BOILERPLATE,
        "low",
        "Notele de pairing editorial se repeta aproape identic.",
        "Acelasi paragraf copiat pe mai multe feluri semnaleaza text generat, nu evaluare.",
        false,
      ),
    );
  }

  for (const pairing of editorialPairings) {
    const blob = normalizeEditorialText(`${pairing.dish} ${pairing.note}`);
    const inventsStructure =
      TANNIN_ANY.test(blob) ||
      OAK_SPECIFIC.test(blob) ||
      ACIDITY_SPECIFIC.test(blob);

    if (
      inventsStructure &&
      !evidence.hasTastingEvidence &&
      !evidenceHasDescriptor(evidence, "tannin") &&
      !evidenceHasDescriptor(evidence, "oak")
    ) {
      issues.push(
        issue(
          TRUTH_ISSUE_CODES.PAIRING_REASON_UNSUPPORTED,
          "high",
          `Pairing-ul "${pairing.dish}" explica tanin/stejar/aciditate fara evidenta.`,
          "AI nu poate inventa structura vinului ca sa justifice un pairing.",
          true,
        ),
      );
    }

    if (
      tanninImpossible(evidence.type) &&
      (TANNIN_ANY.test(blob) ||
        (RED_GRILL_DISH.test(blob) && RED_FRUIT_SPECIFIC.test(blob)))
    ) {
      issues.push(
        issue(
          TRUTH_ISSUE_CODES.PAIRING_CONTRADICTS_WINE_TYPE,
          "high",
          `Pairing-ul "${pairing.dish}" foloseste logica de vin rosu pentru un vin ${evidence.type}.`,
          "Taninuri sau fructe rosii + gratar/sarmale/mititei nu sunt pairing-uri evaluate pentru acest tip.",
          true,
        ),
      );
    }

    if (
      pairing.score != null &&
      !evidence.hasEvaluatedPairings &&
      !evidence.hasTastingEvidence &&
      inventsStructure
    ) {
      issues.push(
        issue(
          TRUTH_ISSUE_CODES.PAIRING_SCORE_WITHOUT_BASIS,
          "medium",
          `Pairing-ul "${pairing.dish}" are scor numeric justificat prin structura inventata.`,
          "foodPairingNotes nu sunt echivalente cu foodPairings evaluate. Un scor plus tanin/stejar/aciditate fara evidenta este nesustinut.",
          false,
        ),
      );
    }
  }

  if (
    editorialPairings.length > 0 &&
    !evidence.hasEvaluatedPairings &&
    !evidence.hasTastingEvidence &&
    !isGeneralContext(fullText)
  ) {
    issues.push(
      issue(
        TRUTH_ISSUE_CODES.EDITORIAL_PAIRING_UNSUPPORTED,
        "high",
        "Pairing-uri editoriale specifice sticlei, fara pairing evaluat si fara evidenta de degustare.",
        "In lipsa de foodPairings evaluate sau note de producator, pairing-ul trebuie sa lipseasca sau sa fie orientare generala.",
        true,
      ),
    );
  }

  return issues;
}

function validateExpertNotes(
  notes: ExpertNotes | null,
  evidence: WineEditorialEvidence,
): EditorialClaimIssue[] {
  if (!notes) return [];
  const text = normalizeEditorialText(
    [
      notes.history,
      notes.terroirSecrets,
      notes.vintageQuirks,
      notes.pairingScience,
      notes.commonMistakes,
      notes.agingPotential,
      notes.valueInsight,
      ...notes.thingsYouShouldKnow,
    ].join(" \n "),
  );
  if (!text.trim()) return [];

  const invented =
    (TANNIN_SPECIFIC.test(text) && !evidenceHasDescriptor(evidence, "tannin")) ||
    (OAK_SPECIFIC.test(text) && !evidenceHasDescriptor(evidence, "oak")) ||
    (tanninImpossible(evidence.type) && TANNIN_ANY.test(text) && !isGeneralContext(text));

  if (!invented) return [];

  return [
    issue(
      TRUTH_ISSUE_CODES.EXPERT_NOTE_UNSUPPORTED,
      "high",
      "Expert Notes contin afirmatii senzoriale nesustinute, folosibile ca fapt de un alt LLM.",
      "Expert Notes nu au voie sa creeze un lant AI-to-AI. Sectiunile nesustinute trebuie omitate.",
      true,
    ),
  ];
}

function dedupeIssues(issues: EditorialClaimIssue[]): EditorialClaimIssue[] {
  const seen = new Set<string>();
  const unique: EditorialClaimIssue[] = [];
  for (const item of issues) {
    const key = `${item.code}:${item.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
  return unique;
}

export function looksLikeQualityAdjectiveProse(text: string | null | undefined): boolean {
  if (!text?.trim()) return false;
  return QUALITY_ADJECTIVES.test(normalizeEditorialText(text));
}

export function looksLikeInferredCellarPotential(input: {
  type?: string | null;
  price?: number | null;
  cellarPotential?: number | null;
  drinkabilityStart?: number | null;
  drinkabilityEnd?: number | null;
}): boolean {
  if (input.cellarPotential == null) return false;
  if (input.drinkabilityStart != null && input.drinkabilityEnd != null) {
    return false;
  }
  const type = evidenceType(input.type);
  const price = input.price ?? 0;
  const expected = type === "red" && price >= 60 ? 4 : 2;
  return input.cellarPotential === expected;
}

function evidenceType(type: string | null | undefined): WineTypeKey {
  return buildWineEditorialEvidence({ type }).type;
}

/**
 * Drops wine-specific unsupported sentences from Expert Notes so Sommelier
 * cannot treat invented tannins/oak as catalog facts.
 */
export function sanitizeExpertNotesForDownstream(
  notes: ExpertNotes | null | undefined,
  evidenceInput: WineEvidenceInput,
): ExpertNotes | null {
  if (!notes) return null;
  const evidence = buildWineEditorialEvidence(evidenceInput);
  const fields: Array<keyof Omit<ExpertNotes, "thingsYouShouldKnow">> = [
    "history",
    "terroirSecrets",
    "vintageQuirks",
    "pairingScience",
    "commonMistakes",
    "agingPotential",
    "valueInsight",
  ];

  const cleaned: ExpertNotes = {
    history: "",
    terroirSecrets: "",
    vintageQuirks: "",
    pairingScience: "",
    commonMistakes: "",
    agingPotential: "",
    valueInsight: "",
    thingsYouShouldKnow: [],
  };

  for (const field of fields) {
    const value = notes[field]?.trim() ?? "";
    if (!value) continue;
    const probe = validateEditorialClaims(
      { expertNotes: { ...emptyExpertNotes(), [field]: value } },
      evidenceInputFromEvidence(evidence, evidenceInput),
    );
    if (probe.some((item) => item.code === TRUTH_ISSUE_CODES.EXPERT_NOTE_UNSUPPORTED)) {
      continue;
    }
    cleaned[field] = value;
  }

  cleaned.thingsYouShouldKnow = (notes.thingsYouShouldKnow ?? []).filter((item) => {
    const probe = validateEditorialClaims(
      {
        expertNotes: {
          ...emptyExpertNotes(),
          thingsYouShouldKnow: [item],
        },
      },
      evidenceInputFromEvidence(evidence, evidenceInput),
    );
    return !probe.some(
      (entry) => entry.code === TRUTH_ISSUE_CODES.EXPERT_NOTE_UNSUPPORTED,
    );
  });

  const hasContent =
    cleaned.history ||
    cleaned.terroirSecrets ||
    cleaned.vintageQuirks ||
    cleaned.pairingScience ||
    cleaned.commonMistakes ||
    cleaned.agingPotential ||
    cleaned.valueInsight ||
    cleaned.thingsYouShouldKnow.length > 0;

  return hasContent ? cleaned : null;
}

function emptyExpertNotes(): ExpertNotes {
  return {
    history: "",
    terroirSecrets: "",
    vintageQuirks: "",
    pairingScience: "",
    commonMistakes: "",
    agingPotential: "",
    valueInsight: "",
    thingsYouShouldKnow: [],
  };
}

function evidenceInputFromEvidence(
  evidence: WineEditorialEvidence,
  original: WineEvidenceInput,
): WineEvidenceInput {
  return {
    ...original,
    type: evidence.type,
    sweetness: evidence.sweetness,
    grapeVarieties: evidence.grapes,
    regionName: evidence.region,
    wineryName: evidence.wineryName,
    vintage: evidence.vintage,
  };
}

export function collectClaimViolations(
  bundle: EditorialTextBundle,
  evidenceInput: WineEvidenceInput,
): string[] {
  return validateEditorialClaims(bundle, evidenceInput).map(
    (item) => item.message,
  );
}
