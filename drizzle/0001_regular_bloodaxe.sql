CREATE TABLE `photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentSlug` varchar(128) NOT NULL,
	`studentName` varchar(256) NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`url` text NOT NULL,
	`originalName` varchar(256),
	`mimeType` varchar(64),
	`fileSize` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `photos_id` PRIMARY KEY(`id`)
);
