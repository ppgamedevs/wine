import { discoverOfficialDocumentUrls } from "@/lib/tech-facts/source-identity";
import { classifySourceUrl } from "@/lib/source-trust";
import type {
  DiscoveredSource,
  SourceCandidate,
  SourceFixture,
  WineIntelligenceInput,
  WineSourceClass,
} from "@/lib/intelligence/types";

const PRIORITY: Record<WineSourceClass, number> = {
  existing_record: 100,
  official_technical_sheet: 90,
  official_producer_page: 85,
  official_catalog: 75,
  producer_general: 60,
  specialist: 50,
  editorial: 40,
  education: 35,
  retailer: 30,
  unknown: 0,
};

export function classifyIntelligenceSource(
  url: string,
  isPdf = false,
  explicit?: WineSourceClass,
): WineSourceClass {
  if (explicit) return explicit;
  const sourceType = classifySourceUrl(url, { isPdf });
  if (sourceType === "tasting_sheet") return "official_technical_sheet";
  if (sourceType === "producer_page") return "official_producer_page";
  if (sourceType === "producer_catalog") return "official_catalog";
  if (sourceType === "producer_general") return "producer_general";
  if (sourceType === "retailer") return "retailer";
  if (sourceType === "marketplace") return "retailer";
  if (/winefolly|wine-searcher|jancisrobinson|decanter|wset|vitisphere/i.test(url)) {
    return "education";
  }
  if (/vinul\.ro|wine\.ro|vinuri\.ro/i.test(url)) return "editorial";
  return "unknown";
}

function sourceAvailability(
  fixture: SourceFixture | null,
  options: {
    robotsAllowed: boolean;
    requiresAuth: boolean;
    rateLimited: boolean;
    liveCandidate?: boolean;
  },
): Pick<DiscoveredSource, "availability" | "availabilityReason"> {
  if (options.robotsAllowed === false) {
    return {
      availability: "blocked",
      availabilityReason: "robots disallow or access restriction",
    };
  }
  if (options.requiresAuth) {
    return {
      availability: "requires_auth",
      availabilityReason: "requires authentication; not bypassed",
    };
  }
  if (options.rateLimited) {
    return {
      availability: "rate_limited",
      availabilityReason: "rate limit / retry later",
    };
  }
  if (!fixture && !options.liveCandidate) {
    return {
      availability: "unavailable",
      availabilityReason: "no accessible fixture/content for this source",
    };
  }
  return { availability: "available", availabilityReason: null };
}

function toDiscovered(fixture: SourceFixture, discoveredFrom: string): DiscoveredSource {
  const isPdf = fixture.kind === "pdf_text";
  const classification = classifyIntelligenceSource(
    fixture.url,
    isPdf,
    fixture.classification,
  );
  const availability = sourceAvailability(fixture, {
    robotsAllowed: fixture.robotsAllowed !== false,
    requiresAuth: fixture.requiresAuth === true,
    rateLimited: fixture.rateLimited === true,
  });
  return {
    url: fixture.url,
    title: fixture.title,
    classification,
    discoveredFrom,
    priority: PRIORITY[classification],
    contentKind: fixture.kind,
    fixture,
    ...availability,
  };
}

export function discoverWineSources(input: {
  wine: WineIntelligenceInput;
  fixtures: SourceFixture[];
  sourceCandidates?: SourceCandidate[];
}): DiscoveredSource[] {
  const byUrl = new Map<string, DiscoveredSource>();
  const add = (source: DiscoveredSource) => {
    if (!byUrl.has(source.url)) byUrl.set(source.url, source);
  };

  const producerFixture =
    input.fixtures.find((fixture) => fixture.url === input.wine.producerPageUrl) ??
    input.fixtures.find((fixture) =>
      /murfatlar-vinul\.ro|producer/i.test(fixture.url),
    );
  if (producerFixture) {
    add(toDiscovered(producerFixture, "wine.producerPageUrl"));
    if (producerFixture.kind === "html") {
      for (const pdfUrl of discoverOfficialDocumentUrls(
        producerFixture.body,
        producerFixture.url,
      )) {
        const pdfFixture = input.fixtures.find((fixture) => fixture.url === pdfUrl);
        if (pdfFixture) {
          add(toDiscovered(pdfFixture, "producer page PDF discovery"));
        } else {
          add({
            url: pdfUrl,
            title: pdfUrl.split("/").pop() ?? "Official technical sheet",
            classification: "official_technical_sheet",
            discoveredFrom: "producer page PDF discovery",
            priority: PRIORITY.official_technical_sheet,
            contentKind: "pdf_text",
            fixture: null,
            availability: "unavailable",
            availabilityReason: "PDF discovered but not fetched in this run",
          });
        }
      }
    }
  }

  for (const fixture of input.fixtures) {
    add(toDiscovered(fixture, "fixture input"));
  }

  for (const candidate of input.sourceCandidates ?? []) {
    const classification = classifyIntelligenceSource(
      candidate.url,
      candidate.contentKind === "pdf_text",
      candidate.classification,
    );
    const availability = sourceAvailability(null, {
      robotsAllowed: true,
      requiresAuth: false,
      rateLimited: false,
      liveCandidate: true,
    });
    add({
      url: candidate.url,
      title: candidate.title,
      classification,
      discoveredFrom: "catalog source candidate",
      priority: PRIORITY[classification],
      contentKind: candidate.contentKind ?? "html",
      fixture: null,
      ...availability,
    });
  }

  add({
    url: `vinintel://wine/${input.wine.id}`,
    title: "Existing VinIntel record",
    classification: "existing_record",
    discoveredFrom: "wine.id",
    priority: PRIORITY.existing_record,
    contentKind: "json",
    fixture: null,
    availability: "available",
    availabilityReason: null,
  });

  return [...byUrl.values()].sort(
    (left, right) =>
      right.priority - left.priority || left.url.localeCompare(right.url),
  );
}
