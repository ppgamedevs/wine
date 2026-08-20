import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  MemoryRateLimitAdapter,
  enforceRateLimit,
} from "@/lib/security/rate-limit";

describe("MemoryRateLimitAdapter", () => {
  let now = Date.now();
  let adapter: MemoryRateLimitAdapter;
  const policy = {
    id: "test-policy",
    limit: 2,
    windowSeconds: 10,
  };
  const request = new Request("https://vinintel.ro/api/test", {
    headers: { "x-test-client-id": "visitor-1" },
  });

  beforeEach(() => {
    now = Date.now();
    adapter = new MemoryRateLimitAdapter(() => now);
  });

  it("allows requests within the fixed window budget", async () => {
    expect((await adapter.consume(policy, request)).allowed).toBe(true);
    expect((await adapter.consume(policy, request)).allowed).toBe(true);
  });

  it("returns a standard 429 response over budget", async () => {
    await adapter.consume(policy, request);
    await adapter.consume(policy, request);

    const response = await enforceRateLimit(policy, request, { adapter });

    expect(response?.status).toBe(429);
    expect(response?.headers.get("retry-after")).toBe("10");
    await expect(response?.json()).resolves.toMatchObject({
      error: { code: "rate_limited" },
    });
  });

  it("resets the budget after the window expires", async () => {
    await adapter.consume(policy, request);
    await adapter.consume(policy, request);
    now += 10_001;

    expect((await adapter.consume(policy, request)).allowed).toBe(true);
  });
});
