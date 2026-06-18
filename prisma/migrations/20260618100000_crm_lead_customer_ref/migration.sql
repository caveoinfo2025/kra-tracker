-- CrmLead: add customerRefId FK → Customer master
ALTER TABLE `CrmLead` ADD COLUMN `customerRefId` INT NULL;
ALTER TABLE `CrmLead` ADD CONSTRAINT `CrmLead_customerRefId_fkey` FOREIGN KEY (`customerRefId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX `CrmLead_customerRefId_idx` ON `CrmLead`(`customerRefId`);
