import { describe, expect, it } from "vitest";
import {
  describeJevConfig,
  resolveJevConfig,
} from "@/lib/jev/config";

const SECRET = "ts_live_super_secret_key_value";

describe("resolveJevConfig: safe defaults", () => {
  it("defaults to off without configuration", () => {
    const config = resolveJevConfig({});
    expect(config.mode).toBe("off");
    expect(config.enabled).toBe(false);
    expect(config.hasApiKey).toBe(false);
    expect(config.model).toBe("jev-latest");
    expect(config.timeoutMs).toBe(6_000);
    expect(config.maxRetries).toBe(1);
    expect(config.minConfidence).toBe(0.55);
  });

  it("never enables live mode merely because an API key exists", () => {
    const config = resolveJevConfig({ TYPESAFE_API_KEY: SECRET });
    expect(config.hasApiKey).toBe(true);
    expect(config.mode).toBe("off");
    expect(config.enabled).toBe(false);
  });

  it("enables the client for shadow mode when a key exists", () => {
    const config = resolveJevConfig({
      TYPESAFE_API_KEY: SECRET,
      JEV_MODE: "shadow",
    });
    expect(config.mode).toBe("shadow");
    expect(config.enabled).toBe(true);
  });

  it("keeps the client disabled when the key is missing", () => {
    const config = resolveJevConfig({ JEV_MODE: "live" });
    expect(config.mode).toBe("live");
    expect(config.enabled).toBe(false);
    expect(config.warnings).toContain("jev_enabled_without_api_key");
  });

  it("treats blank values as unset", () => {
    const config = resolveJevConfig({
      JEV_MODE: "   ",
      TYPESAFE_API_KEY: "   ",
    });
    expect(config.mode).toBe("off");
    expect(config.hasApiKey).toBe(false);
  });
});

describe("resolveJevConfig: invalid values fail safe", () => {
  it("falls back to off for an unknown mode", () => {
    const config = resolveJevConfig({ JEV_MODE: "enabled" });
    expect(config.mode).toBe("off");
    expect(config.warnings).toContain("jev_mode_invalid_defaulted_to_off");
  });

  it("clamps out-of-range numbers", () => {
    const config = resolveJevConfig({
      JEV_TIMEOUT_MS: "999999",
      JEV_MAX_RETRIES: "99",
      JEV_MIN_CONFIDENCE: "5",
      JEV_MAX_CONCURRENT: "0",
    });
    expect(config.timeoutMs).toBe(15_000);
    expect(config.maxRetries).toBe(2);
    expect(config.minConfidence).toBe(0.9);
    expect(config.maxConcurrent).toBe(1);
    expect(config.warnings.length).toBeGreaterThan(0);
  });

  it("rejects an invalid model name", () => {
    const config = resolveJevConfig({ JEV_MODEL: "bad model!" });
    expect(config.model).toBe("jev-latest");
    expect(config.warnings).toContain("jev_model_invalid_defaulted");
  });

  it("refuses to spend a key that was exposed publicly", () => {
    const config = resolveJevConfig({
      TYPESAFE_API_KEY: SECRET,
      NEXT_PUBLIC_TYPESAFE_API_KEY: SECRET,
      JEV_MODE: "live",
    });
    expect(config.hasApiKey).toBe(false);
    expect(config.enabled).toBe(false);
    expect(config.warnings).toContain("typesafe_key_must_not_be_public");
  });

  it("does not allow personalised ranking in live mode", () => {
    const config = resolveJevConfig({
      TYPESAFE_API_KEY: SECRET,
      JEV_MODE: "live",
      JEV_PERSONALIZATION: "live",
    });
    expect(config.personalization).toBe("off");
    expect(config.warnings).toContain("jev_personalization_only_off_or_shadow");
  });

  it("only trusts https base urls", () => {
    const insecure = resolveJevConfig({ TYPESAFE_BASE_URL: "http://api.test" });
    expect(insecure.baseUrl).toBe("https://api.typesafe.ai");
    expect(insecure.warnings).toContain("jev_base_url_requires_https");

    const secure = resolveJevConfig({ TYPESAFE_BASE_URL: "https://proxy.test/" });
    expect(secure.baseUrl).toBe("https://proxy.test");
  });
});

describe("describeJevConfig", () => {
  it("never includes the API key", () => {
    const config = resolveJevConfig({
      TYPESAFE_API_KEY: SECRET,
      JEV_MODE: "shadow",
    });
    const serialized = JSON.stringify(describeJevConfig(config));
    expect(serialized).not.toContain(SECRET);
    expect(serialized).toContain("\"hasApiKey\":true");
  });
});
