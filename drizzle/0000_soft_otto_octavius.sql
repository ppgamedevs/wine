CREATE TABLE `grape_varieties` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL,
	`is_indigenous` integer DEFAULT false NOT NULL,
	`description` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `grape_varieties_slug_idx` ON `grape_varieties` (`slug`);--> statement-breakpoint
CREATE INDEX `grape_varieties_color_idx` ON `grape_varieties` (`color`);--> statement-breakpoint
CREATE TABLE `ratings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`wine_id` integer NOT NULL,
	`score` integer NOT NULL,
	`review` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`wine_id`) REFERENCES `wines`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ratings_user_wine_idx` ON `ratings` (`user_id`,`wine_id`);--> statement-breakpoint
CREATE INDEX `ratings_wine_idx` ON `ratings` (`wine_id`);--> statement-breakpoint
CREATE INDEX `ratings_user_idx` ON `ratings` (`user_id`);--> statement-breakpoint
CREATE TABLE `regions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`country` text DEFAULT 'Romania' NOT NULL,
	`description` text,
	`image_url` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `regions_slug_idx` ON `regions` (`slug`);--> statement-breakpoint
CREATE INDEX `regions_name_idx` ON `regions` (`name`);--> statement-breakpoint
CREATE TABLE `scores_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`wine_id` integer NOT NULL,
	`price_avg` real,
	`value_score` integer,
	`gift_score` integer,
	`food_match_score` integer,
	`overpriced_risk` text,
	`recorded_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`wine_id`) REFERENCES `wines`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `scores_history_wine_idx` ON `scores_history` (`wine_id`);--> statement-breakpoint
CREATE INDEX `scores_history_recorded_idx` ON `scores_history` (`recorded_at`);--> statement-breakpoint
CREATE INDEX `scores_history_wine_recorded_idx` ON `scores_history` (`wine_id`,`recorded_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`image_url` text,
	`role` text DEFAULT 'user' NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `wineries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`region_id` integer,
	`description` text,
	`website` text,
	`logo_url` text,
	`founded_year` integer,
	`verified` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`region_id`) REFERENCES `regions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wineries_slug_idx` ON `wineries` (`slug`);--> statement-breakpoint
CREATE INDEX `wineries_region_idx` ON `wineries` (`region_id`);--> statement-breakpoint
CREATE INDEX `wineries_verified_idx` ON `wineries` (`verified`);--> statement-breakpoint
CREATE INDEX `wineries_name_idx` ON `wineries` (`name`);--> statement-breakpoint
CREATE TABLE `wines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`winery_id` integer,
	`region_id` integer,
	`type` text NOT NULL,
	`sweetness` text,
	`vintage` integer,
	`grape_varieties` text DEFAULT '[]' NOT NULL,
	`alcohol` real,
	`sugar` real,
	`acidity` real,
	`price_avg` real,
	`value_score` integer,
	`gift_score` integer,
	`food_match_score` integer,
	`beginner_friendly` integer DEFAULT false NOT NULL,
	`cellar_potential` integer,
	`overpriced_risk` text,
	`tasting_notes` text,
	`food_pairings` text DEFAULT '[]' NOT NULL,
	`availability` text DEFAULT '[]' NOT NULL,
	`affiliate_links` text DEFAULT '[]' NOT NULL,
	`image_url` text,
	`rating_avg` real,
	`rating_count` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`winery_id`) REFERENCES `wineries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`region_id`) REFERENCES `regions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wines_slug_idx` ON `wines` (`slug`);--> statement-breakpoint
CREATE INDEX `wines_winery_idx` ON `wines` (`winery_id`);--> statement-breakpoint
CREATE INDEX `wines_region_idx` ON `wines` (`region_id`);--> statement-breakpoint
CREATE INDEX `wines_type_idx` ON `wines` (`type`);--> statement-breakpoint
CREATE INDEX `wines_vintage_idx` ON `wines` (`vintage`);--> statement-breakpoint
CREATE INDEX `wines_value_score_idx` ON `wines` (`value_score`);--> statement-breakpoint
CREATE INDEX `wines_gift_score_idx` ON `wines` (`gift_score`);--> statement-breakpoint
CREATE INDEX `wines_food_match_score_idx` ON `wines` (`food_match_score`);--> statement-breakpoint
CREATE INDEX `wines_price_idx` ON `wines` (`price_avg`);--> statement-breakpoint
CREATE INDEX `wines_beginner_idx` ON `wines` (`beginner_friendly`);--> statement-breakpoint
CREATE INDEX `wines_type_price_idx` ON `wines` (`type`,`price_avg`);