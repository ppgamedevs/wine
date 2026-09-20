import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { wineryHasCatalogWinesCondition } from "@/lib/wine-catalog";

function sqlText(fragment: { queryChunks: readonly unknown[] }): string {
  return fragment.queryChunks
    .map((chunk) => {
      if (typeof chunk === "string") return chunk;
      if (
        chunk &&
        typeof chunk === "object" &&
        "value" in chunk &&
        Array.isArray((chunk as { value: unknown }).value)
      ) {
        return (chunk as { value: string[] }).value.join("");
      }
      return "";
    })
    .join("");
}

describe("wineryHasCatalogWinesCondition", () => {
  it("aliases wines in EXISTS so the outer wineries query cannot rewrite winery_id", () => {
    const text = sqlText(wineryHasCatalogWinesCondition());

    expect(text).toContain("from wines as catalog_wines");
    expect(text).toContain("catalog_wines.winery_id");
    expect(text).not.toContain("wineries.winery_id");
    expect(text).not.toContain('"wineries"."winery_id"');
  });
});
