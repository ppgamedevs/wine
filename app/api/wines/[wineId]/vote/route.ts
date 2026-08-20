import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { wines } from "@/lib/schema";
import {
  getClientIp,
  getUserWineVote,
  MAX_VOTES_PER_MINUTE,
  resolveGuestUserId,
  submitWineVote,
  VoteRateLimitError,
  WINE_VOTE_SCORE_MAX,
  WINE_VOTE_SCORE_MIN,
} from "@/lib/wine-vote-service";
import { guardInteractiveApi } from "@/lib/security/api-guard";
import { readBoundedJson } from "@/lib/security/request-body";
import { RATE_LIMIT_POLICIES } from "@/lib/security/route-policy";

const requestSchema = z.object({
  score: z.number().int().min(WINE_VOTE_SCORE_MIN).max(WINE_VOTE_SCORE_MAX),
  voterKey: z.string().uuid(),
});

interface RouteContext {
  params: Promise<{ wineId: string }>;
}

function wineSlugCondition(slug: string) {
  return eq(wines.slug, slug);
}

export async function POST(req: Request, context: RouteContext) {
  try {
    const denied = await guardInteractiveApi(req, {
      checkLevel: "basic",
      rateLimit: RATE_LIMIT_POLICIES.wineVote,
    });
    if (denied) return denied;

    const { wineId: wineReference } = await context.params;

    const wine = await db.query.wines.findFirst({
      where: wineSlugCondition(wineReference),
      columns: { id: true, status: true },
    });

    if (!wine) {
      return Response.json({ error: "Vin negasit." }, { status: 404 });
    }

    if (wine.status === "rejected") {
      return Response.json(
        { error: "Acest vin nu accepta voturi." },
        { status: 403 },
      );
    }

    const parsedBody = await readBoundedJson(req, requestSchema, 1_024);
    if (!parsedBody.ok) return parsedBody.response;

    const { score, voterKey } = parsedBody.data;
    const userId = await resolveGuestUserId(voterKey);
    const ipAddress = getClientIp(req);

    const result = await submitWineVote({
      userId,
      wineId: wine.id,
      score,
      ipAddress,
    });

    return Response.json({
      ok: true,
      ...result,
      hasVoted: true,
    });
  } catch (error) {
    if (error instanceof VoteRateLimitError) {
      console.warn("[wine-vote] rate limit", {
        message: error.message,
        recentCount: error.recentCount,
      });
      return Response.json(
        {
          error: error.message,
          rateLimited: true,
          maxPerMinute: MAX_VOTES_PER_MINUTE,
        },
        { status: 429 },
      );
    }

    console.error("[wine-vote]", error);
    return Response.json(
      { error: "Nu am putut inregistra votul." },
      { status: 500 },
    );
  }
}

export async function GET(req: Request, context: RouteContext) {
  try {
    const { wineId: wineReference } = await context.params;
    const voterKey = new URL(req.url).searchParams.get("voterKey");

    const wine = await db.query.wines.findFirst({
      where: wineSlugCondition(wineReference),
      columns: {
        id: true,
        communityScore: true,
        communityVoteCount: true,
      },
    });

    if (!wine) {
      return Response.json({ error: "Vin negasit." }, { status: 404 });
    }

    let userScore: number | null = null;
    let hasVoted = false;

    if (voterKey && z.string().uuid().safeParse(voterKey).success) {
      const userId = await resolveGuestUserId(voterKey);
      const vote = await getUserWineVote(userId, wine.id);
      if (vote) {
        userScore = vote.score;
        hasVoted = true;
      }
    }

    return Response.json({
      communityScore: wine.communityScore,
      communityVoteCount: wine.communityVoteCount,
      userScore,
      hasVoted,
    });
  } catch (error) {
    console.error("[wine-vote-get]", error);
    return Response.json({ error: "Eroare la citire." }, { status: 500 });
  }
}
