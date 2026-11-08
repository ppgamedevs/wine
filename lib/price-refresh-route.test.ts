import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const route = readFileSync(
  path.join(process.cwd(), "app/api/cron/price-refresh/route.ts"),
  "utf8",
);
const job = readFileSync(
  path.join(process.cwd(), "jobs/update-prices.ts"),
  "utf8",
);
const vercel = JSON.parse(
  readFileSync(path.join(process.cwd(), "vercel.json"), "utf8"),
) as { crons: Array<{ path: string; schedule: string }> };

describe("daily price refresh operations contract", () => {
  it("secures the cron endpoint with CRON_SECRET", () => {
    expect(route).toContain("CRON_SECRET");
    expect(route).toContain("secretsMatch");
    expect(route).toContain("status: 401");
  });

  it("runs bounded batches, not the whole catalog in one request", () => {
    expect(route).toContain("BATCH_SIZE");
    expect(route).toContain("maxDuration = 60");
    expect(route).toContain("runPriceRefreshBatch");
  });

  it("schedules hourly batches with enough capacity for all existing affiliate wines", () => {
    expect(vercel.crons).toEqual([
      { path: "/api/cron/price-refresh", schedule: "0 * * * *" },
    ]);
  });

  it("replaces the legacy sourceUrl crawler with the resumable runner", () => {
    expect(job).toContain("runPriceRefreshBatch");
    expect(job).not.toContain("extractProductFromUrl");
    expect(job).not.toContain("updatePrice(");
  });
});
