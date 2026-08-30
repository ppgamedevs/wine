import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  consumeSommelierHandoff,
  SOMMELIER_PROMPT_STORAGE,
  SOMMELIER_SENT_STORAGE,
  storeSommelierPrompt,
} from "@/lib/sommelier-handoff";

describe("sommelier handoff", () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    vi.stubGlobal("window", {
      sessionStorage: {
        getItem: (key: string) => memory.get(key) ?? null,
        setItem: (key: string, value: string) => {
          memory.set(key, value);
        },
        removeItem: (key: string) => {
          memory.delete(key);
        },
        clear: () => memory.clear(),
      },
    });
    vi.stubGlobal("document", { cookie: "" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("delivers a stored prompt once, then ignores the same replay", () => {
    storeSommelierPrompt("vin pentru sarmale");
    expect(consumeSommelierHandoff()).toBe("vin pentru sarmale");
    expect(memory.get(SOMMELIER_PROMPT_STORAGE)).toBeUndefined();
    expect(consumeSommelierHandoff("vin pentru sarmale")).toBe("");
  });

  it("accepts a new prompt after another search", () => {
    storeSommelierPrompt("vin pentru sarmale");
    expect(consumeSommelierHandoff()).toBe("vin pentru sarmale");

    storeSommelierPrompt("vin pentru cheesecake");
    expect(consumeSommelierHandoff()).toBe("vin pentru cheesecake");
    expect(memory.get(SOMMELIER_SENT_STORAGE)).toBe("vin pentru cheesecake");
  });
});
