import { describe, expect, it } from "vitest";
import { validateTranslation } from "@/lib/i18n/translation-qa";

describe("translation QA", () => {
  it("preserves numbers, URLs, identities, and JSON shape", () => {
    const report = validateTranslation(
      {
        title: "Selene Fetească Neagră 2022",
        body: ["Are 13.5% alcool. Vezi https://vinintel.ro/wines/selene."],
      },
      {
        title: "Selene Fetească Neagră 2022",
        body: [
          "It has 13.5% alcohol. See https://vinintel.ro/wines/selene.",
        ],
      },
      {
        wineNames: ["Selene Fetească Neagră"],
        grapeNames: ["Fetească Neagră"],
      },
    );

    expect(report).toEqual({ valid: true, issues: [] });
  });

  it("requires review when factual tokens or identity change", () => {
    const report = validateTranslation(
      "Selene Fetească Neagră 2022 are 13.5% alcool.",
      "Selene Black Maiden 2021 has 13% alcohol.",
      {
        wineNames: ["Selene Fetească Neagră"],
        grapeNames: ["Fetească Neagră"],
      },
    );

    expect(report.valid).toBe(false);
    expect(report.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["NUMBER_CHANGED", "IDENTITY_CHANGED"]),
    );
  });

  it("rejects structural corruption and empty text", () => {
    const report = validateTranslation(
      ["Primul paragraf", "Al doilea paragraf"],
      ["First paragraph", ""],
    );

    expect(report.valid).toBe(false);
    expect(report.issues.map((issue) => issue.code)).toContain(
      "EMPTY_TRANSLATION",
    );
  });
});

