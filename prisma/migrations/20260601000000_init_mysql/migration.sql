-- CreateTable
CREATE TABLE `Employee` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `department` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `isManager` BOOLEAN NOT NULL DEFAULT false,
    `msEmail` VARCHAR(191) NULL,
    `msId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reportsToId` INTEGER NULL,
    UNIQUE INDEX `Employee_email_key`(`email`),
    UNIQUE INDEX `Employee_msEmail_key`(`msEmail`),
    UNIQUE INDEX `Employee_msId_key`(`msId`),
    INDEX `Employee_reportsToId_idx`(`reportsToId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KRA` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `target` TEXT NOT NULL,
    `deadline` DATETIME(3) NOT NULL,
    `weight` INTEGER NOT NULL DEFAULT 100,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `employeeId` INTEGER NOT NULL,
    INDEX `KRA_employeeId_idx`(`employeeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WeeklyReview` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `week` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `progress` INTEGER NOT NULL,
    `score` INTEGER NOT NULL,
    `notes` TEXT NOT NULL,
    `blockers` TEXT NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `employeeId` INTEGER NOT NULL,
    `kraId` INTEGER NOT NULL,
    INDEX `WeeklyReview_employeeId_idx`(`employeeId`),
    INDEX `WeeklyReview_kraId_idx`(`kraId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeadGeneration` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `employeeId` INTEGER NOT NULL,
    `territory` VARCHAR(191) NOT NULL DEFAULT '',
    `leadSource` VARCHAR(191) NOT NULL DEFAULT '',
    `customerName` VARCHAR(191) NOT NULL,
    `contactPerson` VARCHAR(191) NOT NULL DEFAULT '',
    `phoneEmail` VARCHAR(191) NOT NULL DEFAULT '',
    `activityType` VARCHAR(191) NOT NULL DEFAULT '',
    `activityCount` INTEGER NOT NULL DEFAULT 1,
    `leadStatus` VARCHAR(191) NOT NULL DEFAULT 'New',
    `qualifiedFlag` BOOLEAN NOT NULL DEFAULT false,
    `nextActionDate` DATETIME(3) NULL,
    `remarks` TEXT NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `LeadGeneration_employeeId_idx`(`employeeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalesFunnel` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `opportunityId` VARCHAR(191) NOT NULL DEFAULT '',
    `createdDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `employeeId` INTEGER NOT NULL,
    `territory` VARCHAR(191) NOT NULL DEFAULT '',
    `customerName` VARCHAR(191) NOT NULL,
    `solutionCategory` VARCHAR(191) NOT NULL DEFAULT '',
    `opportunityName` VARCHAR(191) NOT NULL,
    `stage` VARCHAR(191) NOT NULL DEFAULT 'Lead',
    `dealValueLakhs` DOUBLE NOT NULL DEFAULT 0,
    `billingValueLakhs` DOUBLE NOT NULL DEFAULT 0,
    `grossProfitPct` DOUBLE NOT NULL DEFAULT 0,
    `proposalDate` DATETIME(3) NULL,
    `expectedCloseDate` DATETIME(3) NULL,
    `poDate` DATETIME(3) NULL,
    `closedDate` DATETIME(3) NULL,
    `probabilityPct` DOUBLE NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Active',
    `newCustomerFlag` BOOLEAN NOT NULL DEFAULT false,
    `pocFlag` BOOLEAN NOT NULL DEFAULT false,
    `remarks` TEXT NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `SalesFunnel_employeeId_idx`(`employeeId`),
    INDEX `SalesFunnel_stage_status_idx`(`stage`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Collection` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoiceDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `invoiceNo` VARCHAR(191) NOT NULL DEFAULT '',
    `employeeId` INTEGER NOT NULL,
    `customerName` VARCHAR(191) NOT NULL,
    `invoiceValueLakhs` DOUBLE NOT NULL,
    `amountWithoutGstLakhs` DOUBLE NOT NULL DEFAULT 0,
    `dueDate` DATETIME(3) NOT NULL,
    `paymentReceivedDate` DATETIME(3) NULL,
    `amountReceivedLakhs` DOUBLE NOT NULL DEFAULT 0,
    `collectionStatus` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `remarks` TEXT NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `Collection_employeeId_idx`(`employeeId`),
    INDEX `Collection_collectionStatus_idx`(`collectionStatus`),
    INDEX `Collection_dueDate_idx`(`dueDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `collectionId` INTEGER NOT NULL,
    `amountLakhs` DOUBLE NOT NULL,
    `paymentDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `mode` VARCHAR(191) NOT NULL DEFAULT 'Bank Transfer',
    `referenceNo` VARCHAR(191) NOT NULL DEFAULT '',
    `notes` TEXT NOT NULL DEFAULT '',
    `fromAdvanceId` INTEGER NULL,
    `recordedById` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `Payment_collectionId_idx`(`collectionId`),
    INDEX `Payment_paymentDate_idx`(`paymentDate`),
    INDEX `Payment_recordedById_idx`(`recordedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderAdvance` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `salesFunnelId` INTEGER NULL,
    `customerName` VARCHAR(191) NOT NULL,
    `amountLakhs` DOUBLE NOT NULL,
    `receivedDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `mode` VARCHAR(191) NOT NULL DEFAULT 'Bank Transfer',
    `referenceNo` VARCHAR(191) NOT NULL DEFAULT '',
    `notes` TEXT NOT NULL DEFAULT '',
    `status` VARCHAR(191) NOT NULL DEFAULT 'unapplied',
    `appliedToCollectionId` INTEGER NULL,
    `appliedDate` DATETIME(3) NULL,
    `recordedById` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `OrderAdvance_recordedById_idx`(`recordedById`),
    INDEX `OrderAdvance_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `recipientId` INTEGER NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL DEFAULT '',
    `link` VARCHAR(191) NOT NULL DEFAULT '',
    `amountLakhs` DOUBLE NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `Notification_recipientId_isRead_idx`(`recipientId`, `isRead`),
    INDEX `Notification_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DailyUpdate` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `employeeId` INTEGER NOT NULL,
    `topUpdates` TEXT NOT NULL,
    `keyMovement` TEXT NOT NULL DEFAULT '',
    `blockers` TEXT NOT NULL DEFAULT '',
    `topDealThisWeek` TEXT NOT NULL DEFAULT '',
    `managerSupportRequired` BOOLEAN NOT NULL DEFAULT false,
    `updateStatus` VARCHAR(191) NOT NULL DEFAULT 'On Track',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `DailyUpdate_employeeId_date_idx`(`employeeId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WeeklyCommit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER NOT NULL,
    `kraId` INTEGER NOT NULL,
    `week` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `commitText` TEXT NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `WeeklyCommit_employeeId_week_year_idx`(`employeeId`, `week`, `year`),
    INDEX `WeeklyCommit_kraId_idx`(`kraId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Certification` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER NOT NULL,
    `kraId` INTEGER NOT NULL,
    `certName` VARCHAR(191) NOT NULL,
    `issuingBody` VARCHAR(191) NOT NULL DEFAULT '',
    `dateObtained` DATETIME(3) NOT NULL,
    `expiryDate` DATETIME(3) NULL,
    `attachmentUrl` VARCHAR(191) NOT NULL DEFAULT '',
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `approvedBy` INTEGER NULL,
    `approvedAt` DATETIME(3) NULL,
    `remarks` TEXT NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `Certification_employeeId_idx`(`employeeId`),
    INDEX `Certification_kraId_idx`(`kraId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CrmLead` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `companyName` VARCHAR(191) NOT NULL,
    `contactPerson` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL DEFAULT '',
    `phone` VARCHAR(191) NOT NULL DEFAULT '',
    `source` VARCHAR(191) NOT NULL DEFAULT 'Direct',
    `categoryId` VARCHAR(191) NULL,
    `categoryName` VARCHAR(191) NOT NULL DEFAULT '',
    `oemId` VARCHAR(191) NULL,
    `oemName` VARCHAR(191) NOT NULL DEFAULT '',
    `productId` VARCHAR(191) NULL,
    `productName` VARCHAR(191) NOT NULL DEFAULT '',
    `customerId` VARCHAR(191) NULL,
    `customerName` VARCHAR(191) NOT NULL DEFAULT '',
    `stage` VARCHAR(191) NOT NULL DEFAULT 'NEW_LEAD',
    `expectedValue` DOUBLE NOT NULL DEFAULT 0,
    `remarks` TEXT NOT NULL DEFAULT '',
    `assignedToId` INTEGER NOT NULL,
    `createdById` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `CrmLead_assignedToId_idx`(`assignedToId`),
    INDEX `CrmLead_createdById_idx`(`createdById`),
    INDEX `CrmLead_stage_idx`(`stage`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CrmOpportunity` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `leadId` INTEGER NOT NULL,
    `stage` VARCHAR(191) NOT NULL DEFAULT 'PROPOSAL_SENT',
    `value` DOUBLE NOT NULL DEFAULT 0,
    `expectedClosureDate` DATETIME(3) NULL,
    `probability` INTEGER NOT NULL DEFAULT 50,
    `lostReason` TEXT NOT NULL DEFAULT '',
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `CrmOpportunity_leadId_key`(`leadId`),
    INDEX `CrmOpportunity_stage_status_idx`(`stage`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CrmTask` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL DEFAULT '',
    `dueDate` DATETIME(3) NOT NULL,
    `assignedToId` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `priority` VARCHAR(191) NOT NULL DEFAULT 'medium',
    `leadId` INTEGER NULL,
    `opportunityId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `CrmTask_assignedToId_idx`(`assignedToId`),
    INDEX `CrmTask_leadId_idx`(`leadId`),
    INDEX `CrmTask_opportunityId_idx`(`opportunityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CrmMeeting` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `meetingDate` DATETIME(3) NOT NULL,
    `notes` TEXT NOT NULL DEFAULT '',
    `attendees` TEXT NOT NULL DEFAULT '',
    `location` VARCHAR(191) NOT NULL DEFAULT '',
    `leadId` INTEGER NULL,
    `opportunityId` INTEGER NULL,
    `employeeId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `CrmMeeting_leadId_idx`(`leadId`),
    INDEX `CrmMeeting_opportunityId_idx`(`opportunityId`),
    INDEX `CrmMeeting_employeeId_idx`(`employeeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CrmActivity` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` INTEGER NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL DEFAULT '',
    `meta` TEXT NOT NULL DEFAULT '',
    `performedById` INTEGER NOT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `leadId` INTEGER NULL,
    `opportunityId` INTEGER NULL,
    INDEX `CrmActivity_leadId_idx`(`leadId`),
    INDEX `CrmActivity_opportunityId_idx`(`opportunityId`),
    INDEX `CrmActivity_performedById_idx`(`performedById`),
    INDEX `CrmActivity_timestamp_idx`(`timestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CrmNote` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `content` TEXT NOT NULL,
    `leadId` INTEGER NOT NULL,
    `authorId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `CrmNote_leadId_idx`(`leadId`),
    INDEX `CrmNote_authorId_idx`(`authorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Customer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `address` TEXT NOT NULL DEFAULT '',
    `district` VARCHAR(191) NOT NULL DEFAULT '',
    `state` VARCHAR(191) NOT NULL DEFAULT '',
    `pincode` VARCHAR(191) NOT NULL DEFAULT '',
    `gstNo` VARCHAR(191) NOT NULL DEFAULT '',
    `officeType` VARCHAR(191) NOT NULL DEFAULT 'HO',
    `parentId` INTEGER NULL,
    `crmSource` VARCHAR(191) NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `Customer_parentId_idx`(`parentId`),
    INDEX `Customer_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AppSetting` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `category` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `description` TEXT NOT NULL DEFAULT '',
    `updatedAt` DATETIME(3) NOT NULL,
    `updatedById` INTEGER NULL,
    UNIQUE INDEX `AppSetting_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AppRole` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `level` INTEGER NOT NULL,
    `color` VARCHAR(191) NOT NULL DEFAULT '#6b7280',
    `isSystem` BOOLEAN NOT NULL DEFAULT false,
    `description` TEXT NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `AppRole_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RolePageAccess` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `roleId` INTEGER NOT NULL,
    `pageKey` VARCHAR(191) NOT NULL,
    `canView` BOOLEAN NOT NULL DEFAULT false,
    `canCreate` BOOLEAN NOT NULL DEFAULT false,
    `canEdit` BOOLEAN NOT NULL DEFAULT false,
    `canDelete` BOOLEAN NOT NULL DEFAULT false,
    UNIQUE INDEX `RolePageAccess_roleId_pageKey_key`(`roleId`, `pageKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Employee` ADD CONSTRAINT `Employee_reportsToId_fkey` FOREIGN KEY (`reportsToId`) REFERENCES `Employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `KRA` ADD CONSTRAINT `KRA_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `WeeklyReview` ADD CONSTRAINT `WeeklyReview_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `WeeklyReview` ADD CONSTRAINT `WeeklyReview_kraId_fkey` FOREIGN KEY (`kraId`) REFERENCES `KRA`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `LeadGeneration` ADD CONSTRAINT `LeadGeneration_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `SalesFunnel` ADD CONSTRAINT `SalesFunnel_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Collection` ADD CONSTRAINT `Collection_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_collectionId_fkey` FOREIGN KEY (`collectionId`) REFERENCES `Collection`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_recordedById_fkey` FOREIGN KEY (`recordedById`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `OrderAdvance` ADD CONSTRAINT `OrderAdvance_recordedById_fkey` FOREIGN KEY (`recordedById`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_recipientId_fkey` FOREIGN KEY (`recipientId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `DailyUpdate` ADD CONSTRAINT `DailyUpdate_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `WeeklyCommit` ADD CONSTRAINT `WeeklyCommit_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `WeeklyCommit` ADD CONSTRAINT `WeeklyCommit_kraId_fkey` FOREIGN KEY (`kraId`) REFERENCES `KRA`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Certification` ADD CONSTRAINT `Certification_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Certification` ADD CONSTRAINT `Certification_kraId_fkey` FOREIGN KEY (`kraId`) REFERENCES `KRA`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CrmLead` ADD CONSTRAINT `CrmLead_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `CrmLead` ADD CONSTRAINT `CrmLead_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `CrmOpportunity` ADD CONSTRAINT `CrmOpportunity_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `CrmLead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CrmTask` ADD CONSTRAINT `CrmTask_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `CrmTask` ADD CONSTRAINT `CrmTask_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `CrmLead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CrmTask` ADD CONSTRAINT `CrmTask_opportunityId_fkey` FOREIGN KEY (`opportunityId`) REFERENCES `CrmOpportunity`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CrmMeeting` ADD CONSTRAINT `CrmMeeting_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `CrmLead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CrmMeeting` ADD CONSTRAINT `CrmMeeting_opportunityId_fkey` FOREIGN KEY (`opportunityId`) REFERENCES `CrmOpportunity`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CrmMeeting` ADD CONSTRAINT `CrmMeeting_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `CrmActivity` ADD CONSTRAINT `CrmActivity_performedById_fkey` FOREIGN KEY (`performedById`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `CrmActivity` ADD CONSTRAINT `CrmActivity_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `CrmLead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CrmActivity` ADD CONSTRAINT `CrmActivity_opportunityId_fkey` FOREIGN KEY (`opportunityId`) REFERENCES `CrmOpportunity`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CrmNote` ADD CONSTRAINT `CrmNote_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `CrmLead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CrmNote` ADD CONSTRAINT `CrmNote_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `RolePageAccess` ADD CONSTRAINT `RolePageAccess_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `AppRole`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
