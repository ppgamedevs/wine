import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  matchBudureascaWineRecord,
  type BudureascaWineRecord,
} from "@/lib/budureasca-producer";
import {
  parseAllBallaGezaWinesFromCatalog,
  resolveBallaGezaWineFromCatalogResult,
} from "@/lib/ballageza-producer";
import { classifyHttpFailure, type FetchedSource, type SourceFetchAttempt } from "@/lib/tech-facts/fetch-source";
import {
  buildOfficialWineSourceCandidate,
  classifyDocumentStatus,
  classifyOfficialIdentity,
  classifySourceDrift,
  classifyTechnicalClaim,
} from "@/lib/tech-facts/official-source-recovery";
import {
  classifyPdfDocument,
  isRejectedTechnicalDocumentUrl,
} from "@/lib/tech-facts/pdf-classify";
import {
  parseResidualSugarClaim,
  parseTotalAcidityClaim,
} from "@/lib/tech-facts/parse";
import type { RecoverableWine } from "@/lib/tech-facts/recover";
import { extractSourceIdentityFromText, type SourceWineIdentity } from "@/lib/tech-facts/source-identity";
import type { TechFactClaim } from "@/lib/tech-facts/types";

function wine(overrides: Partial<RecoverableWine> = {}): RecoverableWine {
  return {
    id: 1,
    slug: "crama-cuvee-2023",
    name: "Cuvee Sec",
    wineryName: "Crama",
    winerySlug: "crama",
    vintage: 2023,
    type: "red",
    sweetness: "sec",
    alcohol: 13,
    acidity: null,
    sugar: null,
    grapeVarieties: [],
    producerPageUrl: "https://crama.example/vinuri/cuvee-2023",
    tastingSheetUrl: null,
    sourceUrl: null,
    tastingNotes: null,
    producerContent: null,
    valueScore: 70,
    giftScore: null,
    foodMatchScore: null,
    ...overrides,
  };
}

function identity(overrides: Partial<SourceWineIdentity> = {}): SourceWineIdentity {
  return {
    sourceWineName: "Cuvee Sec",
    sourceProducer: "Crama",
    sourceVintage: 2023,
    sourceType: "red",
    sourceGrapes: [],
    sourceBottleSize: 750,
    sourceSku: null,
    sourceLine: null,
    nameClass: "SOURCE_NAME_EXACT",
    vintageClass: "SOURCE_VINTAGE_EXPLICIT",
    identityEvidence: ["fixture"],
    ...overrides,
  };
}

function claim(overrides: Partial<TechFactClaim> = {}): TechFactClaim {
  return {
    field: "alcohol",
    value: 13,
    unit: "% vol",
    sourceUrl: "https://crama.example/vinuri/cuvee-2023",
    sourceType: "producer_page",
    sourceWineName: "Cuvee Sec",
    sourceVintage: 2023,
    sourceDocumentTitle: "Cuvee Sec 2023",
    excerpt: "Alcool 13% vol",
    extractionMethod: "deterministic",
    identityMatchClass: "EXACT_WINE_EXACT_VINTAGE",
    sourceNameClass: "SOURCE_NAME_EXACT",
    sourceVintageClass: "SOURCE_VINTAGE_EXPLICIT",
    confidence: 0.9,
    observedAt: "2026-08-18T00:00:00.000Z",
    sourceHash: "a".repeat(64),
    claimIdentityHash: "b".repeat(64),
    ...overrides,
  };
}

function fetched(overrides: Partial<FetchedSource> = {}): FetchedSource {
  return {
    url: "https://crama.example/vinuri/cuvee-2023",
    finalUrl: "https://crama.example/vinuri/cuvee-2023",
    httpStatus: 200,
    text: "Cuvee Sec 2023 Alcool 13% vol",
    html: "<h1>Cuvee Sec 2023</h1>",
    isPdf: false,
    redirected: false,
    contentType: "text/html",
    ...overrides,
  };
}

function attempt(overrides: Partial<SourceFetchAttempt> = {}): SourceFetchAttempt {
  return {
    url: "https://crama.example/vinuri/cuvee-2023",
    ok: true,
    httpStatus: 200,
    contentType: "text/html",
    redirected: false,
    finalUrl: "https://crama.example/vinuri/cuvee-2023",
    failureClass: null,
    reason: null,
    ...overrides,
  };
}

function budRecord(overrides: Partial<BudureascaWineRecord> = {}): BudureascaWineRecord {
  return {
    name: "Clasic Feteasca Neagra Sec",
    vintage: 2021,
    line: "Clasic",
    color: "rosu",
    sweetness: "sec",
    grapeVarieties: [],
    alcohol: 13.5,
    volumeMl: 750,
    price: 35,
    imageUrl: null,
    tastingNotes: null,
    producerPageUrl: "https://budureasca.ro/vin-clasic/feteasca-neagra-sec/",
    sku: "CL-FN-S-21",
    ...overrides,
  };
}

function ballaBlock(input: {
  id: number;
  name: string;
  vintage: number;
  category: string;
  acidity?: string;
  sugar?: string;
}): string {
  return `<div id="product-${input.id}">
    <div class="wine__name">${input.name}</div>
    <li><span>An de producție:</span> ${input.vintage}</li>
    <li><span>Categoria:</span> ${input.category}</li>
    <li><span>Culoare:</span> roșu</li>
    <li><span>Tip:</span> sec</li>
    <li><span>Alcool:</span> 13.5 % vol</li>
    ${input.acidity ? `<li><span>Aciditate:</span> ${input.acidity}</li>` : ""}
    ${input.sugar ? `<li><span>Zahăr rezidual:</span> ${input.sugar}</li>` : ""}
  </div>`;
}

describe("Prompt 16 source identity and cleanup A-K", () => {
  it("A exact product exact vintage is valid", () => {
    expect(classifyOfficialIdentity({ wine: wine(), identity: identity() }).status).toBe("VALID_EXACT_VINTAGE");
  });
  it("B exact product different vintage is wrong vintage", () => {
    expect(classifyOfficialIdentity({ wine: wine(), identity: identity({ sourceVintage: 2025 }) }).status).toBe("WRONG_VINTAGE");
  });
  it("C same family different sweetness is wrong product", () => {
    expect(classifyOfficialIdentity({ wine: wine(), identity: identity({ sourceWineName: "Cuvee Demisec" }) }).status).toBe("WRONG_PRODUCT");
  });
  it("D privacy PDF is wrong document", () => {
    expect(classifyDocumentStatus("tasting_sheet", "PRIVACY_POLICY")).toBe("WRONG_DOCUMENT");
  });
  it("E redirect to homepage is invalid", () => {
    const candidate = buildOfficialWineSourceCandidate({
      wine: wine(),
      descriptor: { url: fetched().url, purpose: "producer_page", discoveryMethod: "stored_producer_page" },
      fetched: fetched({ redirected: true, finalUrl: "https://crama.example/" }),
      attempt: attempt({ redirected: true, finalUrl: "https://crama.example/" }),
      identity: null,
      pdfClass: null,
    });
    expect(candidate.healthStatus).toBe("REDIRECTED_DIFFERENT_PRODUCT");
  });
  it("F redirect to different vintage is reclassified", () => {
    const candidate = buildOfficialWineSourceCandidate({
      wine: wine(),
      descriptor: { url: fetched().url, purpose: "producer_page", discoveryMethod: "stored_producer_page" },
      fetched: fetched({ redirected: true, finalUrl: "https://crama.example/cuvee-2025" }),
      attempt: attempt({ redirected: true, finalUrl: "https://crama.example/cuvee-2025" }),
      identity: identity({ sourceVintage: 2025 }),
      pdfClass: null,
    });
    expect(candidate.healthStatus).toBe("REDIRECTED_DIFFERENT_PRODUCT");
  });
  it("G transient 503 is server error, never dead", () => {
    expect(classifyHttpFailure(503)).toBe("SERVER_ERROR");
    expect(classifyHttpFailure(503)).not.toBe("DEAD_404");
  });
  it("H 404 is dead", () => expect(classifyHttpFailure(404)).toBe("DEAD_404"));
  it("I anti-bot 403 is blocked", () => expect(classifyHttpFailure(403)).toBe("FETCH_BLOCKED"));
  it("J exact isolated catalog block is valid", () => {
    expect(classifyOfficialIdentity({ wine: wine(), identity: identity(), exactCatalogBlock: true }).status).toBe("VALID_EXACT_CATALOG_BLOCK");
  });
  it("K generic catalog without identity is generic", () => {
    expect(classifyOfficialIdentity({ wine: wine(), identity: null, finalUrl: "https://crama.example/catalog/" }).status).toBe("GENERIC_WINERY_PAGE");
  });
});

describe("Prompt 16 Budureasca L-P", () => {
  it("L 2021 Sec cannot match 2025 Demisec", () => {
    const result = matchBudureascaWineRecord(
      [budRecord({ vintage: 2025, sweetness: "demisec", name: "Clasic Feteasca Neagra Demisec" })],
      { name: "Clasic Feteasca Neagra Sec", vintage: 2021, sweetness: "sec", color: "rosu" },
    );
    expect(result.status).toBe("NO_MATCH");
  });
  it("M DB vintage never supplies a missing source vintage", () => {
    const result = matchBudureascaWineRecord([budRecord({ vintage: null })], {
      name: "Clasic Feteasca Neagra Sec",
      vintage: 2021,
      sweetness: "sec",
      color: "rosu",
    });
    expect(result.status).toBe("EXACT_PRODUCT_UNDATED");
    expect(result.wine?.vintage).toBeNull();
  });
  it("N copyright year does not become vintage", () => {
    const found = extractSourceIdentityFromText({ text: "Cuvee Sec Copyright 2026", title: "Cuvee Sec" });
    expect(found.sourceVintage).toBeNull();
  });
  it("O exact SKU disambiguates same-name products", () => {
    const result = matchBudureascaWineRecord(
      [budRecord(), budRecord({ sku: "OTHER", vintage: 2022 })],
      { name: "Clasic Feteasca Neagra Sec", vintage: 2021, sku: "CL-FN-S-21" },
    );
    expect(result.status).toBe("EXACT_MATCH");
    expect(result.wine?.sku).toBe("CL-FN-S-21");
  });
  it("P replacement is a candidate and does not mutate DB input", () => {
    const dbWine = wine({ producerPageUrl: "https://budureasca.ro/stale/" });
    const result = matchBudureascaWineRecord([budRecord()], {
      name: "Clasic Feteasca Neagra Sec",
      vintage: 2021,
    });
    expect(result.wine?.producerPageUrl).not.toBe(dbWine.producerPageUrl);
    expect(dbWine.producerPageUrl).toBe("https://budureasca.ro/stale/");
  });
});

describe("Prompt 16 Avincis Q-U", () => {
  it("Q policy URL never qualifies", () => {
    expect(isRejectedTechnicalDocumentUrl("https://avincis.ro/politica-confidentialitate.pdf")).toBe(true);
  });
  it("R brochure is refused before storage", () => {
    expect(isRejectedTechnicalDocumentUrl("https://avincis.ro/catalog-general-brosura.pdf")).toBe(true);
  });
  it("S exact technical PDF can qualify as replacement candidate", () => {
    expect(classifyPdfDocument({ text: "Fisa tehnica Cuvee Amelie Alcool 12.5% vol", title: "Cuvee Amelie" })).toBe("WINE_TECHNICAL_SHEET");
  });
  it("T invalid tasting sheet with no replacement proposes clear", () => {
    const candidate = buildOfficialWineSourceCandidate({
      wine: wine(),
      descriptor: { url: "https://avincis.ro/privacy.pdf", purpose: "tasting_sheet", discoveryMethod: "stored_tasting_sheet" },
      fetched: null,
      attempt: null,
      identity: null,
      pdfClass: "PRIVACY_POLICY",
    });
    expect(candidate.proposedAction).toBe("CLEAR_TASTING_SHEET");
  });
  it("U generic Vila Dobrusa cannot prove Cuvee Amelie", () => {
    expect(classifyOfficialIdentity({
      wine: wine({ name: "Cuvee Amelie Dulce" }),
      identity: identity({ sourceWineName: "Vila Dobrusa" }),
    }).status).toBe("WRONG_PRODUCT");
  });
});

describe("Prompt 16 Balla V-Z", () => {
  const html = [
    ballaBlock({ id: 24, name: "Chardonnay", vintage: 2022, category: "Kolna" }),
    ballaBlock({ id: 25, name: "Chardonnay", vintage: 2022, category: "Stonewines" }),
  ].join("");
  it("V parser exposes productId", () => {
    expect(parseAllBallaGezaWinesFromCatalog(html).map((row) => row.productId)).toEqual([24, 25]);
  });
  it("W line mismatch prevents exact classification", () => {
    const result = resolveBallaGezaWineFromCatalogResult(html, "https://www.ballageza.com/ro/catalog/vinuri/chardonnay,2022-reserve", "Chardonnay 2022 Reserve");
    expect(result.status).not.toBe("EXACT_MATCH");
  });
  it("X Stonewines and Kolna do not cross-contaminate", () => {
    const result = resolveBallaGezaWineFromCatalogResult(html, "https://www.ballageza.com/ro/catalog/vinuri/chardonnay,2022-stonewines", "Chardonnay 2022 Stonewines");
    expect(result.wine?.category).toBe("Stonewines");
  });
  it("Y matcher has no first-match fallback", () => {
    const result = resolveBallaGezaWineFromCatalogResult(html, "https://www.ballageza.com/ro/catalog/vinuri/chardonnay,2022", "Chardonnay 2022");
    expect(result.status).toBe("AMBIGUOUS_MATCH");
  });
  it("Z Cadarissima remains no-match without positive identity", () => {
    const result = resolveBallaGezaWineFromCatalogResult(html, "https://www.ballageza.com/ro/catalog/vinuri/cadarissima,2023-editie-limitata", "Cadarissima 2023 Editie Limitata");
    expect(result.status).toBe("NO_MATCH");
  });
});

describe("Prompt 16 technical facts AA-AG", () => {
  it("AA explicit residual sugar g/L is accepted", () => {
    expect(parseResidualSugarClaim("Zahăr rezidual: 4,2 g/L")?.value).toBe(4.2);
  });
  it("AB sweetness label cannot become residual sugar", () => {
    expect(parseResidualSugarClaim("Vin demidulce, cu aromă dulce")).toBeNull();
  });
  it("AC total acidity is accepted", () => {
    expect(parseTotalAcidityClaim("Aciditate totală: 5,8 g/L")?.value).toBe(5.8);
  });
  it("AD pH is rejected as total acidity", () => {
    expect(parseTotalAcidityClaim("pH: 3.4")).toBeNull();
  });
  it("AE volatile acidity is rejected as total acidity", () => {
    expect(parseTotalAcidityClaim("Aciditate volatilă: 0,4 g/L")).toBeNull();
  });
  it("AF wrong-vintage alcohol is not safe", () => {
    expect(classifyTechnicalClaim(wine(), claim({ sourceVintage: 2025 }), "WRONG_VINTAGE")?.classification).toBe("DIFFERENT_VINTAGE");
  });
  it("AG official conflict is reported", () => {
    expect(classifyTechnicalClaim(wine(), claim({ value: 14 }), "VALID_EXACT_VINTAGE")?.classification).toBe("OFFICIAL_CONFLICT");
  });
});

describe("Prompt 16 source health AH-AL", () => {
  it("AH transient outage is human review, not evidence deletion", () => {
    const candidate = buildOfficialWineSourceCandidate({
      wine: wine(),
      descriptor: { url: fetched().url, purpose: "producer_page", discoveryMethod: "stored_producer_page" },
      fetched: null,
      attempt: attempt({ ok: false, httpStatus: 503, failureClass: "SERVER_ERROR", reason: "HTTP 503" }),
      identity: null,
      pdfClass: null,
    });
    expect(candidate.proposedAction).toBe("HUMAN_REVIEW");
  });
  it("AI 2023 to 2025 is detected as vintage roll-forward", () => {
    expect(classifySourceDrift({
      persistedWineName: "Cuvee Sec",
      persistedVintage: 2023,
      persistedValue: 13,
      currentWineName: "Cuvee Sec",
      currentVintage: 2025,
      currentValue: 13.5,
      field: "alcohol",
    })).toBe("VINTAGE_ROLLED_FORWARD");
  });
  it("AJ layout/name decoration with same fact is non-material", () => {
    expect(classifySourceDrift({
      persistedWineName: "Cuvee Sec",
      persistedVintage: 2023,
      persistedValue: 13,
      currentWineName: "Cuvee Sec Wine",
      currentVintage: 2023,
      currentValue: 13,
      field: "alcohol",
    })).toBe("NON_MATERIAL_PAGE_CHANGE");
  });
  it("AK broken evidence link is classified dead", () => {
    expect(classifyHttpFailure(410)).toBe("DEAD_404");
  });
  it("AL public renderer imports no recovery or fetch code", () => {
    const page = readFileSync("app/wines/[slug]/page.tsx", "utf8");
    expect(page).not.toMatch(/fetchOfficialSources|runReadOnlyCatalogRecovery|official-source-recovery/);
  });
});
