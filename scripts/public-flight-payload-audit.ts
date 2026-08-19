import "../lib/load-env";
import {
  classifyPublicPageHtml,
  countHiddenSecondaryPayloadLeaks,
  totalSecondaryPayloadLeaks,
  type PublicPayloadSurfaces,
} from "../lib/public-payload-audit";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3456";
const STRICT = !process.argv.includes("--report-only");
const HIDDEN_FIXTURE = { giftScore: 60, foodMatchScore: 80 };
const ROUTES = [
  "/wines/murfatlar-sable-noble-alb",
  "/topuri/vinuri-cadou",
  "/vinuri",
] as const;

function bytes(value: string): number {
  return Buffer.byteLength(value, "utf8");
}

function keyCount(value: string, key: "giftScore" | "foodMatchScore"): number {
  return value.match(new RegExp(`(?:\\\\?")${key}(?:\\\\?")\\s*:`, "g"))
    ?.length ?? 0;
}

async function clientJsBytes(html: string): Promise<{
  files: number;
  bytes: number;
}> {
  const sources = [
    ...new Set(
      [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(
        (match) => match[1]!,
      ),
    ),
  ];
  const payloads = await Promise.all(
    sources.map(async (source) => {
      const response = await fetch(new URL(source, BASE_URL));
      return response.ok ? Buffer.from(await response.arrayBuffer()).byteLength : 0;
    }),
  );
  return {
    files: sources.length,
    bytes: payloads.reduce((total, size) => total + size, 0),
  };
}

function surfaceLeakCounts(surfaces: PublicPayloadSurfaces) {
  return Object.fromEntries(
    Object.entries(surfaces).map(([name, content]) => [
      name,
      countHiddenSecondaryPayloadLeaks(content, HIDDEN_FIXTURE),
    ]),
  );
}

async function main() {
  const reports = [];

  for (const route of ROUTES) {
    const response = await fetch(new URL(route, BASE_URL));
    if (!response.ok) {
      throw new Error(`${route} returned HTTP ${response.status}`);
    }
    const html = await response.text();
    const surfaces = classifyPublicPageHtml(html);
    const js = await clientJsBytes(html);
    const leaks = surfaceLeakCounts(surfaces);
    const report = {
      route,
      htmlBytes: bytes(html),
      flightBytes: bytes(surfaces.flightData),
      clientJsFiles: js.files,
      clientJsBytes: js.bytes,
      giftScoreKeys: keyCount(surfaces.flightData, "giftScore"),
      foodMatchScoreKeys: keyCount(surfaces.flightData, "foodMatchScore"),
      leaks,
    };
    reports.push(report);

    if (STRICT) {
      if (report.giftScoreKeys !== 0 || report.foodMatchScoreKeys !== 0) {
        throw new Error(
          `${route} serialized stored secondary score fields in Flight.`,
        );
      }
      for (const [surface, counts] of Object.entries(leaks)) {
        if (totalSecondaryPayloadLeaks(counts) !== 0) {
          throw new Error(
            `${route} leaked hidden secondary fixture data in ${surface}.`,
          );
        }
      }
    }
  }

  console.log(JSON.stringify(reports, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
