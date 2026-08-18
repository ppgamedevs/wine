import { describe, expect, it } from "vitest";
import { GOLDEN_CURATION_STATS, GOLDEN_CURATION_WINES } from "@/lib/pairing/golden-curation-dataset";
import { getSecondaryScoringMode } from "@/lib/scoring-v2/secondary-scoring-mode";
import { resolveTechSpecs } from "@/lib/wine-tech-specs";
import { extractClaimsFromSource, verifyAiNumericCandidate } from "@/lib/tech-facts/claims";
import { classifyProductIdentity } from "@/lib/tech-facts/identity";
import {
  parseAlcoholClaim,
  parseResidualSugarClaim,
  parseTotalAcidityClaim,
} from "@/lib/tech-facts/parse";
import { classifyPdfDocument } from "@/lib/tech-facts/pdf-classify";
import { recoverWineFromStored, simulatedSafePatch } from "@/lib/tech-facts/recover";
import { reconcileField } from "@/lib/tech-facts/reconcile";
import { resolveTechSpecsFromSources } from "@/lib/tech-facts/resolve";
import { techValuesEqual } from "@/lib/tech-facts/types";
import { extractTechnicalSourceVintage } from "@/lib/tech-facts/vintage";

const wine = {
  wineName: "Solo Quinta Roze",
  wineryName: "Cramele Recas",
  vintage: 2025,
  type: "rose",
  grapes: ["Cabernet Sauvignon", "Pinot Noir"],
};

describe("Prompt 12 technical truth", () => {
  it("A: exact vintage PDF + exact wine = SAFE_EXACT", () => {
    const claims = extractClaimsFromSource({
      text: "Solo Quinta Roze 2025\nAlcool 13.5% vol\nAciditate totala 5.6 g/L\nZahar rezidual 4.1 g/L",
      url: "https://cramelerecas.ro/fisa-2025.pdf",
      sourceType: "tasting_sheet",
      wine,
      documentTitle: "Solo Quinta Roze 2025",
      filename: "fisa-solo-quinta-2025.pdf",
    });
    const alcohol = reconcileField({
      field: "alcohol",
      stored: null,
      claims,
      wineHasVintage: true,
      isNonVintageWine: false,
    });
    expect(alcohol.candidateClass).toBe("SAFE_EXACT");
    expect(alcohol.safeAutomatic).toBe(true);
    expect(alcohol.candidate).toBe(13.5);
  });

  it("B: wrong vintage exact wine = DIFFERENT_VINTAGE", () => {
    const claims = extractClaimsFromSource({
      text: "Solo Quinta Roze 2022\nAlcool 12.5% vol\nZahar rezidual 4.1 g/L",
      url: "https://cramelerecas.ro/solo-quinta-roze-2022",
      sourceType: "producer_page",
      wine,
      documentTitle: "Solo Quinta Roze 2022",
    });
    const alcohol = reconcileField({
      field: "alcohol",
      stored: 13,
      claims,
      wineHasVintage: true,
      isNonVintageWine: false,
    });
    expect(alcohol.candidateClass).toBe("DIFFERENT_VINTAGE");
    expect(alcohol.safeAutomatic).toBe(false);
  });

  it("C: undated producer page for vintage wine = PROVISIONAL_UNDATED", () => {
    const claims = extractClaimsFromSource({
      text: "Solo Quinta Roze\nAlcool 13.5% vol",
      url: "https://cramelerecas.ro/solo-quinta-roze",
      sourceType: "producer_page",
      wine,
      documentTitle: "Solo Quinta Roze",
    });
    const alcohol = reconcileField({
      field: "alcohol",
      stored: null,
      claims,
      wineHasVintage: true,
      isNonVintageWine: false,
    });
    expect(alcohol.candidateClass).toBe("PROVISIONAL_UNDATED");
    expect(alcohol.safeAutomatic).toBe(false);
  });

  it("D: non-vintage wine + exact official undated page may qualify", () => {
    const resolved = resolveTechSpecsFromSources({
      wine: { ...wine, vintage: null },
      isNonVintageWine: true,
      sources: [
        {
          text: "Solo Quinta Roze\nAlcool 13.5% vol",
          url: "https://cramelerecas.ro/solo-quinta-roze",
          sourceType: "producer_page",
        },
      ],
    });
    expect(resolved.specs.alcohol).toBe(13.5);
  });

  it("E: retailer alcohol cannot become canonical", () => {
    const resolved = resolveTechSpecsFromSources({
      wine,
      sources: [
        {
          text: "Alcool 13.5% vol",
          url: "https://vinul.ro/solo-quinta",
          sourceType: "retailer",
        },
      ],
    });
    expect(resolved.specs.alcohol).toBeNull();
    expect(resolved.fields[0]?.candidateClass).toBe("RETAILER_ONLY");
  });

  it("F: marketplace acidity cannot become canonical", () => {
    const resolved = resolveTechSpecsFromSources({
      wine,
      sources: [
        {
          text: "Aciditate totala 5.6 g/L",
          url: "https://www.emag.ro/vin",
          sourceType: "marketplace",
        },
      ],
    });
    expect(resolved.specs.acidity).toBeNull();
  });

  it("G: AI candidate absent from source is rejected", () => {
    const specs = resolveTechSpecs({
      wineName: "Solo Quinta Roze",
      pageText: "Note de capsuni si trandafir.",
      ai: { alcohol: 13.5 },
    });
    expect(specs.alcohol).toBeNull();
    expect(
      verifyAiNumericCandidate({
        field: "alcohol",
        value: 13.5,
        unit: "% vol",
        sourceText: "Note de capsuni",
        label: "alcool",
      }).accepted,
    ).toBe(false);
  });

  it("H: AI candidate present verbatim may survive as candidate", () => {
    const specs = resolveTechSpecs({
      wineName: "Solo Quinta Roze",
      pageText: "Alcool: 13.5% vol",
      ai: { alcohol: 13.5 },
    });
    expect(specs.alcohol).toBe(13.5);
  });

  it("I: alcohol 13,5% parses 13.5", () => {
    expect(parseAlcoholClaim("Alcool 13,5% vol")?.value).toBe(13.5);
  });

  it("J: residual sugar 4,10 g/L parses 4.1", () => {
    expect(parseResidualSugarClaim("Zahar rezidual 4,10 g/L")?.value).toBe(4.1);
  });

  it("K: total acidity 5,6 g/L parses 5.6", () => {
    expect(parseTotalAcidityClaim("Aciditate totala 5,6 g/L")?.value).toBe(5.6);
  });

  it("L: pH 3.4 does not become acidity", () => {
    expect(parseTotalAcidityClaim("pH 3.4")?.value).toBeUndefined();
    expect(parseTotalAcidityClaim("pH: 3,4")).toBeNull();
  });

  it("M: volatile acidity does not become total acidity", () => {
    expect(parseTotalAcidityClaim("Aciditate volatila 0.4 g/L")).toBeNull();
  });

  it("N: medal year does not become vintage", () => {
    expect(
      extractTechnicalSourceVintage({
        text: "Medalie de aur 2023. Concursul Bucuresti 2024. Copyright 2026.",
        title: "Solo Quinta Roze",
      }),
    ).toBeNull();
  });

  it("O: PDF privacy policy rejected", () => {
    expect(
      classifyPdfDocument({
        text: "Politica de confidentialitate. Prelucrarea datelor personale.",
        title: "Politica de confidentialitate",
      }),
    ).toBe("PRIVACY_POLICY");
  });

  it("P: catalog PDF with multiple products is not an exact sheet", () => {
    expect(
      classifyPdfDocument({
        text: "Vin: Solo Quinta\nVin: Sole\nVin: Castel Huniade\nCatalog general",
        title: "Catalog Recas",
      }),
    ).toBe("CATALOG_GENERIC");
  });

  it("Q: two exact official sources agree = corroborated", () => {
    const page = extractClaimsFromSource({
      text: "Solo Quinta Roze 2025 Alcool 13.5% vol",
      url: "https://cramelerecas.ro/solo-quinta-roze-2025",
      sourceType: "producer_page",
      wine,
      documentTitle: "Solo Quinta Roze 2025",
    });
    const sheet = extractClaimsFromSource({
      text: "Solo Quinta Roze 2025 Alcool 13.5% vol",
      url: "https://cramelerecas.ro/fisa-2025.pdf",
      sourceType: "tasting_sheet",
      wine,
      documentTitle: "Solo Quinta Roze 2025",
      filename: "fisa-2025.pdf",
    });
    const alcohol = reconcileField({
      field: "alcohol",
      stored: null,
      claims: [...page, ...sheet],
      wineHasVintage: true,
      isNonVintageWine: false,
    });
    expect(alcohol.candidateClass).toBe("SAFE_CORROBORATED");
  });

  it("R: two exact official sources conflict = conflict", () => {
    const page = extractClaimsFromSource({
      text: "Solo Quinta Roze 2025 Alcool 13.0% vol",
      url: "https://cramelerecas.ro/solo-quinta-roze-2025",
      sourceType: "producer_page",
      wine,
      documentTitle: "Solo Quinta Roze 2025",
    });
    const sheet = extractClaimsFromSource({
      text: "Solo Quinta Roze 2025 Alcool 13.5% vol",
      url: "https://cramelerecas.ro/fisa-2025.pdf",
      sourceType: "tasting_sheet",
      wine,
      documentTitle: "Solo Quinta Roze 2025",
      filename: "fisa-2025.pdf",
    });
    const alcohol = reconcileField({
      field: "alcohol",
      stored: 13,
      claims: [...page, ...sheet],
      wineHasVintage: true,
      isNonVintageWine: false,
    });
    expect(alcohol.candidateClass).toBe("SOURCE_CONFLICT");
    expect(alcohol.safeAutomatic).toBe(false);
  });

  it("S: existing value equals official = evidence attach", () => {
    const claims = extractClaimsFromSource({
      text: "Solo Quinta Roze 2025 Alcool 13.0% vol",
      url: "https://cramelerecas.ro/fisa-2025.pdf",
      sourceType: "tasting_sheet",
      wine,
      documentTitle: "Solo Quinta Roze 2025",
      filename: "fisa-2025.pdf",
    });
    const alcohol = reconcileField({
      field: "alcohol",
      stored: 13,
      claims,
      wineHasVintage: true,
      isNonVintageWine: false,
    });
    expect(alcohol.action).toBe("EVIDENCE_ATTACH");
    expect(alcohol.storedClass).toBe("VERIFIED_MATCH");
    expect(techValuesEqual("alcohol", 13, 13.0)).toBe(true);
  });

  it("T: existing value conflicts = human review", () => {
    const claims = extractClaimsFromSource({
      text: "Solo Quinta Roze 2025 Alcool 13.5% vol",
      url: "https://cramelerecas.ro/fisa-2025.pdf",
      sourceType: "tasting_sheet",
      wine,
      documentTitle: "Solo Quinta Roze 2025",
      filename: "fisa-2025.pdf",
    });
    const alcohol = reconcileField({
      field: "alcohol",
      stored: 13,
      claims,
      wineHasVintage: true,
      isNonVintageWine: false,
    });
    expect(alcohol.action).toBe("HUMAN_REVIEW");
    expect(alcohol.safeAutomatic).toBe(false);
  });

  it("U: recovery patch never writes scores", () => {
    const recovery = recoverWineFromStored({
      id: 1,
      slug: "cramele-recas-solo-quinta-roze-2025",
      name: "Solo Quinta Roze",
      wineryName: "Cramele Recas",
      winerySlug: "cramele-recas",
      vintage: 2025,
      type: "rose",
      sweetness: "sec",
      alcohol: 13,
      acidity: null,
      sugar: null,
      grapeVarieties: [{ name: "Pinot Noir" }],
      producerPageUrl: "https://cramelerecas.ro/solo-quinta-roze",
      tastingSheetUrl: null,
      sourceUrl: null,
      tastingNotes: null,
      producerContent: null,
    });
    const patch = simulatedSafePatch(recovery);
    expect("valueScore" in patch).toBe(false);
    expect("giftScore" in patch).toBe(false);
    expect("foodMatchScore" in patch).toBe(false);
  });

  it("V: golden 30 unchanged", () => {
    expect(GOLDEN_CURATION_STATS.wines).toBe(30);
    expect(GOLDEN_CURATION_WINES[0]?.slug).toBeTruthy();
  });

  it("W: public URLs unchanged by recovery helpers", () => {
    const slug = "cramele-recas-solo-quinta-roze-2025";
    const recovery = recoverWineFromStored({
      id: 1,
      slug,
      name: "Solo Quinta Roze",
      wineryName: "Cramele Recas",
      winerySlug: "cramele-recas",
      vintage: 2025,
      type: "rose",
      sweetness: "sec",
      alcohol: 13,
      acidity: null,
      sugar: null,
      grapeVarieties: [],
      producerPageUrl: "https://cramelerecas.ro/x",
      tastingSheetUrl: null,
      sourceUrl: null,
      tastingNotes: null,
      producerContent: null,
    });
    expect(recovery.slug).toBe(slug);
  });

  it("X: shadow mode remains shadow", () => {
    expect(getSecondaryScoringMode()).toBe("shadow");
  });

  it("Balla Geza channel SKUs do not cross-contaminate", () => {
    expect(
      classifyProductIdentity(
        { wineName: "Stonewines Feteasca Neagra", vintage: 2022, type: "red" },
        { wineName: "Kolna Feteasca Neagra", vintage: 2022, type: "red" },
      ),
    ).toBe("PRODUCT_MISMATCH");
  });

  it("numeric tolerances treat 13 vs 13.0 as equal and 13.0 vs 13.5 as different", () => {
    expect(techValuesEqual("alcohol", 13, 13.0)).toBe(true);
    expect(techValuesEqual("alcohol", 13.0, 13.5)).toBe(false);
    expect(techValuesEqual("acidity", 5.1, 5.1)).toBe(true);
    expect(techValuesEqual("sugar", 4.1, 4.1)).toBe(true);
  });
});
