/**
 * Privacy-aware structured logging for Jev.
 *
 * Allowed: counters, latency, token usage, status codes, hashed message
 * fingerprints. Never allowed: API keys, raw user messages, conversation
 * history, e-mail addresses or other identifiers.
 */

const MAX_FIELD_STRING = 160;
const SENSITIVE_KEY_PATTERN =
  /(api[_-]?key|authorization|bearer|secret|cookie|raw_?message|user_?message|conversation|prompt|^state$|email)/i;

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (value == null) return value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") {
    return value.length > MAX_FIELD_STRING
      ? `${value.slice(0, MAX_FIELD_STRING)}...`
      : value;
  }
  if (depth >= 2) return "[truncated]";
  if (Array.isArray(value)) {
    return value.slice(0, 8).map((entry) => sanitizeValue(entry, depth + 1));
  }
  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      // A boolean flag (for example `hasApiKey: true`) is not a secret.
      if (typeof entry !== "boolean" && SENSITIVE_KEY_PATTERN.test(key)) {
        output[key] = "[redacted]";
        continue;
      }
      output[key] = sanitizeValue(entry, depth + 1);
    }
    return output;
  }
  return "[unserializable]";
}

export type JevLogLevel = "info" | "warn" | "error";

/**
 * Emit one JSON line. Namespaced so existing log drains can filter it.
 */
export function logJevEvent(
  level: JevLogLevel,
  event: string,
  fields: Record<string, unknown> = {},
): void {
  const payload = {
    scope: "jev",
    event,
    ...(sanitizeValue(fields) as Record<string, unknown>),
  };
  const serialized = JSON.stringify(payload);
  if (level === "error") console.error(serialized);
  else if (level === "warn") console.warn(serialized);
  else console.info(serialized);
}

export { sanitizeValue as sanitizeJevLogFields };
