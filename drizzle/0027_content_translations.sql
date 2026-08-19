CREATE TABLE `content_translations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`field` text NOT NULL,
	`source_locale` text DEFAULT 'ro' NOT NULL,
	`target_locale` text NOT NULL,
	`source_value_json` text NOT NULL,
	`value_json` text DEFAULT 'null',
	`source_hash` text NOT NULL,
	`status` text DEFAULT 'REVIEW_REQUIRED' NOT NULL,
	`method` text NOT NULL,
	`model` text,
	`prompt_version` text,
	`qa_metadata` text DEFAULT '{}' NOT NULL,
	`failure_reason` text,
	`reviewed_by` text,
	`reviewed_at` text,
	`is_current` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	CONSTRAINT `content_translations_entity_type_check`
		CHECK (`entity_type` IN ('wine', 'winery', 'winery_event', 'region', 'grape_variety', 'journal_article', 'winery_catalog')),
	CONSTRAINT `content_translations_status_check`
		CHECK (`status` IN ('READY', 'STALE', 'REVIEW_REQUIRED', 'FAILED')),
	CONSTRAINT `content_translations_method_check`
		CHECK (`method` IN ('AI', 'HUMAN', 'IMPORT')),
	CONSTRAINT `content_translations_is_current_check`
		CHECK (`is_current` IN (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_translations_source_version_uidx`
ON `content_translations` (
	`entity_type`,
	`entity_id`,
	`field`,
	`source_locale`,
	`target_locale`,
	`source_hash`
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_translations_current_uidx`
ON `content_translations` (
	`entity_type`,
	`entity_id`,
	`field`,
	`source_locale`,
	`target_locale`
)
WHERE `is_current` = 1;
--> statement-breakpoint
CREATE INDEX `content_translations_lookup_idx`
ON `content_translations` (
	`entity_type`,
	`entity_id`,
	`field`,
	`source_locale`,
	`target_locale`,
	`is_current`
);
--> statement-breakpoint
CREATE INDEX `content_translations_source_hash_idx`
ON `content_translations` (`source_hash`);
--> statement-breakpoint
CREATE INDEX `content_translations_status_idx`
ON `content_translations` (`status`);
