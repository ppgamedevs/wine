CREATE TABLE `wine_votes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`wine_id` integer NOT NULL,
	`score` integer NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`wine_id`) REFERENCES `wines`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wine_votes_user_wine_idx` ON `wine_votes` (`user_id`,`wine_id`);
--> statement-breakpoint
CREATE INDEX `wine_votes_wine_idx` ON `wine_votes` (`wine_id`);
--> statement-breakpoint
CREATE INDEX `wine_votes_user_idx` ON `wine_votes` (`user_id`);
--> statement-breakpoint
CREATE TABLE `wine_vote_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`wine_id` integer NOT NULL,
	`ip_address` text NOT NULL,
	`action` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`wine_id`) REFERENCES `wines`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `wine_vote_logs_user_created_idx` ON `wine_vote_logs` (`user_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `wine_vote_logs_ip_created_idx` ON `wine_vote_logs` (`ip_address`,`created_at`);
--> statement-breakpoint
CREATE INDEX `wine_vote_logs_wine_idx` ON `wine_vote_logs` (`wine_id`);
--> statement-breakpoint
INSERT INTO `users` (`email`, `name`, `role`, `email_verified`, `created_at`, `updated_at`)
SELECT
	'guest+' || `voter_key` || '@votes.vinintel.local',
	'Guest',
	'user',
	0,
	COALESCE(`created_at`, current_timestamp),
	COALESCE(`updated_at`, current_timestamp)
FROM `community_ratings`
GROUP BY `voter_key`;
--> statement-breakpoint
INSERT INTO `wine_votes` (`user_id`, `wine_id`, `score`, `created_at`, `updated_at`)
SELECT
	u.`id`,
	cr.`wine_id`,
	cr.`score`,
	cr.`created_at`,
	cr.`updated_at`
FROM `community_ratings` cr
INNER JOIN `users` u ON u.`email` = 'guest+' || cr.`voter_key` || '@votes.vinintel.local';
--> statement-breakpoint
DROP TABLE `community_ratings`;
