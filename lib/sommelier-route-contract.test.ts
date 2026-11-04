import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const route = readFileSync(
  path.join(process.cwd(), "app/api/sommelier/chat/route.ts"),
  "utf8",
);
const client = readFileSync(
  path.join(process.cwd(), "components/sommelier/sommelier-chat.tsx"),
  "utf8",
);

describe("sommelier structured recommendation contract", () => {
  it("does not parse a machine-readable marker from streamed text", () => {
    expect(route).not.toContain("extractRecommendedSlugs");
    expect(route).not.toContain("RECOMMENDED_SLUGS");
  });

  it("emits recommendations as a structured UI data part", () => {
    expect(route).toContain('type: "data-recommendations"');
    expect(route).toContain("serializeWineForChat");
  });

  it("uses deterministic fallback for unavailable availability cases", () => {
    expect(route).toContain("buildAvailabilityFallback");
    expect(route).toContain("deterministic_availability");
    expect(route).toContain('answerQuality: "low"');
  });

  it("sanitizes visible streamed text on the client", () => {
    expect(client).toContain("sanitizeAssistantChatText");
  });
});
