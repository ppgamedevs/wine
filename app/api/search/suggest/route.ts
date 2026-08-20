import { NextResponse } from "next/server";
import { getSearchSuggestions } from "@/lib/queries";
import { guardInteractiveApi } from "@/lib/security/api-guard";
import { RATE_LIMIT_POLICIES } from "@/lib/security/route-policy";

export async function GET(request: Request) {
  const denied = await guardInteractiveApi(request, {
    checkLevel: "basic",
    rateLimit: RATE_LIMIT_POLICIES.searchSuggest,
  });
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim().slice(0, 80);

  const suggestions = await getSearchSuggestions(query, 6);

  return NextResponse.json(
    { suggestions },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
