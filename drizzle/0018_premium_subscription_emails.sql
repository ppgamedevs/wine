ALTER TABLE `wineries` ADD `premium_expires_at` text;
--> statement-breakpoint
ALTER TABLE `wineries` ADD `premium_plan` text;
--> statement-breakpoint
ALTER TABLE `winery_premium_checkouts` ADD `expires_at` text;
--> statement-breakpoint
ALTER TABLE `winery_premium_checkouts` ADD `welcome_email_sent_at` text;
--> statement-breakpoint
ALTER TABLE `winery_premium_checkouts` ADD `reminder_email_sent_at` text;
--> statement-breakpoint
ALTER TABLE `winery_premium_checkouts` ADD `expired_email_sent_at` text;
--> statement-breakpoint
CREATE INDEX `winery_premium_checkouts_expires_idx` ON `winery_premium_checkouts` (`expires_at`);
