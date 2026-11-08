CREATE TABLE IF NOT EXISTS `price_refresh_runs` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `started_at` text NOT NULL,
  `finished_at` text,
  `status` text NOT NULL CHECK (`status` IN ('running','success','failed','locked')),
  `dry_run` integer NOT NULL DEFAULT false,
  `cursor_start` integer NOT NULL DEFAULT 0,
  `cursor_end` integer,
  `processed` integer NOT NULL DEFAULT 0,
  `updated` integer NOT NULL DEFAULT 0,
  `unchanged` integer NOT NULL DEFAULT 0,
  `failed` integer NOT NULL DEFAULT 0,
  `skipped` integer NOT NULL DEFAULT 0,
  `error_json` text NOT NULL DEFAULT '[]',
  `lock_token` text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `price_refresh_state` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `key` text NOT NULL,
  `cursor` integer NOT NULL DEFAULT 0,
  `lock_token` text,
  `lock_expires_at` text,
  `last_started_at` text,
  `last_finished_at` text,
  `last_success_at` text,
  `last_error` text,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `price_refresh_state_key_uidx` ON `price_refresh_state` (`key`);
