ALTER TABLE `wineries` ADD `stripe_customer_id` text;
--> statement-breakpoint
ALTER TABLE `wineries` ADD `stripe_subscription_id` text;
--> statement-breakpoint
ALTER TABLE `wineries` ADD `stripe_subscription_status` text;
--> statement-breakpoint
CREATE INDEX `wineries_stripe_subscription_idx` ON `wineries` (`stripe_subscription_id`);
--> statement-breakpoint
CREATE INDEX `wineries_stripe_customer_idx` ON `wineries` (`stripe_customer_id`);
--> statement-breakpoint
ALTER TABLE `winery_premium_checkouts` ADD `stripe_customer_id` text;
--> statement-breakpoint
ALTER TABLE `winery_premium_checkouts` ADD `stripe_subscription_id` text;
--> statement-breakpoint
CREATE INDEX `winery_premium_checkouts_subscription_idx` ON `winery_premium_checkouts` (`stripe_subscription_id`);
