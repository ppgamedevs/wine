import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Prompt 27B translation job safety", () => {
  it("writes only through contentTranslations", async () => {
    const source = await readFile(
      new URL("../../scripts/translate-content.ts", import.meta.url),
      "utf8",
    );

    expect(source).toContain("contentTranslations");
    expect(source).not.toMatch(
      /\.update\(wines\)|\.insert\(wines\)|\.delete\(wines\)|price-tracker/,
    );
  });

  it("is dry-run by default and requires explicit apply", async () => {
    const source = await readFile(
      new URL("../../scripts/translate-content.ts", import.meta.url),
      "utf8",
    );

    expect(source).toContain('apply: argv.includes("--apply")');
    expect(source).toContain("if (!options.apply) continue");
  });

  it("keeps the coverage audit read-only", async () => {
    const source = await readFile(
      new URL("../../scripts/i18n-coverage-audit.ts", import.meta.url),
      "utf8",
    );

    expect(source).not.toMatch(/\.(insert|update|delete)\(/);
    expect(source).toContain("i18n-coverage-audit.json");
  });
});

