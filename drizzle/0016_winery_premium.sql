ALTER TABLE `wineries` ADD `is_premium` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `wineries` ADD `premium_since` text;
--> statement-breakpoint
ALTER TABLE `wineries` ADD `custom_banner_url` text;
--> statement-breakpoint
ALTER TABLE `wineries` ADD `custom_story` text;
--> statement-breakpoint
ALTER TABLE `wineries` ADD `analytics_enabled` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `wineries` ADD `lead_capture_enabled` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `wineries` ADD `featured_placement` integer DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE INDEX `wineries_is_premium_idx` ON `wineries` (`is_premium`);
--> statement-breakpoint
CREATE INDEX `wineries_featured_placement_idx` ON `wineries` (`featured_placement`);
--> statement-breakpoint
CREATE TABLE `winery_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`winery_id` integer NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`event_type` text DEFAULT 'other' NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text,
	`location` text,
	`registration_url` text,
	`is_published` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`winery_id`) REFERENCES `wineries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `winery_events_winery_slug_idx` ON `winery_events` (`winery_id`,`slug`);
--> statement-breakpoint
CREATE INDEX `winery_events_winery_idx` ON `winery_events` (`winery_id`);
--> statement-breakpoint
CREATE INDEX `winery_events_starts_at_idx` ON `winery_events` (`starts_at`);
--> statement-breakpoint
CREATE INDEX `winery_events_published_idx` ON `winery_events` (`is_published`);
--> statement-breakpoint
CREATE TABLE `winery_analytics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`winery_id` integer NOT NULL,
	`event_type` text NOT NULL,
	`wine_id` integer,
	`winery_event_id` integer,
	`path` text,
	`referrer` text,
	`user_agent` text,
	`ip_address` text,
	`metadata` text DEFAULT 'null',
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`winery_id`) REFERENCES `wineries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`wine_id`) REFERENCES `wines`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`winery_event_id`) REFERENCES `winery_events`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `winery_analytics_winery_idx` ON `winery_analytics` (`winery_id`);
--> statement-breakpoint
CREATE INDEX `winery_analytics_event_type_idx` ON `winery_analytics` (`event_type`);
--> statement-breakpoint
CREATE INDEX `winery_analytics_created_idx` ON `winery_analytics` (`created_at`);
--> statement-breakpoint
CREATE INDEX `winery_analytics_winery_created_idx` ON `winery_analytics` (`winery_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `winery_analytics_wine_idx` ON `winery_analytics` (`wine_id`);
