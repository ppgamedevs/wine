import { describe, expect, it, vi } from "vitest";
import { JevError } from "@/lib/jev/types";
import { SOMMELIER_INTENT_QUESTIONS } from "@/lib/jev/questions";
import {
  createJevTransport,
  type JevFetchLike,
} from "@/lib/jev/transport";

const API_KEY = "ts_test_secret_never_logged";

function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

const VALID_BODY = {
  model: "jev-latest",
  answers: {},
  usage: { input_tokens: 10, output_tokens: 2 },
};

function transportWith(
  fetchImpl: JevFetchLike,
  overrides: Partial<Parameters<typeof createJevTransport>[0]> = {},
) {
  return createJevTransport({
    apiKey: API_KEY,
    baseUrl: "https://api.typesafe.ai",
    timeoutMs: 1_000,
    maxRetries: 1,
    fetchImpl,
    sleep: async () => {},
    random: () => 0.5,
    ...overrides,
  });
}

function request() {
  return {
    model: "jev-latest",
    state: { user_request: "Vreau un vin rosu" },
    questions: SOMMELIER_INTENT_QUESTIONS,
  };
}

describe("createJevTransport: happy path", () => {
  it("posts to the official endpoint and returns the parsed body", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(VALID_BODY, 200, { "x-request-id": "req_123" }),
    );
    const transport = transportWith(fetchImpl);

    const result = await transport.call(request());

    expect(result.body).toEqual(VALID_BODY);
    expect(result.attempts).toBe(1);
    expect(result.requestId).toBe("req_123");
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.typesafe.ai/v1/systemone");
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${API_KEY}`);
    expect(headers["Content-Type"]).toBe("application/json");
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.model).toBe("jev-latest");
    expect(JSON.stringify(body)).not.toContain(API_KEY);
  });
});

describe("createJevTransport: failure taxonomy", () => {
  it("does not retry authentication failures", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ error: "unauthorized" }, 401),
    );
    const transport = transportWith(fetchImpl);

    await expect(transport.call(request())).rejects.toMatchObject({
      name: "JevError",
      reason: "auth",
      status: 401,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("maps 400/422 to invalid_request without retrying", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ detail: [{ loc: ["body", "questions"], type: "missing" }] }, 422),
    );
    const transport = transportWith(fetchImpl);

    await expect(transport.call(request())).rejects.toMatchObject({
      reason: "invalid_request",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retries a rate limit and honours Retry-After", async () => {
    const fetchImpl = vi
      .fn<JevFetchLike>()
      .mockResolvedValueOnce(
        jsonResponse({ error: "rate limited" }, 429, { "retry-after": "0" }),
      )
      .mockResolvedValueOnce(jsonResponse(VALID_BODY));
    const transport = transportWith(fetchImpl);

    const result = await transport.call(request());
    expect(result.attempts).toBe(2);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("throws rate_limited when retries are exhausted", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}, 429));
    const transport = transportWith(fetchImpl, { maxRetries: 0 });

    await expect(transport.call(request())).rejects.toMatchObject({
      reason: "rate_limited",
      status: 429,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retries server errors up to the bounded budget", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}, 503));
    const transport = transportWith(fetchImpl, { maxRetries: 2 });

    await expect(transport.call(request())).rejects.toMatchObject({
      reason: "http_error",
      status: 503,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("times out one attempt and does not retry when retries are disabled", async () => {
    const hangingFetch: JevFetchLike = (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => {
          reject(new Error("aborted"));
        });
      });
    const transport = transportWith(hangingFetch, {
      timeoutMs: 20,
      maxRetries: 0,
    });

    const error = await transport.call(request()).catch((caught) => caught);
    expect(error).toBeInstanceOf(JevError);
    expect((error as JevError).reason).toBe("timeout");
  });

  it("maps network failures and retries once", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("socket hang up");
    });
    const transport = transportWith(fetchImpl);

    await expect(transport.call(request())).rejects.toMatchObject({
      reason: "network",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("rejects a non-JSON body as invalid_response", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response("<html>oops</html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        }),
    );
    const transport = transportWith(fetchImpl);

    await expect(transport.call(request())).rejects.toMatchObject({
      reason: "invalid_response",
    });
  });

  it("never includes the API key in error messages", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ detail: "bad", error: API_KEY }, 400),
    );
    const transport = transportWith(fetchImpl);

    const error = (await transport
      .call(request())
      .catch((caught) => caught)) as JevError;
    expect(error.message).not.toContain(API_KEY);
  });
});
