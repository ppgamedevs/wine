import { relations, sql } from "drizzle-orm";
import {
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
    ...timestamps,
  },
  (table) => [
    uniqueIndex("wineries_slug_idx").on(table.slug),
    index("wineries_region_idx").on(table.regionId),
    index("wineries_verified_idx").on(table.verified),
    index("wineries_name_idx").on(table.name),
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

    imageUrl: text("image_url"),
    ratingAvg: real("rating_avg"),
    ratingCount: integer("rating_count").notNull().default(0),

    ...timestamps,
  },
  (table) => [
    uniqueIndex("wines_slug_idx").on(table.slug),
    index("wines_winery_idx").on(table.wineryId),
    index("wines_region_idx").on(table.regionId),
    index("wines_type_idx").on(table.type),
    index("wines_vintage_idx").on(table.vintage),
    index("wines_value_score_idx").on(table.valueScore),
    index("wines_gift_score_idx").on(table.giftScore),
    index("wines_food_match_score_idx").on(table.foodMatchScore),
    index("wines_price_idx").on(table.priceAvg),
    index("wines_beginner_idx").on(table.beginnerFriendly),
    index("wines_type_price_idx").on(table.type, table.priceAvg),
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
}));

export const scoresHistoryRelations = relations(scoresHistory, ({ one }) => ({
  wine: one(wines, {
    fields: [scoresHistory.wineId],
    references: [wines.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  ratings: many(ratings),
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
