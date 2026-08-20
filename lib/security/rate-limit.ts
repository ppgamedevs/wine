import "server-only";

import { checkRateLimit } from "@vercel/firewall";
import type { RateLimitPolicy } from "@/lib/security/route-policy";

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number | null;
  resetAt: number;
  source: "memory" | "vercel";
}

export interface RateLimitAdapter {
  consume(
    policy: RateLimitPolicy,
    request: Request,
    key?: string,
  ): Promise<RateLimitResult>;
}

interface FixedWindowState {
  count: number;
  resetAt: number;
}

const missingProductionRules = new Set<string>();

export class MemoryRateLimitAdapter implements RateLimitAdapter {
  private readonly windows = new Map<string, FixedWindowState>();

  constructor(private readonly now: () => number = Date.now) {}

  async consume(
    policy: RateLimitPolicy,
    request: Request,
    key?: string,
  ): Promise<RateLimitResult> {
    const now = this.now();
    const identity = key ?? request.headers.get("x-test-client-id") ?? "local";
    const stateKey = `${policy.id}:${identity}`;
    const current = this.windows.get(stateKey);
    const resetAt =
      current && current.resetAt > now
        ? current.resetAt
        : now + policy.windowSeconds * 1_000;
    const count = current && current.resetAt > now ? current.count + 1 : 1;
    this.windows.set(stateKey, { count, resetAt });

    return {
      allowed: count <= policy.limit,
      limit: policy.limit,
      remaining: Math.max(0, policy.limit - count),
      resetAt,
      source: "memory",
    };
  }
}

class VercelFirewallRateLimitAdapter implements RateLimitAdapter {
  async consume(
    policy: RateLimitPolicy,
    request: Request,
    key?: string,
  ): Promise<RateLimitResult> {
    const requestIdentity =
      key ??
      request.headers.get("x-vercel-proxied-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown-client";
    const result = await checkRateLimit(policy.id, {
      request,
      rateLimitKey: requestIdentity,
    });

    if (result.error === "blocked") {
      return {
        allowed: false,
        limit: policy.limit,
        remaining: 0,
        resetAt: Date.now() + policy.windowSeconds * 1_000,
        source: "vercel",
      };
    }

    if (
      result.error === "not-found" &&
      !missingProductionRules.has(policy.id)
    ) {
      missingProductionRules.add(policy.id);
      console.warn("[security] Vercel rate limit rule is not configured", {
        rateLimitId: policy.id,
      });
    }

    return {
      allowed: !result.rateLimited,
      limit: policy.limit,
      remaining: null,
      resetAt: Date.now() + policy.windowSeconds * 1_000,
      source: "vercel",
    };
  }
}

const developmentAdapter = new MemoryRateLimitAdapter();
const productionAdapter = new VercelFirewallRateLimitAdapter();

export function getRateLimitAdapter(request?: Request): RateLimitAdapter {
  const hostname = request ? new URL(request.url).hostname : null;
  const isLocalRequest =
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  return (
    process.env.NODE_ENV === "production" &&
    Boolean(process.env.VERCEL_ENV) &&
    !isLocalRequest
  )
    ? productionAdapter
    : developmentAdapter;
}

export async function enforceRateLimit(
  policy: RateLimitPolicy,
  request: Request,
  options: {
    adapter?: RateLimitAdapter;
    key?: string;
  } = {},
): Promise<Response | null> {
  const result = await (options.adapter ?? getRateLimitAdapter(request)).consume(
    policy,
    request,
    options.key,
  );
  if (result.allowed) return null;

  const retryAfter = Math.max(
    1,
    Math.ceil((result.resetAt - Date.now()) / 1_000),
  );
  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "Content-Type": "application/json",
    "Retry-After": String(retryAfter),
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1_000)),
  });
  if (result.remaining != null) {
    headers.set("X-RateLimit-Remaining", String(result.remaining));
  }

  return Response.json(
    {
      error: {
        code: "rate_limited",
        message: "Too many requests. Try again later.",
      },
      retryAfter,
    },
    { status: 429, headers },
  );
}
