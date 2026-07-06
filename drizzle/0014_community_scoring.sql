ALTER TABLE `wines` ADD `community_score` integer;
--> statement-breakpoint
ALTER TABLE `wines` ADD `community_vote_count` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TABLE `community_ratings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`wine_id` integer NOT NULL,
	`voter_key` text NOT NULL,
	`score` integer NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`wine_id`) REFERENCES `wines`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `community_ratings_wine_voter_idx` ON `community_ratings` (`wine_id`,`voter_key`);
--> statement-breakpoint
CREATE INDEX `community_ratings_wine_idx` ON `community_ratings` (`wine_id`);
