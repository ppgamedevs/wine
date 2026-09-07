import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import {
  addEnglishSitemapEntries,
  englishPath,
} from "@/app/sitemap";

describe("localized sitemap", () => {
  it("maps canonical Romanian route families to English", () => {
    expect(englishPath("/vinuri", [])).toBe("/en/wines");
    expect(englishPath("/soiuri", [])).toBe("/en/grape-varieties");
    expect(englishPath("/soiuri/sarba", [])).toBe("/en/grape-varieties/sarba");
    expect(englishPath("/wines/example", [])).toBe("/en/wines/example");
    expect(englishPath("/regiuni/dealu-mare", [])).toBe(
      "/en/regions/dealu-mare",
    );
    expect(englishPath("/topuri/vinuri-sub-100-lei", [])).toBe(
      "/en/top-wines/wines-under-100-ron",
    );
  });

  it("emits reciprocal hreflang pairs with Romanian x-default", () => {
    const entries = addEnglishSitemapEntries(
      [{ url: "https://vinintel.ro/vinuri", priority: 0.8 }],
      [],
    );

    expect(entries).toHaveLength(2);
    expect(entries[0]?.alternates?.languages).toEqual(
      entries[1]?.alternates?.languages,
    );
    expect(entries[0]?.alternates?.languages?.["x-default"]).toBe(
      "https://vinintel.ro/vinuri",
    );
  });
});

