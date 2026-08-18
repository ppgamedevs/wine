import { createHash } from "node:crypto";
import type { WineSourceType } from "@/lib/source-trust";
import type {
  IdentityMatchClass,
  TechExtractionMethod,
  TechFactField,
} from "@/lib/tech-facts/types";

export const PROMPT_17_CHECKPOINT = "1736bd1";
export const PROMPT_18_MANIFEST_VERSION = 1;
export const PROMPT_18_MAX_EVIDENCE_ROWS = 9;

export type Prompt18Batch = "A" | "B" | "C";

export interface Prompt18SourceManifestEntry {
  wineId: number;
  slug: string;
  field: "producerPageUrl" | "tastingSheetUrl";
  oldUrl: string;
  newUrl: string | null;
  action:
    | "CLEAR_PRODUCER_PAGE"
    | "REPLACE_PRODUCER_PAGE"
    | "CLEAR_TASTING_SHEET";
  adjudicationReason: string[];
}

export interface Prompt18EvidenceManifestEntry {
  wineId: number;
  slug: string;
  winery: "balla-geza" | "avincis";
  field: Extract<TechFactField, "alcohol" | "sweetness" | "vintage">;
  expectedStoredValue: string | number;
  value: string | number;
  unit: string | null;
  sourceUrl: string;
  sourceType: WineSourceType;
  sourceWineName: string;
  sourceVintage: number | null;
  sourceDocumentTitle: string | null;
  excerpt: string;
  extractionMethod: TechExtractionMethod;
  identityMatchClass: IdentityMatchClass;
  confidence: number;
  observedAt: string;
  sourceHash: string;
  qualification: "QUALIFIED_MATCH_EXISTING";
  stability: "STABLE";
}

export interface Prompt18ManifestEnvelope<T> {
  prompt: 18;
  batch: Prompt18Batch;
  version: typeof PROMPT_18_MANIFEST_VERSION;
  prompt17Commit: typeof PROMPT_17_CHECKPOINT;
  frozenAt: string;
  entriesHash: string;
  entries: T[];
}

export interface Prompt18ApprovedEvidenceIdentity {
  wineId: number;
  slug: string;
  winery: Prompt18EvidenceManifestEntry["winery"];
  field: Prompt18EvidenceManifestEntry["field"];
  expectedStoredValue: string | number;
  value: string | number;
  sourceUrl: string;
  sourceHash: string;
}

export const APPROVED_MANIFEST_A: Prompt18SourceManifestEntry[] = [
  {
    wineId: 209,
    slug: "avincis-alb-avincis-cuvee-amelie-dulce-0-75l",
    field: "producerPageUrl",
    oldUrl:
      "https://www.avincis.ro/cuvee-amelie-vin-alb-dulce-vin-avincis-41-ro.htm",
    newUrl: "https://www.avincis.ro/cuvee-amelie-vin-avincis-62-ro.htm",
    action: "REPLACE_PRODUCER_PAGE",
    adjudicationReason: [
      "Exact official Cuvée Amélie heading",
      "Exact official product deep link",
    ],
  },
  ...[
    [208, "avincis-orange-2022"],
    [210, "avincis-spumant-avincis-metoda-traditionla-extra-brut-0-75l"],
    [214, "avincis-feteasca-regala-pinot-gris"],
    [217, "avincis-cuvee-valerius-alutus-primus-editie-limitata-2021"],
  ].map(([wineId, slug]) => ({
    wineId: wineId as number,
    slug: slug as string,
    field: "tastingSheetUrl" as const,
    oldUrl:
      "https://www.avincis.ro/dyn_doc/Politica%20de%20confidentialitate.pdf",
    newUrl: null,
    action: "CLEAR_TASTING_SHEET" as const,
    adjudicationReason: [
      "Stored document is the Avincis privacy policy",
      "No exact technical PDF replacement was qualified",
    ],
  })),
  ...[
    [
      371,
      "crama-gabai-vin-rose-demidulce-sweet-pinot-rose-2022",
      "https://cramagabai.ro/product/vin-rose-demidulce-sweet-pinot-rose/",
    ],
    [
      384,
      "crama-gabai-vin-alb-sec-sauvignon-blanc-2021",
      "https://cramagabai.ro/product/vin-alb-sec-sauvignon-blanc/",
    ],
    [
      385,
      "crama-gabai-vin-alb-sec-feteasca-alba-2019",
      "https://cramagabai.ro/product/vin-alb-sec-feteasca-alba/",
    ],
    [
      386,
      "crama-gabai-vin-rosu-demidulce-sweet-pinot-noir-vintage-2015",
      "https://cramagabai.ro/product/pinot-noir-demidulce/",
    ],
  ].map(([wineId, slug, oldUrl]) => ({
    wineId: wineId as number,
    slug: slug as string,
    field: "producerPageUrl" as const,
    oldUrl: oldUrl as string,
    newUrl: null,
    action: "CLEAR_PRODUCER_PAGE" as const,
    adjudicationReason: [
      "Stored official product URL repeatedly returned 404 or 410",
      "No exact current official replacement was qualified",
    ],
  })),
];

export const APPROVED_MANIFEST_B_IDENTITIES: Prompt18ApprovedEvidenceIdentity[] = [
  {
    wineId: 280,
    slug: "balla-geza-david-cuvee-2015-editie-limitata",
    winery: "balla-geza",
    field: "alcohol",
    expectedStoredValue: 15,
    value: 15,
    sourceUrl:
      "https://www.ballageza.com/ro/catalog/vinuri/david-cuvee,2015-editie-limitata",
    sourceHash: "3225492b29246f1142a768549f319208ec976967319039fa46de0c2467f63606",
  },
  {
    wineId: 280,
    slug: "balla-geza-david-cuvee-2015-editie-limitata",
    winery: "balla-geza",
    field: "sweetness",
    expectedStoredValue: "sec",
    value: "sec",
    sourceUrl:
      "https://www.ballageza.com/ro/catalog/vinuri/david-cuvee,2015-editie-limitata",
    sourceHash: "ed32ef40002215786c93df67d499dbcd65d49e74029168bf7661f809d6e58715",
  },
  {
    wineId: 281,
    slug: "balla-geza-cadarissima-2023-editie-limitata",
    winery: "balla-geza",
    field: "alcohol",
    expectedStoredValue: 12.5,
    value: 12.5,
    sourceUrl:
      "https://www.ballageza.com/ro/catalog/vinuri/cadarissima,2023-editie-limitata",
    sourceHash: "02b7a1fb81f8a846faa39849c61241a0aca2637d927286e6d6d64161d949dfb9",
  },
  {
    wineId: 281,
    slug: "balla-geza-cadarissima-2023-editie-limitata",
    winery: "balla-geza",
    field: "sweetness",
    expectedStoredValue: "dulce",
    value: "dulce",
    sourceUrl:
      "https://www.ballageza.com/ro/catalog/vinuri/cadarissima,2023-editie-limitata",
    sourceHash: "b0959f2fc5c9e25db666de201816fdea5b56166cf6db68298d4d02993aef4cd1",
  },
  {
    wineId: 281,
    slug: "balla-geza-cadarissima-2023-editie-limitata",
    winery: "balla-geza",
    field: "vintage",
    expectedStoredValue: 2023,
    value: 2023,
    sourceUrl:
      "https://www.ballageza.com/ro/catalog/vinuri/cadarissima,2023-editie-limitata",
    sourceHash: "451af7581fb4110b79dc1d0f4ac258194080de472c3902a26429a7aad2ee4851",
  },
  {
    wineId: 208,
    slug: "avincis-orange-2022",
    winery: "avincis",
    field: "sweetness",
    expectedStoredValue: "sec",
    value: "sec",
    sourceUrl: "https://www.avincis.ro/orange-2022-magazin-online-v52-ro.htm",
    sourceHash: "448716a4e7d4fadaea64b458a88e91d0698a4f0ad7e30fe29ef5182f934461d6",
  },
  {
    wineId: 208,
    slug: "avincis-orange-2022",
    winery: "avincis",
    field: "vintage",
    expectedStoredValue: 2022,
    value: 2022,
    sourceUrl: "https://www.avincis.ro/orange-2022-magazin-online-v52-ro.htm",
    sourceHash: "08f01248f20f24016d496d6955da68d82aeb4b9b3ef5a87d6b3b2d7c1d558ebd",
  },
  {
    wineId: 225,
    slug: "avincis-domnul-de-roua-alb",
    winery: "avincis",
    field: "sweetness",
    expectedStoredValue: "demisec",
    value: "demisec",
    sourceUrl:
      "https://www.avincis.ro/domnul-de-roua-alb-vin-avincis-22-ro.htm",
    sourceHash: "e9ca836d301aab364614919112bafe0854c4257f233d170fd415a87b1cafcaef",
  },
  {
    wineId: 230,
    slug: "avincis-vila-dobrusa-cramposie-selectionata",
    winery: "avincis",
    field: "sweetness",
    expectedStoredValue: "demisec",
    value: "demisec",
    sourceUrl:
      "https://www.avincis.ro/vila-dobrusa-cramposie-selectionata-vin-avincis-41-ro.htm",
    sourceHash: "ad12887c0e559df66526d804ba348b28e5b895eeef1ad207001d34c6134a9cae",
  },
];

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function deterministicManifestHash(entries: unknown[]): string {
  return createHash("sha256").update(stableJson(entries)).digest("hex");
}

export function evidenceManifestKey(input: {
  wineId: number;
  field: string;
  sourceHash: string;
}): string {
  return `${input.wineId}|${input.field}|${input.sourceHash}`;
}

function approvedEvidenceKey(row: Prompt18ApprovedEvidenceIdentity): string {
  return evidenceManifestKey(row);
}

export function validateManifestA(entries: Prompt18SourceManifestEntry[]): void {
  if (entries.length !== 9) throw new Error(`Manifest A must contain 9 entries, got ${entries.length}`);
  const approved = new Map(
    APPROVED_MANIFEST_A.map((row) => [`${row.wineId}|${row.field}`, row]),
  );
  for (const row of entries) {
    const expected = approved.get(`${row.wineId}|${row.field}`);
    if (!expected || stableJson(row) !== stableJson(expected)) {
      throw new Error(`Unapproved Manifest A entry: ${row.wineId}|${row.field}`);
    }
  }
}

export function validateManifestB(entries: Prompt18EvidenceManifestEntry[]): void {
  if (entries.length > PROMPT_18_MAX_EVIDENCE_ROWS) {
    throw new Error(`Manifest B exceeds ${PROMPT_18_MAX_EVIDENCE_ROWS} approved claims`);
  }
  if (entries.length !== PROMPT_18_MAX_EVIDENCE_ROWS) {
    throw new Error(`Manifest B must contain 9 frozen entries, got ${entries.length}`);
  }
  const approved = new Map(APPROVED_MANIFEST_B_IDENTITIES.map((row) => [approvedEvidenceKey(row), row]));
  for (const row of entries) {
    const expected = approved.get(evidenceManifestKey(row));
    if (
      !expected ||
      row.winery !== expected.winery ||
      row.slug !== expected.slug ||
      row.expectedStoredValue !== expected.expectedStoredValue ||
      row.value !== expected.value ||
      row.sourceUrl !== expected.sourceUrl ||
      row.qualification !== "QUALIFIED_MATCH_EXISTING" ||
      row.stability !== "STABLE" ||
      !row.sourceWineName.trim() ||
      !row.excerpt.trim() ||
      !row.sourceHash.match(/^[a-f0-9]{64}$/) ||
      row.extractionMethod === "legacy_producer_fact" ||
      row.sourceType === "retailer" ||
      row.sourceType === "marketplace"
    ) {
      throw new Error(`Invalid or unapproved Manifest B entry: ${evidenceManifestKey(row)}`);
    }
  }
}

export function validateManifestC(entries: never[]): void {
  if (entries.length !== 0) throw new Error("Manifest C is approved as an empty mandatory no-op");
}

export function validateEnvelope<T>(
  envelope: Prompt18ManifestEnvelope<T>,
  batch: Prompt18Batch,
): void {
  if (
    envelope.prompt !== 18 ||
    envelope.batch !== batch ||
    envelope.version !== PROMPT_18_MANIFEST_VERSION ||
    envelope.prompt17Commit !== PROMPT_17_CHECKPOINT
  ) {
    throw new Error(`Invalid Prompt 18 Manifest ${batch} envelope`);
  }
  if (envelope.entriesHash !== deterministicManifestHash(envelope.entries)) {
    throw new Error(`Manifest ${batch} hash mismatch`);
  }
}

export type SourceMutationStatus =
  | "PENDING"
  | "ALREADY_APPLIED"
  | "STALE_MANIFEST";

export interface CurrentSourceRow {
  id: number;
  slug: string;
  producerPageUrl: string | null;
  tastingSheetUrl: string | null;
}

export function planSourceMutations(
  entries: Prompt18SourceManifestEntry[],
  currentRows: CurrentSourceRow[],
): Array<Prompt18SourceManifestEntry & { currentUrl: string | null; status: SourceMutationStatus }> {
  const currentById = new Map(currentRows.map((row) => [row.id, row]));
  return entries.map((entry) => {
    const current = currentById.get(entry.wineId);
    const currentUrl = current?.[entry.field] ?? null;
    const status: SourceMutationStatus =
      current?.slug !== entry.slug
        ? "STALE_MANIFEST"
        : currentUrl === entry.oldUrl
          ? "PENDING"
          : currentUrl === entry.newUrl
            ? "ALREADY_APPLIED"
            : "STALE_MANIFEST";
    return { ...entry, currentUrl, status };
  });
}

export function applySourceEntryToRecord(
  row: CurrentSourceRow,
  entry: Prompt18SourceManifestEntry,
): CurrentSourceRow {
  if (row.id !== entry.wineId || row.slug !== entry.slug || row[entry.field] !== entry.oldUrl) {
    return row;
  }
  return { ...row, [entry.field]: entry.newUrl };
}

export type EvidenceMutationStatus =
  | "PENDING"
  | "ALREADY_PERSISTED"
  | "STALE_VALUE_OR_CONFLICT";

export interface CurrentTechnicalRow {
  id: number;
  slug: string;
  alcohol: number | null;
  sweetness: string | null;
  vintage: number | null;
}

export function planEvidenceMutations(
  entries: Prompt18EvidenceManifestEntry[],
  currentRows: CurrentTechnicalRow[],
  persistedKeys: Set<string>,
): Array<Prompt18EvidenceManifestEntry & { currentValue: string | number | null; status: EvidenceMutationStatus }> {
  const currentById = new Map(currentRows.map((row) => [row.id, row]));
  return entries.map((entry) => {
    const current = currentById.get(entry.wineId);
    const currentValue = current?.[entry.field] ?? null;
    const key = evidenceManifestKey(entry);
    const status: EvidenceMutationStatus =
      persistedKeys.has(key)
        ? "ALREADY_PERSISTED"
        : current?.slug === entry.slug &&
            currentValue === entry.expectedStoredValue &&
            currentValue === entry.value
          ? "PENDING"
          : "STALE_VALUE_OR_CONFLICT";
    return { ...entry, currentValue, status };
  });
}
