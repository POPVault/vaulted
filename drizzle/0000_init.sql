CREATE TABLE `acknowledgments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`investor_id` integer NOT NULL,
	`offering_id` integer NOT NULL,
	`documents_hash` text NOT NULL,
	`documents_json` text NOT NULL,
	`created_at` text NOT NULL,
	`ip` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`investor_id`) REFERENCES `investors`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`offering_id`) REFERENCES `offerings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `acks_investor_offering_idx` ON `acknowledgments` (`investor_id`,`offering_id`);--> statement-breakpoint
CREATE TABLE `comps` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`offering_id` integer NOT NULL,
	`description` text NOT NULL,
	`price` text DEFAULT '' NOT NULL,
	`source` text DEFAULT '' NOT NULL,
	`date` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`offering_id`) REFERENCES `offerings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `comps_offering_idx` ON `comps` (`offering_id`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`offering_id` integer NOT NULL,
	`title` text NOT NULL,
	`file_path` text NOT NULL,
	`version` text NOT NULL,
	`date` text NOT NULL,
	`content_hash` text,
	`size_bytes` integer,
	FOREIGN KEY (`offering_id`) REFERENCES `offerings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `documents_offering_file_unique` ON `documents` (`offering_id`,`file_path`);--> statement-breakpoint
CREATE TABLE `interests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`investor_id` integer NOT NULL,
	`offering_id` integer NOT NULL,
	`units` integer NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`ip` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`investor_id`) REFERENCES `investors`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`offering_id`) REFERENCES `offerings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `interests_investor_offering_unique` ON `interests` (`investor_id`,`offering_id`);--> statement-breakpoint
CREATE TABLE `investor_offerings` (
	`investor_id` integer NOT NULL,
	`offering_id` integer NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`investor_id`, `offering_id`),
	FOREIGN KEY (`investor_id`) REFERENCES `investors`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`offering_id`) REFERENCES `offerings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `investors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`relationship_note` text NOT NULL,
	`invite_token` text NOT NULL,
	`code` text NOT NULL,
	`revoked_at` text,
	`last_viewed_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `investors_invite_token_unique` ON `investors` (`invite_token`);--> statement-breakpoint
CREATE UNIQUE INDEX `investors_code_unique` ON `investors` (`code`);--> statement-breakpoint
CREATE TABLE `items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`offering_id` integer NOT NULL,
	`number` integer NOT NULL,
	`title` text NOT NULL,
	`photographer` text DEFAULT '' NOT NULL,
	`year` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`estimate` text DEFAULT '' NOT NULL,
	`image` text NOT NULL,
	`caption` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`offering_id`) REFERENCES `offerings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `items_offering_idx` ON `items` (`offering_id`);--> statement-breakpoint
CREATE TABLE `offerings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`overview` text DEFAULT '[]' NOT NULL,
	`phase` text DEFAULT 'preview' NOT NULL,
	`price_per_unit_cents` integer NOT NULL,
	`total_units` integer,
	`investor_units_offered` integer,
	`partner_units` integer,
	`vaulted_units` integer,
	`close_date` text,
	`key_terms` text DEFAULT '[]' NOT NULL,
	`how_it_works` text DEFAULT '[]' NOT NULL,
	`how_you_get_paid` text,
	`provenance` text DEFAULT '' NOT NULL,
	`custody` text DEFAULT '' NOT NULL,
	`risks` text DEFAULT '[]' NOT NULL,
	`faq` text DEFAULT '[]' NOT NULL,
	`contact_email` text DEFAULT '' NOT NULL,
	`wire_instructions` text,
	`esign_url` text,
	`legal_line` text DEFAULT '' NOT NULL,
	`legend` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `offerings_code_unique` ON `offerings` (`code`);--> statement-breakpoint
CREATE TABLE `questionnaires` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`investor_id` integer NOT NULL,
	`offering_id` integer NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`address1` text NOT NULL,
	`address2` text DEFAULT '' NOT NULL,
	`city` text NOT NULL,
	`state` text NOT NULL,
	`postal_code` text NOT NULL,
	`investor_status` text NOT NULL,
	`status_basis` text NOT NULL,
	`relationship_confirmed` integer NOT NULL,
	`bad_actor_confirmed` integer NOT NULL,
	`signature_name` text NOT NULL,
	`signature_date` text NOT NULL,
	`created_at` text NOT NULL,
	`ip` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`investor_id`) REFERENCES `investors`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`offering_id`) REFERENCES `offerings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `questionnaires_investor_offering_unique` ON `questionnaires` (`investor_id`,`offering_id`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`window_start` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `status_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`subscription_id` integer NOT NULL,
	`action` text NOT NULL,
	`at` text NOT NULL,
	`ip` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `status_log_subscription_idx` ON `status_log` (`subscription_id`);--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`investor_id` integer NOT NULL,
	`offering_id` integer NOT NULL,
	`units` integer NOT NULL,
	`amount_cents` integer NOT NULL,
	`acknowledgment_id` integer NOT NULL,
	`wire_reference` text NOT NULL,
	`status` text DEFAULT 'requested' NOT NULL,
	`cancelled_at` text,
	`accepted_at` text,
	`signed_at` text,
	`funded_at` text,
	`created_at` text NOT NULL,
	`ip` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`investor_id`) REFERENCES `investors`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`offering_id`) REFERENCES `offerings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`acknowledgment_id`) REFERENCES `acknowledgments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_investor_offering_unique` ON `subscriptions` (`investor_id`,`offering_id`);--> statement-breakpoint
CREATE INDEX `subscriptions_offering_idx` ON `subscriptions` (`offering_id`);--> statement-breakpoint
CREATE TABLE `updates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`offering_id` integer NOT NULL,
	`date` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	FOREIGN KEY (`offering_id`) REFERENCES `offerings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `updates_offering_idx` ON `updates` (`offering_id`);