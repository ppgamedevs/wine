CREATE TABLE `sommelier_question_intents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`raw_query` text NOT NULL,
	`normalized_query` text NOT NULL,
	`entities_json` text NOT NULL,
	`topic_cluster` text NOT NULL,
	`canonical_question` text NOT NULL,
	`intent_type` text NOT NULL,
	`language` text NOT NULL,
	`answer_quality` text DEFAULT 'unknown' NOT NULL,
	`similar_page_exists` integer DEFAULT false NOT NULL,
	`blocked` integer DEFAULT false NOT NULL,
	`block_reason` text,
	`source` text DEFAULT 'sommelier_chat' NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sommelier_question_intents_cluster_idx` ON `sommelier_question_intents` (`topic_cluster`);
--> statement-breakpoint
CREATE INDEX `sommelier_question_intents_normalized_idx` ON `sommelier_question_intents` (`normalized_query`);
--> statement-breakpoint
CREATE INDEX `sommelier_question_intents_created_idx` ON `sommelier_question_intents` (`created_at`);
--> statement-breakpoint
CREATE INDEX `sommelier_question_intents_quality_idx` ON `sommelier_question_intents` (`answer_quality`);
--> statement-breakpoint
CREATE TABLE `pseo_draft_pages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`locale` text NOT NULL,
	`page_type` text NOT NULL,
	`title` text NOT NULL,
	`meta_title` text NOT NULL,
	`meta_description` text NOT NULL,
	`intro` text NOT NULL,
	`content_markdown` text NOT NULL,
	`sections_json` text DEFAULT '[]' NOT NULL,
	`faq_json` text DEFAULT '[]' NOT NULL,
	`sources_json` text DEFAULT '[]' NOT NULL,
	`generated_from_intent_cluster` text NOT NULL,
	`cluster_key` text NOT NULL,
	`confidence` real DEFAULT 0 NOT NULL,
	`publish_recommendation` text DEFAULT 'review' NOT NULL,
	`noindex_until_approved` integer DEFAULT true NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`supporting_wine_count` integer DEFAULT 0 NOT NULL,
	`demand_count` integer DEFAULT 0 NOT NULL,
	`quality_gate_json` text DEFAULT '{}' NOT NULL,
	`source_intent_ids_json` text DEFAULT '[]' NOT NULL,
	`review_notes` text,
	`approved_at` text,
	`approved_by` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pseo_draft_pages_slug_locale_uidx` ON `pseo_draft_pages` (`slug`,`locale`);
--> statement-breakpoint
CREATE INDEX `pseo_draft_pages_cluster_idx` ON `pseo_draft_pages` (`cluster_key`);
--> statement-breakpoint
CREATE INDEX `pseo_draft_pages_status_idx` ON `pseo_draft_pages` (`status`);
--> statement-breakpoint
CREATE INDEX `pseo_draft_pages_recommendation_idx` ON `pseo_draft_pages` (`publish_recommendation`);
