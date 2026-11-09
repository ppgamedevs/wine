import { describe, expect, it } from "vitest";
import {
  commercialEditorialNotice,
  extractEditorialPrices,
} from "@/lib/commercial-editorial";

describe("commercial editorial price reconciliation", () => {
  it("extracts RON and lei prices", () => {
    expect(extractEditorialPrices("La 71 RON si sub 45 lei.")).toEqual([
      71, 45,
    ]);
  });

  it("labels a stale price as historical without rewriting it", () => {
    const notice = commercialEditorialNotice(
      ["La 71 RON, acest vin ofera un raport corect."],
      65,
      "ro",
    );
    expect(notice).toContain("Analiză istorică");
    expect(notice).toContain("71 RON");
    expect(notice).toContain("65 RON");
    expect(notice).not.toContain("La 65 RON, acest vin");
  });

  it("shows no notice when the price matches current verified data", () => {
    expect(
      commercialEditorialNotice(["La 65 RON, oferta este corecta."], 65, "ro"),
    ).toBeNull();
  });

  it("marks price prose historical when no verified offer exists", () => {
    const notice = commercialEditorialNotice(
      ["La 50 RON, merita."],
      null,
      "ro",
    );
    expect(notice).toContain("ofertă Profitshare verificată");
    expect(notice).toContain("50 RON");
  });

  it("does not flag immutable text without a price", () => {
    expect(
      commercialEditorialNotice(["Vin proaspat, cu aciditate vie."], 65, "ro"),
    ).toBeNull();
  });
});
