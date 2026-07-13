CREATE TABLE `capitalRates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`company` enum('orix','shinhan','hana') NOT NULL,
	`annualRate` double NOT NULL,
	`residualAdjustment` double NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedByEmail` varchar(320),
	CONSTRAINT `capitalRates_id` PRIMARY KEY(`id`),
	CONSTRAINT `capitalRates_company_unique` UNIQUE(`company`)
);
--> statement-breakpoint
CREATE TABLE `quoteRecords` (
	`id` varchar(64) NOT NULL,
	`status` enum('consulting','completed') NOT NULL DEFAULT 'consulting',
	`creatorEmail` varchar(320),
	`imageUri` text,
	`vehicle` json NOT NULL,
	`conditions` json NOT NULL,
	`result` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quoteRecords_id` PRIMARY KEY(`id`)
);
