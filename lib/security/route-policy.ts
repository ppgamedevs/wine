export type ProtectedRouteMethod = "GET" | "POST";

export interface ProtectedRouteDefinition {
  path: string;
  method: ProtectedRouteMethod;
  checkLevel: "basic" | "deepAnalysis";
}

export const BOT_PROTECTED_ROUTES = [
  { path: "/api/search/suggest", method: "GET", checkLevel: "basic" },
  { path: "/api/sommelier/chat", method: "POST", checkLevel: "deepAnalysis" },
  { path: "/api/analyze-wine", method: "POST", checkLevel: "deepAnalysis" },
  { path: "/api/wines/*/vote", method: "POST", checkLevel: "basic" },
  { path: "/api/wines/*/report", method: "POST", checkLevel: "basic" },
  { path: "/api/wineries/*/analytics", method: "POST", checkLevel: "basic" },
  {
    path: "/api/stripe/premium-checkout",
    method: "POST",
    checkLevel: "deepAnalysis",
  },
  { path: "/claim-your-winery", method: "POST", checkLevel: "deepAnalysis" },
  { path: "/en/claim-your-winery", method: "POST", checkLevel: "deepAnalysis" },
  { path: "/wines/*", method: "POST", checkLevel: "basic" },
  { path: "/en/wines/*", method: "POST", checkLevel: "basic" },
  { path: "/wineries/premium", method: "POST", checkLevel: "deepAnalysis" },
  { path: "/admin/login", method: "POST", checkLevel: "deepAnalysis" },
] as const satisfies readonly ProtectedRouteDefinition[];

export interface RateLimitPolicy {
  id: string;
  limit: number;
  windowSeconds: number;
}

export const RATE_LIMIT_POLICIES = {
  searchSuggest: {
    id: "vinintel-search-suggest",
    limit: 60,
    windowSeconds: 60,
  },
  sommelierChat: {
    id: "vinintel-sommelier-chat",
    limit: 30,
    windowSeconds: 60 * 60,
  },
  analyzeWine: {
    id: "vinintel-analyze-wine",
    limit: 3,
    windowSeconds: 60 * 60,
  },
  wineVote: {
    id: "vinintel-wine-vote",
    limit: 20,
    windowSeconds: 60,
  },
  wineReport: {
    id: "vinintel-wine-report",
    limit: 5,
    windowSeconds: 60 * 60,
  },
  wineryAnalytics: {
    id: "vinintel-winery-analytics",
    limit: 120,
    windowSeconds: 60,
  },
  premiumCheckout: {
    id: "vinintel-premium-checkout",
    limit: 5,
    windowSeconds: 15 * 60,
  },
  premiumEmailCron: {
    id: "vinintel-premium-email-cron",
    limit: 2,
    windowSeconds: 60 * 60,
  },
} as const satisfies Record<string, RateLimitPolicy>;
