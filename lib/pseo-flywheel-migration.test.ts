import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve("drizzle/0029_pseo_question_flywheel.sql"),
  "utf8",
);
const journal = JSON.parse(
  readFileSync(resolve("drizzle/meta/_journal.json"), "utf8"),
) as { entries: Array<{ idx: number; tag: string }> };

describe("migration 0029 PSEO question flywheel", () => {
  it("adds the intent and draft tables without destructive statements", () => {
    expect(sql).toContain("CREATE TABLE `sommelier_question_intents`");
    expect(sql).toContain("CREATE TABLE `pseo_draft_pages`");
    expect(sql).toContain("`answer_quality`");
    expect(sql).toContain("`similar_page_exists`");
    expect(sql).toContain("`generated_from_intent_cluster`");
    expect(sql).toContain("`noindex_until_approved`");
    expect(sql).toContain("`supporting_wine_count`");
    expect(sql).toContain("`quality_gate_json`");
    expect(sql).toContain("`source_intent_ids_json`");
    expect(sql).not.toMatch(/\b(?:DROP\s+(?:TABLE|INDEX)|DELETE\s+FROM|INSERT\s+INTO|ALTER\s+TABLE)\b/i);
  });

  it("is registered as the next journal entry", () => {
    expect(journal.entries.at(-1)).toMatchObject({
      idx: 29,
      tag: "0029_pseo_question_flywheel",
    });
  });
});
