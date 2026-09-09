CREATE TABLE `deletionRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`personnelId` int,
	`personnelName` varchar(255) NOT NULL,
	`reason` text NOT NULL,
	`status` enum('pending','rejected','executed') NOT NULL DEFAULT 'pending',
	`requesterUserId` int,
	`reviewerUserId` int,
	`decisionNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedAt` timestamp,
	`executedAt` timestamp,
	CONSTRAINT `deletionRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `deletionRequests` ADD CONSTRAINT `deletionRequests_requesterUserId_users_id_fk` FOREIGN KEY (`requesterUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `deletionRequests` ADD CONSTRAINT `deletionRequests_reviewerUserId_users_id_fk` FOREIGN KEY (`reviewerUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `deletionRequests` ADD CONSTRAINT `deletion_requests_personnel_fk` FOREIGN KEY (`personnelId`) REFERENCES `personnel`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `deletion_requests_status_idx` ON `deletionRequests` (`status`);--> statement-breakpoint
CREATE INDEX `deletion_requests_personnel_idx` ON `deletionRequests` (`personnelId`);--> statement-breakpoint
CREATE INDEX `deletion_requests_requester_idx` ON `deletionRequests` (`requesterUserId`);