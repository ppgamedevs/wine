import { describe, expect, it } from "vitest";
import {
  SOMMELIER_INTENT_QUESTIONS,
  parseSystemOneResponse,
} from "@/lib/jev/questions";
import {
  applyJevIntentToSommelierInput,
  buildJevIntent,
  compareJevWithDeterministic,
  describeJevIntent,
} from "@/lib/jev/intent";
import type { ParsedJevAnswers } from "@/lib/jev/questions";
import type { SommelierInput } from "@/lib/sommelier-occasions";
import { JevError, type JevIntent } from "@/lib/jev/types";

function rawResponse(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    model: "jev-latest",
    answers: {
      occasion: {
        type: "choice",
        choice: "romantic_dinner",
        confidence: 0.9,
        probabilities: { romantic_dinner: 0.9 },
      },
      food_pairing: { type: "noul", noul: 0.92 },
      food_pairing_strength: {
        type: "score",
        score: 2,
        confidence: 0.8,
        legend: {},
        probabilities: {},
      },
      food_category: {
        type: "choice",
        choice: "pasta",
        confidence: 0.8,
        probabilities: {},
      },
      wine_color: {
        type: "choice",
        choice: "white",
        confidence: 0.85,
        probabilities: {},
      },
      sweetness: {
        type: "choice",
        choice: "dry",
        confidence: 0.8,
        probabilities: {},
      },
      acidity: {
        type: "choice",
        choice: "low",
        confidence: 0.78,
        probabilities: {},
      },
      body: { type: "choice", choice: "medium", confidence: 0.7, probabilities: {} },
      style: { type: "choice", choice: "fresh", confidence: 0.72, probabilities: {} },
      user_intent: {
        type: "choice",
        choice: "discover",
        confidence: 0.9,
        probabilities: {},
      },
      specific_product_request: { type: "noul", noul: 0.05 },
      has_exclusions: { type: "noul", noul: 0.88 },
      ...overrides,
    },
    usage: { input_tokens: 120, output_tokens: 30 },
  };
}

function parse(raw: Record<string, unknown>): ParsedJevAnswers {
  return parseSystemOneResponse(raw);
}

function baseInput(overrides: Partial<SommelierInput> = {}): SommelierInput {
  return {
    budgetMin: 0,
    budgetMax: 9999,
    budgetSpecified: false,
    occasion: "oricare",
    color: "any",
    sweetness: "any",
    preferredWinerySlugs: [],
    absurdRequest: false,
    dish: null,
    ...overrides,
  };
}

describe("parseSystemOneResponse", () => {
  it("accepts the documented response shape", () => {
    const parsed = parse(rawResponse());
    expect(parsed.model).toBe("jev-latest");
    expect(parsed.answers.size).toBeGreaterThanOrEqual(12);
    expect(parsed.usage).toEqual({ inputTokens: 120, outputTokens: 30 });
    expect(parsed.missing).toEqual([]);
    expect(parsed.invalid).toEqual([]);
  });

  it("rejects a response that is not the documented schema", () => {
    expect(() => parse({ answers: {} })).toThrow(JevError);
  });

  it("rejects unknown choice labels as invalid fields", () => {
    const parsed = parse(
      rawResponse({
        wine_color: {
          type: "choice",
          choice: "purple",
          confidence: 0.9,
          probabilities: {},
        },
      }),
    );
    expect(parsed.invalid).toContain("wine_color");
  });

  it("treats a mostly missing response as unusable", () => {
    const raw = rawResponse();
    const answers = raw.answers as Record<string, unknown>;
    delete answers.occasion;
    delete answers.wine_color;
    delete answers.food_category;
    expect(() => parseSystemOneResponse(raw)).toThrow(JevError);
  });

  it("rejects a noul answer with an out-of-range probability", () => {
    expect(() =>
      parse(rawResponse({ food_pairing: { type: "noul", noul: 1.4 } })),
    ).toThrow(JevError);
  });
});

describe("buildJevIntent", () => {
  it("maps validated answers into structured intent", () => {
    const intent = buildJevIntent(parse(rawResponse()), 0.55);
    expect(intent.occasion).toBe("romantic_dinner");
    expect(intent.foodPairing).toBe(true);
    expect(intent.foodPairingStrength).toBe("central");
    expect(intent.foodCategory).toBe("pasta");
    expect(intent.color).toBe("white");
    expect(intent.sweetness).toBe("dry");
    expect(intent.acidity).toBe("low");
    expect(intent.body).toBe("medium");
    expect(intent.style).toBe("fresh");
    expect(intent.userIntent).toBe("discover");
    expect(intent.specificProductRequest).toBe(false);
    expect(intent.hasExclusions).toBe(true);
    expect(intent.confidentFields).toContain("color");
  });

  it("downgrades low-confidence choices to unknown instead of guessing", () => {
    const parsed = parse(
      rawResponse({
        wine_color: {
          type: "choice",
          choice: "red",
          confidence: 0.3,
          probabilities: {},
        },
      }),
    );
    const intent = buildJevIntent(parsed, 0.55);
    expect(intent.color).toBe("unknown");
    expect(intent.confidence.color).toBe(0.3);
    expect(intent.confidentFields).not.toContain("color");
  });

  it("keeps a 50/50 noul answer as null", () => {
    const intent = buildJevIntent(
      parse(rawResponse({ has_exclusions: { type: "noul", noul: 0.5 } })),
      0.55,
    );
    expect(intent.hasExclusions).toBeNull();
  });

  it("maps an explicit 'no preference' colour to no_preference", () => {
    const intent = buildJevIntent(
      parse(
        rawResponse({
          wine_color: {
            type: "choice",
            choice: "no_preference",
            confidence: 0.9,
            probabilities: {},
          },
        }),
      ),
      0.55,
    );
    expect(intent.color).toBe("no_preference");
  });
});

describe("applyJevIntentToSommelierInput", () => {
  it("fills only fields the deterministic parser left open", () => {
    const intent = buildJevIntent(parse(rawResponse()), 0.55);
    const applied = applyJevIntentToSommelierInput(baseInput(), intent);
    expect(applied.input.color).toBe("white");
    expect(applied.input.sweetness).toBe("sec");
    expect(applied.input.occasion).toBe("cina-romantica");
    expect(applied.input.dish).toBe("paste");
    expect(applied.applied).toEqual(
      expect.arrayContaining(["color", "sweetness", "occasion", "dish"]),
    );
  });

  it("never overrides an explicit deterministic preference", () => {
    const intent = buildJevIntent(parse(rawResponse()), 0.55);
    const applied = applyJevIntentToSommelierInput(
      baseInput({ color: "red", sweetness: "sec", occasion: "gratar", dish: "sarmale" }),
      intent,
    );
    expect(applied.input.color).toBe("red");
    expect(applied.input.sweetness).toBe("sec");
    expect(applied.input.occasion).toBe("gratar");
    expect(applied.input.dish).toBe("sarmale");
    expect(applied.ignored).toEqual(
      expect.arrayContaining(["color", "sweetness", "occasion", "dish"]),
    );
  });
});

describe("compareJevWithDeterministic", () => {
  it("reports agreement when both engines agree", () => {
    const intent = buildJevIntent(parse(rawResponse()), 0.55);
    const comparison = compareJevWithDeterministic(
      baseInput({ color: "white", sweetness: "sec" }),
      intent,
    );
    expect(comparison.agreement).toBe("agree");
  });

  it("reports the disagreeing field", () => {
    const intent = buildJevIntent(parse(rawResponse()), 0.55);
    const comparison = compareJevWithDeterministic(
      baseInput({ color: "red", sweetness: "sec" }),
      intent,
    );
    expect(comparison.agreement).toBe("disagree");
    expect(comparison.disagreements).toContain("color");
  });

  it("does not compare fields neither engine knows", () => {
    const parsed = parse(rawResponse({ wine_color: { type: "noul", noul: 0.2 } }));
    const intent = buildJevIntent(parsed, 0.55);
    const comparison = compareJevWithDeterministic(baseInput(), intent);
    expect(comparison.agreement).toBe("not_compared");
  });
});

describe("describeJevIntent", () => {
  it("omits unknown fields and never invents wine facts", () => {
    const intent = buildJevIntent(parse(rawResponse()), 0.55);
    const lines = describeJevIntent(intent, "ro");
    expect(lines.join("\n")).toContain("Ocazie");
    expect(lines.join("\n")).not.toContain("unknown");
    const empty = buildJevIntent(
      parse(
        rawResponse({
          occasion: { type: "choice", choice: "unknown", confidence: 0.9, probabilities: {} },
          food_category: {
            type: "choice",
            choice: "unknown",
            confidence: 0.9,
            probabilities: {},
          },
        }),
      ),
      0.55,
    );
    expect(describeJevIntent(empty, "ro").join("\n")).not.toContain("Ocazie");
  });
});

describe("question set", () => {
  it("contains explicit unknown options for preference questions", () => {
    const occasion = SOMMELIER_INTENT_QUESTIONS.occasion;
    expect(occasion.type).toBe("choice");
    if (occasion.type === "choice") {
      expect(occasion.criteria.unknown).toBeTruthy();
    }
  });

  it("never asks the model for a budget", () => {
    const serialized = JSON.stringify(SOMMELIER_INTENT_QUESTIONS);
    expect(serialized.toLowerCase()).not.toContain("budget");
    expect(serialized.toLowerCase()).not.toContain("price");
  });

  it("exposes the expected intent type only through validated answers", () => {
    const intent: JevIntent = buildJevIntent(parse(rawResponse()), 0.55);
    expect(Object.keys(intent.confidence)).toHaveLength(12);
  });
});
