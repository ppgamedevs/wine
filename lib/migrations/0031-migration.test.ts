import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  path.join(process.cwd(), "drizzle/0031_daily_price_refresh.sql"),
  "utf8",
);
const journal = JSON.parse(
  readFileSync(path.join(process.cwd(), "drizzle/meta/_journal.json"), "utf8"),
) as { entries: Array<{ idx: number; tag: string }> };

describe("0031 daily price refresh migration", () => {
  it("creates persistent run and cursor/lock state tables", () => {
    expect(sql).toContain("price_refresh_runs");
    expect(sql).toContain("price_refresh_state");
    expect(sql).toContain("lock_expires_at");
    expect(sql).toContain("cursor");
  });

  it("is registered in the Drizzle journal", () => {
    expect(journal.entries.at(-1)).toMatchObject({
      idx: 31,
      tag: "0031_daily_price_refresh",
    });
  });
});
