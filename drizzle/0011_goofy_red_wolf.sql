CREATE TABLE `personnelCommendationFiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`commendationId` int NOT NULL,
	`originalName` varchar(255) NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`storageUrl` varchar(1024) NOT NULL,
	`mimeType` varchar(150) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `personnelCommendationFiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `personnelCommendations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`personnelId` int NOT NULL,
	`awardType` enum('certificate_collective','certificate_individual','letter_collective','letter_individual') NOT NULL,
	`decisionNumber` varchar(150) NOT NULL,
	`issuedAt` datetime NOT NULL,
	`issuingAgency` varchar(255) NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `personnelCommendations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `personnelTrainingFiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trainingId` int NOT NULL,
	`originalName` varchar(255) NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`storageUrl` varchar(1024) NOT NULL,
	`mimeType` varchar(150) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `personnelTrainingFiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `personnelTrainings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`personnelId` int NOT NULL,
	`trainingName` varchar(255) NOT NULL,
	`decisionNumber` varchar(150) NOT NULL,
	`issuedAt` datetime NOT NULL,
	`issuingAgency` varchar(255) NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `personnelTrainings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `personnelCommendationFiles` ADD CONSTRAINT `pcf_commendation_fk` FOREIGN KEY (`commendationId`) REFERENCES `personnelCommendations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `personnelCommendations` ADD CONSTRAINT `pc_personnel_fk` FOREIGN KEY (`personnelId`) REFERENCES `personnel`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `personnelTrainingFiles` ADD CONSTRAINT `ptf_training_fk` FOREIGN KEY (`trainingId`) REFERENCES `personnelTrainings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `personnelTrainings` ADD CONSTRAINT `pt_personnel_fk` FOREIGN KEY (`personnelId`) REFERENCES `personnel`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `personnel_commendation_files_commendation_idx` ON `personnelCommendationFiles` (`commendationId`);--> statement-breakpoint
CREATE INDEX `personnel_commendations_personnel_idx` ON `personnelCommendations` (`personnelId`);--> statement-breakpoint
CREATE INDEX `personnel_commendations_issued_idx` ON `personnelCommendations` (`issuedAt`);--> statement-breakpoint
CREATE INDEX `personnel_commendations_type_idx` ON `personnelCommendations` (`awardType`);--> statement-breakpoint
CREATE INDEX `personnel_training_files_training_idx` ON `personnelTrainingFiles` (`trainingId`);--> statement-breakpoint
CREATE INDEX `personnel_trainings_personnel_idx` ON `personnelTrainings` (`personnelId`);--> statement-breakpoint
CREATE INDEX `personnel_trainings_issued_idx` ON `personnelTrainings` (`issuedAt`);
