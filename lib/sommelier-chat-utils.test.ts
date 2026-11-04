import { describe, expect, it } from "vitest";
import { sanitizeAssistantChatText } from "@/lib/sommelier-chat-utils";

describe("sommelier visible text sanitizer", () => {
  it("removes an empty recommendation marker", () => {
    expect(
      sanitizeAssistantChatText("Recomandarea mea.\nRECOMMENDED_SLUGS:\n"),
    ).toBe("Recomandarea mea.");
  });

  it("removes partial streamed marker chunks", () => {
    expect(sanitizeAssistantChatText("Text util\nRECOMMENDED_SL")).toBe(
      "Text util",
    );
    expect(sanitizeAssistantChatText("Text util\nRECOMMENDED_SLUGS: wi")).toBe(
      "Text util",
    );
  });

  it("removes a full marker and internal slug line", () => {
    expect(
      sanitizeAssistantChatText(
        "Un vin bun.\nRECOMMENDED_SLUGS: wine-a, wine-b\nslug: wine-a",
      ),
    ).toBe("Un vin bun.");
  });

  it("removes internal JSON recommendation payloads", () => {
    expect(
      sanitizeAssistantChatText(
        'Recomandare.\n```json\n{"wineSlug":"wine-a"}\n```\nSfarsit.',
      ),
    ).toBe("Recomandare.\n\nSfarsit.");
  });

  it("never leaves a marker in visible text", () => {
    const visible = sanitizeAssistantChatText(
      "Bun.\nRECOMMENDED_SLUGS:\nRECOMMENDED_SLUGS: x",
    );
    expect(visible).not.toMatch(/RECOMMENDED|wineSlug|slug:/i);
  });
});
