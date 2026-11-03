CREATE TABLE `vintage_evidence` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`scope` text NOT NULL,
	`region` text,
	`appellation` text,
	`grape` text,
	`winery_id` integer,
	`wine_id` integer,
	`family_key` text,
	`vintage` integer,
	`evidence_type` text NOT NULL,
	`impact` text NOT NULL,
	`source_url` text NOT NULL,
	`source_title` text NOT NULL,
	`publisher` text NOT NULL,
	`published_at` text,
	`event_date` text,
	`excerpt` text NOT NULL,
	`confidence` real NOT NULL,
	`producer_claim` integer DEFAULT false NOT NULL,
	`independent` integer DEFAULT false NOT NULL,
	`regional_exception` integer DEFAULT false NOT NULL,
	`maturity` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`winery_id`) REFERENCES `wineries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`wine_id`) REFERENCES `wines`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `vintage_evidence_scope_idx` ON `vintage_evidence` (`scope`);
--> statement-breakpoint
CREATE INDEX `vintage_evidence_vintage_idx` ON `vintage_evidence` (`vintage`);
--> statement-breakpoint
CREATE INDEX `vintage_evidence_region_idx` ON `vintage_evidence` (`region`);
--> statement-breakpoint
CREATE INDEX `vintage_evidence_wine_idx` ON `vintage_evidence` (`wine_id`);
--> statement-breakpoint
CREATE INDEX `vintage_evidence_winery_idx` ON `vintage_evidence` (`winery_id`);
--> statement-breakpoint
CREATE INDEX `vintage_evidence_family_idx` ON `vintage_evidence` (`family_key`);
--> statement-breakpoint
CREATE UNIQUE INDEX `vintage_evidence_source_scope_uidx` ON `vintage_evidence` (`source_url`,`scope`,`evidence_type`,`vintage`);
