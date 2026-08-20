import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

const PRIVATE_PATHS = [
  "/api/",
  "/admin/",
  "/wineries/premium/",
  "/wineries/*/dashboard",
] as const;

const AI_SEARCH_USER_AGENTS = [
  "ChatGPT-User",
  "OAI-SearchBot",
  "Claude-Web",
  "PerplexityBot",
  "Perplexity-User",
] as const;

const AI_TRAINING_USER_AGENTS = [
  "GPTBot",
  "ClaudeBot",
  "anthropic-ai",
  "Google-Extended",
  "CCBot",
  "Bytespider",
  "Applebot-Extended",
] as const;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [...PRIVATE_PATHS],
      },
      ...AI_SEARCH_USER_AGENTS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: [...PRIVATE_PATHS],
      })),
      ...AI_TRAINING_USER_AGENTS.map((userAgent) => ({
        userAgent,
        disallow: "/",
      })),
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
