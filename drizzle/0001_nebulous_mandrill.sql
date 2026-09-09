CREATE TABLE `personnel` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fullName` varchar(255) NOT NULL,
	`dateOfBirth` timestamp,
	`gender` enum('male','female','other'),
	`citizenId` varchar(20),
	`phone` varchar(24),
	`address` text,
	`village` varchar(255),
	`ethnicity` varchar(100),
	`religion` varchar(100),
	`educationLevel` varchar(255),
	`position` varchar(255),
	`unitId` int,
	`joinedFormerForceAt` timestamp,
	`joinedAt` timestamp,
	`leftFormerForceAt` timestamp,
	`leftAt` timestamp,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`policyResult` text,
	`certificateNumber` varchar(100),
	`commendation` text,
	`classification` varchar(100),
	`classificationDecision` varchar(100),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `personnel_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `personnelFiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`personnelId` int NOT NULL,
	`fileType` enum('portrait','recruitment_decision','resignation_decision','other') NOT NULL,
	`originalName` varchar(255) NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`storageUrl` varchar(1024) NOT NULL,
	`mimeType` varchar(150) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `personnelFiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `units` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	`name` varchar(255) NOT NULL,
	`unitType` enum('province','district','ward','team','other') NOT NULL DEFAULT 'ward',
	`parentId` int,
	`address` text,
	`isActive` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `units_id` PRIMARY KEY(`id`),
	CONSTRAINT `units_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
ALTER TABLE `personnel` ADD CONSTRAINT `personnel_unitId_units_id_fk` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `personnelFiles` ADD CONSTRAINT `personnelFiles_personnelId_personnel_id_fk` FOREIGN KEY (`personnelId`) REFERENCES `personnel`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `personnel_name_idx` ON `personnel` (`fullName`);--> statement-breakpoint
CREATE INDEX `personnel_unit_idx` ON `personnel` (`unitId`);--> statement-breakpoint
CREATE INDEX `personnel_status_idx` ON `personnel` (`status`);--> statement-breakpoint
CREATE INDEX `personnel_position_idx` ON `personnel` (`position`);--> statement-breakpoint
CREATE INDEX `personnel_files_personnel_idx` ON `personnelFiles` (`personnelId`);--> statement-breakpoint
CREATE INDEX `personnel_files_type_idx` ON `personnelFiles` (`fileType`);--> statement-breakpoint
CREATE INDEX `units_parent_idx` ON `units` (`parentId`);