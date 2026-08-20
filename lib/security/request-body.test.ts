import { describe, expect, it } from "vitest";
import { z } from "zod";
import { readBoundedJson } from "@/lib/security/request-body";

const schema = z.object({ value: z.string().max(12) });

describe("readBoundedJson", () => {
  it("accepts bounded valid JSON", async () => {
    const result = await readBoundedJson(
      new Request("https://vinintel.ro/api/test", {
        method: "POST",
        body: JSON.stringify({ value: "vin" }),
      }),
      schema,
      100,
    );

    expect(result).toEqual({ ok: true, data: { value: "vin" } });
  });

  it("rejects an oversized content length before reading", async () => {
    const result = await readBoundedJson(
      new Request("https://vinintel.ro/api/test", {
        method: "POST",
        headers: { "Content-Length": "101" },
        body: "{}",
      }),
      schema,
      100,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(413);
  });

  it("rejects malformed and schema-invalid JSON", async () => {
    const malformed = await readBoundedJson(
      new Request("https://vinintel.ro/api/test", {
        method: "POST",
        body: "{",
      }),
      schema,
      100,
    );
    const invalid = await readBoundedJson(
      new Request("https://vinintel.ro/api/test", {
        method: "POST",
        body: JSON.stringify({ value: 1 }),
      }),
      schema,
      100,
    );

    expect(malformed.ok).toBe(false);
    expect(invalid.ok).toBe(false);
  });
});
