import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveJevConfig } from "@/lib/jev/config";
import { JevMetrics } from "@/lib/jev/metrics";
import { JevDecisionService } from "@/lib/jev/service";
import type { JevTransport, JevTransportResult } from "@/lib/jev/transport";
import { JevError } from "@/lib/jev/types";

const API_KEY = "ts_service_secret_value_123";

function validResponse(overrides: Record<string, unknown> = {}): unknown {
  return {
    model: "jev-latest",
    answers: {
      occasion: {
        type: "choice",
        choice: "romantic_dinner",
        confidence: 0.9,
        probabilities: {},
      },
      food_pairing: { type: "noul", noul: 0.9 },
      food_pairing_strength: {
        type: "score",
        score: 2,
        confidence: 0.8,
        legend: {},
        probabilities: {},
      },
      food_category: {
        type: "choice",
        choice: "pasta",
        confidence: 0.8,
        probabilities: {},
      },
      wine_color: {
        type: "choice",
        choice: "white",
        confidence: 0.85,
        probabilities: {},
      },
      sweetness: {
        type: "choice",
        choice: "dry",
        confidence: 0.8,
        probabilities: {},
      },
      acidity: {
        type: "choice",
        choice: "low",
        confidence: 0.8,
        probabilities: {},
      },
      body: { type: "choice", choice: "medium", confidence: 0.8, probabilities: {} },
      style: { type: "choice", choice: "fresh", confidence: 0.8, probabilities: {} },
      user_intent: {
        type: "choice",
        choice: "discover",
        confidence: 0.9,
        probabilities: {},
      },
      specific_product_request: { type: "noul", noul: 0.05 },
      has_exclusions: { type: "noul", noul: 0.9 },
      ...overrides,
    },
    usage: { input_tokens: 120, output_tokens: 20 },
  };
}

function staticTransport(body: unknown, latencyMs = 12): JevTransport {
  const result: JevTransportResult = {
    body,
    status: 200,
    attempts: 1,
    requestId: "req_test",
    latencyMs,
  };
  return { call: async () => result };
}

function serviceWith(
  transport: JevTransport | null,
  env: Record<string, string | undefined> = {},
): { service: JevDecisionService; metrics: JevMetrics } {
  const config = resolveJevConfig({
    TYPESAFE_API_KEY: API_KEY,
    JEV_MODE: "shadow",
    ...env,
  });
  const metrics = new JevMetrics();
  return {
    service: new JevDecisionService({
      config,
      transport: transport ?? undefined,
      metrics,
    }),
    metrics,
  };
}

beforeEach(() => {
  // Keep expected structured logs out of the test output.
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("JevDecisionService: release gates", () => {
  it("makes no call when the mode is off", async () => {
    const config = resolveJevConfig({ TYPESAFE_API_KEY: API_KEY, JEV_MODE: "off" });
    const transport = { call: vi.fn() } as unknown as JevTransport;
    const metrics = new JevMetrics();
    const service = new JevDecisionService({ config, transport, metrics });

    const outcome = await service.classifySommelierIntent({
      userMessage: "Vreau un vin rosu",
    });

    expect(outcome).toEqual({ status: "skipped", reason: "mode_off" });
    expect(transport.call).not.toHaveBeenCalled();
    expect(metrics.snapshot().skipped).toBe(1);
  });

  it("skips when an enabled mode has no API key", async () => {
    const config = resolveJevConfig({ JEV_MODE: "live" });
    const transport = { call: vi.fn() } as unknown as JevTransport;
    const metrics = new JevMetrics();
    const service = new JevDecisionService({ config, transport, metrics });

    const outcome = await service.classifySommelierIntent({
      userMessage: "Vreau un vin rosu",
    });

    expect(outcome).toEqual({ status: "skipped", reason: "missing_api_key" });
    expect(transport.call).not.toHaveBeenCalled();
  });

  it("skips empty messages", async () => {
    const { service } = serviceWith(staticTransport(validResponse()));
    const outcome = await service.classifySommelierIntent({ userMessage: "   " });
    expect(outcome).toEqual({ status: "skipped", reason: "empty_message" });
  });
});

describe("JevDecisionService: successful evaluation", () => {
  it("returns validated intent and caches identical requests", async () => {
    const call = vi.fn(async () => ({
      body: validResponse(),
      status: 200,
      attempts: 1,
      requestId: "req_1",
      latencyMs: 15,
    }));
    const { service, metrics } = serviceWith({ call });

    const first = await service.classifySommelierIntent({
      userMessage: "Vreau un vin alb pentru paste, maxim 80 de lei",
    });
    const second = await service.classifySommelierIntent({
      userMessage: "  vreau un vin alb pentru paste, maxim 80 de lei ",
    });

    expect(first.status).toBe("ok");
    expect(second.status).toBe("ok");
    if (first.status === "ok" && second.status === "ok") {
      expect(first.intent.color).toBe("white");
      expect(first.meta.cache).toBe("miss");
      expect(second.meta.cache).toBe("hit");
      expect(second.meta.cache).toBe("hit");
      expect(second.intent.color).toBe("white");
    }
    expect(call).toHaveBeenCalledTimes(1);
    const snapshot = metrics.snapshot();
    expect(snapshot.succeeded).toBe(2);
    expect(snapshot.cacheHits).toBe(1);
    expect(snapshot.tokens.input).toBe(240);
  });

  it("records shadow agreement without changing the intent", async () => {
    const { service, metrics } = serviceWith(staticTransport(validResponse()));
    const outcome = await service.classifySommelierIntent({
      userMessage: "Vreau un vin alb pentru paste",
      deterministic: {
        budgetMin: 0,
        budgetMax: 9999,
        budgetSpecified: false,
        occasion: "oricare",
        color: "white",
        sweetness: "any",
        preferredWinerySlugs: [],
        absurdRequest: false,
        dish: null,
      },
    });
    expect(outcome.status).toBe("ok");
    const snapshot = metrics.snapshot();
    expect(snapshot.shadow.runs).toBe(1);
    expect(snapshot.shadow.agreements).toBe(1);
  });
});

describe("JevDecisionService: failures fall back", () => {
  it("maps an invalid response to unavailable", async () => {
    const { service, metrics } = serviceWith(staticTransport({ model: "x" }));
    const outcome = await service.classifySommelierIntent({
      userMessage: "Vreau un vin rosu",
    });
    expect(outcome.status).toBe("unavailable");
    if (outcome.status === "unavailable") {
      expect(outcome.reason).toBe("invalid_response");
    }
    expect(metrics.snapshot().failed).toBe(1);
  });

  it("maps transport errors to unavailable", async () => {
    const transport: JevTransport = {
      call: async () => {
        throw new JevError("timeout", "timed out");
      },
    };
    const { service, metrics } = serviceWith(transport);
    const outcome = await service.classifySommelierIntent({
      userMessage: "Vreau un vin rosu",
    });
    expect(outcome.status).toBe("unavailable");
    if (outcome.status === "unavailable") expect(outcome.reason).toBe("timeout");
    expect(metrics.snapshot().byReason.timeout).toBe(1);
  });

  it("maps unexpected errors without throwing", async () => {
    const transport: JevTransport = {
      call: async () => {
        throw new Error("boom");
      },
    };
    const { service } = serviceWith(transport);
    const outcome = await service.classifySommelierIntent({
      userMessage: "Vreau un vin rosu",
    });
    expect(outcome.status).toBe("unavailable");
    if (outcome.status === "unavailable") expect(outcome.reason).toBe("unknown");
  });

  it("fails fast when the concurrency budget is saturated", async () => {
    let release: ((value: JevTransportResult) => void) | null = null;
    const transport: JevTransport = {
      call: () =>
        new Promise<JevTransportResult>((resolve) => {
          release = resolve;
        }),
    };
    const { service } = serviceWith(transport, { JEV_MAX_CONCURRENT: "1" });

    const firstCall = service.classifySommelierIntent({
      userMessage: "Vreau un vin rosu",
    });
    const second = await service.classifySommelierIntent({
      userMessage: "Vreau un vin alb",
    });

    expect(second.status).toBe("unavailable");
    if (second.status === "unavailable") expect(second.reason).toBe("saturated");

    const resolveCall = release as
      | ((value: JevTransportResult) => void)
      | null;
    resolveCall?.({
      body: validResponse(),
      status: 200,
      attempts: 1,
      requestId: null,
      latencyMs: 5,
    });
    await expect(firstCall).resolves.toMatchObject({ status: "ok" });
  });
});

describe("JevDecisionService: privacy", () => {
  it("never logs the API key or the raw user message", async () => {
    const logs: string[] = [];
    vi.spyOn(console, "info").mockImplementation((...args) => {
      logs.push(args.map(String).join(" "));
    });
    vi.spyOn(console, "warn").mockImplementation((...args) => {
      logs.push(args.map(String).join(" "));
    });
    vi.spyOn(console, "error").mockImplementation((...args) => {
      logs.push(args.map(String).join(" "));
    });

    const { service } = serviceWith(staticTransport(validResponse()));
    const message = "Vreau un vin rosu pentru cina, numarul meu este 0722000000";
    await service.classifySommelierIntent({ userMessage: message });

    const failed = serviceWith(staticTransport({ model: "x" })).service;
    await failed.classifySommelierIntent({ userMessage: message });

    expect(logs.length).toBeGreaterThan(0);
    for (const line of logs) {
      expect(line).not.toContain(API_KEY);
      expect(line).not.toContain("0722000000");
      expect(line).not.toContain("cina");
    }
    expect(logs.join("\n")).toContain("messageFingerprint");
  });
});
