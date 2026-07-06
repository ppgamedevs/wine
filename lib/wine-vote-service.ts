import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, wineVoteLogs, wineVotes, wines } from "@/lib/schema";

export const MAX_VOTES_PER_MINUTE = 5;
export const WINE_VOTE_SCORE_MIN = 1;
export const WINE_VOTE_SCORE_MAX = 100;

export function guestEmailForVoterKey(voterKey: string): string {
  return `guest+${voterKey}@votes.vinintel.local`;
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }

  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 64);

  return "unknown";
}

export async function resolveGuestUserId(voterKey: string): Promise<number> {
  const email = guestEmailForVoterKey(voterKey);

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: { id: true },
  });

  if (existing) return existing.id;

  const [created] = await db
    .insert(users)
    .values({
      email,
      name: "Guest",
      role: "user",
      emailVerified: false,
    })
    .returning({ id: users.id });

  return created.id;
}

export async function getVoteRateLimitStatus(userId: number): Promise<{
  allowed: boolean;
  recentCount: number;
}> {
  const [result] = await db
    .select({
      recentCount: sql<number>`count(*)`.mapWith(Number),
    })
    .from(wineVoteLogs)
    .where(
      and(
        eq(wineVoteLogs.userId, userId),
        sql`${wineVoteLogs.createdAt} > datetime('now', '-1 minute')`,
      ),
    );

  const recentCount = result?.recentCount ?? 0;
  return {
    allowed: recentCount < MAX_VOTES_PER_MINUTE,
    recentCount,
  };
}

async function recomputeCommunityScore(wineId: number): Promise<{
  communityScore: number;
  communityVoteCount: number;
}> {
  const [aggregate] = await db
    .select({
      avgScore: sql<number>`round(avg(${wineVotes.score}))`.mapWith(Number),
      voteCount: sql<number>`count(*)`.mapWith(Number),
    })
    .from(wineVotes)
    .where(eq(wineVotes.wineId, wineId));

  const communityScore = aggregate?.avgScore ?? 0;
  const communityVoteCount = aggregate?.voteCount ?? 0;

  await db
    .update(wines)
    .set({
      communityScore: communityVoteCount > 0 ? communityScore : null,
      communityVoteCount,
    })
    .where(eq(wines.id, wineId));

  return { communityScore, communityVoteCount };
}

export async function getUserWineVote(
  userId: number,
  wineId: number,
): Promise<{ score: number } | null> {
  const vote = await db.query.wineVotes.findFirst({
    where: and(eq(wineVotes.userId, userId), eq(wineVotes.wineId, wineId)),
    columns: { score: true },
  });

  return vote ?? null;
}

export async function submitWineVote(input: {
  userId: number;
  wineId: number;
  score: number;
  ipAddress: string;
}): Promise<{
  updated: boolean;
  communityScore: number;
  communityVoteCount: number;
  userScore: number;
}> {
  const rateLimit = await getVoteRateLimitStatus(input.userId);
  if (!rateLimit.allowed) {
    throw new VoteRateLimitError(rateLimit.recentCount);
  }

  const existing = await db.query.wineVotes.findFirst({
    where: and(
      eq(wineVotes.userId, input.userId),
      eq(wineVotes.wineId, input.wineId),
    ),
    columns: { id: true },
  });

  const action = existing ? "update" : "create";

  if (existing) {
    await db
      .update(wineVotes)
      .set({
        score: input.score,
        updatedAt: sql`(current_timestamp)`,
      })
      .where(eq(wineVotes.id, existing.id));
  } else {
    await db.insert(wineVotes).values({
      userId: input.userId,
      wineId: input.wineId,
      score: input.score,
    });
  }

  await db.insert(wineVoteLogs).values({
    userId: input.userId,
    wineId: input.wineId,
    ipAddress: input.ipAddress,
    action,
  });

  const { communityScore, communityVoteCount } = await recomputeCommunityScore(
    input.wineId,
  );

  return {
    updated: Boolean(existing),
    communityScore,
    communityVoteCount,
    userScore: input.score,
  };
}

export class VoteRateLimitError extends Error {
  readonly recentCount: number;

  constructor(recentCount: number) {
    super(
      `Prea multe voturi intr-un minut (${recentCount}/${MAX_VOTES_PER_MINUTE}). Incearca din nou curand.`,
    );
    this.name = "VoteRateLimitError";
    this.recentCount = recentCount;
  }
}
