import { isAdminAuthenticated } from "@/lib/admin-auth";
import { describeJevConfig, getJevConfig } from "@/lib/jev/config";
import { jevMetrics } from "@/lib/jev/metrics";
import { getSommelierGroundingMode } from "@/lib/sommelier-grounding-mode";

export const dynamic = "force-dynamic";

/**
 * Read-only Jev diagnostics for administrators.
 *
 * Never returns the API key (see `describeJevConfig`) and never mutates data.
 * Metrics are process-local: on serverless they describe the instance that
 * served the request, not the whole fleet.
 */
export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return Response.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  return Response.json(
    {
      config: describeJevConfig(getJevConfig()),
      grounding: getSommelierGroundingMode(),
      metrics: jevMetrics.snapshot(),
      generatedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
