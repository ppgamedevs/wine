import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import type {
  AffiliatePriceTarget,
  PriceRefreshObservation,
  PriceRefreshStore,
} from "@/lib/price-refresh";
import { runPriceRefreshBatch } from "@/lib/price-refresh";

function target(id: number, price: number): AffiliatePriceTarget {
  return {
    wine: {
      id,
      slug: `wine-${id}`,
      name: `Wine ${id} 0.75L`,
      status: "verified",
      sourceUrl: null,
      producerPageUrl: null,
      currentPrice: price,
      priceAvg: price,
      priceHistory: [],
      affiliateLinks: [],
      vintage: null,
    },
    offer: {
      merchantUrl: `https://www.emag.ro/vin-${id}/pd/D4BLPY2B${id}/`,
      affiliateUrl: `https://l.profitshare.ro/l/1613955${id}`,
      merchantProductId: `D4BLPY2B${id}`,
      priceRon: price,
      currency: "RON",
      inStock: true,
      observedAt: new Date().toISOString(),
      productKey: `wine-${id}`,
    },
  };
}

class MemoryStore implements PriceRefreshStore {
  cursor = 0;
  locked = false;
  observations: Array<{ id: number; observation: PriceRefreshObservation }> = [];
  runs: Array<Record<string, unknown>> = [];
  constructor(public targets: AffiliatePriceTarget[]) {}
  async acquireLock() {
    if (this.locked) return false;
    this.locked = true;
    return true;
  }
  async releaseLock() {
    this.locked = false;
  }
  async getCursor() {
    return this.cursor;
  }
  async setCursor(cursor: number) {
    this.cursor = cursor;
  }
  async loadTargets(cursor: number, limit: number) {
    return this.targets.filter((t) => t.wine.id > cursor).slice(0, limit);
  }
  async startRun(input: Record<string, unknown>) {
    this.runs.push({ status: "running", ...input });
    return 1;
  }
  async finishRun(input: Record<string, unknown>) {
    this.runs.push(input);
  }
  async applyObservation(input: { target: AffiliatePriceTarget; observation: PriceRefreshObservation }) {
    this.observations.push({ id: input.target.wine.id, observation: input.observation });
    return {
      priceChanged: input.target.offer.priceRon !== input.observation.priceRon,
    };
  }
}

const liveObservation = (price: number): PriceRefreshObservation => ({
  priceRon: price,
  currency: "RON",
  inStock: true,
  observedAt: new Date().toISOString(),
  finalUrl: "https://www.emag.ro/vin/pd/D4BLPY2B1/",
});

describe("daily affiliate price refresh", () => {
  it("refreshes checkedAt for unchanged prices and counts unchanged", async () => {
    const store = new MemoryStore([target(1, 50)]);
    const result = await runPriceRefreshBatch({
      store,
      lockToken: "t1",
      limit: 20,
      fetcher: {
        verifyAffiliateDestination: async () => true,
        fetchObservation: async () => liveObservation(50),
      },
    });
    expect(result.status).toBe("success");
    expect(result.unchanged).toBe(1);
    expect(result.updated).toBe(0);
    expect(store.observations[0]?.observation.priceRon).toBe(50);
    expect(store.cursor).toBe(0);
  });

  it("counts a changed price as updated", async () => {
    const store = new MemoryStore([target(1, 50)]);
    const result = await runPriceRefreshBatch({
      store,
      lockToken: "t1",
      fetcher: {
        verifyAffiliateDestination: async () => true,
        fetchObservation: async () => liveObservation(54),
      },
    });
    expect(result.updated).toBe(1);
  });

  it("records out-of-stock observations without inventing a price", async () => {
    const store = new MemoryStore([target(1, 50)]);
    const observation = { ...liveObservation(50), inStock: false };
    await runPriceRefreshBatch({
      store,
      lockToken: "t1",
      fetcher: {
        verifyAffiliateDestination: async () => true,
        fetchObservation: async () => observation,
      },
    });
    expect(store.observations[0]?.observation.inStock).toBe(false);
    expect(store.observations[0]?.observation.priceRon).toBe(50);
  });

  it("does not overwrite history when extraction fails", async () => {
    const store = new MemoryStore([target(1, 50)]);
    const result = await runPriceRefreshBatch({
      store,
      lockToken: "t1",
      fetcher: {
        verifyAffiliateDestination: async () => true,
        fetchObservation: async () => null,
      },
    });
    expect(result.status).toBe("success");
    expect(result.skipped).toBe(1);
    expect(store.observations).toHaveLength(0);
  });

  it("fails when the affiliate destination points to another product", async () => {
    const store = new MemoryStore([target(1, 50)]);
    const result = await runPriceRefreshBatch({
      store,
      lockToken: "t1",
      fetcher: {
        verifyAffiliateDestination: async () => false,
        fetchObservation: async () => liveObservation(50),
      },
    });
    expect(result.failed).toBe(1);
    expect(store.observations).toHaveLength(0);
  });

  it("prevents overlapping runs with the persistent lock", async () => {
    const store = new MemoryStore([target(1, 50)]);
    store.locked = true;
    const result = await runPriceRefreshBatch({
      store,
      lockToken: "t2",
      fetcher: {
        verifyAffiliateDestination: async () => true,
        fetchObservation: async () => liveObservation(50),
      },
    });
    expect(result.status).toBe("locked");
    expect(store.observations).toHaveLength(0);
  });

  it("resumes from the cursor and resets after the final batch", async () => {
    const store = new MemoryStore([target(1, 50), target(2, 60), target(3, 70)]);
    const first = await runPriceRefreshBatch({
      store,
      lockToken: "t1",
      limit: 2,
      fetcher: {
        verifyAffiliateDestination: async () => true,
        fetchObservation: async (t) => liveObservation(t.offer.priceRon ?? 0),
      },
    });
    expect(first.cursorEnd).toBe(2);
    const second = await runPriceRefreshBatch({
      store,
      lockToken: "t2",
      limit: 2,
      fetcher: {
        verifyAffiliateDestination: async () => true,
        fetchObservation: async (t) => liveObservation(t.offer.priceRon ?? 0),
      },
    });
    expect(second.processed).toBe(1);
    expect(second.cursorEnd).toBe(0);
    expect(store.observations.map((o) => o.id)).toEqual([1, 2, 3]);
  });

  it("retries transient extraction failures with backoff", async () => {
    const store = new MemoryStore([target(1, 50)]);
    const sleep = vi.fn(async () => undefined);
    let attempts = 0;
    const result = await runPriceRefreshBatch({
      store,
      lockToken: "t1",
      sleep,
      maxAttempts: 3,
      fetcher: {
        verifyAffiliateDestination: async () => true,
        fetchObservation: async () => {
          attempts += 1;
          if (attempts < 3) throw new Error("temporary");
          return liveObservation(50);
        },
      },
    });
    expect(result.unchanged).toBe(1);
    expect(attempts).toBe(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });
});

describe("legacy price refresh persistence integration", () => {
  it("uses verified product-id matching and skips recently checked offers", () => {
    const source = readFileSync(
      path.join(process.cwd(), "lib/price-refresh-store.ts"),
      "utf8",
    );
    expect(source).toContain("extractEmagProductId(candidate.url) === productId");
    expect(source).toContain("merchantProductId: productId");
    expect(source).toContain("url: affiliateUrl");
    expect(source).toContain("verificationStatus: \"verified\"");
    expect(source).toContain("while (targets.length < limit)");
    expect(source).toContain("const freshnessCutoff");
  });
});
