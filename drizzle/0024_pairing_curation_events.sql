CREATE TABLE `pairing_curation_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`wine_id` integer NOT NULL,
	`wine_slug` text NOT NULL,
	`proposed_dish_id` text,
	`proposed_dish` text,
	`proposed_rationale` text,
	`proposed_strength` text,
	`proposed_basis` text,
	`action` text NOT NULL,
	`final_dish_id` text,
	`final_dish` text,
	`final_rationale` text,
	`final_strength` text,
	`final_basis` text,
	`reviewer` text DEFAULT 'admin' NOT NULL,
	`generator_version` integer,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`wine_id`) REFERENCES `wines`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX `pairing_curation_events_wine_idx` ON `pairing_curation_events` (`wine_id`);
CREATE INDEX `pairing_curation_events_slug_idx` ON `pairing_curation_events` (`wine_slug`);
CREATE INDEX `pairing_curation_events_created_idx` ON `pairing_curation_events` (`created_at`);
