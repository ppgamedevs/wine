export interface PublicPayloadSurfaces {
  visibleText: string;
  metadata: string;
  jsonLd: string;
  flightData: string;
  otherScriptData: string;
}

export interface HiddenSecondaryFixture {
  giftScore: number;
  foodMatchScore: number;
}

export interface SecondaryPayloadLeakCounts {
  giftLegacyText: number;
  foodLegacyText: number;
  giftScoreField: number;
  foodMatchScoreField: number;
}

function matches(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

export function classifyPublicPageHtml(html: string): PublicPayloadSurfaces {
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  const jsonLd: string[] = [];
  const flightData: string[] = [];
  const otherScriptData: string[] = [];

  for (const script of scripts) {
    const attributes = script[1] ?? "";
    const content = script[2] ?? "";
    if (/type=["']application\/ld\+json["']/i.test(attributes)) {
      jsonLd.push(content);
    } else if (content.includes("__next_f")) {
      flightData.push(content);
    } else {
      otherScriptData.push(content);
    }
  }

  const metadata = [
    ...html.matchAll(/<title\b[^>]*>[\s\S]*?<\/title>/gi),
    ...html.matchAll(/<meta\b[^>]*>/gi),
    ...html.matchAll(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi),
  ]
    .map((match) => match[0])
    .join("\n");
  const withoutScripts = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ");
  const visibleText = withoutScripts
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&middot;/gi, "·")
    .replace(/&#x([0-9a-f]+);/gi, (_, value: string) =>
      String.fromCodePoint(Number.parseInt(value, 16)),
    )
    .replace(/&#([0-9]+);/g, (_, value: string) =>
      String.fromCodePoint(Number.parseInt(value, 10)),
    )
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();

  return {
    visibleText,
    metadata,
    jsonLd: jsonLd.join("\n"),
    flightData: flightData.join("\n"),
    otherScriptData: otherScriptData.join("\n"),
  };
}

export function countHiddenSecondaryPayloadLeaks(
  text: string,
  fixture: HiddenSecondaryFixture,
): SecondaryPayloadLeakCounts {
  const gift = fixture.giftScore;
  const food = fixture.foodMatchScore;

  return {
    giftLegacyText: matches(
      text,
      new RegExp(
        `(?:Gift(?: Score)?)(?:\\\\n|\\s|\\\\")*:?\\s*${gift}(?:\\\\?\\/100)`,
        "gi",
      ),
    ),
    foodLegacyText: matches(
      text,
      new RegExp(
        `(?:Food Match|Versatilitate(?:a)? la mas[ăa])(?:\\\\n|\\s|\\\\")*:?\\s*${food}(?:\\\\?\\/100)`,
        "gi",
      ),
    ),
    giftScoreField: matches(
      text,
      new RegExp(`(?:giftScore\\\\?"?\\s*:\\s*)${gift}\\b`, "g"),
    ),
    foodMatchScoreField: matches(
      text,
      new RegExp(`(?:foodMatchScore\\\\?"?\\s*:\\s*)${food}\\b`, "g"),
    ),
  };
}

export function totalSecondaryPayloadLeaks(
  counts: SecondaryPayloadLeakCounts,
): number {
  return Object.values(counts).reduce((total, count) => total + count, 0);
}
