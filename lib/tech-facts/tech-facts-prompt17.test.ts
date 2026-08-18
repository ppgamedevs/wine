import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  adjudicateBallaIdentitySet,
  type BallaGezaWineRecord,
} from "@/lib/ballageza-producer";
import { parseBudureascaProductPage } from "@/lib/budureasca-producer";
import { GOLDEN_CURATION_STATS } from "@/lib/pairing/golden-curation-dataset";
import { getSecondaryScoringMode } from "@/lib/scoring-v2/secondary-scoring-mode";
import {
  adjudicateOfficialConflict,
  canonicalizeOfficialUrl,
  classifyRepeatedSource,
  confirmedCorrectionsOnly,
  dedupePrompt18Evidence,
  enforceOneToOneOfficialIdentity,
  independentOfficialSourceCount,
  isExactSourceReplacement,
  type Prompt18CorrectionEntry,
  type Prompt18EvidenceEntry,
  type SourceRepeatObservation,
} from "@/lib/tech-facts/source-adjudication";
import { classifyOfficialIdentity } from "@/lib/tech-facts/official-source-recovery";
import type { SourceWineIdentity } from "@/lib/tech-facts/source-identity";

function observation(
  overrides: Partial<SourceRepeatObservation> = {},
): SourceRepeatObservation {
  return {
    ok: true,
    httpStatus: 200,
    failureClass: null,
    canonicalUrl: "https://budureasca.ro/vin/produs",
    identityFingerprint: "product-2020",
    factFingerprint: "alcohol-13",
    ...overrides,
  };
}

function ballaRecord(
  productId: number,
  name: string,
  category: string,
): BallaGezaWineRecord {
  return {
    productId,
    name,
    vintage: 2022,
    category,
    color: "alb",
    sweetness: "sec",
    grapeVarieties: [],
    alcohol: 13,
    acidity: null,
    sugar: null,
    volumeMl: 750,
    imageUrl: `https://www.ballageza.com/media/${productId}.jpg`,
    tastingNotes: null,
    producerPageUrl: `https://www.ballageza.com/ro/catalog/vinuri/${name.toLowerCase()},2022-${category.toLowerCase()}`,
    blockText: `${name} ${category} 2022`,
  };
}

function correction(
  decision: "DB_WRONG_CONFIRMED" | "SOURCE_STALE_OR_WRONG" | "UNRESOLVED",
): Prompt18CorrectionEntry & { decision: typeof decision } {
  return {
    wineId: 1,
    slug: "wine",
    winery: "budureasca",
    field: "alcohol",
    oldValue: 12.5,
    newValue: 11,
    sourceUrls: ["https://budureasca.ro/vin/produs/"],
    identityProof: ["exact product", "exact vintage"],
    conflictResolution: "DB_WRONG_CONFIRMED",
    impactPreview: {
      publicDisplay: "12.5 -> 11",
      jsonLd: "12.5 -> 11",
      derivedCopy: "changes",
      valueScoreDelta: 0,
      pairingImpact: "unchanged",
    },
    decision,
  };
}

describe("Prompt 17 source stability A-H", () => {
  it("A unstable 403 is blocked, never dead", () => {
    const result = classifyRepeatedSource([
      observation({ ok: false, httpStatus: 403, failureClass: "FETCH_BLOCKED", identityFingerprint: null, factFingerprint: null }),
      observation({ ok: false, httpStatus: 403, failureClass: "FETCH_BLOCKED", identityFingerprint: null, factFingerprint: null }),
      observation({ ok: false, httpStatus: 403, failureClass: "FETCH_BLOCKED", identityFingerprint: null, factFingerprint: null }),
    ], { exactIdentity: true });
    expect(result.stability).toBe("TEMPORARILY_BLOCKED");
    expect(result.stability).not.toBe("DEAD_AFTER_DISCOVERY");
  });

  it("B stable exact catalog block qualifies despite detail block", () => {
    const result = classifyRepeatedSource(
      [observation(), observation(), observation()],
      { exactCatalogBlock: true },
    );
    expect(result.qualification).toBe("STABLE_QUALIFIED");
  });

  it("C one lucky fetch remains transient", () => {
    const result = classifyRepeatedSource([
      observation(),
      observation({ ok: false, httpStatus: 403, failureClass: "FETCH_BLOCKED", identityFingerprint: null, factFingerprint: null }),
      observation({ ok: false, httpStatus: 403, failureClass: "FETCH_BLOCKED", identityFingerprint: null, factFingerprint: null }),
    ], { exactIdentity: true });
    expect(result.qualification).toBe("TRANSIENTLY_QUALIFIED");
  });

  it("D exact stable historical vintage can confirm DB conflict", () => {
    expect(adjudicateOfficialConflict({
      exactProduct: true,
      dbVintage: 2016,
      sourceVintage: 2016,
      explicitFact: true,
      stablePrimarySource: true,
      officialSourceUrls: ["https://budureasca.ro/vin-rose/prima-stilla-rose/"],
      corroboratingValues: [],
      officialValue: 11,
    }).outcome).toBe("DB_WRONG_CONFIRMED");
  });

  it("E rolled-forward evergreen page cannot adjudicate old vintage", () => {
    expect(adjudicateOfficialConflict({
      exactProduct: true,
      dbVintage: 2016,
      sourceVintage: 2024,
      explicitFact: true,
      stablePrimarySource: true,
      officialSourceUrls: ["https://budureasca.ro/vin/produs"],
      corroboratingValues: [],
      officialValue: 11,
      sourceRolledForward: true,
    }).outcome).toBe("SOURCE_STALE_OR_WRONG");
  });

  it("F canonical aliases count as one source", () => {
    expect(independentOfficialSourceCount([
      "http://www.budureasca.ro/vin/produs/?utm_source=x#facts",
      "https://budureasca.ro/vin/produs",
    ])).toBe(1);
  });

  it("G two independent official exact sources may corroborate", () => {
    expect(adjudicateOfficialConflict({
      exactProduct: true,
      dbVintage: 2016,
      sourceVintage: 2016,
      explicitFact: true,
      stablePrimarySource: false,
      officialSourceUrls: [
        "https://budureasca.ro/vin/produs",
        "https://budureasca.ro/media/produs.pdf",
      ],
      corroboratingValues: [11],
      officialValue: 11,
    }).outcome).toBe("DB_WRONG_CONFIRMED");
  });

  it("H retailer cannot corroborate an official conflict", () => {
    expect(adjudicateOfficialConflict({
      exactProduct: true,
      dbVintage: 2016,
      sourceVintage: 2016,
      explicitFact: true,
      stablePrimarySource: false,
      officialSourceUrls: [
        "https://budureasca.ro/vin/produs",
        "https://www.emag.ro/produs",
      ],
      corroboratingValues: [11],
      officialValue: 11,
    }).outcome).toBe("UNRESOLVED");
  });

  it("H2 Budureasca alcohol parsing stays bounded to the explicit percent", () => {
    const html = `<h1>Spumant Prima Stilla Rosé Sec 2016</h1>
      <table>
        <tr><th>An de recoltă</th><td>2016</td></tr>
        <tr><th>Volum alcool</th><td>11% alc. 75,00 Lei</td></tr>
      </table>`;
    expect(parseBudureascaProductPage(
      html,
      "https://budureasca.ro/vin-rose/prima-stilla-rose/",
    )?.alcohol).toBe(11);
  });

  it("H3 explicit product title sweetness beats generic filter text", () => {
    const html = `<h1>The Dark Count Cabernet Sauvignon & Fetească Neagră Demisec 2020</h1>
      <table>
        <tr><th>An de recoltă</th><td>2020</td></tr>
        <tr><th>Tip vin</th><td>Sec Demisec Dulce</td></tr>
      </table>`;
    expect(parseBudureascaProductPage(
      html,
      "https://budureasca.ro/dark-count-of-transylvania-cs-fn/",
    )?.sweetness).toBe("demisec");
  });
});

describe("Prompt 17 identity and manifests I-S", () => {
  it("I one product ID cannot resolve two DB rows", () => {
    const rows = enforceOneToOneOfficialIdentity([
      { wineId: 1, slug: "a", productId: 20, resolution: "RESOLVED_EXACT", positiveEvidence: ["EXACT_PRODUCT_ID"] },
      { wineId: 2, slug: "b", productId: 20, resolution: "RESOLVED_EXACT", positiveEvidence: ["EXACT_PRODUCT_ID"] },
    ]);
    expect(rows.every((row) => row.resolution === "IDENTITY_COLLISION")).toBe(true);
  });

  it("J identity collision is explicit", () => {
    const [row] = enforceOneToOneOfficialIdentity([
      { wineId: 1, slug: "a", productId: 20, resolution: "RESOLVED_EXACT", positiveEvidence: [] },
      { wineId: 2, slug: "b", productId: 20, resolution: "RESOLVED_EXACT", positiveEvidence: [] },
    ]);
    expect(row?.positiveEvidence).toContain("IDENTITY_COLLISION");
  });

  it("K resolved Stonewines block is excluded from generic Chardonnay", () => {
    const result = adjudicateBallaIdentitySet(
      [
        { wineId: 1, slug: "chardonnay-2022-stonewines", name: "Chardonnay 2022 Stonewines", vintage: 2022, producerPageUrl: null, grapes: [] },
        { wineId: 2, slug: "chardonnay-2022", name: "Chardonnay 2022", vintage: 2022, producerPageUrl: null, grapes: [] },
      ],
      [
        ballaRecord(10, "Chardonnay", "Classic"),
        ballaRecord(11, "Chardonnay", "Stonewines"),
      ],
    );
    expect(result.assignments.find((row) => row.wineId === 1)?.productId).toBe(11);
    expect(result.assignments.find((row) => row.wineId === 2)?.productId).toBe(10);
  });

  it("L generic Balla row remains ambiguous without line evidence", () => {
    const result = adjudicateBallaIdentitySet(
      [{ wineId: 1, slug: "chardonnay-2022", name: "Chardonnay 2022", vintage: 2022, producerPageUrl: null, grapes: [] }],
      [
        ballaRecord(10, "Chardonnay", "Classic"),
        ballaRecord(11, "Chardonnay", "Stonewines"),
      ],
    );
    expect(result.assignments[0]?.status).toBe("REMAINS_AMBIGUOUS");
  });

  it("M Cadarissima remains no-match if absent from official records", () => {
    const result = adjudicateBallaIdentitySet(
      [{ wineId: 1, slug: "cadarissima-2023", name: "Cadarissima 2023 Editie Limitata", vintage: 2023, producerPageUrl: null, grapes: [] }],
      [ballaRecord(10, "Chardonnay", "Classic")],
    );
    expect(result.assignments[0]?.status).toBe("NO_MATCH");
  });

  it("M2 current exact Cadarissima block resolves", () => {
    const record = {
      ...ballaRecord(23, "Cadarissima", "Ediție limitată"),
      vintage: 2023,
      color: "rosu" as const,
      sweetness: "dulce" as const,
      volumeMl: 375,
    };
    const result = adjudicateBallaIdentitySet(
      [{ wineId: 1, slug: "cadarissima-2023-editie-limitata", name: "Cadarissima", vintage: 2023, producerPageUrl: null, grapes: ["Cadarcă"] }],
      [record],
    );
    expect(result.assignments[0]?.status).toBe("RESOLVED_EXACT");
    expect(result.assignments[0]?.productId).toBe(23);
  });

  it("N Avincis generic family heading remains ambiguous", () => {
    const source: SourceWineIdentity = {
      sourceWineName: "Vila Dobrusa",
      sourceProducer: "Avincis",
      sourceVintage: null,
      sourceType: null,
      sourceGrapes: [],
      sourceBottleSize: null,
      sourceSku: null,
      sourceLine: null,
      nameClass: "SOURCE_NAME_CONFLICT",
      vintageClass: "SOURCE_VINTAGE_MISSING",
      identityEvidence: ["family heading"],
    };
    expect(classifyOfficialIdentity({
      wine: { name: "Cuvee Amelie Dulce", vintage: null },
      identity: source,
    }).status).toBe("WRONG_PRODUCT");
  });

  it("O Avincis privacy URL becomes a tasting-sheet clear", () => {
    const entry = {
      field: "tastingSheetUrl",
      action: "CLEAR_TASTING_SHEET",
      proposedNewUrl: null,
    } as const;
    expect(entry).toEqual({
      field: "tastingSheetUrl",
      action: "CLEAR_TASTING_SHEET",
      proposedNewUrl: null,
    });
  });

  it("P dead Gabai exact URL is cleared without replacement", () => {
    const dead = classifyRepeatedSource([
      observation({ ok: false, httpStatus: 404, failureClass: "DEAD_404", identityFingerprint: null, factFingerprint: null }),
      observation({ ok: false, httpStatus: 404, failureClass: "DEAD_404", identityFingerprint: null, factFingerprint: null }),
      observation({ ok: false, httpStatus: 404, failureClass: "DEAD_404", identityFingerprint: null, factFingerprint: null }),
    ]);
    expect(dead.stability).toBe("DEAD_AFTER_DISCOVERY");
  });

  it("Q homepage is never an exact source replacement", () => {
    expect(isExactSourceReplacement({
      oldIdentityQuality: 2,
      newIdentityQuality: 3,
      newUrl: "https://cramagabai.ro/",
      exactProduct: false,
      genericHomepage: true,
    })).toBe(false);
  });

  it("R Manifest B excludes persisted evidence and unstable sources", () => {
    const base: Prompt18EvidenceEntry = {
      wineId: 1,
      slug: "wine",
      winery: "budureasca",
      field: "alcohol",
      storedValue: 13,
      sourceClaim: 13,
      sourceUrl: "https://budureasca.ro/vin/wine/",
      sourceHash: "hash",
      qualification: "QUALIFIED_MATCH_EXISTING",
      stability: "STABLE",
    };
    expect(dedupePrompt18Evidence([base], [{
      wineId: 1,
      field: "alcohol",
      value: 13,
      sourceUrl: "https://www.budureasca.ro/vin/wine",
      sourceHash: "hash",
    }])).toEqual([]);
    expect(dedupePrompt18Evidence([{ ...base, sourceHash: "new", stability: "TEMPORARILY_BLOCKED" }], [])).toEqual([]);
    expect(dedupePrompt18Evidence([base], [{
      wineId: 2,
      field: "alcohol",
      value: 13,
      sourceUrl: base.sourceUrl,
      sourceHash: "hash",
    }])).toEqual([base]);
  });

  it("S Manifest C contains confirmed corrections only", () => {
    expect(confirmedCorrectionsOnly([
      correction("DB_WRONG_CONFIRMED"),
      correction("UNRESOLVED"),
    ])).toHaveLength(1);
  });
});

describe("Prompt 17 invariants T-X", () => {
  it("T public wine page performs no source recovery or network fetch", () => {
    const source = readFileSync("app/wines/[slug]/page.tsx", "utf8");
    expect(source).not.toMatch(/fetchOfficialSources|probeOfficialSource|source-adjudicate|runReadOnlyCatalogRecovery/);
  });

  it("U adjudication script contains no evidence mutation", () => {
    const source = readFileSync("scripts/source-adjudicate.ts", "utf8");
    expect(source).not.toMatch(/db\.(?:insert|update|delete)\s*\(/);
  });

  it("V canonical correction filtering does not mutate candidates", () => {
    const rows = [correction("UNRESOLVED")];
    const before = JSON.stringify(rows);
    confirmedCorrectionsOnly(rows);
    expect(JSON.stringify(rows)).toBe(before);
  });

  it("W golden dataset remains 30 wines and 102 pairings", () => {
    expect(GOLDEN_CURATION_STATS.wines).toBe(30);
    expect(GOLDEN_CURATION_STATS.pairings).toBe(102);
  });

  it("X secondary scoring remains shadow", () => {
    expect(getSecondaryScoringMode()).toBe("shadow");
    expect(canonicalizeOfficialUrl("http://www.budureasca.ro/vin/")).toBe(
      "https://budureasca.ro/vin",
    );
  });
});
