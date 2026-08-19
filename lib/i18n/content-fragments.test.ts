import { readFile } from "node:fs/promises";
import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import enMessages from "@/messages/en/content.json";
import roMessages from "@/messages/ro/content.json";

function messageKeys(value: unknown, prefix = ""): string[] {
  if (typeof value === "string") return [prefix];
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return [];
  }

  return Object.entries(value).flatMap(([key, child]) =>
    messageKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

function messageText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return "";
  }
  return Object.values(value).map(messageText).join(" ");
}

describe("Prompt 27B content message fragments", () => {
  it("keeps Romanian and English fragment keys in sync", () => {
    expect(messageKeys(enMessages).sort()).toEqual(
      messageKeys(roMessages).sort(),
    );
  });

  it("preserves legal and scoring facts in English", () => {
    const english = messageText(enMessages);

    for (const fact of [
      "2016/679",
      "12 months",
      "90 days",
      "18 or older",
      "30 days",
      "72%",
      "28%",
      "69/100",
      "2-3 business days",
    ]) {
      expect(english).toContain(fact);
    }
  });

  it("contains no em dash or en dash", () => {
    expect(messageText(enMessages)).not.toMatch(/[\u2013\u2014]/);
    expect(messageText(roMessages)).not.toMatch(/[\u2013\u2014]/);
  });

  it("formats fragment messages through next-intl", () => {
    const t = createTranslator({ locale: "en", messages: enMessages });

    expect(t("Privacy.lastUpdated", { date: "6 July 2026" })).toBe(
      "Last updated: 6 July 2026",
    );
    expect(t("Journal.readingMinutes", { minutes: 7 })).toBe("7 min read");
    expect(t("Scores.maximum", { score: 69 })).toBe("Maximum 69/100");
  });
});

describe("Prompt 27B public surface guards", () => {
  it("uses translation readiness and noindex for unavailable journal content", async () => {
    const [indexPage, articlePage, journalContent] = await Promise.all([
      readFile(
        new URL("../../app/journal/page.tsx", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../../app/journal/[slug]/page.tsx", import.meta.url),
        "utf8",
      ),
      readFile(new URL("./journal-content.ts", import.meta.url), "utf8"),
    ]);

    expect(indexPage).toContain("getJournalArticlesForLocale");
    expect(articlePage).toContain("robots: { index: false, follow: true }");
    expect(articlePage).toContain("getJournalArticleForLocale");
    expect(journalContent).toContain('"title", "excerpt", "body"');
    expect(journalContent).toContain("isJournalArticleIndexable");
  });

  it("adds canonical language alternates to each requested public domain", async () => {
    const files = await Promise.all(
      [
        "../../app/journal/page.tsx",
        "../../app/politica-confidentialitate/page.tsx",
        "../../app/politica-cookies/page.tsx",
        "../../app/cum-functioneaza-scorurile/page.tsx",
        "../../app/adauga-vin/page.tsx",
        "../../app/claim-your-winery/page.tsx",
      ].map((file) => readFile(new URL(file, import.meta.url), "utf8")),
    );

    for (const source of files) {
      expect(source).toContain("canonical:");
      expect(source).toContain("languages:");
      expect(source).toContain('"x-default"');
    }
  });

  it("keeps locale route states translated and client copy scoped", async () => {
    const [loading, error, claimForm, smartSearch] = await Promise.all([
      readFile(
        new URL("../../app/[locale]/loading.tsx", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../../app/[locale]/error.tsx", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../../components/claim/claim-form.tsx", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../../components/smart-search.tsx", import.meta.url),
        "utf8",
      ),
    ]);

    expect(loading).toContain('getTranslations("Route")');
    expect(error).toContain('useTranslations("Error")');
    expect(claimForm).toContain("copy: ClaimFormCopy");
    expect(smartSearch).toContain("copy?: SmartSearchCopy");
  });
});
