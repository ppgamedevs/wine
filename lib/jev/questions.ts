/**
 * Jev question definitions for the VinIntel Sommelier intent engine.
 *
 * The wire format is the official `POST /v1/systemone` contract:
 *   { model, state, questions: { name: { type, instructions, criteria } } }
 * Choice criteria are label -> description (or null), score criteria are an
 * ordered list of levels, noul is a yes/no statement.
 *
 * Deliberately missing from this file: prices, budgets, availability and any
 * other numeric constraint. Those stay deterministic in `lib/sommelier-budget`.
 */
import { z } from "zod";
import { JevError } from "@/lib/jev/types";

export const JEV_QUESTION_IDS = [
  "occasion",
  "food_pairing",
  "food_pairing_strength",
  "food_category",
  "wine_color",
  "sweetness",
  "acidity",
  "body",
  "style",
  "user_intent",
  "specific_product_request",
  "has_exclusions",
] as const;

export type JevQuestionId = (typeof JEV_QUESTION_IDS)[number];

export interface ChoiceQuestionWire {
  type: "choice";
  instructions: string;
  criteria: Record<string, string | null>;
}

export interface NoulQuestionWire {
  type: "noul";
  instructions: string;
  criteria: { true: string; false: string };
}

export interface ScoreQuestionWire {
  type: "score";
  instructions: string;
  criteria: string[];
}

export type JevQuestionWire = ChoiceQuestionWire | NoulQuestionWire | ScoreQuestionWire;

export type JevQuestions = Record<JevQuestionId, JevQuestionWire>;

/** Mirrors the official SDK `choice(instructions, criteria)` helper. */
export function choice(
  instructions: string,
  criteria: Record<string, string | null>,
): ChoiceQuestionWire {
  return { type: "choice", instructions, criteria };
}

/** Mirrors the official SDK `noul(instructions)` helper. */
export function noul(
  instructions: string,
  criteria: { true: string; false: string },
): NoulQuestionWire {
  return { type: "noul", instructions, criteria };
}

/** Mirrors the official SDK `score(instructions, levels)` helper. */
export function score(instructions: string, criteria: string[]): ScoreQuestionWire {
  return { type: "score", instructions, criteria };
}

const UNKNOWN = "The request does not say." as const;

/**
 * One request, independent questions. Jev answers them in parallel, so adding
 * a dimension does not multiply latency.
 */
export const SOMMELIER_INTENT_QUESTIONS: JevQuestions = {
  occasion: choice(
    "What occasion is the user shopping for? Answer from the request only; do not guess.",
    {
      everyday: "An ordinary meal or everyday bottle, with no special event.",
      romantic_dinner: "A romantic dinner, date night, or a meal for two.",
      gift: "Buying a bottle as a gift for someone else.",
      celebration: "A party, wedding, birthday, or other celebration.",
      business: "A business gift, client, or partner context.",
      unknown: UNKNOWN,
    },
  ),
  food_pairing: noul(
    "The user wants a wine to accompany a specific food or meal.",
    {
      true: "The request mentions food, a dish, or a meal to pair with wine.",
      false: "The request asks for wine without naming food to go with it.",
    },
  ),
  food_pairing_strength: score(
    "How central is food pairing to this request?",
    [
      "Food is incidental or only mentioned in passing.",
      "Food is a relevant part of the request.",
      "Food pairing is the main point of the request.",
    ],
  ),
  food_category: choice(
    "Which food category best matches the dish or meal in the request? Use other when a dish is named but no category fits.",
    {
      red_meat: "Beef, pork, lamb, game, steak, barbeque, or a mixed grill.",
      white_meat: "Chicken, turkey, duck, or other poultry.",
      fish: "Fish or a fish-based dish.",
      seafood: "Shellfish, shrimp, calamari, or other seafood.",
      pasta: "Pasta, noodles, or a pasta-based dish.",
      cheese: "Cheese, a cheese board, or a cheese-heavy dish.",
      dessert: "Cake, pastry, sweet dumplings, or another dessert.",
      traditional_romanian:
        "A Romanian traditional dish such as sarmale, mici, tochitura, or mamaliga.",
      other: "A named dish that fits none of the categories above.",
      unknown: UNKNOWN,
    },
  ),
  wine_color: choice(
    "Which wine colour or style does the user prefer? Use no_preference only when the user says any is fine, and unknown when the request is silent.",
    {
      red: "Red wine.",
      white: "White wine.",
      rose: "Rosé wine.",
      sparkling: "Sparkling wine.",
      no_preference: "The user explicitly accepts any colour.",
      unknown: UNKNOWN,
    },
  ),
  sweetness: choice(
    "Which sweetness level does the user ask for? Do not infer from the dish.",
    {
      dry: "Dry wine.",
      off_dry: "Off-dry or medium-dry wine.",
      semi_sweet: "Semi-sweet wine.",
      sweet: "Sweet or dessert wine.",
      unknown: UNKNOWN,
    },
  ),
  acidity: choice(
    "What acidity does the user ask for, including through exclusions such as 'not too acidic'?",
    {
      low: "Low acidity, soft, or explicitly not acidic.",
      medium: "Medium acidity.",
      high: "High acidity, crisp, or explicitly fresh and tangy.",
      unknown: UNKNOWN,
    },
  ),
  body: choice(
    "What body does the user ask for, including through words such as light, full, or robust?",
    {
      light: "Light-bodied wine.",
      medium: "Medium-bodied wine.",
      full: "Full-bodied, powerful, or robust wine.",
      unknown: UNKNOWN,
    },
  ),
  style: choice(
    "Which style does the user ask for? Use no_preference only when the user explicitly says any style works.",
    {
      fresh: "Fresh and crisp style.",
      fruity: "Fruity, aromatic style.",
      mineral: "Mineral, saline style.",
      creamy: "Creamy, round, lees-aged style.",
      tannic: "Tannic, structured style.",
      complex: "Complex, aged, or layered style.",
      no_preference: "The user explicitly accepts any style.",
      unknown: UNKNOWN,
    },
  ),
  user_intent: choice(
    "What does the user want to do?",
    {
      discover: "Find a wine to drink, without a specific bottle or comparison.",
      compare: "Compare two or more named wines or styles.",
      buy: "Buy a specific wine the user already has in mind.",
      gift: "Buy a wine as a gift.",
      learn: "Learn about wine, a grape, a region, or a pairing, not necessarily buy.",
      unknown: UNKNOWN,
    },
  ),
  specific_product_request: noul(
    "The user asks about one or more specific wines, grape varieties, wineries or producers by name, rather than an open-ended recommendation.",
    {
      true: "At least one specific wine, grape variety, winery or producer is named as the subject of the request.",
      false: "The request is open-ended and names no specific product, grape, winery or producer.",
    },
  ),
  has_exclusions: noul(
    "The user explicitly excludes a wine property, for example 'not too acidic', 'not red', or 'nothing sweet'.",
    {
      true: "The request contains an explicit exclusion of a wine property.",
      false: "The request contains no exclusion of a wine property.",
    },
  ),
};

/** Metadata for one answered question, before intent mapping. */
export interface JevAnswerValue {
  id: JevQuestionId;
  type: "choice" | "noul" | "score";
  choice: string | null;
  value: number | null;
  confidence: number | null;
}

const noulAnswerSchema = z.object({
  type: z.literal("noul"),
  noul: z.number().min(0).max(1),
});

const choiceAnswerSchema = z.object({
  type: z.literal("choice"),
  choice: z.string().min(1),
  confidence: z.number().min(0).max(1),
  probabilities: z.record(z.string(), z.number()).optional(),
});

const scoreAnswerSchema = z.object({
  type: z.literal("score"),
  score: z.number(),
  confidence: z.number().min(0).max(1),
  legend: z.record(z.string(), z.unknown()).optional(),
  probabilities: z.record(z.string(), z.number()).optional(),
});

const rawAnswerSchema = z.union([
  noulAnswerSchema,
  choiceAnswerSchema,
  scoreAnswerSchema,
]);

export const systemOneResponseSchema = z.object({
  model: z.string().min(1),
  answers: z.record(z.string(), rawAnswerSchema),
  usage: z
    .object({
      input_tokens: z.number().int().nonnegative().nullable().optional(),
      output_tokens: z.number().int().nonnegative().nullable().optional(),
    })
    .optional(),
});

export type SystemOneResponse = z.infer<typeof systemOneResponseSchema>;

export interface ParsedJevAnswers {
  model: string;
  answers: Map<JevQuestionId, JevAnswerValue>;
  missing: JevQuestionId[];
  invalid: JevQuestionId[];
  usage: { inputTokens: number | null; outputTokens: number | null };
}

function invalidResponse(message: string): never {
  throw new JevError("invalid_response", message);
}

function questionType(id: JevQuestionId): "choice" | "noul" | "score" {
  return SOMMELIER_INTENT_QUESTIONS[id].type;
}

/**
 * Validate a raw API body against the official response contract and the exact
 * questions we asked. A response that does not answer the requested question
 * set is unusable: substituting a default would look like a user preference.
 */
export function parseSystemOneResponse(raw: unknown): ParsedJevAnswers {
  const parsed = systemOneResponseSchema.safeParse(raw);
  if (!parsed.success) {
    invalidResponse("System One response does not match the documented schema.");
  }

  const body = parsed.data;
  const answers = new Map<JevQuestionId, JevAnswerValue>();
  const missing: JevQuestionId[] = [];
  const invalid: JevQuestionId[] = [];

  for (const id of JEV_QUESTION_IDS) {
    const answer = body.answers[id];
    if (!answer) {
      missing.push(id);
      continue;
    }

    const expectedType = questionType(id);
    if (answer.type !== expectedType) {
      invalid.push(id);
      continue;
    }

    if (answer.type === "choice") {
      const question = SOMMELIER_INTENT_QUESTIONS[id] as ChoiceQuestionWire;
      if (!Object.prototype.hasOwnProperty.call(question.criteria, answer.choice)) {
        invalid.push(id);
        continue;
      }
      answers.set(id, {
        id,
        type: "choice",
        choice: answer.choice,
        value: null,
        confidence: answer.confidence,
      });
      continue;
    }

    if (answer.type === "noul") {
      answers.set(id, {
        id,
        type: "noul",
        choice: null,
        value: answer.noul,
        confidence: null,
      });
      continue;
    }

    const question = SOMMELIER_INTENT_QUESTIONS[id] as ScoreQuestionWire;
    const max = question.criteria.length - 1;
    if (answer.score < 0 || answer.score > max + 0.5) {
      invalid.push(id);
      continue;
    }
    answers.set(id, {
      id,
      type: "score",
      choice: null,
      value: Math.min(max, Math.max(0, answer.score)),
      confidence: answer.confidence,
    });
  }

  // Missing optional safety questions are tolerable; missing preferences are not.
  if (missing.length > 2 || invalid.length > 2) {
    invalidResponse(
      `System One response is incomplete (missing: ${missing.join(",") || "none"}; invalid: ${invalid.join(",") || "none"}).`,
    );
  }

  return {
    model: body.model,
    answers,
    missing,
    invalid,
    usage: {
      inputTokens: body.usage?.input_tokens ?? null,
      outputTokens: body.usage?.output_tokens ?? null,
    },
  };
}

export function isJevQuestionId(value: string): value is JevQuestionId {
  return (JEV_QUESTION_IDS as readonly string[]).includes(value);
}
