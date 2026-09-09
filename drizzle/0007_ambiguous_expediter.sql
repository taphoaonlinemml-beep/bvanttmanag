CREATE TABLE `deletionRequestFiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deletionRequestId` int NOT NULL,
	`originalName` varchar(255) NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`storageUrl` varchar(1024) NOT NULL,
	`mimeType` varchar(150) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `deletionRequestFiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `deletionRequestFiles` ADD CONSTRAINT `deletionRequestFiles_deletionRequestId_deletionRequests_id_fk` FOREIGN KEY (`deletionRequestId`) REFERENCES `deletionRequests`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `deletion_request_files_request_idx` ON `deletionRequestFiles` (`deletionRequestId`);