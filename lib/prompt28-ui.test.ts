import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Prompt 28 homepage metadata and locale control", () => {
  it.each(["ro", "en"])(
    "uses a homepage title without a dash separator for %s",
    (locale) => {
      const messages = JSON.parse(
        source(`messages/${locale}/discovery.json`),
      ) as {
        Home: { metadata: { title: string } };
      };

      expect(messages.Home.metadata.title).not.toMatch(/[\u2013\u2014]/u);
      expect(messages.Home.metadata.title).not.toContain("VinIntel - ");
      expect(messages.Home.metadata.title).toMatch(/^VinIntel: /);
    },
  );

  it("keeps both locale choices visibly styled", () => {
    const switcher = source("components/language-switcher.tsx");

    expect(switcher).toContain('"bg-wine text-white shadow-sm"');
    expect(switcher).toContain(
      '"bg-background text-foreground hover:bg-wine/10 hover:text-wine"',
    );
    expect(switcher).toContain("<a");
    expect(switcher).not.toContain('from "next/link"');
  });
});
