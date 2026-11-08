import { relations, sql } from "drizzle-orm";
import {
  blob,
  check,
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/**
 * Shared JSON payload shapes. Stored as TEXT in SQLite/libSQL via `mode: "json"`.
 */
export interface GrapeVarietyShare {
  name: string;
  slug?: string;
  percentage?: number;
}

export type FoodPairingSource = "vinintel_curated";

export type FoodPairingBasis =
  | "producer_evidence"
  | "verified_style"
  | "technical_data"
  | "editorial_judgment";

export type FoodPairingStrength = "strong" | "good" | "possible";

export interface FoodPairing {
  dish: string;
  note?: string;
  /** Legacy optional number. New curated pairings do not set this. */
  score?: number;
  category?: string;
  source?: FoodPairingSource;
  curatedAt?: string;
  curatedBy?: string;
  basis?: FoodPairingBasis[];
  strength?: FoodPairingStrength;
  /** Stable Romanian dish identity. Optional; existing pairings may omit it. */
  dishId?: string;
  servingVariantId?: string;
}

export interface AvailabilityEntry {
  retailer: string;
  url?: string;
  priceRon?: number;
  inStock?: boolean;
  lastCheckedAt?: string;
}

export interface AffiliateLink {
  retailer: string;
  url: string;
  /**
   * Price observed for THIS offer, from the merchant behind this exact
   * Profitshare link. Public display requires a fresh `checkedAt`.
   */
  priceRon?: number;
  /** ISO timestamp of the observation for this exact offer. */
  checkedAt?: string;
  /** False only when the offer is known to be unavailable. */
  inStock?: boolean;
  /** Profitshare campaign token, when explicitly stored. */
  offerId?: string;
  /** Retailer-side product/variant key used to prove offer identity. */
  productKey?: string;
  /** Exact merchant product URL; separate from the affiliate purchase URL. */
  merchantUrl?: string;
  /** Stable merchant product ID (eMAG: the `/pd/<ID>` token). */
  merchantProductId?: string;
  /** ISO currency for priceRon; defaults to RON. */
  currency?: string;
  /** Result of matching the affiliate destination to merchantProductId. */
  verificationStatus?: "verified" | "unverified" | "mismatch";
  verifiedAt?: string;
  verificationError?: string;
  /** Bottle size in ml; compared with the wine name when present. */
  bottleSizeMl?: number;
  /** Offer vintage; compared with the wine vintage when both exist. */
  vintage?: number | null;
  /** Wine slug this offer was explicitly attached to. */
  wineSlug?: string;
}

/** Tracked retail price observation for a wine. */
export interface PriceHistoryEntry {
  date: string;
  price: number;
  source: string;
}

/** Editorial pairing notes (VinIntel analysis, distinct from factual food_pairings). */
export interface EditorialFoodPairingNote {
  dish: string;
  note: string;
  score?: number;
}

/** Editorial dessert pairing notes for Romanian sweets. */
export type EditorialDessertPairingNote = EditorialFoodPairingNote;

/** Competition medal extracted from product or producer pages. */
export interface WineMedal {
  year?: number | null;
  competition: string;
  medal: "gold" | "silver" | "bronze" | "double_gold" | "best_in_class" | "other";
  country?: string;
  importance?: "high" | "medium" | "low";
}

/** Fapte extrase explicit dintr-o sursa (pagina/fisa), nu din inferenta. */
export interface ProducerExtractedFacts {
  alcohol?: number;
  acidity?: number;
  sugar?: number;
  sweetness?: string;
  vintage?: number;
  grapes?: string[];
  type?: string;
  oakAged?: true;
  oakDurationMonths?: number;
  tanninMentioned?: true;
  cellarPotentialYears?: number;
  drinkabilityStart?: number;
  drinkabilityEnd?: number;
  descriptors?: string[];
}

/** Claim-level food evidence attached to producer content JSON. */
export interface ProducerFoodEvidenceClaim {
  category: string;
  dish: string;
  sourceUrl?: string;
  sourceType: string;
  excerpt: string;
  extractionMethod: "deterministic" | "constrained_llm";
  evidenceClass: string;
  confidence: number;
}

/** Viticultura, note si asocieri de pe site-ul producatorului. */
export interface ProducerPageContent {
  viticulture?: string;
  tastingNotes?: string;
  culinaryPairings?: string;
  foodEvidence?: ProducerFoodEvidenceClaim[];
  culinaryChromeRejected?: boolean;
  culinaryLaundryRejected?: boolean;
  sourceUrls?: string[];
  extractedAt?: string;
  /** tasting_sheet | producer_page | producer_catalog | retailer | marketplace */
  sourceType?: string;
  /** deterministic | constrained_llm. Sursa ramane URL-ul, nu modelul. */
  extractionMethod?: "deterministic" | "constrained_llm";
  facts?: ProducerExtractedFacts;
}

export const DEFAULT_WINE_SOURCE_BADGE =
  "Date factuale preluate din surse publice. Analiza si scorurile apartin VinIntel.ro";

export type WineSubmissionStatus =
  | "user_submitted"
  | "verified"
  | "rejected";

export const COMMUNITY_SOURCE_BADGE =
  "Adaugat de comunitate. Analiza generata de VinIntel.ro. In curs de verificare.";

export const AFFILIATE_SOURCE_BADGE =
  "Importat din sursa afiliata verificata. Analiza si scorurile apartin VinIntel.ro";

export type WineSubmitType = "affiliate" | "community";

/** Calendar event types for premium winery pages. */
export type WineryEventType =
  | "tasting"
  | "tour"
  | "harvest"
  | "festival"
  | "workshop"
  | "other";

/** Tracked analytics events for premium wineries. */
export type WineryAnalyticsEventType =
  | "page_view"
  | "profile_click"
  | "wine_click"
  | "purchase_click"
  | "event_click"
  | "lead_submit"
  | "visit_click"
  | "banner_click";

/** Optional JSON payload on analytics rows. */
export interface WineryAnalyticsMetadata {
  path?: string;
  referrer?: string;
  wineSlug?: string;
  eventSlug?: string;
  [key: string]: string | number | boolean | undefined;
}

/** Known values: "emag", "avincis", "manual", or retailer slug from source URL. */
export type WineImageSource = string;

/** Pre-computed sommelier knowledge per wine (generated once via LLM). */
export interface ExpertNotes {
  history: string;
  terroirSecrets: string;
  vintageQuirks: string;
  pairingScience: string;
  commonMistakes: string;
  agingPotential: string;
  valueInsight: string;
  thingsYouShouldKnow: string[];
}

export type ContentTranslationEntityType =
  | "wine"
  | "winery"
  | "winery_event"
  | "region"
  | "grape_variety"
  | "journal_article"
  | "winery_catalog";

export type ContentTranslationStatus =
  | "READY"
  | "STALE"
  | "REVIEW_REQUIRED"
  | "FAILED";

export type ContentTranslationMethod = "AI" | "HUMAN" | "IMPORT";

export type ContentTranslationJson =
  | string
  | number
  | boolean
  | null
  | ContentTranslationJson[]
  | { [key: string]: ContentTranslationJson };

export interface ContentTranslationQaMetadata {
  shapeValid?: boolean;
  issues?: string[];
  checkedAt?: string;
  checkerVersion?: string;
}

const timestamps = {
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(current_timestamp)`)
    .$onUpdate(() => sql`(current_timestamp)`),
};

/* -------------------------------------------------------------------------- */
/*                                  Regions                                    */
/* -------------------------------------------------------------------------- */

export const regions = sqliteTable(
  "regions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    country: text("country").notNull().default("Romania"),
    description: text("description"),
    imageUrl: text("image_url"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("regions_slug_idx").on(table.slug),
    index("regions_name_idx").on(table.name),
  ],
);

/* -------------------------------------------------------------------------- */
/*                              Grape varieties                               */
/* -------------------------------------------------------------------------- */

export const grapeVarieties = sqliteTable(
  "grape_varieties",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    color: text("color", { enum: ["red", "white", "rose"] }).notNull(),
    isIndigenous: integer("is_indigenous", { mode: "boolean" })
      .notNull()
      .default(false),
    description: text("description"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("grape_varieties_slug_idx").on(table.slug),
    index("grape_varieties_color_idx").on(table.color),
  ],
);

/* -------------------------------------------------------------------------- */
/*                                 Wineries                                    */
/* -------------------------------------------------------------------------- */

export const wineries = sqliteTable(
  "wineries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    regionId: integer("region_id").references(() => regions.id, {
      onDelete: "set null",
    }),
    description: text("description"),
    website: text("website"),
    logoUrl: text("logo_url"),
    foundedYear: integer("founded_year"),
    verified: integer("verified", { mode: "boolean" })
      .notNull()
      .default(false),
    status: text("status", {
      enum: ["user_submitted", "verified", "rejected"],
    })
      .notNull()
      .default("verified"),
    isPremium: integer("is_premium", { mode: "boolean" })
      .notNull()
      .default(false),
    premiumSince: text("premium_since"),
    premiumExpiresAt: text("premium_expires_at"),
    premiumPlan: text("premium_plan", { enum: ["monthly", "annual"] }),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    stripeSubscriptionStatus: text("stripe_subscription_status"),
    customBannerUrl: text("custom_banner_url"),
    customStory: text("custom_story"),
    analyticsEnabled: integer("analytics_enabled", { mode: "boolean" })
      .notNull()
      .default(false),
    leadCaptureEnabled: integer("lead_capture_enabled", { mode: "boolean" })
      .notNull()
      .default(false),
    featuredPlacement: integer("featured_placement", { mode: "boolean" })
      .notNull()
      .default(false),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("wineries_slug_idx").on(table.slug),
    index("wineries_region_idx").on(table.regionId),
    index("wineries_verified_idx").on(table.verified),
    index("wineries_name_idx").on(table.name),
    index("wineries_status_idx").on(table.status),
    index("wineries_is_premium_idx").on(table.isPremium),
    index("wineries_stripe_subscription_idx").on(table.stripeSubscriptionId),
    index("wineries_stripe_customer_idx").on(table.stripeCustomerId),
    index("wineries_featured_placement_idx").on(table.featuredPlacement),
  ],
);

/* -------------------------------------------------------------------------- */
/*                         Premium winery events & analytics                   */
/* -------------------------------------------------------------------------- */

export const wineryEvents = sqliteTable(
  "winery_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    wineryId: integer("winery_id")
      .notNull()
      .references(() => wineries.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    eventType: text("event_type", {
      enum: ["tasting", "tour", "harvest", "festival", "workshop", "other"],
    })
      .notNull()
      .default("other"),
    startsAt: text("starts_at").notNull(),
    endsAt: text("ends_at"),
    location: text("location"),
    registrationUrl: text("registration_url"),
    isPublished: integer("is_published", { mode: "boolean" })
      .notNull()
      .default(true),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("winery_events_winery_slug_idx").on(table.wineryId, table.slug),
    index("winery_events_winery_idx").on(table.wineryId),
    index("winery_events_starts_at_idx").on(table.startsAt),
    index("winery_events_published_idx").on(table.isPublished),
  ],
);

export const wineryAnalytics = sqliteTable(
  "winery_analytics",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    wineryId: integer("winery_id")
      .notNull()
      .references(() => wineries.id, { onDelete: "cascade" }),
    eventType: text("event_type", {
      enum: [
        "page_view",
        "profile_click",
        "wine_click",
        "purchase_click",
        "event_click",
        "lead_submit",
        "visit_click",
        "banner_click",
      ],
    }).notNull(),
    wineId: integer("wine_id").references(() => wines.id, {
      onDelete: "set null",
    }),
    wineryEventId: integer("winery_event_id").references(
      () => wineryEvents.id,
      { onDelete: "set null" },
    ),
    path: text("path"),
    referrer: text("referrer"),
    userAgent: text("user_agent"),
    ipAddress: text("ip_address"),
    metadata: text("metadata", { mode: "json" })
      .$type<WineryAnalyticsMetadata>()
      .default(sql`'null'`),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    index("winery_analytics_winery_idx").on(table.wineryId),
    index("winery_analytics_event_type_idx").on(table.eventType),
    index("winery_analytics_created_idx").on(table.createdAt),
    index("winery_analytics_winery_created_idx").on(
      table.wineryId,
      table.createdAt,
    ),
    index("winery_analytics_wine_idx").on(table.wineId),
  ],
);

/* -------------------------------------------------------------------------- */
/*                                   Wines                                     */
/* -------------------------------------------------------------------------- */

export const wines = sqliteTable(
  "wines",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    wineryId: integer("winery_id").references(() => wineries.id, {
      onDelete: "cascade",
    }),
    regionId: integer("region_id").references(() => regions.id, {
      onDelete: "set null",
    }),
    type: text("type", {
      enum: ["red", "white", "rose", "sparkling", "dessert", "orange"],
    }).notNull(),
    sweetness: text("sweetness", {
      enum: ["sec", "demisec", "demidulce", "dulce"],
    }),
    vintage: integer("vintage"),

    grapeVarieties: text("grape_varieties", { mode: "json" })
      .$type<GrapeVarietyShare[]>()
      .notNull()
      .default(sql`'[]'`),

    alcohol: real("alcohol"),
    sugar: real("sugar"),
    acidity: real("acidity"),
    priceAvg: real("price_avg"),
    currentPrice: integer("current_price"),
    lowestPrice30d: integer("lowest_price_30d"),
    priceHistory: text("price_history", { mode: "json" })
      .$type<PriceHistoryEntry[]>()
      .notNull()
      .default(sql`'[]'`),

    valueScore: integer("value_score"),
    valueScoreVersion: integer("value_score_version").default(2),
    estimatedQuality: real("estimated_quality"),
    qualityEffective: real("quality_effective"),
    qualityFinal: real("quality_final"),
    qualitySurplus: real("quality_surplus"),
    rawSigmoidScore: real("raw_sigmoid_score"),
    criticScore: real("critic_score"),
    drinkabilityStart: integer("drinkability_start"),
    drinkabilityEnd: integer("drinkability_end"),
    giftScore: integer("gift_score"),
    foodMatchScore: integer("food_match_score"),
    beginnerFriendly: integer("beginner_friendly", { mode: "boolean" })
      .notNull()
      .default(false),
    cellarPotential: integer("cellar_potential"),
    overpricedRisk: text("overpriced_risk", {
      enum: ["low", "medium", "high"],
    }),

    tastingNotes: text("tasting_notes"),

    descriptionEditorial: text("description_editorial"),
    valueExplanation: text("value_explanation"),
    thingsYouShouldKnow: text("things_you_should_know", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    foodPairingNotes: text("food_pairing_notes", { mode: "json" })
      .$type<EditorialFoodPairingNote[]>()
      .notNull()
      .default(sql`'[]'`),
    dessertPairings: text("dessert_pairings", { mode: "json" })
      .$type<EditorialDessertPairingNote[]>()
      .notNull()
      .default(sql`'[]'`),
    tasteProfile: text("taste_profile"),
    recommendedOccasions: text("recommended_occasions", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    medals: text("medals", { mode: "json" })
      .$type<WineMedal[]>()
      .notNull()
      .default(sql`'[]'`),
    producerContent: text("producer_content", { mode: "json" })
      .$type<ProducerPageContent | null>()
      .default(sql`'null'`),
    sourceBadge: text("source_badge")
      .notNull()
      .default(DEFAULT_WINE_SOURCE_BADGE),

    foodPairings: text("food_pairings", { mode: "json" })
      .$type<FoodPairing[]>()
      .notNull()
      .default(sql`'[]'`),
    availability: text("availability", { mode: "json" })
      .$type<AvailabilityEntry[]>()
      .notNull()
      .default(sql`'[]'`),
    affiliateLinks: text("affiliate_links", { mode: "json" })
      .$type<AffiliateLink[]>()
      .notNull()
      .default(sql`'[]'`),

    /** External product image URL (retailer or manual upload). */
    imageUrl: text("image_url"),
    /** Origin of imageUrl, e.g. "emag", "avincis", "manual". */
    imageSource: text("image_source"),
    imageAlt: text("image_alt"),
    ratingAvg: real("rating_avg"),
    ratingCount: integer("rating_count").notNull().default(0),
    /** Media voturilor comunitatii VinIntel (0-100). */
    communityScore: integer("community_score"),
    communityVoteCount: integer("community_vote_count").notNull().default(0),

    expertNotes: text("expert_notes", { mode: "json" })
      .$type<ExpertNotes | null>()
      .default(sql`'null'`),

    /** F32_BLOB(384) vector for all-MiniLM-L6-v2 semantic search. Stored as Buffer. */
    embedding: blob("embedding", { mode: "buffer" }),

    sourceUrl: text("source_url"),
    submittedBy: text("submitted_by"),
    submittedEmail: text("submitted_email"),
    submitType: text("submit_type", {
      enum: ["affiliate", "community"],
    })
      .notNull()
      .default("community"),
    status: text("status", {
      enum: ["user_submitted", "verified", "rejected"],
    })
      .notNull()
      .default("verified"),
    reportCount: integer("report_count").notNull().default(0),
    producerPageUrl: text("producer_page_url"),
    tastingSheetUrl: text("tasting_sheet_url"),

    ...timestamps,
  },
  (table) => [
    uniqueIndex("wines_slug_idx").on(table.slug),
    uniqueIndex("wines_source_url_idx").on(table.sourceUrl),
    index("wines_status_idx").on(table.status),
    index("wines_submit_type_idx").on(table.submitType),
    index("wines_winery_idx").on(table.wineryId),
    index("wines_region_idx").on(table.regionId),
    index("wines_type_idx").on(table.type),
    index("wines_vintage_idx").on(table.vintage),
    index("wines_value_score_idx").on(table.valueScore),
    index("wines_gift_score_idx").on(table.giftScore),
    index("wines_food_match_score_idx").on(table.foodMatchScore),
    index("wines_price_idx").on(table.priceAvg),
    index("wines_current_price_idx").on(table.currentPrice),
    index("wines_beginner_idx").on(table.beginnerFriendly),
    index("wines_type_price_idx").on(table.type, table.priceAvg),
  ],
);

export type WineFactField =
  | "alcohol"
  | "acidity"
  | "sugar"
  | "sweetness"
  | "vintage"
  | "grape_varieties"
  | "wine_type"
  | "serving_temperature";

export type WineFactExtractionMethod =
  | "deterministic"
  | "constrained_llm"
  | "manual"
  | "legacy_producer_fact";

export type WineFactIdentityMatch =
  | "EXACT_WINE_EXACT_VINTAGE"
  | "EXACT_WINE_UNDATED_SOURCE"
  | "EXACT_WINE_DIFFERENT_VINTAGE"
  | "LIKELY_WINE"
  | "CATALOG_LEVEL"
  | "PRODUCT_MISMATCH"
  | "SOURCE_IDENTITY_INCOMPLETE";

/**
 * Field-level technical claims. Canonical public values stay on `wines`.
 */
export const wineFactEvidence = sqliteTable(
  "wine_fact_evidence",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    wineId: integer("wine_id")
      .notNull()
      .references(() => wines.id, { onDelete: "cascade" }),
    field: text("field").$type<WineFactField>().notNull(),
    valueJson: text("value_json", { mode: "json" })
      .$type<string | number | string[]>()
      .notNull(),
    unit: text("unit"),
    sourceUrl: text("source_url"),
    sourceType: text("source_type").notNull(),
    sourceWineName: text("source_wine_name"),
    sourceVintage: integer("source_vintage"),
    sourceDocumentTitle: text("source_document_title"),
    excerpt: text("excerpt").notNull(),
    extractionMethod: text("extraction_method")
      .$type<WineFactExtractionMethod>()
      .notNull(),
    identityMatchClass: text("identity_match_class")
      .$type<WineFactIdentityMatch>()
      .notNull(),
    confidence: real("confidence").notNull(),
    observedAt: text("observed_at").notNull(),
    sourceHash: text("source_hash"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    index("wine_fact_evidence_wine_idx").on(table.wineId),
    index("wine_fact_evidence_field_idx").on(table.field),
    index("wine_fact_evidence_hash_idx").on(table.sourceHash),
    uniqueIndex("wine_fact_evidence_wine_field_hash_uidx").on(
      table.wineId,
      table.field,
      table.sourceHash,
    ),
  ],
);

/* -------------------------------------------------------------------------- */
/*                         Localized content history                           */
/* -------------------------------------------------------------------------- */

/**
 * Additive translation history. A source hash identifies an immutable source
 * version, while the partial current index gives each locale lookup one row.
 */
export const contentTranslations = sqliteTable(
  "content_translations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    entityType: text("entity_type")
      .$type<ContentTranslationEntityType>()
      .notNull(),
    entityId: text("entity_id").notNull(),
    field: text("field").notNull(),
    sourceLocale: text("source_locale").notNull().default("ro"),
    targetLocale: text("target_locale").notNull(),
    sourceValueJson: text("source_value_json", { mode: "json" })
      .$type<ContentTranslationJson>()
      .notNull(),
    valueJson: text("value_json", { mode: "json" })
      .$type<ContentTranslationJson | null>()
      .default(sql`'null'`),
    sourceHash: text("source_hash").notNull(),
    status: text("status")
      .$type<ContentTranslationStatus>()
      .notNull()
      .default("REVIEW_REQUIRED"),
    method: text("method").$type<ContentTranslationMethod>().notNull(),
    model: text("model"),
    promptVersion: text("prompt_version"),
    qaMetadata: text("qa_metadata", { mode: "json" })
      .$type<ContentTranslationQaMetadata>()
      .notNull()
      .default(sql`'{}'`),
    failureReason: text("failure_reason"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: text("reviewed_at"),
    isCurrent: integer("is_current", { mode: "boolean" })
      .notNull()
      .default(true),
    ...timestamps,
  },
  (table) => [
    check(
      "content_translations_entity_type_check",
      sql`${table.entityType} in ('wine', 'winery', 'winery_event', 'region', 'grape_variety', 'journal_article', 'winery_catalog')`,
    ),
    check(
      "content_translations_status_check",
      sql`${table.status} in ('READY', 'STALE', 'REVIEW_REQUIRED', 'FAILED')`,
    ),
    check(
      "content_translations_method_check",
      sql`${table.method} in ('AI', 'HUMAN', 'IMPORT')`,
    ),
    check(
      "content_translations_is_current_check",
      sql`${table.isCurrent} in (0, 1)`,
    ),
    uniqueIndex("content_translations_source_version_uidx").on(
      table.entityType,
      table.entityId,
      table.field,
      table.sourceLocale,
      table.targetLocale,
      table.sourceHash,
    ),
    uniqueIndex("content_translations_current_uidx")
      .on(
        table.entityType,
        table.entityId,
        table.field,
        table.sourceLocale,
        table.targetLocale,
      )
      .where(sql`${table.isCurrent} = 1`),
    index("content_translations_lookup_idx").on(
      table.entityType,
      table.entityId,
      table.field,
      table.sourceLocale,
      table.targetLocale,
      table.isCurrent,
    ),
    index("content_translations_source_hash_idx").on(table.sourceHash),
    index("content_translations_status_idx").on(table.status),
  ],
);

/* -------------------------------------------------------------------------- */
/*                            Community wine reports                           */
/* -------------------------------------------------------------------------- */

export const subscribers = sqliteTable(
  "subscribers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    email: text("email").notNull(),
    source: text("source").notNull().default("wine_approval"),
    ...timestamps,
  },
  (table) => [uniqueIndex("subscribers_email_idx").on(table.email)],
);

export const wineSubmissionNotifications = sqliteTable(
  "wine_submission_notifications",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    email: text("email").notNull(),
    sourceUrl: text("source_url").notNull(),
    wineId: integer("wine_id")
      .notNull()
      .references(() => wines.id, { onDelete: "cascade" }),
    notifiedAt: text("notified_at"),
    ...timestamps,
  },
  (table) => [
    index("wine_submission_notifications_wine_idx").on(table.wineId),
    index("wine_submission_notifications_email_idx").on(table.email),
  ],
);

export const wineReports = sqliteTable(
  "wine_reports",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    wineId: integer("wine_id")
      .notNull()
      .references(() => wines.id, { onDelete: "cascade" }),
    reason: text("reason"),
    submittedBy: text("submitted_by").default("anonymous"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    index("wine_reports_wine_idx").on(table.wineId),
    index("wine_reports_created_idx").on(table.createdAt),
  ],
);

/* -------------------------------------------------------------------------- */
/*                              Scores history                                 */
/* -------------------------------------------------------------------------- */

/**
 * Motivul pentru care a fost inregistrat un snapshot de scor. Pastrat ca sa
 * putem reconstitui "de ce s-a schimbat scorul" fara sa ghicim din diff-uri.
 */
export type ScoreChangeReason =
  | "initial"
  | "recalculation"
  | "gift_food_recalculation"
  | "price_update"
  | "editorial_regeneration"
  | "admin_override"
  | "data_migration";

export const scoresHistory = sqliteTable(
  "scores_history",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    wineId: integer("wine_id")
      .notNull()
      .references(() => wines.id, { onDelete: "cascade" }),
    priceAvg: real("price_avg"),
    valueScore: integer("value_score"),
    giftScore: integer("gift_score"),
    foodMatchScore: integer("food_match_score"),
    overpricedRisk: text("overpriced_risk", {
      enum: ["low", "medium", "high"],
    }),
    /** Versiunea algoritmului de scoring folosita la acest calcul (reproducibilitate). */
    algorithmVersion: integer("algorithm_version"),
    /** Increderea datelor (0-100%) la momentul calcularii, separat de scor. */
    confidencePercent: integer("confidence_percent"),
    changeReason: text("change_reason", {
      enum: [
        "initial",
        "recalculation",
        "gift_food_recalculation",
        "price_update",
        "editorial_regeneration",
        "admin_override",
        "data_migration",
      ],
    }),
    /** "system" pentru joburi automate, sau identificatorul adminului. */
    changedBy: text("changed_by"),
    recordedAt: text("recorded_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    index("scores_history_wine_idx").on(table.wineId),
    index("scores_history_recorded_idx").on(table.recordedAt),
    index("scores_history_wine_recorded_idx").on(
      table.wineId,
      table.recordedAt,
    ),
  ],
);

/* -------------------------------------------------------------------------- */
/*                          Users and ratings (later)                         */
/* -------------------------------------------------------------------------- */

export const users = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    email: text("email").notNull(),
    name: text("name"),
    imageUrl: text("image_url"),
    role: text("role", { enum: ["user", "editor", "admin"] })
      .notNull()
      .default("user"),
    emailVerified: integer("email_verified", { mode: "boolean" })
      .notNull()
      .default(false),
    ...timestamps,
  },
  (table) => [uniqueIndex("users_email_idx").on(table.email)],
);

export const ratings = sqliteTable(
  "ratings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    wineId: integer("wine_id")
      .notNull()
      .references(() => wines.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    review: text("review"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("ratings_user_wine_idx").on(table.userId, table.wineId),
    index("ratings_wine_idx").on(table.wineId),
    index("ratings_user_idx").on(table.userId),
  ],
);

export const wineVotes = sqliteTable(
  "wine_votes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    wineId: integer("wine_id")
      .notNull()
      .references(() => wines.id, { onDelete: "cascade" }),
    /** 1-100, aceeasi scala ca VinIntel Score. */
    score: integer("score").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("wine_votes_user_wine_idx").on(table.userId, table.wineId),
    index("wine_votes_wine_idx").on(table.wineId),
    index("wine_votes_user_idx").on(table.userId),
  ],
);

export const wineVoteLogs = sqliteTable(
  "wine_vote_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    wineId: integer("wine_id")
      .notNull()
      .references(() => wines.id, { onDelete: "cascade" }),
    ipAddress: text("ip_address").notNull(),
    action: text("action", { enum: ["create", "update"] }).notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    index("wine_vote_logs_user_created_idx").on(table.userId, table.createdAt),
    index("wine_vote_logs_ip_created_idx").on(table.ipAddress, table.createdAt),
    index("wine_vote_logs_wine_idx").on(table.wineId),
  ],
);

export type StripeSubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

export type PremiumCheckoutPlan = "monthly" | "annual";

export const wineryPremiumCheckouts = sqliteTable(
  "winery_premium_checkouts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    stripeSessionId: text("stripe_session_id").notNull(),
    wineryId: integer("winery_id").references(() => wineries.id, {
      onDelete: "set null",
    }),
    wineryName: text("winery_name").notNull(),
    winerySlug: text("winery_slug"),
    email: text("email").notNull(),
    phone: text("phone"),
    plan: text("plan", { enum: ["monthly", "annual"] }).notNull(),
    status: text("status", { enum: ["pending", "completed"] })
      .notNull()
      .default("pending"),
    completedAt: text("completed_at"),
    expiresAt: text("expires_at"),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    welcomeEmailSentAt: text("welcome_email_sent_at"),
    reminderEmailSentAt: text("reminder_email_sent_at"),
    expiredEmailSentAt: text("expired_email_sent_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    uniqueIndex("winery_premium_checkouts_session_idx").on(
      table.stripeSessionId,
    ),
    index("winery_premium_checkouts_winery_idx").on(table.wineryId),
    index("winery_premium_checkouts_email_idx").on(table.email),
    index("winery_premium_checkouts_expires_idx").on(table.expiresAt),
    index("winery_premium_checkouts_subscription_idx").on(
      table.stripeSubscriptionId,
    ),
  ],
);

/* -------------------------------------------------------------------------- */
/*                                 Relations                                   */
/* -------------------------------------------------------------------------- */

export const regionsRelations = relations(regions, ({ many }) => ({
  wineries: many(wineries),
  wines: many(wines),
}));

export const wineriesRelations = relations(wineries, ({ one, many }) => ({
  region: one(regions, {
    fields: [wineries.regionId],
    references: [regions.id],
  }),
  wines: many(wines),
  events: many(wineryEvents),
  analytics: many(wineryAnalytics),
}));

export const winesRelations = relations(wines, ({ one, many }) => ({
  winery: one(wineries, {
    fields: [wines.wineryId],
    references: [wineries.id],
  }),
  region: one(regions, {
    fields: [wines.regionId],
    references: [regions.id],
  }),
  scoresHistory: many(scoresHistory),
  scoreOverrides: many(scoreOverrides),
  ratings: many(ratings),
  wineVotes: many(wineVotes),
  reports: many(wineReports),
  submissionNotifications: many(wineSubmissionNotifications),
  factEvidence: many(wineFactEvidence),
}));

export const wineFactEvidenceRelations = relations(wineFactEvidence, ({ one }) => ({
  wine: one(wines, {
    fields: [wineFactEvidence.wineId],
    references: [wines.id],
  }),
}));

export const scoresHistoryRelations = relations(scoresHistory, ({ one }) => ({
  wine: one(wines, {
    fields: [scoresHistory.wineId],
    references: [wines.id],
  }),
}));

/* -------------------------------------------------------------------------- */
/*                          Manual override audit log                        */
/* -------------------------------------------------------------------------- */

/**
 * Campurile pe care un admin le poate suprascrie manual. Nu include camp
 * pentru date brute de sursa: override-urile ating doar valori calculate/
 * editoriale, niciodata `sourceUrl`, `priceHistory` sau alte date brute.
 */
export type ScoreOverrideField =
  | "valueScore"
  | "giftScore"
  | "foodMatchScore"
  | "criticScore"
  | "overpricedRisk";

/**
 * Audit trail pentru orice override manual de scor din admin. Cerinta de
 * business: fiecare override trebuie sa aiba valoare veche, valoare noua,
 * motiv, responsabil si timestamp, si (optional) o data de expirare dupa
 * care override-ul nu mai trebuie considerat valid la urmatoarea recalculare.
 * Niciodata nu suprascriem aceasta tabela - e append-only.
 */
export const scoreOverrides = sqliteTable(
  "score_overrides",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    wineId: integer("wine_id")
      .notNull()
      .references(() => wines.id, { onDelete: "cascade" }),
    field: text("field", {
      enum: [
        "valueScore",
        "giftScore",
        "foodMatchScore",
        "criticScore",
        "overpricedRisk",
      ],
    }).notNull(),
    previousValue: text("previous_value"),
    newValue: text("new_value"),
    reason: text("reason").notNull(),
    changedBy: text("changed_by").notNull().default("admin"),
    expiresAt: text("expires_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    index("score_overrides_wine_idx").on(table.wineId),
    index("score_overrides_created_idx").on(table.createdAt),
  ],
);

export const scoreOverridesRelations = relations(
  scoreOverrides,
  ({ one }) => ({
    wine: one(wines, {
      fields: [scoreOverrides.wineId],
      references: [wines.id],
    }),
  }),
);

export type PairingCurationEventAction =
  | "approved"
  | "approved_after_edit"
  | "rejected"
  | "skipped_wine"
  | "review_later";

/**
 * Append-only curation feedback. Never writes Value/Gift/Food scores.
 */
export const pairingCurationEvents = sqliteTable(
  "pairing_curation_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    wineId: integer("wine_id")
      .notNull()
      .references(() => wines.id, { onDelete: "cascade" }),
    wineSlug: text("wine_slug").notNull(),
    proposedDishId: text("proposed_dish_id"),
    proposedDish: text("proposed_dish"),
    proposedRationale: text("proposed_rationale"),
    proposedStrength: text("proposed_strength"),
    proposedBasis: text("proposed_basis", { mode: "json" }).$type<FoodPairingBasis[] | null>(),
    action: text("action", {
      enum: [
        "approved",
        "approved_after_edit",
        "rejected",
        "skipped_wine",
        "review_later",
      ],
    }).notNull(),
    finalDishId: text("final_dish_id"),
    finalDish: text("final_dish"),
    finalRationale: text("final_rationale"),
    finalStrength: text("final_strength"),
    finalBasis: text("final_basis", { mode: "json" }).$type<FoodPairingBasis[] | null>(),
    reviewer: text("reviewer").notNull().default("admin"),
    generatorVersion: integer("generator_version"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    index("pairing_curation_events_wine_idx").on(table.wineId),
    index("pairing_curation_events_slug_idx").on(table.wineSlug),
    index("pairing_curation_events_created_idx").on(table.createdAt),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  ratings: many(ratings),
  wineVotes: many(wineVotes),
  wineVoteLogs: many(wineVoteLogs),
}));

export const ratingsRelations = relations(ratings, ({ one }) => ({
  user: one(users, {
    fields: [ratings.userId],
    references: [users.id],
  }),
  wine: one(wines, {
    fields: [ratings.wineId],
    references: [wines.id],
  }),
}));

export const wineVotesRelations = relations(wineVotes, ({ one }) => ({
  user: one(users, {
    fields: [wineVotes.userId],
    references: [users.id],
  }),
  wine: one(wines, {
    fields: [wineVotes.wineId],
    references: [wines.id],
  }),
}));

export const wineVoteLogsRelations = relations(wineVoteLogs, ({ one }) => ({
  user: one(users, {
    fields: [wineVoteLogs.userId],
    references: [users.id],
  }),
  wine: one(wines, {
    fields: [wineVoteLogs.wineId],
    references: [wines.id],
  }),
}));

export const wineryPremiumCheckoutsRelations = relations(
  wineryPremiumCheckouts,
  ({ one }) => ({
    winery: one(wineries, {
      fields: [wineryPremiumCheckouts.wineryId],
      references: [wineries.id],
    }),
  }),
);

export const wineReportsRelations = relations(wineReports, ({ one }) => ({
  wine: one(wines, {
    fields: [wineReports.wineId],
    references: [wines.id],
  }),
}));

export const wineSubmissionNotificationsRelations = relations(
  wineSubmissionNotifications,
  ({ one }) => ({
    wine: one(wines, {
      fields: [wineSubmissionNotifications.wineId],
      references: [wines.id],
    }),
  }),
);

export const wineryEventsRelations = relations(wineryEvents, ({ one }) => ({
  winery: one(wineries, {
    fields: [wineryEvents.wineryId],
    references: [wineries.id],
  }),
}));

export const wineryAnalyticsRelations = relations(wineryAnalytics, ({ one }) => ({
  winery: one(wineries, {
    fields: [wineryAnalytics.wineryId],
    references: [wineries.id],
  }),
  wine: one(wines, {
    fields: [wineryAnalytics.wineId],
    references: [wines.id],
  }),
  wineryEvent: one(wineryEvents, {
    fields: [wineryAnalytics.wineryEventId],
    references: [wineryEvents.id],
  }),
}));

/* -------------------------------------------------------------------------- */
/*                    Multi-source wine intelligence V2                       */
/* -------------------------------------------------------------------------- */

export const WINE_CLAIM_FIELDS = [
  "producer",
  "range",
  "product_name",
  "grape_varieties",
  "grape_percentages",
  "vintage",
  "bottle_volume",
  "wine_color",
  "sweetness",
  "alcohol",
  "appellation",
  "region",
  "country",
  "serving_temperature",
  "visual_appearance",
  "aroma_descriptors",
  "taste_descriptors",
  "body",
  "acidity_perception",
  "tannin_perception",
  "finish",
  "winemaking_method",
  "oak_treatment",
  "food_pairing",
  "awards",
  "cellaring",
  "allergens",
  "other_product_info",
] as const;

export type WineClaimField = (typeof WINE_CLAIM_FIELDS)[number];

export const WINE_SOURCE_CLASSES = [
  "official_technical_sheet",
  "official_producer_page",
  "official_catalog",
  "producer_general",
  "retailer",
  "specialist",
  "education",
  "editorial",
  "existing_record",
  "unknown",
] as const;

export type WineSourceClass = (typeof WINE_SOURCE_CLASSES)[number];

export const WINE_CLAIM_VERIFICATION_STATUSES = [
  "verified_official",
  "attributed_retailer",
  "attributed_specialist",
  "attributed_editorial",
  "corroborated",
  "unverified",
  "conflict",
  "identity_mismatch",
] as const;

export type WineClaimVerificationStatus =
  (typeof WINE_CLAIM_VERIFICATION_STATUSES)[number];

/** V2 evidence ledger. Technical claims may also be mirrored into wine_fact_evidence. */
export const wineClaimEvidence = sqliteTable(
  "wine_claim_evidence",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    wineId: integer("wine_id")
      .notNull()
      .references(() => wines.id, { onDelete: "cascade" }),
    canonicalIdentityKey: text("canonical_identity_key").notNull(),
    field: text("field").$type<WineClaimField>().notNull(),
    valueJson: text("value_json", { mode: "json" })
      .$type<string | number | string[] | Record<string, unknown>>()
      .notNull(),
    normalizedValue: text("normalized_value").notNull(),
    unit: text("unit"),
    sourceUrl: text("source_url").notNull(),
    sourceTitle: text("source_title"),
    sourceClass: text("source_class").$type<WineSourceClass>().notNull(),
    excerpt: text("excerpt").notNull(),
    observedAt: text("observed_at").notNull(),
    extractionMethod: text("extraction_method").notNull(),
    identityMatchStatus: text("identity_match_status").notNull(),
    verificationStatus: text("verification_status")
      .$type<WineClaimVerificationStatus>()
      .notNull(),
    confidence: real("confidence").notNull(),
    conflictJson: text("conflict_json", { mode: "json" }).$type<Record<
      string,
      unknown
    > | null>(),
    sourceHash: text("source_hash").notNull(),
    claimHash: text("claim_hash").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    index("wine_claim_evidence_wine_idx").on(table.wineId),
    index("wine_claim_evidence_field_idx").on(table.field),
    index("wine_claim_evidence_source_idx").on(table.sourceUrl),
    uniqueIndex("wine_claim_evidence_wine_field_hash_uidx").on(
      table.wineId,
      table.field,
      table.sourceHash,
    ),
  ],
);

/** General variety knowledge is deliberately independent from bottle notes. */
export const grapeVarietyKnowledge = sqliteTable(
  "grape_variety_knowledge",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    history: text("history"),
    typicalAromas: text("typical_aromas", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    regions: text("regions", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    styles: text("styles", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    foodCompatibility: text("food_compatibility", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    winemaking: text("winemaking", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    sources: text("sources", { mode: "json" })
      .$type<Array<{ url: string; title: string }>>()
      .notNull()
      .default(sql`'[]'`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [uniqueIndex("grape_variety_knowledge_slug_uidx").on(table.slug)],
);

/** AI interpretation is stored separately from source-backed claims. */
export const vintageEvidence = sqliteTable(
  "vintage_evidence",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    scope: text("scope").notNull(),
    region: text("region"),
    appellation: text("appellation"),
    grape: text("grape"),
    wineryId: integer("winery_id").references(() => wineries.id, {
      onDelete: "cascade",
    }),
    wineId: integer("wine_id").references(() => wines.id, {
      onDelete: "cascade",
    }),
    familyKey: text("family_key"),
    vintage: integer("vintage"),
    evidenceType: text("evidence_type").notNull(),
    impact: text("impact").notNull(),
    sourceUrl: text("source_url").notNull(),
    sourceTitle: text("source_title").notNull(),
    publisher: text("publisher").notNull(),
    publishedAt: text("published_at"),
    eventDate: text("event_date"),
    excerpt: text("excerpt").notNull(),
    confidence: real("confidence").notNull(),
    producerClaim: integer("producer_claim", { mode: "boolean" })
      .notNull()
      .default(false),
    independent: integer("independent", { mode: "boolean" })
      .notNull()
      .default(false),
    regionalException: integer("regional_exception", { mode: "boolean" })
      .notNull()
      .default(false),
    maturity: text("maturity"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    index("vintage_evidence_scope_idx").on(table.scope),
    index("vintage_evidence_vintage_idx").on(table.vintage),
    index("vintage_evidence_region_idx").on(table.region),
    index("vintage_evidence_wine_idx").on(table.wineId),
    index("vintage_evidence_winery_idx").on(table.wineryId),
    index("vintage_evidence_family_idx").on(table.familyKey),
    uniqueIndex("vintage_evidence_source_scope_uidx").on(
      table.sourceUrl,
      table.scope,
      table.evidenceType,
      table.vintage,
    ),
  ],
);

/** AI interpretation is stored separately from source-backed claims. */
export const wineAiInterpretations = sqliteTable(
  "wine_ai_interpretations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    wineId: integer("wine_id")
      .notNull()
      .references(() => wines.id, { onDelete: "cascade" }),
    runId: text("run_id").notNull(),
    model: text("model").notNull(),
    text: text("text").notNull(),
    supportedClaimHashes: text("supported_claim_hashes", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    estimatedCostUsd: real("estimated_cost_usd").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    index("wine_ai_interpretations_wine_idx").on(table.wineId),
    uniqueIndex("wine_ai_interpretations_wine_run_uidx").on(
      table.wineId,
      table.runId,
    ),
  ],
);

/** Idempotency and cost/request reporting per enrichment run. */
export const wineEnrichmentRuns = sqliteTable(
  "wine_enrichment_runs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    wineId: integer("wine_id")
      .notNull()
      .references(() => wines.id, { onDelete: "cascade" }),
    fingerprint: text("fingerprint").notNull(),
    status: text("status").notNull(),
    dryRun: integer("dry_run", { mode: "boolean" }).notNull().default(false),
    sourceCount: integer("source_count").notNull().default(0),
    requestCount: integer("request_count").notNull().default(0),
    claimCount: integer("claim_count").notNull().default(0),
    conflictCount: integer("conflict_count").notNull().default(0),
    aiRequestCount: integer("ai_request_count").notNull().default(0),
    aiInputTokens: integer("ai_input_tokens").notNull().default(0),
    aiOutputTokens: integer("ai_output_tokens").notNull().default(0),
    estimatedCostUsd: real("estimated_cost_usd").notNull().default(0),
    completenessJson: text("completeness_json", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull(),
    errorJson: text("error_json", { mode: "json" })
      .$type<Record<string, unknown>[]>()
      .notNull()
      .default(sql`'[]'`),
    startedAt: text("started_at").notNull(),
    finishedAt: text("finished_at"),
  },
  (table) => [
    index("wine_enrichment_runs_wine_idx").on(table.wineId),
    uniqueIndex("wine_enrichment_runs_wine_fingerprint_uidx").on(
      table.wineId,
      table.fingerprint,
    ),
  ],
);

/* -------------------------------------------------------------------------- */
/*                    Daily affiliate price refresh                           */
/* -------------------------------------------------------------------------- */

export const priceRefreshRuns = sqliteTable("price_refresh_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  startedAt: text("started_at").notNull(),
  finishedAt: text("finished_at"),
  status: text("status", {
    enum: ["running", "success", "failed", "locked"],
  }).notNull(),
  dryRun: integer("dry_run", { mode: "boolean" }).notNull().default(false),
  cursorStart: integer("cursor_start").notNull().default(0),
  cursorEnd: integer("cursor_end"),
  processed: integer("processed").notNull().default(0),
  updated: integer("updated").notNull().default(0),
  unchanged: integer("unchanged").notNull().default(0),
  failed: integer("failed").notNull().default(0),
  skipped: integer("skipped").notNull().default(0),
  errorJson: text("error_json", { mode: "json" })
    .$type<Record<string, unknown>[]>()
    .notNull()
    .default(sql`'[]'`),
  lockToken: text("lock_token"),
});

export const priceRefreshState = sqliteTable("price_refresh_state", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull(),
  cursor: integer("cursor").notNull().default(0),
  lockToken: text("lock_token"),
  lockExpiresAt: text("lock_expires_at"),
  lastStartedAt: text("last_started_at"),
  lastFinishedAt: text("last_finished_at"),
  lastSuccessAt: text("last_success_at"),
  lastError: text("last_error"),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  uniqueIndex("price_refresh_state_key_uidx").on(table.key),
]);

/* -------------------------------------------------------------------------- */
/*                    Sommelier demand to PSEO flywheel                        */
/* -------------------------------------------------------------------------- */

export interface SommelierIntentEntities {
  references: string[];
  grapes: string[];
  regions: string[];
  wineries: string[];
  wines: string[];
  vintages: number[];
}

export const SOMMELIER_ANSWER_QUALITIES = ["high", "low", "unknown"] as const;
export type SommelierAnswerQuality =
  (typeof SOMMELIER_ANSWER_QUALITIES)[number];

export const PSEO_DRAFT_STATUSES = [
  "draft",
  "approved",
  "published",
  "rejected",
] as const;
export type PseoDraftStatus = (typeof PSEO_DRAFT_STATUSES)[number];

export const PSEO_PUBLISH_RECOMMENDATIONS = [
  "publish",
  "review",
  "reject",
] as const;
export type PseoPublishRecommendation =
  (typeof PSEO_PUBLISH_RECOMMENDATIONS)[number];

/** Structured record of a real sommelier question. */
export const sommelierQuestionIntents = sqliteTable(
  "sommelier_question_intents",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    rawQuery: text("raw_query").notNull(),
    normalizedQuery: text("normalized_query").notNull(),
    entitiesJson: text("entities_json", { mode: "json" })
      .$type<SommelierIntentEntities>()
      .notNull(),
    topicCluster: text("topic_cluster").notNull(),
    canonicalQuestion: text("canonical_question").notNull(),
    intentType: text("intent_type").notNull(),
    language: text("language", { enum: ["ro", "en", "other"] }).notNull(),
    answerQuality: text("answer_quality", {
      enum: SOMMELIER_ANSWER_QUALITIES,
    })
      .notNull()
      .default("unknown"),
    similarPageExists: integer("similar_page_exists", { mode: "boolean" })
      .notNull()
      .default(false),
    blocked: integer("blocked", { mode: "boolean" }).notNull().default(false),
    blockReason: text("block_reason"),
    source: text("source").notNull().default("sommelier_chat"),
    metadataJson: text("metadata_json", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'`),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    index("sommelier_question_intents_cluster_idx").on(table.topicCluster),
    index("sommelier_question_intents_normalized_idx").on(table.normalizedQuery),
    index("sommelier_question_intents_created_idx").on(table.createdAt),
    index("sommelier_question_intents_quality_idx").on(table.answerQuality),
  ],
);

/** Generated PSEO candidates. Public indexing is off until explicit approval. */
export const pseoDraftPages = sqliteTable(
  "pseo_draft_pages",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    locale: text("locale", { enum: ["ro", "en"] }).notNull(),
    pageType: text("page_type").notNull(),
    title: text("title").notNull(),
    metaTitle: text("meta_title").notNull(),
    metaDescription: text("meta_description").notNull(),
    intro: text("intro").notNull(),
    contentMarkdown: text("content_markdown").notNull(),
    sectionsJson: text("sections_json", { mode: "json" })
      .$type<Array<{ heading: string; body: string }>>()
      .notNull()
      .default(sql`'[]'`),
    faqJson: text("faq_json", { mode: "json" })
      .$type<Array<{ question: string; answer: string }>>()
      .notNull()
      .default(sql`'[]'`),
    sourcesJson: text("sources_json", { mode: "json" })
      .$type<Array<{ label: string; href?: string }>>()
      .notNull()
      .default(sql`'[]'`),
    generatedFromIntentCluster: text("generated_from_intent_cluster").notNull(),
    clusterKey: text("cluster_key").notNull(),
    confidence: real("confidence").notNull().default(0),
    publishRecommendation: text("publish_recommendation", {
      enum: PSEO_PUBLISH_RECOMMENDATIONS,
    })
      .notNull()
      .default("review"),
    noindexUntilApproved: integer("noindex_until_approved", {
      mode: "boolean",
    })
      .notNull()
      .default(true),
    status: text("status", { enum: PSEO_DRAFT_STATUSES })
      .notNull()
      .default("draft"),
    supportingWineCount: integer("supporting_wine_count").notNull().default(0),
    demandCount: integer("demand_count").notNull().default(0),
    qualityGateJson: text("quality_gate_json", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'`),
    sourceIntentIdsJson: text("source_intent_ids_json", { mode: "json" })
      .$type<number[]>()
      .notNull()
      .default(sql`'[]'`),
    reviewNotes: text("review_notes"),
    approvedAt: text("approved_at"),
    approvedBy: text("approved_by"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    uniqueIndex("pseo_draft_pages_slug_locale_uidx").on(
      table.slug,
      table.locale,
    ),
    index("pseo_draft_pages_cluster_idx").on(table.clusterKey),
    index("pseo_draft_pages_status_idx").on(table.status),
    index("pseo_draft_pages_recommendation_idx").on(
      table.publishRecommendation,
    ),
  ],
);
