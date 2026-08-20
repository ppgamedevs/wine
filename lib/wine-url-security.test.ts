import { describe, expect, it } from "vitest";
import { isSafePublicWineUrl } from "@/lib/wine-url";

describe("isSafePublicWineUrl", () => {
  it("accepts normal public HTTP and HTTPS product links", () => {
    expect(isSafePublicWineUrl("https://www.avincis.ro/vin/sole")).toBe(true);
    expect(isSafePublicWineUrl("http://example.com/wine")).toBe(true);
  });

  it.each([
    "http://localhost/wine",
    "http://127.0.0.1/wine",
    "http://10.0.0.8/wine",
    "http://169.254.169.254/latest/meta-data",
    "http://192.168.1.2/wine",
    "http://[::1]/wine",
    "ftp://example.com/wine",
    "https://user:password@example.com/wine",
    "https://example.com:8080/wine",
  ])("rejects unsafe address %s", (url) => {
    expect(isSafePublicWineUrl(url)).toBe(false);
  });
});
