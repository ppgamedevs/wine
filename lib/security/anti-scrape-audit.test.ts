import { describe, expect, it } from "vitest";
import {
  API_ROUTE_EXPECTATIONS,
  detectForbiddenPublicFields,
  extractJsonResponseArguments,
  isSensitiveTrackedSnapshot,
  routePathFromSourcePath,
  runAntiScrapeAudit,
  type ApiRouteExpectation,
} from "@/lib/security/anti-scrape-audit";

const CLEAN_EXPECTATION = {
  route: "/api/example",
  sourcePath: "app/api/example/route.ts",
  classification: "public-expensive",
  methods: ["POST"],
  caps: {
    requestBodyBytes: 4_096,
    responseItems: 2,
    requestLimit: 10,
    requestWindowSeconds: 60,
  },
  protections: [
    "schema-validation",
    "bot-check",
    "rate-limit",
    "request-size-cap",
    "response-cap",
  ],
  notes: "Test policy.",
} as const satisfies ApiRouteExpectation;

const CLEAN_SOURCE = `
export async function POST(request: Request) {
  const contentLength = request.headers.get("content-length");
  await checkBotId(request);
  const parsed = schema.safeParse(await request.json());
  const rateLimit = await enforceRateLimit(request);
  if (!rateLimit.ok) return Response.json({ error: "limited" }, { status: 429 });
  return Response.json({ items: parsed.data.items.slice(0, 2), contentLength });
}
`;

describe("route inventory", () => {
  it("normalizes Windows route paths and preserves dynamic segments", () => {
    expect(
      routePathFromSourcePath(
        "app\\api\\wines\\[wineId]\\vote\\route.ts",
      ),
    ).toBe("/api/wines/[wineId]/vote");
    expect(routePathFromSourcePath("app/wines/[slug]/page.tsx")).toBeNull();
  });

  it("contains each current API source once and reserves no v1 implementation", () => {
    const sources = API_ROUTE_EXPECTATIONS.map((item) => item.sourcePath);
    expect(new Set(sources).size).toBe(sources.length);
    expect(API_ROUTE_EXPECTATIONS).toHaveLength(10);
    expect(API_ROUTE_EXPECTATIONS.some((item) => item.route.startsWith("/api/v1")))
      .toBe(false);
  });

  it("accepts a bounded route with all expected static protections", () => {
    const report = runAntiScrapeAudit({
      sourceFiles: [
        { path: CLEAN_EXPECTATION.sourcePath, content: CLEAN_SOURCE },
      ],
      trackedPaths: [],
      routeExpectations: [CLEAN_EXPECTATION],
    });

    expect(report.findings).toEqual([]);
    expect(report.routes[0]).toMatchObject({
      route: "/api/example",
      classification: "public-expensive",
      detectedMethods: ["POST"],
    });
  });

  it("reports missing methods and protections", () => {
    const report = runAntiScrapeAudit({
      sourceFiles: [
        {
          path: CLEAN_EXPECTATION.sourcePath,
          content: "export async function GET() { return Response.json({ ok: true }); }",
        },
      ],
      trackedPaths: [],
      routeExpectations: [CLEAN_EXPECTATION],
    });

    expect(report.findings.some((item) => item.code === "METHOD_MISMATCH")).toBe(
      true,
    );
    expect(
      report.findings.filter((item) => item.code === "MISSING_PROTECTION"),
    ).toHaveLength(CLEAN_EXPECTATION.protections.length);
  });

  it("flags unclassified bulk routes", () => {
    const report = runAntiScrapeAudit({
      sourceFiles: [
        {
          path: "app/api/catalog-export/route.ts",
          content:
            "export function GET() { return Response.json({ wines: [] }); }",
        },
      ],
      trackedPaths: [],
      routeExpectations: [],
    });

    expect(report.findings.map((item) => item.code)).toEqual([
      "FORBIDDEN_BULK_ROUTE",
      "UNINVENTORIED_API_ROUTE",
    ]);
  });
});

describe("public response field scan", () => {
  it("extracts complete JSON response arguments", () => {
    const source = `
      const ignored = fn(")");
      return Response.json(
        { safe: nested(value), message: "close ) is data" },
        { status: 200 },
      );
    `;
    const argumentsList = extractJsonResponseArguments(source);

    expect(argumentsList).toHaveLength(1);
    expect(argumentsList[0]).toContain("safe: nested(value)");
    expect(argumentsList[0]).toContain("{ status: 200 }");
  });

  it("flags explicit forbidden output fields but not internal reads", () => {
    const content = `
      const email = record.email;
      const source = { internalNotes: record.internalNotes };
      if (!source) return Response.json({ ok: false });
      return NextResponse.json({ ok: true, "email": email, internalNotes: source.internalNotes });
    `;

    expect(detectForbiddenPublicFields(content)).toEqual([
      "email",
      "internalNotes",
    ]);
  });

  it("flags collection reads that reach JSON without a visible cap", () => {
    const expectation = {
      ...CLEAN_EXPECTATION,
      protections: [],
    } satisfies ApiRouteExpectation;
    const report = runAntiScrapeAudit({
      sourceFiles: [
        {
          path: expectation.sourcePath,
          content: `
            export async function POST() {
              const rows = await db.query.wines.findMany();
              return Response.json({ rows });
            }
          `,
        },
      ],
      trackedPaths: [],
      routeExpectations: [expectation],
    });

    expect(
      report.findings.some(
        (item) => item.code === "POSSIBLE_UNBOUNDED_COLLECTION",
      ),
    ).toBe(true);
  });
});

describe("tracked sensitive snapshot scan", () => {
  it("allows migration metadata and the env example", () => {
    expect(isSensitiveTrackedSnapshot("drizzle/meta/0023_snapshot.json")).toBe(
      false,
    );
    expect(isSensitiveTrackedSnapshot("drizzle/0027_content_translations.sql")).toBe(
      false,
    );
    expect(isSensitiveTrackedSnapshot(".env.example")).toBe(false);
  });

  it("flags env files, database copies, and data snapshots", () => {
    expect(isSensitiveTrackedSnapshot(".env.production")).toBe(true);
    expect(isSensitiveTrackedSnapshot("backups/catalog.sql")).toBe(true);
    expect(
      isSensitiveTrackedSnapshot("artifacts/catalog-snapshot.json"),
    ).toBe(true);
    expect(
      isSensitiveTrackedSnapshot("snapshots/production-wines.csv"),
    ).toBe(true);
  });

  it("returns the same report for permuted inputs", () => {
    const first = runAntiScrapeAudit({
      sourceFiles: [],
      trackedPaths: [
        "snapshots/production-wines.csv",
        ".env.production",
        "drizzle/meta/0023_snapshot.json",
      ],
      routeExpectations: [],
    });
    const second = runAntiScrapeAudit({
      sourceFiles: [],
      trackedPaths: [
        "drizzle/meta/0023_snapshot.json",
        ".env.production",
        "snapshots/production-wines.csv",
      ],
      routeExpectations: [],
    });

    expect(second).toEqual(first);
    expect(first).not.toHaveProperty("generatedAt");
    expect(first.readOnly).toBe(true);
    expect(first.offline).toBe(true);
  });
});
