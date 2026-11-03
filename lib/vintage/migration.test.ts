import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("vintage intelligence migration safety", () => {
  it("is additive and leaves production data untouched", async () => {
    const sql = await readFile(
      new URL("../../drizzle/0029_vintage_intelligence.sql", import.meta.url),
      "utf8",
    );
    expect(sql).toContain("CREATE TABLE `vintage_evidence`");
    expect(sql).not.toMatch(/\b(DROP\s+(?:TABLE|INDEX)|DELETE\s+FROM|INSERT\s+INTO)\b/i);
    expect(sql.match(/CREATE TABLE/gi)).toHaveLength(1);
  });
});
