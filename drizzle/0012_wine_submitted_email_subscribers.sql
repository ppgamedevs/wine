ALTER TABLE `wines` ADD `submitted_email` text;
--> statement-breakpoint
CREATE TABLE `subscribers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`source` text DEFAULT 'wine_approval' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscribers_email_idx` ON `subscribers` (`email`);
