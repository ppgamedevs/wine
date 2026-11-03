CREATE TABLE "__drizzle_migrations" (
			id SERIAL PRIMARY KEY,
			hash text NOT NULL,
			created_at numeric
		);

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

CREATE TABLE `grape_varieties` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL,
	`is_indigenous` integer DEFAULT false NOT NULL,
	`description` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);

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

CREATE TABLE `ratings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`wine_id` integer NOT NULL,
	`score` integer NOT NULL,
	`review` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`wine_id`) REFERENCES `wines`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `regions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`country` text DEFAULT 'Romania' NOT NULL,
	`description` text,
	`image_url` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);

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

CREATE TABLE `scores_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`wine_id` integer NOT NULL,
	`price_avg` real,
	`value_score` integer,
	`gift_score` integer,
	`food_match_score` integer,
	`overpriced_risk` text,
	`recorded_at` text DEFAULT (current_timestamp) NOT NULL, `algorithm_version` integer, `confidence_percent` integer, `change_reason` text, `changed_by` text,
	FOREIGN KEY (`wine_id`) REFERENCES `wines`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `subscribers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`source` text DEFAULT 'wine_approval' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);

CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`image_url` text,
	`role` text DEFAULT 'user' NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);

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

CREATE TABLE `wine_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`wine_id` integer NOT NULL,
	`reason` text,
	`submitted_by` text DEFAULT 'anonymous',
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`wine_id`) REFERENCES `wines`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `wine_submission_notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`source_url` text NOT NULL,
	`wine_id` integer NOT NULL,
	`notified_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`wine_id`) REFERENCES `wines`(`id`) ON UPDATE no action ON DELETE cascade
);

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

CREATE TABLE `wineries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`region_id` integer,
	`description` text,
	`website` text,
	`logo_url` text,
	`founded_year` integer,
	`verified` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL, `status` text DEFAULT 'verified' NOT NULL, `is_premium` integer DEFAULT false NOT NULL, `premium_since` text, `custom_banner_url` text, `custom_story` text, `analytics_enabled` integer DEFAULT false NOT NULL, `lead_capture_enabled` integer DEFAULT false NOT NULL, `featured_placement` integer DEFAULT false NOT NULL, `premium_expires_at` text, `premium_plan` text, `stripe_customer_id` text, `stripe_subscription_id` text, `stripe_subscription_status` text,
	FOREIGN KEY (`region_id`) REFERENCES `regions`(`id`) ON UPDATE no action ON DELETE set null
);

CREATE TABLE `winery_analytics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`winery_id` integer NOT NULL,
	`event_type` text NOT NULL,
	`wine_id` integer,
	`winery_event_id` integer,
	`path` text,
	`referrer` text,
	`user_agent` text,
	`ip_address` text,
	`metadata` text DEFAULT 'null',
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`winery_id`) REFERENCES `wineries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`wine_id`) REFERENCES `wines`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`winery_event_id`) REFERENCES `winery_events`(`id`) ON UPDATE no action ON DELETE set null
);

CREATE TABLE `winery_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`winery_id` integer NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`event_type` text DEFAULT 'other' NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text,
	`location` text,
	`registration_url` text,
	`is_published` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`winery_id`) REFERENCES `wineries`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `winery_premium_checkouts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`stripe_session_id` text NOT NULL,
	`winery_id` integer,
	`winery_name` text NOT NULL,
	`winery_slug` text,
	`email` text NOT NULL,
	`phone` text,
	`plan` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`completed_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL, `expires_at` text, `welcome_email_sent_at` text, `reminder_email_sent_at` text, `expired_email_sent_at` text, `stripe_customer_id` text, `stripe_subscription_id` text,
	FOREIGN KEY (`winery_id`) REFERENCES `wineries`(`id`) ON UPDATE no action ON DELETE set null
);

CREATE TABLE `wines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`winery_id` integer,
	`region_id` integer,
	`type` text NOT NULL,
	`sweetness` text,
	`vintage` integer,
	`grape_varieties` text DEFAULT '[]' NOT NULL,
	`alcohol` real,
	`sugar` real,
	`acidity` real,
	`price_avg` real,
	`value_score` integer,
	`gift_score` integer,
	`food_match_score` integer,
	`beginner_friendly` integer DEFAULT false NOT NULL,
	`cellar_potential` integer,
	`overpriced_risk` text,
	`tasting_notes` text,
	`food_pairings` text DEFAULT '[]' NOT NULL,
	`availability` text DEFAULT '[]' NOT NULL,
	`affiliate_links` text DEFAULT '[]' NOT NULL,
	`image_url` text,
	`rating_avg` real,
	`rating_count` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL, `expert_notes` text, `embedding` F32_BLOB(384), `image_alt` text, `description_editorial` text, `value_explanation` text, `things_you_should_know` text DEFAULT '[]' NOT NULL, `food_pairing_notes` text DEFAULT '[]' NOT NULL, `taste_profile` text, `recommended_occasions` text DEFAULT '[]' NOT NULL, `source_badge` text DEFAULT 'Date factuale preluate din surse publice. Analiza si scorurile apartin VinIntel.ro' NOT NULL, `source_url` text, `submitted_by` text, `status` text DEFAULT 'verified' NOT NULL, `report_count` integer DEFAULT 0 NOT NULL, `current_price` integer, `lowest_price_30d` integer, `price_history` text DEFAULT '[]' NOT NULL, `image_source` text, `submit_type` text DEFAULT 'community' NOT NULL, `producer_page_url` text, `tasting_sheet_url` text, `submitted_email` text, `dessert_pairings` text DEFAULT '[]' NOT NULL, `community_score` integer, `community_vote_count` integer DEFAULT 0 NOT NULL, `medals` text DEFAULT '[]' NOT NULL, `producer_content` text DEFAULT 'null', `value_score_version` integer DEFAULT 2, `estimated_quality` real, `quality_effective` real, `quality_final` real, `quality_surplus` real, `raw_sigmoid_score` real, `critic_score` real, `drinkability_start` integer, `drinkability_end` integer,
	FOREIGN KEY (`winery_id`) REFERENCES `wineries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`region_id`) REFERENCES `regions`(`id`) ON UPDATE no action ON DELETE set null
);

CREATE UNIQUE INDEX `content_translations_current_uidx`
ON `content_translations` (
	`entity_type`,
	`entity_id`,
	`field`,
	`source_locale`,
	`target_locale`
)
WHERE `is_current` = 1;

CREATE INDEX `content_translations_lookup_idx`
ON `content_translations` (
	`entity_type`,
	`entity_id`,
	`field`,
	`source_locale`,
	`target_locale`,
	`is_current`
);

CREATE INDEX `content_translations_source_hash_idx`
ON `content_translations` (`source_hash`);

CREATE UNIQUE INDEX `content_translations_source_version_uidx`
ON `content_translations` (
	`entity_type`,
	`entity_id`,
	`field`,
	`source_locale`,
	`target_locale`,
	`source_hash`
);

CREATE INDEX `content_translations_status_idx`
ON `content_translations` (`status`);

CREATE INDEX `grape_varieties_color_idx` ON `grape_varieties` (`color`);

CREATE UNIQUE INDEX `grape_varieties_slug_idx` ON `grape_varieties` (`slug`);

CREATE INDEX `pairing_curation_events_created_idx` ON `pairing_curation_events` (`created_at`);

CREATE INDEX `pairing_curation_events_slug_idx` ON `pairing_curation_events` (`wine_slug`);

CREATE INDEX `pairing_curation_events_wine_idx` ON `pairing_curation_events` (`wine_id`);

CREATE INDEX `ratings_user_idx` ON `ratings` (`user_id`);

CREATE UNIQUE INDEX `ratings_user_wine_idx` ON `ratings` (`user_id`,`wine_id`);

CREATE INDEX `ratings_wine_idx` ON `ratings` (`wine_id`);

CREATE INDEX `regions_name_idx` ON `regions` (`name`);

CREATE UNIQUE INDEX `regions_slug_idx` ON `regions` (`slug`);

CREATE INDEX `score_overrides_created_idx` ON `score_overrides` (`created_at`);

CREATE INDEX `score_overrides_wine_idx` ON `score_overrides` (`wine_id`);

CREATE INDEX `scores_history_recorded_idx` ON `scores_history` (`recorded_at`);

CREATE INDEX `scores_history_wine_idx` ON `scores_history` (`wine_id`);

CREATE INDEX `scores_history_wine_recorded_idx` ON `scores_history` (`wine_id`,`recorded_at`);

CREATE UNIQUE INDEX `subscribers_email_idx` ON `subscribers` (`email`);

CREATE UNIQUE INDEX `users_email_idx` ON `users` (`email`);

CREATE INDEX `wine_fact_evidence_field_idx` ON `wine_fact_evidence` (`field`);

CREATE INDEX `wine_fact_evidence_hash_idx` ON `wine_fact_evidence` (`source_hash`);

CREATE UNIQUE INDEX `wine_fact_evidence_wine_field_hash_uidx`
ON `wine_fact_evidence` (`wine_id`, `field`, `source_hash`);

CREATE INDEX `wine_fact_evidence_wine_idx` ON `wine_fact_evidence` (`wine_id`);

CREATE INDEX `wine_reports_created_idx` ON `wine_reports` (`created_at`);

CREATE INDEX `wine_reports_wine_idx` ON `wine_reports` (`wine_id`);

CREATE INDEX `wine_submission_notifications_email_idx` ON `wine_submission_notifications` (`email`);

CREATE INDEX `wine_submission_notifications_wine_idx` ON `wine_submission_notifications` (`wine_id`);

CREATE INDEX `wine_vote_logs_ip_created_idx` ON `wine_vote_logs` (`ip_address`,`created_at`);

CREATE INDEX `wine_vote_logs_user_created_idx` ON `wine_vote_logs` (`user_id`,`created_at`);

CREATE INDEX `wine_vote_logs_wine_idx` ON `wine_vote_logs` (`wine_id`);

CREATE INDEX `wine_votes_user_idx` ON `wine_votes` (`user_id`);

CREATE UNIQUE INDEX `wine_votes_user_wine_idx` ON `wine_votes` (`user_id`,`wine_id`);

CREATE INDEX `wine_votes_wine_idx` ON `wine_votes` (`wine_id`);

CREATE INDEX `wineries_featured_placement_idx` ON `wineries` (`featured_placement`);

CREATE INDEX `wineries_is_premium_idx` ON `wineries` (`is_premium`);

CREATE INDEX `wineries_name_idx` ON `wineries` (`name`);

CREATE INDEX `wineries_region_idx` ON `wineries` (`region_id`);

CREATE UNIQUE INDEX `wineries_slug_idx` ON `wineries` (`slug`);

CREATE INDEX `wineries_status_idx` ON `wineries` (`status`);

CREATE INDEX `wineries_stripe_customer_idx` ON `wineries` (`stripe_customer_id`);

CREATE INDEX `wineries_stripe_subscription_idx` ON `wineries` (`stripe_subscription_id`);

CREATE INDEX `wineries_verified_idx` ON `wineries` (`verified`);

CREATE INDEX `winery_analytics_created_idx` ON `winery_analytics` (`created_at`);

CREATE INDEX `winery_analytics_event_type_idx` ON `winery_analytics` (`event_type`);

CREATE INDEX `winery_analytics_wine_idx` ON `winery_analytics` (`wine_id`);

CREATE INDEX `winery_analytics_winery_created_idx` ON `winery_analytics` (`winery_id`,`created_at`);

CREATE INDEX `winery_analytics_winery_idx` ON `winery_analytics` (`winery_id`);

CREATE INDEX `winery_events_published_idx` ON `winery_events` (`is_published`);

CREATE INDEX `winery_events_starts_at_idx` ON `winery_events` (`starts_at`);

CREATE INDEX `winery_events_winery_idx` ON `winery_events` (`winery_id`);

CREATE UNIQUE INDEX `winery_events_winery_slug_idx` ON `winery_events` (`winery_id`,`slug`);

CREATE INDEX `winery_premium_checkouts_email_idx` ON `winery_premium_checkouts` (`email`);

CREATE INDEX `winery_premium_checkouts_expires_idx` ON `winery_premium_checkouts` (`expires_at`);

CREATE UNIQUE INDEX `winery_premium_checkouts_session_idx` ON `winery_premium_checkouts` (`stripe_session_id`);

CREATE INDEX `winery_premium_checkouts_subscription_idx` ON `winery_premium_checkouts` (`stripe_subscription_id`);

CREATE INDEX `winery_premium_checkouts_winery_idx` ON `winery_premium_checkouts` (`winery_id`);

CREATE INDEX `wines_beginner_idx` ON `wines` (`beginner_friendly`);

CREATE INDEX `wines_current_price_idx` ON `wines` (`current_price`);

CREATE INDEX wines_embedding_idx ON wines (libsql_vector_idx(embedding, 'metric=cosine'));

CREATE INDEX `wines_food_match_score_idx` ON `wines` (`food_match_score`);

CREATE INDEX `wines_gift_score_idx` ON `wines` (`gift_score`);

CREATE INDEX `wines_price_idx` ON `wines` (`price_avg`);

CREATE INDEX `wines_region_idx` ON `wines` (`region_id`);

CREATE UNIQUE INDEX `wines_slug_idx` ON `wines` (`slug`);

CREATE UNIQUE INDEX `wines_source_url_idx` ON `wines` (`source_url`);

CREATE INDEX `wines_status_idx` ON `wines` (`status`);

CREATE INDEX `wines_submit_type_idx` ON `wines` (`submit_type`);

CREATE INDEX `wines_type_idx` ON `wines` (`type`);

CREATE INDEX `wines_type_price_idx` ON `wines` (`type`,`price_avg`);

CREATE INDEX `wines_value_score_idx` ON `wines` (`value_score`);

CREATE INDEX `wines_vintage_idx` ON `wines` (`vintage`);

CREATE INDEX `wines_winery_idx` ON `wines` (`winery_id`);
