/**
 * Vercel BotID (Kasada) proxy paths from `botid/next/config`.
 *
 * `withBotId()` appends these as a flat rewrite array (afterFiles) when the
 * app has no `beforeFiles` bucket. next-intl middleware and `[locale]` then
 * 404 the challenge (`c.js`) and fingerprint (`fp`) endpoints, so Deep
 * Analysis never completes.
 */

export const BOTID_PROXY_SEGMENT = "149e9513-01fa-4fb0-aad4-566afd725d1b";
export const BOTID_PROXY_TOKEN = "2d206a39-8ed7-437e-a3be-862e0f06eea3";

export const BOTID_PROXY_ROOT = `/${BOTID_PROXY_SEGMENT}`;
export const BOTID_PROXY_PATH_PREFIX = `${BOTID_PROXY_ROOT}/${BOTID_PROXY_TOKEN}`;
export const BOTID_CHALLENGE_SOURCE = `${BOTID_PROXY_PATH_PREFIX}/a-4-a/c.js`;

export interface BotIdRewrite {
  source: string;
  destination: string;
  locale?: false;
}

export interface BotIdRewriteBuckets {
  beforeFiles?: BotIdRewrite[];
  afterFiles?: BotIdRewrite[];
  fallback?: BotIdRewrite[];
}

export function isBotIdProxyPath(pathname: string): boolean {
  return (
    pathname === BOTID_PROXY_ROOT ||
    pathname.startsWith(`${BOTID_PROXY_ROOT}/`)
  );
}

export function isBotIdRewriteSource(source: string): boolean {
  return source.startsWith(BOTID_PROXY_ROOT);
}

function botProtectionOrigin(): string {
  return (
    process.env.OVERRIDE_BOTID_SERVER_URL ??
    "https://api.vercel.com/bot-protection"
  );
}

export function botIdProxyRewrites(): BotIdRewrite[] {
  const origin = botProtectionOrigin();
  return [
    {
      source: BOTID_CHALLENGE_SOURCE,
      destination: `${origin}/v1/challenge`,
      locale: false,
    },
    {
      source: `${BOTID_PROXY_PATH_PREFIX}/:path*`,
      destination: `${origin}/v1/proxy/:path*`,
      locale: false,
    },
  ];
}

function takeBotIdRewrites(
  rules: BotIdRewrite[] | undefined,
): { botId: BotIdRewrite[]; rest: BotIdRewrite[] } {
  const botId: BotIdRewrite[] = [];
  const rest: BotIdRewrite[] = [];
  for (const rule of rules ?? []) {
    if (isBotIdRewriteSource(rule.source)) {
      botId.push({ ...rule, locale: false });
    } else {
      rest.push(rule);
    }
  }
  return { botId, rest };
}

function uniqueRewritesBySource(rules: BotIdRewrite[]): BotIdRewrite[] {
  const seen = new Set<string>();
  const unique: BotIdRewrite[] = [];
  for (const rule of rules) {
    if (seen.has(rule.source)) continue;
    seen.add(rule.source);
    unique.push(rule);
  }
  return unique;
}

export function ensureBotIdRewritesBeforeFiles(
  resolved: BotIdRewrite[] | BotIdRewriteBuckets | undefined,
): BotIdRewriteBuckets {
  const collected: BotIdRewrite[] = [];
  let beforeFiles: BotIdRewrite[] = [];
  let afterFiles: BotIdRewrite[] = [];
  let fallback: BotIdRewrite[] = [];

  if (Array.isArray(resolved)) {
    const partitioned = takeBotIdRewrites(resolved);
    collected.push(...partitioned.botId);
    afterFiles = partitioned.rest;
  } else if (resolved) {
    const before = takeBotIdRewrites(resolved.beforeFiles);
    const after = takeBotIdRewrites(resolved.afterFiles);
    const fall = takeBotIdRewrites(resolved.fallback);
    collected.push(...before.botId, ...after.botId, ...fall.botId);
    beforeFiles = before.rest;
    afterFiles = after.rest;
    fallback = fall.rest;
  }

  const proxyRewrites =
    collected.length > 0
      ? uniqueRewritesBySource(collected)
      : botIdProxyRewrites();

  const buckets: BotIdRewriteBuckets = {
    beforeFiles: [...proxyRewrites, ...beforeFiles],
  };
  if (afterFiles.length > 0) buckets.afterFiles = afterFiles;
  if (fallback.length > 0) buckets.fallback = fallback;
  return buckets;
}

export function withBotIdRewritesBeforeFiles<
  T extends {
    rewrites?: unknown;
  },
>(config: T): T {
  const previousRewrites = config.rewrites;
  return {
    ...config,
    async rewrites() {
      const resolved =
        typeof previousRewrites === "function"
          ? await previousRewrites()
          : previousRewrites;
      return ensureBotIdRewritesBeforeFiles(
        resolved as BotIdRewrite[] | BotIdRewriteBuckets | undefined,
      );
    },
  };
}
