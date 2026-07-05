ALTER TABLE `wineries` ADD `status` text DEFAULT 'verified' NOT NULL;--> statement-breakpoint
CREATE INDEX `wineries_status_idx` ON `wineries` (`status`);
