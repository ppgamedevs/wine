import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { parseChatToSommelierInput } from "@/lib/sommelier-chat";

vi.mock("server-only", () => ({}));

describe("Sommelier locale propagation", () => {
  it("maps English requests to the same canonical ranking IDs", () => {
    expect(
      parseChatToSommelierInput(
        "I want a dry red wine under 60 RON for grilled meat",
        [],
        "en",
      ),
    ).toMatchObject({
      budgetMax: 60,
      budgetSpecified: true,
      budgetConstraint: "hard",
      occasion: "gratar",
      color: "red",
      sweetness: "sec",
    });

    expect(
      parseChatToSommelierInput(
        "I need a gift for a client under 100 RON",
        [],
        "en",
      ),
    ).toMatchObject({
      occasion: "cadou-business",
      budgetMax: 100,
    });
  });

  it("makes route locale explicit across chat UI and API", async () => {
    const [component, route] = await Promise.all([
      readFile(
        new URL(
          "../../components/sommelier/sommelier-chat.tsx",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL("../../app/api/sommelier/chat/route.ts", import.meta.url),
        "utf8",
      ),
    ]);

    expect(component).toContain("body: { locale }");
    expect(component).toContain('locale === "en" ? "en-US" : "ro-RO"');
    expect(route).toContain("isAppLocale(body.locale)");
    expect(route).toContain(
      "buildChatSommelierSystemPrompt(wines, input, locale)",
    );
  });
});

