ALTER TABLE `wines` ADD `value_score_version` integer DEFAULT 2;
--> statement-breakpoint
ALTER TABLE `wines` ADD `estimated_quality` real;
--> statement-breakpoint
ALTER TABLE `wines` ADD `quality_effective` real;
--> statement-breakpoint
ALTER TABLE `wines` ADD `quality_final` real;
--> statement-breakpoint
ALTER TABLE `wines` ADD `quality_surplus` real;
--> statement-breakpoint
ALTER TABLE `wines` ADD `raw_sigmoid_score` real;
--> statement-breakpoint
ALTER TABLE `wines` ADD `critic_score` real;
--> statement-breakpoint
ALTER TABLE `wines` ADD `drinkability_start` integer;
--> statement-breakpoint
ALTER TABLE `wines` ADD `drinkability_end` integer;
