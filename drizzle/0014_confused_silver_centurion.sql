CREATE TABLE `mobileSyncLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tokenId` int NOT NULL,
	`wardId` int,
	`statusCode` int NOT NULL,
	`unitCount` int NOT NULL DEFAULT 0,
	`personnelCount` int NOT NULL DEFAULT 0,
	`errorCode` varchar(80),
	`ipAddress` varchar(64),
	`userAgent` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mobileSyncLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `mobileSyncLogs` ADD CONSTRAINT `mobile_sync_logs_token_fk` FOREIGN KEY (`tokenId`) REFERENCES `mobileSyncTokens`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mobileSyncLogs` ADD CONSTRAINT `mobile_sync_logs_ward_fk` FOREIGN KEY (`wardId`) REFERENCES `units`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `mobile_sync_logs_token_idx` ON `mobileSyncLogs` (`tokenId`);--> statement-breakpoint
CREATE INDEX `mobile_sync_logs_ward_idx` ON `mobileSyncLogs` (`wardId`);--> statement-breakpoint
CREATE INDEX `mobile_sync_logs_created_idx` ON `mobileSyncLogs` (`createdAt`);