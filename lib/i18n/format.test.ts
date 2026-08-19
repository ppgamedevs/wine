import { describe, expect, it } from "vitest";
import {
  formatLongDate,
  formatRon,
  getWineSweetnessLabel,
  getWineTypeLabel,
} from "@/lib/format";

describe("locale-aware public formatting", () => {
  it("keeps RON while using natural English notation", () => {
    expect(formatRon(78, "en")).toBe("78 RON");
    expect(formatRon(null, "en")).toBe("Price unavailable");
  });

  it("formats English dates and canonical labels without changing values", () => {
    expect(formatLongDate("2026-08-19T00:00:00.000Z", "en")).toContain(
      "August",
    );
    expect(getWineTypeLabel("red", "en")).toBe("Red");
    expect(getWineSweetnessLabel("demisec", "en")).toBe("Medium-dry");
  });
});

