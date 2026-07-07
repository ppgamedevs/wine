CREATE TABLE `winery_premium_checkouts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`stripe_session_id` text NOT NULL,
	`winery_id` integer,
	`winery_name` text NOT NULL,
	`winery_slug` text,
	`email` text NOT NULL,
	`phone` text,
	`plan` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`completed_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`winery_id`) REFERENCES `wineries`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `winery_premium_checkouts_session_idx` ON `winery_premium_checkouts` (`stripe_session_id`);
--> statement-breakpoint
CREATE INDEX `winery_premium_checkouts_winery_idx` ON `winery_premium_checkouts` (`winery_id`);
--> statement-breakpoint
CREATE INDEX `winery_premium_checkouts_email_idx` ON `winery_premium_checkouts` (`email`);
