import { relations, sql } from "drizzle-orm";
import {
  blob,
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

export interface FoodPairing {
  dish: string;
  note?: string;
  score?: number;
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
  priceRon?: number;
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
  ratings: many(ratings),
  wineVotes: many(wineVotes),
  reports: many(wineReports),
  submissionNotifications: many(wineSubmissionNotifications),
}));

export const scoresHistoryRelations = relations(scoresHistory, ({ one }) => ({
  wine: one(wines, {
    fields: [scoresHistory.wineId],
    references: [wines.id],
  }),
}));

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
