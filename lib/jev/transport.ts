/**
 * Minimal, typed transport for the official TypeSafe System One API.
 *
 * Why a transport instead of a vendor SDK in this repository:
 * - The app bundle stays free of an ESM-only dependency that requires a newer
 *   Node runtime than the project declares.
 * - Response bodies are validated at runtime anyway (see `questions.ts`), and
 *   the retry/timeout policy must be shared with the existing server guards.
 * - The official request/response contract is documented at
 *   https://docs.typesafe.ai/api/systemone and implemented verbatim below.
 *
 * This module never logs. It receives the API key and only sends it in the
 * Authorization header.
 */
import { JevError, type JevFailureReason } from "@/lib/jev/types";
import type { JevQuestions } from "@/lib/jev/questions";

export const JEV_SYSTEM_ONE_PATH = "/v1/systemone";
export const JEV_MAX_RESPONSE_BYTES = 262_144;

export type JevFetchLike = (
  input: string,
  init: RequestInit,
) => Promise<Response>;

export interface JevTransportOptions {
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
  maxRetries: number;
  fetchImpl?: JevFetchLike;
  /** Injected for deterministic tests. */
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  now?: () => number;
  maxResponseBytes?: number;
}

export interface JevTransportRequest {
  model: string;
  state: unknown;
  questions: JevQuestions;
}

export interface JevTransportResult {
  body: unknown;
  status: number;
  attempts: number;
  requestId: string | null;
  latencyMs: number;
}

export interface JevTransport {
  call(request: JevTransportRequest): Promise<JevTransportResult>;
}

const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 501, 502, 503, 504, 505, 522, 524]);

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export function classifyHttpStatus(status: number): JevFailureReason {
  if (status === 401 || status === 403) return "auth";
  if (status === 429) return "rate_limited";
  if (status === 400 || status === 422) return "invalid_request";
  return "http_error";
}

function parseRetryAfterMs(value: string | null, nowMs: number): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(2_000, Math.round(seconds * 1_000));
  }
  const date = Date.parse(value);
  if (Number.isFinite(date)) {
    return Math.min(2_000, Math.max(0, date - nowMs));
  }
  return null;
}

function backoffMs(attempt: number, random: () => number): number {
  const base = Math.min(1_000, 250 * 2 ** attempt);
  const jitter = base * 0.2 * (random() * 2 - 1);
  return Math.max(0, Math.round(base + jitter));
}

function readRequestId(response: Response): string | null {
  return (
    response.headers.get("x-request-id") ??
    response.headers.get("request-id") ??
    response.headers.get("x-typesafe-request-id")
  );
}

async function readBodyText(response: Response, limit: number): Promise<string> {
  const text = await response.text();
  if (text.length > limit) {
    throw new JevError("invalid_response", "System One response exceeds the size limit.");
  }
  return text;
}

function parseJsonBody(text: string): unknown {
  if (!text.trim()) {
    throw new JevError("invalid_response", "System One response body is empty.");
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new JevError("invalid_response", "System One response is not valid JSON.");
  }
}

/**
 * Extract a short, non-sensitive error description. Validation details may echo
 * request content, so only the error type/code is kept.
 */
function describeErrorBody(body: unknown): string {
  if (!body || typeof body !== "object") return "no details";
  const record = body as Record<string, unknown>;
  const detail = record.detail;
  if (Array.isArray(detail)) {
    const first = detail[0];
    if (first && typeof first === "object") {
      const item = first as Record<string, unknown>;
      const type = typeof item.type === "string" ? item.type : "validation_error";
      const loc = Array.isArray(item.loc) ? item.loc.join(".") : "";
      return loc ? `${type} at ${loc}` : type;
    }
  }
  // Never echo free-form server text: it can contain reflected headers.
  return "no details";
}

/** Defensive scrub in case a proxy reflects credentials into an error body. */
function redactSecret(message: string, secret: string): string {
  if (secret.length < 8) return message;
  return message.split(secret).join("[redacted]");
}

export function createJevTransport(options: JevTransportOptions): JevTransport {
  const fetchImpl: JevFetchLike =
    options.fetchImpl ?? ((input, init) => globalThis.fetch(input, init));
  const sleep = options.sleep ?? defaultSleep;
  const random = options.random ?? Math.random;
  const now = options.now ?? Date.now;
  const maxResponseBytes = options.maxResponseBytes ?? JEV_MAX_RESPONSE_BYTES;
  const url = `${options.baseUrl.replace(/\/+$/, "")}${JEV_SYSTEM_ONE_PATH}`;
  const maxAttempts = Math.max(1, Math.round(options.maxRetries) + 1);

  return {
    async call(request: JevTransportRequest): Promise<JevTransportResult> {
      const started = now();
      const payload = JSON.stringify({
        model: request.model,
        state: request.state,
        questions: request.questions,
      });

      let lastError: JevError | null = null;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const controller = new AbortController();
        let timedOut = false;
        const timer = setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, options.timeoutMs);

        let response: Response;
        try {
          response = await fetchImpl(url, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${options.apiKey}`,
              "Content-Type": "application/json",
              Accept: "application/json",
              "User-Agent": "vinintel-sommelier/1.0 (+https://vinintel.ro)",
            },
            body: payload,
            signal: controller.signal,
          });
        } catch {
          const aborted = controller.signal.aborted;
          const reason: JevFailureReason = timedOut
            ? "timeout"
            : aborted
              ? "aborted"
              : "network";
          lastError = new JevError(
            reason,
            reason === "timeout"
              ? "System One request timed out."
              : "System One request failed before a response.",
            { retryable: reason !== "aborted" },
          );
          if (reason === "aborted" || attempt + 1 >= maxAttempts) {
            throw lastError;
          }
          await sleep(backoffMs(attempt, random));
          continue;
        } finally {
          clearTimeout(timer);
        }

        const requestId = readRequestId(response);

        if (!response.ok) {
          let body: unknown = null;
          try {
            const text = await readBodyText(response, maxResponseBytes);
            body = text.trim() ? parseJsonBody(text) : null;
          } catch {
            body = null;
          }
          const reason = classifyHttpStatus(response.status);
          const error = new JevError(
            reason,
            redactSecret(
              `System One returned HTTP ${response.status} (${describeErrorBody(body)}).`,
              options.apiKey,
            ),
            { status: response.status, retryable: RETRYABLE_STATUSES.has(response.status) },
          );
          if (!error.retryable || attempt + 1 >= maxAttempts) {
            throw error;
          }
          const retryAfter = parseRetryAfterMs(response.headers.get("retry-after"), now());
          await sleep(retryAfter ?? backoffMs(attempt, random));
          lastError = error;
          continue;
        }

        let text: string;
        try {
          text = await readBodyText(response, maxResponseBytes);
        } catch (error) {
          if (error instanceof JevError) throw error;
          lastError = new JevError(
            "network",
            "System One response body was interrupted.",
            { retryable: true, status: response.status },
          );
          if (attempt + 1 >= maxAttempts) throw lastError;
          await sleep(backoffMs(attempt, random));
          continue;
        }
        const body = parseJsonBody(text);

        return {
          body,
          status: response.status,
          attempts: attempt + 1,
          requestId,
          latencyMs: Math.max(0, now() - started),
        };
      }

      throw (
        lastError ??
        new JevError("unknown", "System One request exhausted its retry budget.")
      );
    },
  };
}
