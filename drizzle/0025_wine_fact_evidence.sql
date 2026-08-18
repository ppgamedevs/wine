CREATE TABLE `wine_fact_evidence` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`wine_id` integer NOT NULL,
	`field` text NOT NULL,
	`value_json` text NOT NULL,
	`unit` text,
	`source_url` text,
	`source_type` text NOT NULL,
	`source_wine_name` text,
	`source_vintage` integer,
	`source_document_title` text,
	`excerpt` text NOT NULL,
	`extraction_method` text NOT NULL,
	`identity_match_class` text NOT NULL,
	`confidence` real NOT NULL,
	`observed_at` text NOT NULL,
	`source_hash` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`wine_id`) REFERENCES `wines`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX `wine_fact_evidence_wine_idx` ON `wine_fact_evidence` (`wine_id`);
CREATE INDEX `wine_fact_evidence_field_idx` ON `wine_fact_evidence` (`field`);
CREATE INDEX `wine_fact_evidence_hash_idx` ON `wine_fact_evidence` (`source_hash`);
