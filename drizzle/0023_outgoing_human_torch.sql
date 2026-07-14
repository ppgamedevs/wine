-- NOTE: this migration was hand-trimmed after `drizzle-kit generate`.
--
-- The auto-generated diff also included dozens of CREATE TABLE / ALTER TABLE
-- statements for tables and columns that were previously applied directly to
-- the production database with `drizzle-kit push` (bypassing migration
-- files), so they already exist live even though the old migration files in
-- this folder never recorded them. Running the full auto-generated diff
-- against production would fail immediately with "table/column already
-- exists". Only the statements below reflect genuinely new schema (the
-- `score_overrides` audit table and the 4 new `scores_history` columns added
-- in this change) and were verified against the live schema before being
-- kept here.
CREATE TABLE `score_overrides` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`wine_id` integer NOT NULL,
	`field` text NOT NULL,
	`previous_value` text,
	`new_value` text,
	`reason` text NOT NULL,
	`changed_by` text DEFAULT 'admin' NOT NULL,
	`expires_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`wine_id`) REFERENCES `wines`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `score_overrides_wine_idx` ON `score_overrides` (`wine_id`);--> statement-breakpoint
CREATE INDEX `score_overrides_created_idx` ON `score_overrides` (`created_at`);--> statement-breakpoint
ALTER TABLE `scores_history` ADD `algorithm_version` integer;--> statement-breakpoint
ALTER TABLE `scores_history` ADD `confidence_percent` integer;--> statement-breakpoint
ALTER TABLE `scores_history` ADD `change_reason` text;--> statement-breakpoint
ALTER TABLE `scores_history` ADD `changed_by` text;
