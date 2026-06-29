ALTER TABLE `wines` ADD `source_url` text;--> statement-breakpoint
ALTER TABLE `wines` ADD `submitted_by` text;--> statement-breakpoint
ALTER TABLE `wines` ADD `status` text DEFAULT 'verified' NOT NULL;--> statement-breakpoint
ALTER TABLE `wines` ADD `report_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `wines_source_url_idx` ON `wines` (`source_url`);--> statement-breakpoint
CREATE INDEX `wines_status_idx` ON `wines` (`status`);--> statement-breakpoint
CREATE TABLE `wine_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`wine_id` integer NOT NULL,
	`reason` text,
	`submitted_by` text DEFAULT 'anonymous',
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`wine_id`) REFERENCES `wines`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `wine_reports_wine_idx` ON `wine_reports` (`wine_id`);--> statement-breakpoint
CREATE INDEX `wine_reports_created_idx` ON `wine_reports` (`created_at`);
