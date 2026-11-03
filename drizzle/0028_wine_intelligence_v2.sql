CREATE TABLE `wine_claim_evidence` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`wine_id` integer NOT NULL,
	`canonical_identity_key` text NOT NULL,
	`field` text NOT NULL,
	`value_json` text NOT NULL,
	`normalized_value` text NOT NULL,
	`unit` text,
	`source_url` text NOT NULL,
	`source_title` text,
	`source_class` text NOT NULL,
	`excerpt` text NOT NULL,
	`observed_at` text NOT NULL,
	`extraction_method` text NOT NULL,
	`identity_match_status` text NOT NULL,
	`verification_status` text NOT NULL,
	`confidence` real NOT NULL,
	`conflict_json` text,
	`source_hash` text NOT NULL,
	`claim_hash` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`wine_id`) REFERENCES `wines`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `wine_claim_evidence_wine_idx` ON `wine_claim_evidence` (`wine_id`);
--> statement-breakpoint
CREATE INDEX `wine_claim_evidence_field_idx` ON `wine_claim_evidence` (`field`);
--> statement-breakpoint
CREATE INDEX `wine_claim_evidence_source_idx` ON `wine_claim_evidence` (`source_url`);
--> statement-breakpoint
CREATE UNIQUE INDEX `wine_claim_evidence_wine_field_hash_uidx` ON `wine_claim_evidence` (`wine_id`,`field`,`source_hash`);
--> statement-breakpoint
CREATE TABLE `grape_variety_knowledge` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`history` text,
	`typical_aromas` text DEFAULT '[]' NOT NULL,
	`regions` text DEFAULT '[]' NOT NULL,
	`styles` text DEFAULT '[]' NOT NULL,
	`food_compatibility` text DEFAULT '[]' NOT NULL,
	`winemaking` text DEFAULT '[]' NOT NULL,
	`sources` text DEFAULT '[]' NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `grape_variety_knowledge_slug_uidx` ON `grape_variety_knowledge` (`slug`);
--> statement-breakpoint
CREATE TABLE `wine_ai_interpretations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`wine_id` integer NOT NULL,
	`run_id` text NOT NULL,
	`model` text NOT NULL,
	`text` text NOT NULL,
	`supported_claim_hashes` text DEFAULT '[]' NOT NULL,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL,
	`estimated_cost_usd` real DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`wine_id`) REFERENCES `wines`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `wine_ai_interpretations_wine_idx` ON `wine_ai_interpretations` (`wine_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `wine_ai_interpretations_wine_run_uidx` ON `wine_ai_interpretations` (`wine_id`,`run_id`);
--> statement-breakpoint
CREATE TABLE `wine_enrichment_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`wine_id` integer NOT NULL,
	`fingerprint` text NOT NULL,
	`status` text NOT NULL,
	`dry_run` integer DEFAULT false NOT NULL,
	`source_count` integer DEFAULT 0 NOT NULL,
	`request_count` integer DEFAULT 0 NOT NULL,
	`claim_count` integer DEFAULT 0 NOT NULL,
	`conflict_count` integer DEFAULT 0 NOT NULL,
	`ai_request_count` integer DEFAULT 0 NOT NULL,
	`ai_input_tokens` integer DEFAULT 0 NOT NULL,
	`ai_output_tokens` integer DEFAULT 0 NOT NULL,
	`estimated_cost_usd` real DEFAULT 0 NOT NULL,
	`completeness_json` text NOT NULL,
	`error_json` text DEFAULT '[]' NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	FOREIGN KEY (`wine_id`) REFERENCES `wines`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `wine_enrichment_runs_wine_idx` ON `wine_enrichment_runs` (`wine_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `wine_enrichment_runs_wine_fingerprint_uidx` ON `wine_enrichment_runs` (`wine_id`,`fingerprint`);
