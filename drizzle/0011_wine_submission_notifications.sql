CREATE TABLE `wine_submission_notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`source_url` text NOT NULL,
	`wine_id` integer NOT NULL,
	`notified_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`wine_id`) REFERENCES `wines`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `wine_submission_notifications_wine_idx` ON `wine_submission_notifications` (`wine_id`);
--> statement-breakpoint
CREATE INDEX `wine_submission_notifications_email_idx` ON `wine_submission_notifications` (`email`);
