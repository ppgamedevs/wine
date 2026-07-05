ALTER TABLE `wines` ADD `submit_type` text DEFAULT 'community' NOT NULL;--> statement-breakpoint
CREATE INDEX `wines_submit_type_idx` ON `wines` (`submit_type`);
