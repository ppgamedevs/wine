import { readFile } from "node:fs/promises";
import path from "node:path";
import { withBotId } from "botid/next/config";
import { describe, expect, it } from "vitest";
import {
  BOTID_CHALLENGE_SOURCE,
  BOTID_PROXY_PATH_PREFIX,
  BOTID_PROXY_SEGMENT,
  botIdProxyRewrites,
  ensureBotIdRewritesBeforeFiles,
  isBotIdProxyPath,
  withBotIdRewritesBeforeFiles,
} from "@/lib/security/botid-proxy";

const CHALLENGE_PATH = `${BOTID_PROXY_PATH_PREFIX}/a-4-a/c.js`;
const FINGERPRINT_PATH = `${BOTID_PROXY_PATH_PREFIX}/fp`;

describe("BotID proxy paths", () => {
  it("recognizes Kasada challenge and fingerprint URLs", () => {
    expect(isBotIdProxyPath(CHALLENGE_PATH)).toBe(true);
    expect(isBotIdProxyPath(FINGERPRINT_PATH)).toBe(true);
    expect(isBotIdProxyPath(`${FINGERPRINT_PATH}/extra`)).toBe(true);
    expect(isBotIdProxyPath("/ai-sommelier")).toBe(false);
    expect(isBotIdProxyPath("/cauta")).toBe(false);
    expect(isBotIdProxyPath("/fp")).toBe(false);
  });

  it("moves flat withBotId rewrites into beforeFiles", () => {
    const fromWithBotId = [
      {
        source: BOTID_CHALLENGE_SOURCE,
        destination: "https://api.vercel.com/bot-protection/v1/challenge",
      },
      {
        source: `${BOTID_PROXY_PATH_PREFIX}/:path*`,
        destination: "https://api.vercel.com/bot-protection/v1/proxy/:path*",
      },
      {
        source: "/legacy",
        destination: "/still-after",
      },
    ];

    expect(ensureBotIdRewritesBeforeFiles(fromWithBotId)).toEqual({
      beforeFiles: [
        {
          source: BOTID_CHALLENGE_SOURCE,
          destination: "https://api.vercel.com/bot-protection/v1/challenge",
          locale: false,
        },
        {
          source: `${BOTID_PROXY_PATH_PREFIX}/:path*`,
          destination: "https://api.vercel.com/bot-protection/v1/proxy/:path*",
          locale: false,
        },
      ],
      afterFiles: [{ source: "/legacy", destination: "/still-after" }],
    });
  });

  it("does not duplicate BotID rewrites already in beforeFiles", () => {
    const official = botIdProxyRewrites();
    const merged = ensureBotIdRewritesBeforeFiles({
      beforeFiles: official,
      afterFiles: official,
    });

    expect(merged.beforeFiles).toEqual(official);
    expect(merged.afterFiles).toBeUndefined();
  });

  it("injects official Kasada rewrites when none are present", () => {
    const merged = ensureBotIdRewritesBeforeFiles(undefined);
    expect(merged.beforeFiles).toEqual(botIdProxyRewrites());
  });

  it("promotes withBotId afterFiles rewrites into beforeFiles", async () => {
    const wrapped = withBotIdRewritesBeforeFiles(withBotId({}));
    const rewrites = wrapped.rewrites;
    expect(typeof rewrites).toBe("function");
    const resolved = await (
      rewrites as () => ReturnType<typeof ensureBotIdRewritesBeforeFiles>
    )();

    expect(Array.isArray(resolved)).toBe(false);
    expect(resolved.beforeFiles?.map((rule) => rule.source)).toEqual([
      BOTID_CHALLENGE_SOURCE,
      `${BOTID_PROXY_PATH_PREFIX}/:path*`,
    ]);
  });
});

describe("BotID wiring", () => {
  it("excludes the Kasada prefix from next-intl middleware", async () => {
    const source = await readFile(
      path.join(process.cwd(), "middleware.ts"),
      "utf8",
    );
    expect(source).toContain("isBotIdProxyPath");
    expect(source).toContain(BOTID_PROXY_SEGMENT);
    expect(source).toMatch(
      new RegExp(
        String.raw`matcher:\s*"\/\(\(\?!api\|admin\|embed\|_next\|_vercel\|${BOTID_PROXY_SEGMENT}\|`,
      ),
    );
  });

  it("keeps BotID rewrites in beforeFiles after withBotId", async () => {
    const source = await readFile(
      path.join(process.cwd(), "next.config.ts"),
      "utf8",
    );
    expect(source).toContain("withBotIdRewritesBeforeFiles");
    expect(source).toMatch(
      /withBotIdRewritesBeforeFiles\(\s*withBotId\(withNextIntl\(nextConfig\)\)/,
    );
    expect(source).toContain("BOTID_PROXY_SEGMENT");
  });
});
