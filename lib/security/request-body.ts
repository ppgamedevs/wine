import type { ZodType } from "zod";

export type BoundedJsonResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      response: Response;
    };

function jsonError(status: number, code: string, message: string): Response {
  return Response.json(
    { error: { code, message } },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
}

export async function readBoundedJson<T>(
  request: Request,
  schema: ZodType<T>,
  maxBytes: number,
): Promise<BoundedJsonResult<T>> {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const parsedLength = Number(contentLength);
    if (Number.isFinite(parsedLength) && parsedLength > maxBytes) {
      return {
        ok: false,
        response: jsonError(
          413,
          "payload_too_large",
          "The request payload is too large.",
        ),
      };
    }
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return {
      ok: false,
      response: jsonError(400, "invalid_body", "The request body is invalid."),
    };
  }

  if (Buffer.byteLength(raw, "utf8") > maxBytes) {
    return {
      ok: false,
      response: jsonError(
        413,
        "payload_too_large",
        "The request payload is too large.",
      ),
    };
  }

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      response: jsonError(400, "invalid_json", "The request body is not JSON."),
    };
  }

  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    return {
      ok: false,
      response: jsonError(400, "invalid_request", "The request is invalid."),
    };
  }

  return { ok: true, data: parsed.data };
}
