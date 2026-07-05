ALTER TABLE `wines` ADD `current_price` integer;--> statement-breakpoint
ALTER TABLE `wines` ADD `lowest_price_30d` integer;--> statement-breakpoint
ALTER TABLE `wines` ADD `price_history` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
CREATE INDEX `wines_current_price_idx` ON `wines` (`current_price`);
