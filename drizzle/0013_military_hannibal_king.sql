CREATE TABLE `mobileSyncTokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`label` varchar(120) NOT NULL,
	`tokenHash` char(64) NOT NULL,
	`wardId` int,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastUsedAt` timestamp,
	`revokedAt` timestamp,
	CONSTRAINT `mobileSyncTokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `mobile_sync_tokens_hash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
ALTER TABLE `mobileSyncTokens` ADD CONSTRAINT `mobile_sync_tokens_ward_fk` FOREIGN KEY (`wardId`) REFERENCES `units`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mobileSyncTokens` ADD CONSTRAINT `mobile_sync_tokens_creator_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `mobile_sync_tokens_ward_idx` ON `mobileSyncTokens` (`wardId`);--> statement-breakpoint
CREATE INDEX `mobile_sync_tokens_active_idx` ON `mobileSyncTokens` (`revokedAt`);