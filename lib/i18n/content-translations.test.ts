import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {} }));

import {
  assessContentTranslationReadiness,
  checkContentTranslationShape,
  getReadyContentTranslation,
  hashContentTranslationSource,
  translationCoverageByEntity,
  translationCoverageReady,
  type ContentTranslationSource,
} from "@/lib/i18n/content-translations";
import type {
  ContentTranslationJson,
  ContentTranslationQaMetadata,
  ContentTranslationStatus,
} from "@/lib/schema";

const romanianSource: ContentTranslationJson = {
  title: "Vin românesc",
  facts: {
    vintage: 2022,
    organic: true,
  },
  notes: ["Fructe roșii", "Condimente"],
};

function source(
  overrides: Partial<ContentTranslationSource> = {},
): ContentTranslationSource {
  return {
    entityType: "wine",
    entityId: "27",
    field: "editorial",
    sourceLocale: "ro",
    targetLocale: "en",
    sourceValueJson: romanianSource,
    sourceUpdatedAt: "2026-08-19T10:00:00.000Z",
    ...overrides,
  };
}

function row(
  status: ContentTranslationStatus,
  overrides: {
    sourceHash?: string;
    sourceValueJson?: ContentTranslationJson;
    valueJson?: ContentTranslationJson | null;
    qaMetadata?: ContentTranslationQaMetadata;
  } = {},
) {
  const currentSource = source();
  return {
    sourceHash:
      overrides.sourceHash ?? hashContentTranslationSource(currentSource),
    status,
    sourceValueJson: overrides.sourceValueJson ?? romanianSource,
    valueJson:
      overrides.valueJson ??
      ({
        title: "Romanian wine",
        facts: {
          vintage: 2022,
          organic: true,
        },
        notes: ["Red fruit", "Spices"],
      } satisfies ContentTranslationJson),
    qaMetadata: overrides.qaMetadata ?? { shapeValid: true, issues: [] },
  };
}

describe("content translation source hashing", () => {
  it("is idempotent, key-order stable, and excludes source timestamps", () => {
    const first = source();
    const reordered = source({
      sourceValueJson: {
        notes: ["Fructe roșii", "Condimente"],
        facts: {
          organic: true,
          vintage: 2022,
        },
        title: "Vin românesc",
      },
      sourceUpdatedAt: "2030-01-01T00:00:00.000Z",
      targetLocale: "de",
    });

    expect(hashContentTranslationSource(first)).toBe(
      hashContentTranslationSource(first),
    );
    expect(hashContentTranslationSource(first)).toBe(
      hashContentTranslationSource(reordered),
    );
  });

  it("detects changed source content as stale", () => {
    const persisted = row("READY");
    const changed = source({
      sourceValueJson: {
        ...romanianSource as { [key: string]: ContentTranslationJson },
        title: "Vin românesc actualizat",
      },
    });

    expect(
      assessContentTranslationReadiness(persisted, changed).readiness,
    ).toBe("STALE");
  });
});

describe("content translation QA and readiness", () => {
  it("does not mutate Romanian source JSON during shape QA or readiness", () => {
    const before = JSON.stringify(romanianSource);
    const persisted = row("READY");

    checkContentTranslationShape(
      romanianSource,
      persisted.valueJson,
    );
    assessContentTranslationReadiness(persisted, source());

    expect(JSON.stringify(romanianSource)).toBe(before);
  });

  it("returns READY only for current, shape-safe approved content", () => {
    expect(
      assessContentTranslationReadiness(row("READY"), source()).readiness,
    ).toBe("READY");
  });

  it("preserves explicit STALE, REVIEW_REQUIRED, and FAILED semantics", () => {
    expect(
      assessContentTranslationReadiness(row("STALE"), source()).readiness,
    ).toBe("STALE");
    expect(
      assessContentTranslationReadiness(row("REVIEW_REQUIRED"), source())
        .readiness,
    ).toBe("REVIEW_REQUIRED");
    expect(
      assessContentTranslationReadiness(row("FAILED"), source()).readiness,
    ).toBe("FAILED");
  });

  it("requires review when translated JSON changes factual shape", () => {
    const invalid = row("READY", {
      valueJson: {
        title: "Romanian wine",
        facts: {
          vintage: 2023,
          organic: true,
        },
        notes: ["Red fruit", "Spices"],
      },
    });

    const assessment = assessContentTranslationReadiness(invalid, source());
    expect(assessment.readiness).toBe("REVIEW_REQUIRED");
    expect(assessment.qa.issues).toContain(
      "$.facts.vintage: non-text value changed",
    );
  });

  it("fails closed when translation storage is unavailable", async () => {
    await expect(getReadyContentTranslation(source())).resolves.toBeNull();
    await expect(translationCoverageReady([source()])).resolves.toBe(false);
    await expect(translationCoverageByEntity([source()])).resolves.toEqual(
      new Map([["wine|27", false]]),
    );
  });
});
