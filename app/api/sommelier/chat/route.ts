import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  streamText,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { getChatSommelierModel } from "@/lib/ai/model";
import {
  buildChatSommelierSystemPrompt,
  budgetFromSommelierInput,
  extractUserTexts,
  parseSommelierRequest,
  retrieveWinesForChat,
  serializeWineForChat,
} from "@/lib/sommelier-chat";
import { extractRecommendedSlugs } from "@/lib/sommelier-chat-utils";
import { isAppLocale } from "@/i18n/locale";
import { guardInteractiveApi } from "@/lib/security/api-guard";
import { readBoundedJson } from "@/lib/security/request-body";
import { RATE_LIMIT_POLICIES } from "@/lib/security/route-policy";
import { getJevConfig } from "@/lib/jev/config";
import { applyJevIntentToSommelierInput } from "@/lib/jev/intent";
import { logJevEvent } from "@/lib/jev/log";
import { getJevDecisionService } from "@/lib/jev/service";
import type { JevFailureReason, JevIntent } from "@/lib/jev/types";
import {
  filterCandidatesByHardConstraints,
  type HardConstraintInput,
} from "@/lib/sommelier-constraints";
import {
  evaluateSommelierGrounding,
  looksLikeSpecificReferenceRequest,
  type CatalogIdentity,
  type GroundingDecision,
} from "@/lib/sommelier-grounding";
import { isSommelierGroundingEnabled } from "@/lib/sommelier-grounding-mode";
import { recommendWines } from "@/lib/sommelier";
import {
  computePersonalMatch,
  compareWithCanonicalMatch,
} from "@/lib/recommendation/personal-match";
import { rankWinesForOccasion } from "@/lib/recommendation/occasion-match";
import { getCatalogIdentityIndex, getCatalogWinesBySlugs } from "@/lib/queries";
import type { SommelierInput } from "@/lib/sommelier-occasions";
import type { WineWithRelations } from "@/types";

export const maxDuration = 60;

const requestSchema = z.object({
  messages: z
    .array(
      z.custom<UIMessage>(
        (value) =>
          typeof value === "object" &&
          value !== null &&
          "role" in value &&
          "parts" in value,
      ),
    )
    .min(1)
    .max(20),
  locale: z.string().optional(),
});

function getLatestUserText(messages: UIMessage[]): string {
  const texts = extractUserTexts(messages);
  return texts.at(-1) ?? "";
}

function toIdentity(wine: WineWithRelations): CatalogIdentity {
  return {
    slug: wine.slug,
    name: wine.name,
    type: wine.type,
    wineryName: wine.winery?.name ?? null,
    regionName: wine.region?.name ?? null,
    grapes: wine.grapeVarieties.map((grape) => grape.name),
    vintage: wine.vintage ?? null,
  };
}

function hardConstraintInput(input: SommelierInput): HardConstraintInput {
  return {
    budget: budgetFromSommelierInput(input),
    color: input.color,
    sweetness: input.sweetness,
    exclusions: input.exclusions
      ? {
          colors: input.exclusions.colors,
          sweetness: input.exclusions.sweetness,
          avoidStyles: input.exclusions.avoidStyles,
          acidity: input.acidityPreference ?? null,
          body: input.bodyPreference ?? null,
          detected: true,
        }
      : undefined,
  };
}

/** Log shadow diagnostics only; nothing here changes the response. */
function logPersonalMatchShadow(
  candidates: WineWithRelations[],
  input: SommelierInput,
): void {
  if (candidates.length === 0) return;
  try {
    const ranked = rankWinesForOccasion(candidates, {
      occasion: input.occasion,
      budgetMin: input.budgetMin,
      budgetMax: input.budgetMax,
      budgetSpecified: input.budgetSpecified,
      budgetConstraint:
        input.budgetConstraint ?? (input.budgetSpecified ? "hard" : "none"),
      color: input.color,
      sweetness: input.sweetness,
      dish: input.dish,
      preferredWinerySlugs: input.preferredWinerySlugs,
    });
    const occasionScores = new Map(
      ranked.map((entry) => [entry.wine.slug, entry.score] as const),
    );

    const diagnostics = candidates.slice(0, 6).map((wine) => {
      const personal = computePersonalMatch(wine, {
        color: input.color,
        sweetness: input.sweetness,
        acidity: input.acidityPreference ?? null,
        body: input.bodyPreference ?? null,
        dish: input.dish,
        excludedColors: input.exclusions?.colors,
        excludedSweetness: input.exclusions?.sweetness,
      });
      const delta = compareWithCanonicalMatch(
        personal,
        occasionScores.get(wine.slug) ?? 50,
      );
      return {
        slug: wine.slug,
        compatibility: personal.compatibility,
        confidence: personal.confidence,
        unknowns: personal.unknowns,
        delta: delta.delta,
        direction: delta.direction,
      };
    });

    console.info(
      JSON.stringify({
        scope: "sommelier",
        event: "personal_match_shadow",
        version: "personal-match-v0",
        candidates: diagnostics,
      }),
    );
  } catch (error) {
    console.warn("personal match shadow evaluation failed", error);
  }
}

/**
 * Shadow comparison: would Jev's intent have changed the deterministic
 * recommendation set? Pure in-memory computation, no extra external calls.
 */
function logShadowRecommendationDiff(
  wines: WineWithRelations[],
  input: SommelierInput,
  intent: JevIntent,
): void {
  if (wines.length === 0) return;
  try {
    const applied = applyJevIntentToSommelierInput(input, intent);
    const baseline = recommendWines(wines, input, 3).map((entry) => entry.wine.slug);
    const withIntent = recommendWines(wines, applied.input, 3).map(
      (entry) => entry.wine.slug,
    );
    console.info(
      JSON.stringify({
        scope: "sommelier",
        event: "shadow_recommendation_diff",
        changed: baseline.join("|") !== withIntent.join("|"),
        appliedFields: applied.applied,
        baseline,
        withJevIntent: withIntent,
      }),
    );
  } catch (error) {
    console.warn("shadow recommendation diff failed", error);
  }
}

export async function POST(req: Request) {
  try {
    const denied = await guardInteractiveApi(req, {
      checkLevel: "deepAnalysis",
      rateLimit: RATE_LIMIT_POLICIES.sommelierChat,
    });
    if (denied) return denied;

    const parsedBody = await readBoundedJson(req, requestSchema, 24_000);
    if (!parsedBody.ok) return parsedBody.response;

    const body = parsedBody.data;
    const messages = body.messages;
    const locale = isAppLocale(body.locale) ? body.locale : "ro";

    const latestUserText = getLatestUserText(messages);
    if (!latestUserText.trim()) {
      return Response.json(
        { error: locale === "en" ? "Message is empty." : "Mesaj gol." },
        { status: 400 },
      );
    }

    const conversationTexts = extractUserTexts(messages);
    const totalUserCharacters = conversationTexts.reduce(
      (total, text) => total + text.length,
      0,
    );
    if (latestUserText.length > 2_000 || totalUserCharacters > 12_000) {
      return Response.json(
        {
          error:
            locale === "en"
              ? "The conversation is too long. Start a new request."
              : "Conversatia este prea lunga. Incepe o cerere noua.",
        },
        {
          status: 413,
          headers: { "Cache-Control": "private, no-store" },
        },
      );
    }

    const jevConfig = getJevConfig();
    const parsedRequest = parseSommelierRequest(
      latestUserText,
      conversationTexts,
      locale,
    );
    let input = parsedRequest.input;

    let jevIntent: JevIntent | null = null;
    let shadowIntent: JevIntent | null = null;
    let jevStatus: "ok" | "skipped" | "unavailable" | "error" = "skipped";
    let jevFailure: JevFailureReason | null = null;

    if (jevConfig.mode !== "off") {
      try {
        const outcome = await getJevDecisionService().classifySommelierIntent({
          userMessage: latestUserText,
          locale,
          deterministic: input,
        });
        jevStatus = outcome.status;
        if (outcome.status === "ok") {
          // Shadow mode must not influence the response: keep the intent for
          // diagnostics only, and merge it exclusively in live mode.
          if (jevConfig.mode === "live") {
            const applied = applyJevIntentToSommelierInput(input, outcome.intent);
            input = {
              ...applied.input,
              intentSource:
                applied.applied.length > 0
                  ? "deterministic+jev"
                  : input.intentSource,
            };
            jevIntent = outcome.intent;
          } else {
            // Shadow mode: keep the intent for diagnostics only.
            shadowIntent = outcome.intent;
          }
        } else if (outcome.status === "unavailable") {
          jevFailure = outcome.reason;
        }
      } catch (error) {
        jevStatus = "error";
        console.error("Jev intent evaluation failed unexpectedly", error);
      }
    }

    const retrieval = await retrieveWinesForChat(
      latestUserText,
      conversationTexts,
      6,
      locale,
      { input },
    );
    let candidates = retrieval.wines;

    if (shadowIntent) {
      logShadowRecommendationDiff(retrieval.wines, input, shadowIntent);
    }

    let grounding: GroundingDecision;
    if (!isSommelierGroundingEnabled()) {
      grounding = {
        allowed: true,
        reason: "ok",
        restrictToSlugs: null,
        references: [],
        advisoryOnly: false,
        notes: ["grounding_disabled"],
      };
    } else {
      const needsCatalog = looksLikeSpecificReferenceRequest(latestUserText);
      const catalog = needsCatalog ? await getCatalogIdentityIndex() : null;

      grounding = evaluateSommelierGrounding({
        userMessage: latestUserText,
        candidates: candidates.map(toIdentity),
        catalog,
        budget: parsedRequest.budget,
        color: input.color,
        sweetness: input.sweetness,
        jevSpecificProductRequest: jevIntent?.specificProductRequest ?? null,
        jevUserIntent: jevIntent?.userIntent ?? null,
      });

      if (
        grounding.allowed &&
        grounding.restrictToSlugs &&
        grounding.restrictToSlugs.length > 0
      ) {
        // The user named specific bottles: load them even if hybrid retrieval
        // ranked other wines higher, then re-apply hard constraints.
        const referenced = await getCatalogWinesBySlugs(grounding.restrictToSlugs);
        const eligible = filterCandidatesByHardConstraints(
          referenced,
          hardConstraintInput(input),
        );
        if (eligible.length > 0) {
          candidates = eligible.slice(0, 4);
        } else {
          candidates = [];
          grounding = {
            ...grounding,
            allowed: false,
            reason: parsedRequest.budget.budgetSpecified
              ? "budget_excludes_all"
              : "constraints_exclude_all",
          };
        }
      }
    }

    if (!grounding.allowed) {
      // Never send a candidate list the model could pick from.
      candidates = [];
    }

    if (jevConfig.personalization === "shadow") {
      logPersonalMatchShadow(retrieval.wines, input);
    }

    const system = buildChatSommelierSystemPrompt(candidates, input, locale, {
      grounding,
      jevIntent,
      budget: parsedRequest.budget,
    });
    const candidateSlugs = candidates.map((wine) => wine.slug);

    const stream = createUIMessageStream({
      originalMessages: messages,
      execute: async ({ writer }) => {
        const modelMessages = await convertToModelMessages(messages);

        const result = streamText({
          model: getChatSommelierModel(),
          system,
          messages: modelMessages,
          temperature: 0.45,
          maxOutputTokens: 900,
          abortSignal: AbortSignal.timeout(45_000),
        });

        writer.merge(result.toUIMessageStream());

        const fullText = await result.text;
        const slugs = grounding.allowed
          ? extractRecommendedSlugs(fullText, candidateSlugs)
          : [];
        const wineBySlug = new Map(candidates.map((wine) => [wine.slug, wine]));
        const recommendations = slugs
          .map((slug) => wineBySlug.get(slug))
          .filter((wine) => wine != null)
          .map((wine) => serializeWineForChat(wine))
          .slice(0, 3);

        if (recommendations.length > 0) {
          writer.write({
            type: "data-recommendations",
            id: generateId(),
            data: recommendations,
          });
        }

        logJevEvent("info", "sommelier_request_completed", {
          mode: jevConfig.mode,
          jevStatus,
          jevFailure,
          intentSource: input.intentSource ?? "deterministic",
          groundingReason: grounding.reason,
          groundingAllowed: grounding.allowed,
          candidateCount: candidates.length,
          recommendationCount: recommendations.length,
        });
      },
      onError: () =>
        locale === "en"
          ? "The Sommelier could not answer. Please try again."
          : "Somelierul nu a putut raspunde. Incearca din nou.",
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    console.error("POST /api/sommelier/chat failed", error);
    return Response.json(
      { error: "Somelierul nu a putut raspunde. Incearca din nou." },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
