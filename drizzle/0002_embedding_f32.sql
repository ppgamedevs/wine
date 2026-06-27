ALTER TABLE `wines` DROP COLUMN `embedding`;--> statement-breakpoint
ALTER TABLE `wines` ADD COLUMN `embedding` F32_BLOB(384);
