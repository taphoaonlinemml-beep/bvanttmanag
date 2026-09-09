ALTER TABLE `users` MODIFY COLUMN `role` enum('user','leader','admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `assignedWardId` int;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_assigned_ward_fk` FOREIGN KEY (`assignedWardId`) REFERENCES `units`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `users_assigned_ward_idx` ON `users` (`assignedWardId`);