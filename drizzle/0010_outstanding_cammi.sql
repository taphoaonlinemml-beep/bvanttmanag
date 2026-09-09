CREATE TABLE `editAccessRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requesterUserId` int NOT NULL,
	`wardId` int NOT NULL,
	`reason` text NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`reviewerUserId` int,
	`decisionNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedAt` timestamp,
	CONSTRAINT `editAccessRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `canEditPersonnel` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `editAccessRequests` ADD CONSTRAINT `editAccessRequests_requesterUserId_users_id_fk` FOREIGN KEY (`requesterUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `editAccessRequests` ADD CONSTRAINT `editAccessRequests_wardId_units_id_fk` FOREIGN KEY (`wardId`) REFERENCES `units`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `editAccessRequests` ADD CONSTRAINT `editAccessRequests_reviewerUserId_users_id_fk` FOREIGN KEY (`reviewerUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `edit_access_requests_status_idx` ON `editAccessRequests` (`status`);--> statement-breakpoint
CREATE INDEX `edit_access_requests_requester_idx` ON `editAccessRequests` (`requesterUserId`);--> statement-breakpoint
CREATE INDEX `edit_access_requests_ward_idx` ON `editAccessRequests` (`wardId`);