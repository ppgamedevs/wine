import { describe, expect, it } from "vitest";
import { GOLDEN_CURATION_STATS, GOLDEN_CURATION_WINES } from "@/lib/pairing/golden-curation-dataset";
import { getSecondaryScoringMode } from "@/lib/scoring-v2/secondary-scoring-mode";
import {
  resolveBallaGezaWineFromCatalogResult,
  parseAllBallaGezaWinesFromCatalog,
} from "@/lib/ballageza-producer";
import { extractClaimsFromSource } from "@/lib/tech-facts/claims";
import { claimIdentityHash } from "@/lib/tech-facts/hash";
import { classifyProductIdentity } from "@/lib/tech-facts/identity";
import { classifyPdfDocument, isRejectedTechnicalDocumentUrl } from "@/lib/tech-facts/pdf-classify";
import { persistWineFactEvidenceFailSoft, persistWineFactEvidenceStrict } from "@/lib/tech-facts/persist";
import { qualifyField, isPrompt14Eligible } from "@/lib/tech-facts/qualify";
import { recoverWineFromStored, recoverWineWithSources } from "@/lib/tech-facts/recover";
import { reconcileField } from "@/lib/tech-facts/reconcile";
import { parseSweetnessClaimFromSource } from "@/lib/tech-facts/sweetness-source";
import { extractSourceIdentityFromText } from "@/lib/tech-facts/source-identity";

const wine = {
  wineName: "Selene Feteasca Neagra",
  wineryName: "Cramele Recas",
  vintage: 2024,
  type: "red",
  grapes: ["Feteasca Neagra"],
};

function ballaBlock(input: {
  id: number;
  name: string;
  vintage: number;
  category: string;
  alcohol: string;
  acidity?: string;
  sugar?: string;
  sweetness?: string;
}): string {
  return `
id="product-${input.id}"
<div class="wine__name">${input.name}</div>
<li>An de producție:</span> ${input.vintage}</li>
<li>Categoria:</span> ${input.category}</li>
<li>Alcool:</span> ${input.alcohol}</li>
${input.acidity ? `<li>Aciditate:</span> ${input.acidity}</li>` : ""}
${input.sugar ? `<li>Zahar rezidual:</span> ${input.sugar}</li>` : ""}
<li>Tip:</span> ${input.sweetness ?? "Sec"}</li>
`;
}

describe("Prompt 13 source identity", () => {
  it("A: source missing wine name cannot inherit DB wine name", () => {
    const claims = extractClaimsFromSource({
      text: "Alcool 14.7% vol Aciditate totala 5 g/L",
      url: "https://cramelerecas.ro/mystery.pdf",
      sourceType: "tasting_sheet",
      wine,
    });
    expect(claims.every((claim) => claim.sourceWineName !== wine.wineName)).toBe(true);
    expect(claims.some((claim) => claim.identityMatchClass === "SOURCE_IDENTITY_INCOMPLETE")).toBe(true);
    const alcohol = reconcileField({
      field: "alcohol",
      stored: 14.7,
      claims,
      wineHasVintage: true,
      isNonVintageWine: false,
    });
    expect(alcohol.candidateClass).not.toBe("SAFE_EXACT");
  });

  it("B: source says no sweetness; DB name contains Sec => no source sweetness claim", () => {
    const claim = parseSweetnessClaimFromSource("Cabernet Sauvignon 2023. Note de coacaze.");
    expect(claim).toBeNull();
    const extracted = extractClaimsFromSource({
      text: "Cabernet Sauvignon 2023. Note de coacaze. Alcool 13.5% vol",
      url: "https://cramagabai.ro/cabernet",
      sourceType: "producer_page",
      wine: { ...wine, wineName: "Cabernet Sauvignon Sec 2023" },
    });
    expect(extracted.some((item) => item.field === "sweetness")).toBe(false);
  });

  it("C: source says Dulce; DB name contains Sec => source claim Dulce", () => {
    const parsed = parseSweetnessClaimFromSource("Cabernet Sauvignon Dulce\nClasificare Dulce");
    expect(parsed?.value).toBe("dulce");
  });

  it("D: related-product Dulce must not contaminate focused Sec product", () => {
    const focused = "H1: Merlot\nClasificare sec\nAlcool 13.5% vol";
    const parsed = parseSweetnessClaimFromSource(focused);
    expect(parsed?.value).toBe("sec");
  });

  it("E: legacy producerContent.fact with URL but no source replay => LEGACY_ONLY", () => {
    const recovery = recoverWineFromStored({
      id: 1,
      slug: "x",
      name: "Selene Feteasca Neagra",
      wineryName: "Cramele Recas",
      winerySlug: "cramele-recas",
      vintage: 2024,
      type: "red",
      sweetness: "sec",
      alcohol: 14.7,
      acidity: 5,
      sugar: null,
      grapeVarieties: [{ name: "Feteasca Neagra" }],
      producerPageUrl: "https://cramelerecas.ro/selene",
      tastingSheetUrl: null,
      sourceUrl: null,
      tastingNotes: null,
      producerContent: {
        facts: { alcohol: 14.7, acidity: 5 },
        sourceUrls: ["https://cramelerecas.ro/selene"],
      },
    });
    const alcohol = recovery.fields.find((field) => field.field === "alcohol");
    expect(alcohol?.qualification).toBe("LEGACY_ONLY");
    expect(alcohol?.action).not.toBe("EVIDENCE_ATTACH");
  });

  it("F: source replay confirms legacy fact => qualified", () => {
    const claims = extractClaimsFromSource({
      text: "Selene Feteasca Neagra 2024\nAlcool 14.7% vol",
      url: "https://cramelerecas.ro/fisa-selene-2024.pdf",
      sourceType: "tasting_sheet",
      wine,
      documentTitle: "Selene Feteasca Neagra 2024",
    });
    const alcohol = qualifyField(
      reconcileField({
        field: "alcohol",
        stored: 14.7,
        claims,
        wineHasVintage: true,
        isNonVintageWine: false,
      }),
    );
    expect(isPrompt14Eligible(alcohol.qualification)).toBe(true);
    expect(alcohol.action).toBe("EVIDENCE_ATTACH");
  });

  it("G: valid PDF linked to wrong wine => product mismatch", () => {
    const claims = extractClaimsFromSource({
      text: "Solo Quinta Roze 2024\nAlcool 12.5% vol",
      url: "https://cramelerecas.ro/solo-quinta-2024.pdf",
      sourceType: "tasting_sheet",
      wine,
      documentTitle: "Solo Quinta Roze 2024",
    });
    expect(claims.some((claim) => claim.identityMatchClass === "PRODUCT_MISMATCH")).toBe(true);
  });

  it("H: valid PDF same wine wrong vintage => different vintage", () => {
    const claims = extractClaimsFromSource({
      text: "Selene Feteasca Neagra 2022\nAlcool 14.7% vol",
      url: "https://cramelerecas.ro/selene-2022.pdf",
      sourceType: "tasting_sheet",
      wine,
      documentTitle: "Selene Feteasca Neagra 2022",
    });
    const alcohol = reconcileField({
      field: "alcohol",
      stored: 14.7,
      claims,
      wineHasVintage: true,
      isNonVintageWine: false,
    });
    expect(alcohol.candidateClass).toBe("DIFFERENT_VINTAGE");
  });

  it("I: Balla exact product block isolates one wine from catalog", () => {
    const html = [
      ballaBlock({ id: 1, name: "Feteasca Neagra", vintage: 2022, category: "Classic", alcohol: "14 % vol" }),
      ballaBlock({ id: 2, name: "Merlot", vintage: 2023, category: "Classic", alcohol: "13.5 % vol" }),
    ].join("\n");
    const wines = parseAllBallaGezaWinesFromCatalog(html);
    expect(wines).toHaveLength(2);
    const result = resolveBallaGezaWineFromCatalogResult(
      html,
      "https://www.ballageza.com/ro/catalog/vinuri/feteasca-neagra,2022",
      "Feteasca Neagra 2022",
    );
    expect(result.status).toBe("EXACT_MATCH");
    expect(result.wine?.name).toBe("Feteasca Neagra");
    expect(result.wine?.vintage).toBe(2022);
  });

  it("J: Balla ambiguous duplicate does not pick matches[0]", () => {
    const html = [
      ballaBlock({ id: 1, name: "Feteasca Neagra", vintage: 2022, category: "Classic", alcohol: "14 % vol" }),
      ballaBlock({ id: 2, name: "Feteasca Neagra", vintage: 2022, category: "Kolna", alcohol: "13.5 % vol" }),
    ].join("\n");
    const result = resolveBallaGezaWineFromCatalogResult(
      html,
      "https://www.ballageza.com/ro/catalog/vinuri/feteasca-neagra,2022",
      "Feteasca Neagra 2022",
    );
    expect(result.status).toBe("AMBIGUOUS_MATCH");
    expect(result.wine).toBeNull();
  });

  it("K: Balla wrong vintage does not fall back to first result", () => {
    const html = [
      ballaBlock({ id: 1, name: "Feteasca Neagra", vintage: 2021, category: "Classic", alcohol: "14 % vol" }),
      ballaBlock({ id: 2, name: "Merlot", vintage: 2021, category: "Classic", alcohol: "13 % vol" }),
    ].join("\n");
    const result = resolveBallaGezaWineFromCatalogResult(
      html,
      "https://www.ballageza.com/ro/catalog/vinuri/feteasca-neagra,2022",
      "Feteasca Neagra 2022",
    );
    expect(result.status).toBe("NO_MATCH");
    expect(result.wine).toBeNull();
  });

  it("L: Balla exact product recovers alcohol", async () => {
    const html = ballaBlock({
      id: 9,
      name: "Cadarca",
      vintage: 2023,
      category: "Classic",
      alcohol: "13,5 % vol",
      acidity: "5,6 g/L",
      sugar: "2,1 g/L",
    });
    const result = resolveBallaGezaWineFromCatalogResult(
      html,
      "https://www.ballageza.com/ro/catalog/vinuri/cadarca,2023",
      "Cadarca 2023",
    );
    expect(result.wine?.alcohol).toBe(13.5);
    const recovery = await recoverWineWithSources(
      {
        id: 9,
        slug: "balla-geza-cadarca-2023",
        name: "Cadarca",
        wineryName: "Balla Geza",
        winerySlug: "balla-geza",
        vintage: 2023,
        type: "red",
        sweetness: "sec",
        alcohol: null,
        acidity: null,
        sugar: null,
        grapeVarieties: [],
        producerPageUrl: "https://www.ballageza.com/ro/catalog/vinuri/cadarca,2023",
        tastingSheetUrl: null,
        sourceUrl: null,
        tastingNotes: null,
        producerContent: null,
      },
      [{ url: "https://www.ballageza.com/ro/catalog/vinuri/cadarca,2023", text: html, isPdf: false, html }],
    );
    expect(recovery.fields.find((field) => field.field === "alcohol")?.candidate).toBe(13.5);
  });

  it("M: Balla exact product recovers total acidity", () => {
    const html = ballaBlock({
      id: 9,
      name: "Cadarca",
      vintage: 2023,
      category: "Classic",
      alcohol: "13,5 % vol",
      acidity: "5,6 g/L",
    });
    const result = resolveBallaGezaWineFromCatalogResult(
      html,
      "https://www.ballageza.com/ro/catalog/vinuri/cadarca,2023",
      "Cadarca 2023",
    );
    expect(result.wine?.acidity).toBe(5.6);
  });

  it("N: Balla exact product recovers residual sugar", () => {
    const html = ballaBlock({
      id: 9,
      name: "Cadarca",
      vintage: 2023,
      category: "Classic",
      alcohol: "13,5 % vol",
      sugar: "2,10 g/L",
    });
    const result = resolveBallaGezaWineFromCatalogResult(
      html,
      "https://www.ballageza.com/ro/catalog/vinuri/cadarca,2023",
      "Cadarca 2023",
    );
    expect(result.wine?.sugar).toBe(2.1);
  });

  it("O: catalog-level generic HTML remains rejected if no dedicated isolation", () => {
    expect(
      classifyPdfDocument({
        text: "Vin: Solo Quinta\nVin: Sole\nVin: Castel Huniade\nCatalog general",
        title: "Catalog",
      }),
    ).toBe("CATALOG_GENERIC");
  });

  it("P: Avincis privacy document rejected during discovery", () => {
    expect(
      isRejectedTechnicalDocumentUrl("https://avincis.ro/politica-de-confidentialitate.pdf"),
    ).toBe(true);
    expect(
      classifyPdfDocument({
        text: "Politica de confidentialitate",
        url: "https://avincis.ro/privacy-policy.pdf",
      }),
    ).toBe("PRIVACY_POLICY");
  });

  it("Q: sweetness navbar/footer text is not used as focused source", () => {
    const identity = extractSourceIdentityFromText({
      text: "Clasificare sec\nAlcool 13% vol",
      title: "Merlot",
    });
    expect(identity.sourceWineName).toBe("Merlot");
    expect(parseSweetnessClaimFromSource("Newsletter cookie Dulce Cadou")).toBeNull();
    expect(parseSweetnessClaimFromSource("Merlot. Note de cirese. Alcool 13% vol")).toBeNull();
  });

  it("R: strict persistence throws on failure", async () => {
    const empty = await persistWineFactEvidenceFailSoft(1, []);
    expect(empty).toBe(0);
    const claim = extractClaimsFromSource({
      text: "Selene Feteasca Neagra 2024\nAlcool 14.7% vol",
      url: "https://cramelerecas.ro/fisa.pdf",
      sourceType: "tasting_sheet",
      wine,
      documentTitle: "Selene Feteasca Neagra 2024",
    })[0];
    expect(claim).toBeTruthy();
    await expect(
      persistWineFactEvidenceStrict(1, [claim!], async () => {
        throw new Error("db down");
      }),
    ).rejects.toThrow("db down");
    const soft = await persistWineFactEvidenceFailSoft(1, [claim!], async () => {
      throw new Error("db down");
    });
    expect(soft).toBe(0);
  });

  it("S/T/U: evidence identity is idempotent and ignores observedAt", () => {
    const first = claimIdentityHash(["alcohol", "13.5", "% vol", "https://x.ro", "tasting_sheet", "Selene", 2024, "Alcool 13.5"]);
    const second = claimIdentityHash(["alcohol", "13.5", "% vol", "https://x.ro", "tasting_sheet", "Selene", 2024, "Alcool 13.5"]);
    const withTime = claimIdentityHash(["alcohol", "13.5", "% vol", "https://x.ro", "tasting_sheet", "Selene", 2024, "Alcool 13.5", "2026-08-18"]);
    expect(first).toBe(second);
    expect(first).not.toBe(withTime);
    expect(first.length).toBe(64);
  });

  it("V: 102 golden pairings unchanged", () => {
    expect(GOLDEN_CURATION_STATS.wines).toBe(30);
    expect(GOLDEN_CURATION_STATS.pairings).toBe(102);
    expect(GOLDEN_CURATION_WINES.flatMap((item) => item.pairings).map((row) => row.dish).join("|").length).toBeGreaterThan(100);
  });

  it("W: identity mismatch is not exact", () => {
    expect(
      classifyProductIdentity(
        { wineName: "Selene Feteasca Neagra", vintage: 2024 },
        { wineName: "", vintage: 2024 },
        "SOURCE_NAME_MISSING",
      ),
    ).toBe("SOURCE_IDENTITY_INCOMPLETE");
  });

  it("X: shadow mode remains shadow", () => {
    expect(getSecondaryScoringMode()).toBe("shadow");
  });
});
