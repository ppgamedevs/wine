import { afterEach, describe, expect, it } from "vitest";
import {
  isEnglishIndexingEnabled,
  localeMayBeIndexed,
  localizedRobots,
} from "@/lib/i18n/indexing";

const original = process.env.ENGLISH_INDEXING_ENABLED;

afterEach(() => {
  if (original == null) delete process.env.ENGLISH_INDEXING_ENABLED;
  else process.env.ENGLISH_INDEXING_ENABLED = original;
});

describe("English indexing gate", () => {
  it("fails closed until full coverage is explicitly enabled", () => {
    delete process.env.ENGLISH_INDEXING_ENABLED;
    expect(isEnglishIndexingEnabled()).toBe(false);
    expect(localeMayBeIndexed("ro")).toBe(true);
    expect(localizedRobots("en")).toEqual({ index: false, follow: true });
  });

  it("can be enabled only through an explicit production gate", () => {
    process.env.ENGLISH_INDEXING_ENABLED = "true";
    expect(localizedRobots("en")).toEqual({ index: true, follow: true });
  });
});

