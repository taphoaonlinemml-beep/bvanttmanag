CREATE TABLE `backupLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actionType` enum('backup','restore','import','export') NOT NULL,
	`status` enum('success','failed') NOT NULL,
	`fileName` varchar(255),
	`storageKey` varchar(512),
	`notes` text,
	`actorUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `backupLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `backupLogs` ADD CONSTRAINT `backupLogs_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `backup_logs_action_idx` ON `backupLogs` (`actionType`);--> statement-breakpoint
CREATE INDEX `backup_logs_actor_idx` ON `backupLogs` (`actorUserId`);