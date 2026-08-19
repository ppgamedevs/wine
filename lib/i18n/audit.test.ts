import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  auditPublicRomanianCopy,
  classifyCopy,
  isLikelyRomanianCopy,
  renderPublicCopyAuditMarkdown,
  shouldExcludeAuditPath,
  writePublicCopyAuditArtifacts,
} from "./index";

const temporaryDirectories: string[] = [];

async function temporaryProject(): Promise<string> {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "vinintel-i18n-"));
  temporaryDirectories.push(rootDir);
  await Promise.all([
    mkdir(path.join(rootDir, "app"), { recursive: true }),
    mkdir(path.join(rootDir, "components"), { recursive: true }),
    mkdir(path.join(rootDir, "lib"), { recursive: true }),
  ]);
  return rootDir;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("Romanian copy detection", () => {
  it("recognizes Romanian without requiring diacritics", () => {
    expect(isLikelyRomanianCopy("Alege vinul potrivit pentru masa ta")).toBe(
      true,
    );
    expect(isLikelyRomanianCopy("Cauta vinuri romanesti")).toBe(true);
    expect(isLikelyRomanianCopy("Configure webhook retry policy")).toBe(false);
    expect(isLikelyRomanianCopy("@/lib/wine-price")).toBe(false);
  });

  it("classifies specialized public copy from semantic context", () => {
    expect(classifyCopy("Pret de la 50 lei", "priceLabel", "app/page.tsx", false))
      .toBe("PRICE_COPY");
    expect(classifyCopy("Ce vin aleg?", "faq question", "lib/faq.ts", false))
      .toBe("FAQ");
    expect(
      classifyCopy(
        "Alege acum {{expression}}",
        "welcome",
        "components/hero.tsx",
        true,
      ),
    ).toBe("DYNAMIC_TEMPLATE");
    expect(classifyCopy("Dealu Mare", "regionName", "lib/regions.ts", false))
      .toBe("PROPER_NOUN");
  });

  it("excludes non-public and generated source paths", () => {
    expect(shouldExcludeAuditPath("app/admin/page.tsx")).toBe(true);
    expect(shouldExcludeAuditPath("lib/example.test.ts")).toBe(true);
    expect(shouldExcludeAuditPath("components/fixtures/card.tsx")).toBe(true);
    expect(shouldExcludeAuditPath("components/wine-card.tsx")).toBe(false);
  });
});

describe("public copy audit", () => {
  it("extracts, locates, categorizes, deduplicates, and preserves source", async () => {
    const rootDir = await temporaryProject();
    const pagePath = path.join(rootDir, "app", "page.tsx");
    const pageSource = [
      "export const metadata = {",
      '  description: "Descopera vinuri romanesti pentru masa ta",',
      "};",
      "export function Page() {",
      '  const priceLabel = "Pret de la 50 lei";',
      "  const welcome = `Alege acum ${priceLabel}`;",
      "  return <main>",
      '    <input placeholder="Cauta vinuri romanesti" />',
      "    <h1>Alege vinul potrivit pentru masa ta</h1>",
      "    <p>{priceLabel}{welcome}</p>",
      "  </main>;",
      "}",
      "",
    ].join("\n");
    await writeFile(pagePath, pageSource, "utf8");
    await writeFile(
      path.join(rootDir, "lib", "faq.ts"),
      'export const faq = { question: "Ce vin aleg pentru masa de Paste?" };\n',
      "utf8",
    );
    await writeFile(
      path.join(rootDir, "lib", "regions.ts"),
      'export const region = { name: "Dealu Mare" };\n',
      "utf8",
    );
    await writeFile(
      path.join(rootDir, "components", "error.tsx"),
      'export const message = "Nu am putut incarca vinurile disponibile";\n',
      "utf8",
    );
    await writeFile(
      path.join(rootDir, "app", "ignored.test.ts"),
      'export const hidden = "Alege vinul pentru masa ta";\n',
      "utf8",
    );

    const audit = await auditPublicRomanianCopy({
      rootDir,
      generatedAt: "2026-08-19T12:00:00.000Z",
    });

    expect(audit.readOnlyScan).toBe(true);
    expect(audit.summary.scannedFiles).toBe(4);
    expect(audit.entries.some((entry) => entry.category === "SEO")).toBe(true);
    expect(audit.entries.some((entry) => entry.category === "PRICE_COPY")).toBe(
      true,
    );
    expect(
      audit.entries.some((entry) => entry.category === "DYNAMIC_TEMPLATE"),
    ).toBe(true);
    expect(audit.entries.some((entry) => entry.category === "FORM")).toBe(true);
    expect(audit.entries.some((entry) => entry.category === "FAQ")).toBe(true);
    expect(audit.entries.some((entry) => entry.category === "ERROR")).toBe(true);
    expect(audit.entries.some((entry) => entry.category === "PROPER_NOUN")).toBe(
      true,
    );
    expect(
      audit.entries.some((entry) => entry.surface === "JSX_TEXT"),
    ).toBe(true);
    expect(
      audit.entries.some((entry) => entry.surface === "JSX_ATTRIBUTE"),
    ).toBe(true);
    expect(audit.entries.every((entry) => entry.line > 0)).toBe(true);
    expect(new Set(audit.entries.map((entry) => JSON.stringify(entry))).size).toBe(
      audit.entries.length,
    );
    expect(await readFile(pagePath, "utf8")).toBe(pageSource);
  });

  it("writes stable JSON and readable Markdown artifacts", async () => {
    const rootDir = await temporaryProject();
    await writeFile(
      path.join(rootDir, "components", "hero.tsx"),
      "export const Hero = () => <h1>Alege vinul potrivit pentru tine</h1>;\n",
      "utf8",
    );
    const audit = await auditPublicRomanianCopy({
      rootDir,
      generatedAt: "2026-08-19T12:00:00.000Z",
    });
    const paths = await writePublicCopyAuditArtifacts(
      audit,
      path.join(rootDir, "artifacts"),
    );

    const json = JSON.parse(await readFile(paths.jsonPath, "utf8")) as {
      schemaVersion: number;
    };
    const markdown = await readFile(paths.markdownPath, "utf8");
    expect(json.schemaVersion).toBe(1);
    expect(markdown).toBe(renderPublicCopyAuditMarkdown(audit));
    expect(markdown).toContain("components/hero.tsx:1:");
  });
});
