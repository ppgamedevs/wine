import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("content translation migration safety", () => {
  it("is additive and touches only content_translations", async () => {
    const sql = await readFile(
      new URL("../../drizzle/0027_content_translations.sql", import.meta.url),
      "utf8",
    );

    expect(sql).toContain("CREATE TABLE `content_translations`");
    expect(sql).toContain("`entity_id` text NOT NULL");
    expect(sql).toContain("`source_hash` text NOT NULL");
    expect(sql).toContain("`status` text");
    expect(sql).not.toMatch(/\b(ALTER|DROP|DELETE|UPDATE|INSERT)\b/i);
    expect(sql.match(/CREATE TABLE/gi)).toHaveLength(1);
  });
});

