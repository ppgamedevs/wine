import { describe, expect, it } from "vitest";
import {
  EXISTING_WINE_CATALOG_MESSAGE,
  WINE_PENDING_REVIEW_MESSAGE,
  localizeWineSubmissionMessage,
} from "@/lib/wine-submission-messages";

describe("wine submission API copy", () => {
  it("preserves Romanian messages", () => {
    expect(
      localizeWineSubmissionMessage(
        WINE_PENDING_REVIEW_MESSAGE,
        "ro",
        "pending_review",
      ),
    ).toBe(WINE_PENDING_REVIEW_MESSAGE);
  });

  it("localizes known status messages without changing status identity", () => {
    expect(
      localizeWineSubmissionMessage(
        EXISTING_WINE_CATALOG_MESSAGE,
        "en",
        "existing",
      ),
    ).toContain("already in our catalog");
    expect(
      localizeWineSubmissionMessage("Motiv intern", "en", "rejected"),
    ).toContain("Romanian wine product page");
  });
});

