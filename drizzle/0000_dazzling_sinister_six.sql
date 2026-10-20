CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`customer` text NOT NULL,
	`type` text NOT NULL,
	`created` text NOT NULL,
	`delta` integer NOT NULL,
	FOREIGN KEY (`customer`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
