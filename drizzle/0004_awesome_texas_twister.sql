ALTER TABLE `wines` ADD `description_editorial` text;--> statement-breakpoint
ALTER TABLE `wines` ADD `value_explanation` text;--> statement-breakpoint
ALTER TABLE `wines` ADD `things_you_should_know` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `wines` ADD `food_pairing_notes` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `wines` ADD `taste_profile` text;--> statement-breakpoint
ALTER TABLE `wines` ADD `recommended_occasions` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `wines` ADD `source_badge` text DEFAULT 'Date factuale preluate din surse publice. Analiza si scorurile apartin VinIntel.ro' NOT NULL;
