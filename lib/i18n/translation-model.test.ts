import { afterEach, describe, expect, it } from "vitest";
import {
  TRANSLATION_PROMPT_VERSION,
  configuredTranslationModel,
  translateContentWithOpenAI,
} from "@/lib/i18n/translation-model";

const originalKey = process.env.OPENAI_API_KEY;
const originalModel = process.env.I18N_TRANSLATION_MODEL;

afterEach(() => {
  if (originalKey == null) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalKey;
  if (originalModel == null) delete process.env.I18N_TRANSLATION_MODEL;
  else process.env.I18N_TRANSLATION_MODEL = originalModel;
});

describe("offline translation model", () => {
  it("uses a versioned prompt and requires an approved model", () => {
    expect(TRANSLATION_PROMPT_VERSION).toBe("prompt27b-v1");
    delete process.env.I18N_TRANSLATION_MODEL;
    expect(configuredTranslationModel).toThrow("I18N_TRANSLATION_MODEL");
  });

  it("fails before any network call when OpenAI is not configured", async () => {
    delete process.env.OPENAI_API_KEY;
    process.env.I18N_TRANSLATION_MODEL = "approved-openai-model";

    await expect(
      translateContentWithOpenAI({
        source: "Vin roșu sec",
        entityType: "wine",
        field: "descriptionEditorial",
      }),
    ).rejects.toThrow("OPENAI_API_KEY");
  });
});

