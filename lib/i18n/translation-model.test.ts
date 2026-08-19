import { afterEach, describe, expect, it } from "vitest";
import {
  TRANSLATION_PROMPT_VERSION,
  configuredTranslationModel,
  parseProviderTranslation,
  translateContentWithXai,
  unwrapProviderTranslation,
} from "@/lib/i18n/translation-model";

const originalKey = process.env.XAI_API_KEY;
const originalModel = process.env.I18N_TRANSLATION_MODEL;

afterEach(() => {
  if (originalKey == null) delete process.env.XAI_API_KEY;
  else process.env.XAI_API_KEY = originalKey;
  if (originalModel == null) delete process.env.I18N_TRANSLATION_MODEL;
  else process.env.I18N_TRANSLATION_MODEL = originalModel;
});

describe("offline translation model", () => {
  it("uses a versioned prompt and requires an approved model", () => {
    expect(TRANSLATION_PROMPT_VERSION).toBe("prompt27b-v1");
    delete process.env.I18N_TRANSLATION_MODEL;
    expect(configuredTranslationModel).toThrow("I18N_TRANSLATION_MODEL");
  });

  it("fails before any network call when xAI is not configured", async () => {
    delete process.env.XAI_API_KEY;
    process.env.I18N_TRANSLATION_MODEL = "approved-xai-model";

    await expect(
      translateContentWithXai({
        source: "Vin roșu sec",
        entityType: "wine",
        field: "descriptionEditorial",
      }),
    ).rejects.toThrow("XAI_API_KEY");
  });

  it("unwraps provider-added field labels without changing source shape", () => {
    const input = {
      source: "Vin roșu sec",
      entityType: "wine",
      field: "descriptionEditorial",
    };
    expect(
      unwrapProviderTranslation(
        { descriptionEditorial: "Dry red wine" },
        input,
      ),
    ).toBe("Dry red wine");
    expect(
      unwrapProviderTranslation(
        {
          "Entity type": "wine",
          Field: "descriptionEditorial",
          "Romanian source JSON": "Dry red wine",
        },
        input,
      ),
    ).toBe("Dry red wine");
    expect(
      unwrapProviderTranslation({ text: "Dry red wine" }, input),
    ).toBe("Dry red wine");
  });

  it("preserves translated objects that already match source shape", () => {
    const translated = { title: "Title", body: "Body" };
    expect(
      unwrapProviderTranslation(translated, {
        source: { title: "Titlu", body: "Corp" },
        entityType: "journal_article",
        field: "content",
      }),
    ).toEqual(translated);
  });

  it("accepts plain or fenced provider text only for string sources", () => {
    const input = {
      source: "Vin roșu sec",
      entityType: "wine",
      field: "tastingNotes",
    };
    expect(parseProviderTranslation("Dry red wine", input)).toBe(
      "Dry red wine",
    );
    expect(parseProviderTranslation('```json\n"Dry red wine"\n```', input)).toBe(
      "Dry red wine",
    );
    expect(() =>
      parseProviderTranslation("not valid JSON", {
        ...input,
        source: ["Vin roșu sec"],
      }),
    ).toThrow("invalid translation JSON");
  });
});

