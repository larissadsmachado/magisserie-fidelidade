CREATE TABLE `access_attempts` (
	`identifier` text PRIMARY KEY NOT NULL,
	`attempts` integer NOT NULL,
	`reset_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `customers` ADD `pin_hash` text;