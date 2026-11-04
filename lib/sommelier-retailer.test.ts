import { describe, expect, it } from "vitest";
import { detectRetailer, describeRetailerForPrompt } from "@/lib/sommelier-retailer";

describe("sommelier retailer detection", () => {
  it("recognizes Mega and Mega Image without assuming stock", () => {
    for (const text of ["Mega", "Mega Image", "la mega image", "MEGA"]) {
      const retailer = detectRetailer(text);
      expect(retailer.detected).toBe(true);
      expect(retailer.id).toBe("mega-image");
      expect(retailer.label).toBe("Mega Image");
      expect(retailer.availabilityStatus).toBe("unverified");
    }
  });

  it("does not treat a generic wine request as a retailer", () => {
    expect(detectRetailer("un vin rosu bun").detected).toBe(false);
  });

  it("tells the model not to claim store stock or invent shelf prices", () => {
    const lines = describeRetailerForPrompt(detectRetailer("Mega"), "ro");
    expect(lines.join(" ")).toContain("nu are");
    expect(lines.join(" ")).toContain("stoc");
    expect(lines.join(" ")).toContain("prețuri");
  });
});
