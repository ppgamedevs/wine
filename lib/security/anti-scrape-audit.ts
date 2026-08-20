export type ApiRouteClassification =
  | "public-read"
  | "public-expensive"
  | "public-interaction"
  | "public-event-ingest"
  | "public-commerce"
  | "private-account"
  | "private-job"
  | "signed-webhook"
  | "disabled";

export type ApiProtectionExpectation =
  | "schema-validation"
  | "bot-check"
  | "rate-limit"
  | "request-size-cap"
  | "query-size-cap"
  | "response-cap"
  | "cache-policy"
  | "account-authorization"
  | "shared-secret"
  | "webhook-signature";

export type ApiRouteMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiRouteCaps {
  requestBodyBytes?: number;
  queryCharacters?: number;
  responseItems?: number;
  requestLimit?: number;
  requestWindowSeconds?: number;
}

export interface ApiRouteExpectation {
  route: string;
  sourcePath: string;
  classification: ApiRouteClassification;
  methods: readonly ApiRouteMethod[];
  caps: ApiRouteCaps;
  protections: readonly ApiProtectionExpectation[];
  notes: string;
}

export interface AuditSourceFile {
  path: string;
  content: string;
}

export type AntiScrapeFindingSeverity = "critical" | "high" | "medium";

export type AntiScrapeFindingCode =
  | "UNINVENTORIED_API_ROUTE"
  | "MISSING_API_ROUTE"
  | "METHOD_MISMATCH"
  | "MISSING_PROTECTION"
  | "FORBIDDEN_BULK_ROUTE"
  | "POSSIBLE_UNBOUNDED_COLLECTION"
  | "FORBIDDEN_PUBLIC_FIELD"
  | "TRACKED_SENSITIVE_SNAPSHOT";

export interface AntiScrapeFinding {
  code: AntiScrapeFindingCode;
  severity: AntiScrapeFindingSeverity;
  path: string;
  route?: string;
  detail: string;
}

export interface ApiRouteAuditResult {
  route: string;
  sourcePath: string;
  classification: ApiRouteClassification | "unclassified";
  expectedMethods: readonly ApiRouteMethod[];
  detectedMethods: readonly ApiRouteMethod[];
  caps: ApiRouteCaps | null;
  expectedProtections: readonly ApiProtectionExpectation[];
  detectedProtections: readonly ApiProtectionExpectation[];
}

export interface AntiScrapeAuditInput {
  sourceFiles: readonly AuditSourceFile[];
  trackedPaths: readonly string[];
  routeExpectations?: readonly ApiRouteExpectation[];
}

export interface AntiScrapeAuditReport {
  schemaVersion: 1;
  readOnly: true;
  offline: true;
  routes: readonly ApiRouteAuditResult[];
  findings: readonly AntiScrapeFinding[];
  summary: {
    routeCount: number;
    findingCount: number;
    findingsBySeverity: Record<AntiScrapeFindingSeverity, number>;
    findingsByCode: Partial<Record<AntiScrapeFindingCode, number>>;
  };
}

export const API_ROUTE_EXPECTATIONS = [
  {
    route: "/api/analyze-wine",
    sourcePath: "app/api/analyze-wine/route.ts",
    classification: "public-expensive",
    methods: ["POST"],
    caps: {
      requestBodyBytes: 4_096,
      requestLimit: 3,
      requestWindowSeconds: 3_600,
    },
    protections: [
      "schema-validation",
      "bot-check",
      "rate-limit",
      "request-size-cap",
    ],
    notes: "Remote analysis is expensive and must never become a bulk fetch proxy.",
  },
  {
    route: "/api/search/suggest",
    sourcePath: "app/api/search/suggest/route.ts",
    classification: "public-read",
    methods: ["GET"],
    caps: {
      queryCharacters: 80,
      responseItems: 6,
      requestLimit: 60,
      requestWindowSeconds: 60,
    },
    protections: [
      "bot-check",
      "rate-limit",
      "query-size-cap",
      "response-cap",
      "cache-policy",
    ],
    notes: "Suggestions expose a small discovery surface, not catalog export.",
  },
  {
    route: "/api/sommelier/chat",
    sourcePath: "app/api/sommelier/chat/route.ts",
    classification: "public-expensive",
    methods: ["POST"],
    caps: {
      requestBodyBytes: 24_000,
      responseItems: 3,
      requestLimit: 30,
      requestWindowSeconds: 3_600,
    },
    protections: [
      "schema-validation",
      "bot-check",
      "rate-limit",
      "request-size-cap",
      "response-cap",
    ],
    notes: "Chat may reveal only a small candidate set per conversation turn.",
  },
  {
    route: "/api/cron/premium-emails",
    sourcePath: "app/api/cron/premium-emails/route.ts",
    classification: "private-job",
    methods: ["GET"],
    caps: {
      requestLimit: 2,
      requestWindowSeconds: 3_600,
    },
    protections: ["shared-secret", "rate-limit"],
    notes: "Scheduled jobs are private and fail closed when the secret is absent.",
  },
  {
    route: "/api/stripe/billing-portal",
    sourcePath: "app/api/stripe/billing-portal/route.ts",
    classification: "disabled",
    methods: ["POST"],
    caps: {},
    protections: [],
    notes: "The endpoint is intentionally unavailable and returns HTTP 404.",
  },
  {
    route: "/api/stripe/premium-checkout",
    sourcePath: "app/api/stripe/premium-checkout/route.ts",
    classification: "public-commerce",
    methods: ["POST"],
    caps: {
      requestBodyBytes: 4_096,
      requestLimit: 5,
      requestWindowSeconds: 900,
    },
    protections: [
      "schema-validation",
      "bot-check",
      "rate-limit",
      "request-size-cap",
    ],
    notes: "Checkout creation is public but costly and abuse sensitive.",
  },
  {
    route: "/api/stripe/webhook",
    sourcePath: "app/api/stripe/webhook/route.ts",
    classification: "signed-webhook",
    methods: ["POST"],
    caps: {
      requestBodyBytes: 262_144,
    },
    protections: ["webhook-signature", "request-size-cap"],
    notes: "Webhook authenticity is based on the provider signature.",
  },
  {
    route: "/api/wineries/[wineryId]/analytics",
    sourcePath: "app/api/wineries/[wineryId]/analytics/route.ts",
    classification: "public-event-ingest",
    methods: ["POST"],
    caps: {
      requestBodyBytes: 4_096,
      requestLimit: 120,
      requestWindowSeconds: 60,
    },
    protections: [
      "schema-validation",
      "bot-check",
      "rate-limit",
      "request-size-cap",
    ],
    notes: "Event ingestion must stay bounded and must not expose stored events.",
  },
  {
    route: "/api/wines/[wineId]/report",
    sourcePath: "app/api/wines/[wineId]/report/route.ts",
    classification: "public-interaction",
    methods: ["POST"],
    caps: {
      requestBodyBytes: 2_048,
      requestLimit: 5,
      requestWindowSeconds: 3_600,
    },
    protections: [
      "schema-validation",
      "bot-check",
      "rate-limit",
      "request-size-cap",
    ],
    notes: "Reports are public writes with a low abuse tolerance.",
  },
  {
    route: "/api/wines/[wineId]/vote",
    sourcePath: "app/api/wines/[wineId]/vote/route.ts",
    classification: "public-interaction",
    methods: ["GET", "POST"],
    caps: {
      requestBodyBytes: 1_024,
      responseItems: 1,
      requestLimit: 20,
      requestWindowSeconds: 60,
    },
    protections: [
      "schema-validation",
      "bot-check",
      "rate-limit",
      "request-size-cap",
    ],
    notes: "Vote reads are single item and vote writes are identity scoped.",
  },
] as const satisfies readonly ApiRouteExpectation[];

export const FORBIDDEN_PUBLIC_FIELDS = [
  "adminNotes",
  "apiKeyHash",
  "email",
  "embedding",
  "evidenceJson",
  "fullText",
  "internalNotes",
  "ipAddress",
  "phone",
  "prompt",
  "rawHtml",
  "rawText",
  "scrapedHtml",
  "secret",
  "sourceHtml",
  "stripeCustomerId",
  "stripeSubscriptionId",
  "submittedBy",
  "systemPrompt",
  "token",
  "userAgent",
] as const;

const MUTATING_METHODS: readonly ApiRouteMethod[] = [
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
];

const BULK_ROUTE_SEGMENT =
  /\/(?:all|bulk|catalog-export|dataset|dump|export|full-catalog)(?:\/|$)/i;

function normalizePath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.?\//, "");
}

export function routePathFromSourcePath(path: string): string | null {
  const normalized = normalizePath(path);
  const match = normalized.match(/^app\/api\/(.+)\/route\.ts$/);
  return match?.[1] ? `/api/${match[1]}` : null;
}

function detectMethods(content: string): ApiRouteMethod[] {
  const methods: ApiRouteMethod[] = [];
  for (const method of ["GET", ...MUTATING_METHODS] as const) {
    const pattern = new RegExp(
      `export\\s+(?:async\\s+)?function\\s+${method}\\b|export\\s+const\\s+${method}\\b`,
    );
    if (pattern.test(content)) methods.push(method);
  }
  return methods;
}

function hasProtectionEvidence(
  protection: ApiProtectionExpectation,
  content: string,
): boolean {
  switch (protection) {
    case "schema-validation":
      return /\.safeParse\s*\(|\.parse\s*\(|\breadBoundedJson\s*\(/.test(
        content,
      );
    case "bot-check":
      return /\b(?:checkBotId|verifyBot|botId|botid|guardInteractiveApi)\b/i.test(
        content,
      );
    case "rate-limit":
      return /\b(?:rateLimit|rateLimited|RateLimit|RATE_LIMIT_POLICIES|guardInteractiveApi|MAX_[A-Z_]*PER_[A-Z_]*|status:\s*429)\b/.test(
        content,
      );
    case "request-size-cap":
      return /\b(?:content-length|maxBodyBytes|requestBodyBytes|bodySizeLimit|readBoundedJson)\b/i.test(
        content,
      );
    case "query-size-cap":
      return /\bquery\b[\s\S]{0,160}\.slice\s*\(|\.max\s*\(\s*\d+\s*\)[\s\S]{0,160}\bquery\b/i.test(
        content,
      );
    case "response-cap":
      return (
        /\.limit\s*\(\s*\d+\s*\)/.test(content) ||
        extractJsonResponseArguments(content).some((argument) =>
          /\.slice\s*\(\s*0\s*,\s*\d+\s*\)/.test(argument),
        ) ||
        /\b(?:getSearchSuggestions|retrieveWinesForChat)\s*\([\s\S]{0,240},\s*\d+\s*(?:,|\))/.test(
          content,
        ) ||
        /\brecommendations\b[\s\S]{0,240}\.slice\s*\(\s*0\s*,\s*\d+\s*\)/.test(
          content,
        )
      );
    case "cache-policy":
      return /Cache-Control/i.test(content);
    case "account-authorization":
      return /\b(?:requireAuth|requireSession|getServerSession|currentUser|assertOwnership|verifyOwnership|claimedBy)\b/.test(
        content,
      );
    case "shared-secret":
      return (
        /\bauthorization\b/i.test(content) &&
        /\b(?:secret|CRON_SECRET)\b/.test(content)
      );
    case "webhook-signature":
      return (
        /\bstripe-signature\b/i.test(content) &&
        /\bconstructEvent\b/.test(content)
      );
  }
}

function detectProtections(content: string): ApiProtectionExpectation[] {
  const protections: ApiProtectionExpectation[] = [
    "schema-validation",
    "bot-check",
    "rate-limit",
    "request-size-cap",
    "query-size-cap",
    "response-cap",
    "cache-policy",
    "account-authorization",
    "shared-secret",
    "webhook-signature",
  ];
  return protections.filter((protection) =>
    hasProtectionEvidence(protection, content),
  );
}

interface ExtractedCall {
  start: number;
  content: string;
}

function extractCallArgument(
  source: string,
  openParenthesis: number,
): ExtractedCall | null {
  let depth = 0;
  let quote: "'" | '"' | "`" | null = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = openParenthesis; index < source.length; index += 1) {
    const character = source[index] ?? "";
    const next = source[index + 1] ?? "";

    if (lineComment) {
      if (character === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (character === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }
    if (character === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (character === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (character === "'" || character === '"' || character === "`") {
      quote = character;
      continue;
    }
    if (character === "(") {
      depth += 1;
      continue;
    }
    if (character !== ")") continue;
    depth -= 1;
    if (depth === 0) {
      return {
        start: openParenthesis + 1,
        content: source.slice(openParenthesis + 1, index),
      };
    }
  }
  return null;
}

export function extractJsonResponseArguments(source: string): string[] {
  const calls: ExtractedCall[] = [];
  const pattern = /\b(?:Response|NextResponse)\.json\s*\(/g;
  let match = pattern.exec(source);
  while (match) {
    const openParenthesis = pattern.lastIndex - 1;
    const call = extractCallArgument(source, openParenthesis);
    if (call) calls.push(call);
    match = pattern.exec(source);
  }
  return calls.map((call) => call.content);
}

export function detectForbiddenPublicFields(content: string): string[] {
  const responseArguments = extractJsonResponseArguments(content);
  return FORBIDDEN_PUBLIC_FIELDS.filter((field) => {
    const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const property = new RegExp(`(?:["']${escaped}["']|\\b${escaped})\\s*:`);
    return responseArguments.some((argument) => property.test(argument));
  });
}

function isPossibleUnboundedCollection(content: string): boolean {
  const readsCollection = /\.(?:findMany|select)\s*\(/.test(content);
  if (!readsCollection) return false;
  const hasBound = /\.limit\s*\(\s*\d+\s*\)|\.slice\s*\(\s*0\s*,\s*\d+\s*\)/.test(
    content,
  );
  return !hasBound && extractJsonResponseArguments(content).length > 0;
}

export function isSensitiveTrackedSnapshot(path: string): boolean {
  const normalized = normalizePath(path).toLowerCase();
  if (
    normalized === ".env.example" ||
    /^drizzle\/meta\/\d+_snapshot\.json$/.test(normalized) ||
    /^drizzle\/[^/]+\.sql$/.test(normalized)
  ) {
    return false;
  }
  if (/^\.env(?:\.|$)/.test(normalized)) return true;
  if (/\.(?:db|sqlite|sqlite3|dump|bak)$/.test(normalized)) return true;
  if (
    /\.sql$/.test(normalized) &&
    /(?:backup|database|db|dump|export|snapshot)/.test(normalized)
  ) {
    return true;
  }

  const dataFile = /\.(?:csv|json|ndjson|parquet)$/.test(normalized);
  const snapshotName =
    /(?:^|\/)(?:[^/]*(?:catalog|database|production|sensitive)[^/]*)?snapshot[^/]*\./.test(
      normalized,
    );
  const databaseCapture =
    /(?:^|\/)[^/]*(?:catalog|database|db)-(?:after|before|dump|export)[^/]*\./.test(
      normalized,
    );
  const sensitiveDirectory =
    /(?:^|\/)(?:backups|exports|snapshots)\//.test(normalized);
  return dataFile && (snapshotName || databaseCapture || sensitiveDirectory);
}

function findingSort(
  left: AntiScrapeFinding,
  right: AntiScrapeFinding,
): number {
  return (
    left.path.localeCompare(right.path) ||
    left.code.localeCompare(right.code) ||
    (left.route ?? "").localeCompare(right.route ?? "") ||
    left.detail.localeCompare(right.detail)
  );
}

function routeResultSort(
  left: ApiRouteAuditResult,
  right: ApiRouteAuditResult,
): number {
  return left.route.localeCompare(right.route);
}

export function runAntiScrapeAudit(
  input: AntiScrapeAuditInput,
): AntiScrapeAuditReport {
  const expectations = input.routeExpectations ?? API_ROUTE_EXPECTATIONS;
  const sourceByPath = new Map(
    input.sourceFiles.map((file) => [normalizePath(file.path), file.content]),
  );
  const expectationByPath = new Map(
    expectations.map((expectation) => [
      normalizePath(expectation.sourcePath),
      expectation,
    ]),
  );
  const findings: AntiScrapeFinding[] = [];
  const routes: ApiRouteAuditResult[] = [];

  for (const expectation of expectations) {
    const sourcePath = normalizePath(expectation.sourcePath);
    const content = sourceByPath.get(sourcePath);
    if (content == null) {
      findings.push({
        code: "MISSING_API_ROUTE",
        severity: "critical",
        path: sourcePath,
        route: expectation.route,
        detail: "The inventoried API route source file is missing.",
      });
      routes.push({
        route: expectation.route,
        sourcePath,
        classification: expectation.classification,
        expectedMethods: expectation.methods,
        detectedMethods: [],
        caps: expectation.caps,
        expectedProtections: expectation.protections,
        detectedProtections: [],
      });
      continue;
    }

    const detectedMethods = detectMethods(content);
    const detectedProtections = detectProtections(content);
    const expectedMethods = [...expectation.methods].sort();
    const actualMethods = [...detectedMethods].sort();
    if (expectedMethods.join(",") !== actualMethods.join(",")) {
      findings.push({
        code: "METHOD_MISMATCH",
        severity: "high",
        path: sourcePath,
        route: expectation.route,
        detail: `Expected ${expectedMethods.join(",")}; detected ${actualMethods.join(",") || "none"}.`,
      });
    }

    for (const protection of expectation.protections) {
      if (!detectedProtections.includes(protection)) {
        findings.push({
          code: "MISSING_PROTECTION",
          severity:
            protection === "account-authorization" ||
            protection === "shared-secret" ||
            protection === "webhook-signature"
              ? "critical"
              : "high",
          path: sourcePath,
          route: expectation.route,
          detail: `No static evidence found for expected protection: ${protection}.`,
        });
      }
    }

    if (BULK_ROUTE_SEGMENT.test(expectation.route)) {
      findings.push({
        code: "FORBIDDEN_BULK_ROUTE",
        severity: "critical",
        path: sourcePath,
        route: expectation.route,
        detail: "Public bulk, dump, dataset, and full catalog routes are forbidden.",
      });
    }

    if (isPossibleUnboundedCollection(content)) {
      findings.push({
        code: "POSSIBLE_UNBOUNDED_COLLECTION",
        severity: "high",
        path: sourcePath,
        route: expectation.route,
        detail: "A collection query reaches a JSON response without a visible numeric cap.",
      });
    }

    for (const field of detectForbiddenPublicFields(content)) {
      findings.push({
        code: "FORBIDDEN_PUBLIC_FIELD",
        severity: "critical",
        path: sourcePath,
        route: expectation.route,
        detail: `A JSON response explicitly exposes forbidden field: ${field}.`,
      });
    }

    routes.push({
      route: expectation.route,
      sourcePath,
      classification: expectation.classification,
      expectedMethods: expectation.methods,
      detectedMethods,
      caps: expectation.caps,
      expectedProtections: expectation.protections,
      detectedProtections,
    });
  }

  for (const file of input.sourceFiles) {
    const sourcePath = normalizePath(file.path);
    const route = routePathFromSourcePath(sourcePath);
    if (!route || expectationByPath.has(sourcePath)) continue;

    findings.push({
      code: "UNINVENTORIED_API_ROUTE",
      severity: "critical",
      path: sourcePath,
      route,
      detail: "Every API route must have a classification, caps, and protection expectations.",
    });
    if (BULK_ROUTE_SEGMENT.test(route)) {
      findings.push({
        code: "FORBIDDEN_BULK_ROUTE",
        severity: "critical",
        path: sourcePath,
        route,
        detail: "Public bulk, dump, dataset, and full catalog routes are forbidden.",
      });
    }
    for (const field of detectForbiddenPublicFields(file.content)) {
      findings.push({
        code: "FORBIDDEN_PUBLIC_FIELD",
        severity: "critical",
        path: sourcePath,
        route,
        detail: `A JSON response explicitly exposes forbidden field: ${field}.`,
      });
    }
    routes.push({
      route,
      sourcePath,
      classification: "unclassified",
      expectedMethods: [],
      detectedMethods: detectMethods(file.content),
      caps: null,
      expectedProtections: [],
      detectedProtections: detectProtections(file.content),
    });
  }

  for (const trackedPath of [...new Set(input.trackedPaths.map(normalizePath))]) {
    if (!isSensitiveTrackedSnapshot(trackedPath)) continue;
    findings.push({
      code: "TRACKED_SENSITIVE_SNAPSHOT",
      severity: "critical",
      path: trackedPath,
      detail: "Sensitive snapshots, data exports, database copies, and env files must not be tracked.",
    });
  }

  findings.sort(findingSort);
  routes.sort(routeResultSort);
  const findingsBySeverity: Record<AntiScrapeFindingSeverity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
  };
  const findingsByCode: Partial<Record<AntiScrapeFindingCode, number>> = {};
  for (const finding of findings) {
    findingsBySeverity[finding.severity] += 1;
    findingsByCode[finding.code] = (findingsByCode[finding.code] ?? 0) + 1;
  }

  return {
    schemaVersion: 1,
    readOnly: true,
    offline: true,
    routes,
    findings,
    summary: {
      routeCount: routes.length,
      findingCount: findings.length,
      findingsBySeverity,
      findingsByCode,
    },
  };
}
