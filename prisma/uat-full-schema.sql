-- UAT Full Schema -- Generated from all migrations
-- Run this in phpMyAdmin on u686730471_Caveo_UAT

-- ===== 20260601000000_init_mysql =====
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


-- ===== 20260602120000_finance_operations_phase1 =====
-- Finance Operations Module â€” Phase 1 (database only)
-- Modules: Account (FinAccount), Ledger, Vendor, Expense, Voucher (+ VoucherSequence),
--          EmployeeAdvance, TravelClaim, ApprovalRule, AuditLog
-- Generated offline via `prisma migrate diff` (no local MySQL available).

-- CreateTable
CREATE TABLE `FinAccount` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'cash',
    `branchName` VARCHAR(191) NOT NULL DEFAULT 'HO',
    `bankName` VARCHAR(191) NOT NULL DEFAULT '',
    `accountNo` VARCHAR(191) NOT NULL DEFAULT '',
    `ifscCode` VARCHAR(191) NOT NULL DEFAULT '',
    `accountHolder` VARCHAR(191) NOT NULL DEFAULT '',
    `openingBalance` DOUBLE NOT NULL DEFAULT 0,
    `currentBalance` DOUBLE NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FinAccount_type_idx`(`type`),
    INDEX `FinAccount_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Ledger` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `accountId` INTEGER NOT NULL,
    `entryDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `type` VARCHAR(191) NOT NULL,
    `direction` VARCHAR(191) NOT NULL,
    `amountLakhs` DOUBLE NOT NULL,
    `narration` TEXT NOT NULL DEFAULT '',
    `referenceNo` VARCHAR(191) NOT NULL DEFAULT '',
    `chequeNo` VARCHAR(191) NOT NULL DEFAULT '',
    `chequeDate` DATETIME(3) NULL,
    `payee` VARCHAR(191) NOT NULL DEFAULT '',
    `voucherId` INTEGER NULL,
    `pairedLedgerId` INTEGER NULL,
    `reconciled` BOOLEAN NOT NULL DEFAULT false,
    `reconciledAt` DATETIME(3) NULL,
    `recordedById` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Ledger_accountId_idx`(`accountId`),
    INDEX `Ledger_entryDate_idx`(`entryDate`),
    INDEX `Ledger_type_idx`(`type`),
    INDEX `Ledger_reconciled_idx`(`reconciled`),
    INDEX `Ledger_voucherId_idx`(`voucherId`),
    INDEX `Ledger_recordedById_idx`(`recordedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Vendor` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `gstin` VARCHAR(191) NOT NULL DEFAULT '',
    `pan` VARCHAR(191) NOT NULL DEFAULT '',
    `address` TEXT NOT NULL DEFAULT '',
    `city` VARCHAR(191) NOT NULL DEFAULT '',
    `state` VARCHAR(191) NOT NULL DEFAULT '',
    `pincode` VARCHAR(191) NOT NULL DEFAULT '',
    `contactName` VARCHAR(191) NOT NULL DEFAULT '',
    `contactPhone` VARCHAR(191) NOT NULL DEFAULT '',
    `contactEmail` VARCHAR(191) NOT NULL DEFAULT '',
    `bankName` VARCHAR(191) NOT NULL DEFAULT '',
    `bankAccountNo` VARCHAR(191) NOT NULL DEFAULT '',
    `ifscCode` VARCHAR(191) NOT NULL DEFAULT '',
    `paymentTerms` VARCHAR(191) NOT NULL DEFAULT '30 days',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Vendor_name_idx`(`name`),
    INDEX `Vendor_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Expense` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `category` VARCHAR(191) NOT NULL DEFAULT '',
    `categoryCode` VARCHAR(191) NOT NULL DEFAULT '',
    `vendorId` INTEGER NULL,
    `customerName` VARCHAR(191) NOT NULL DEFAULT '',
    `employeeId` INTEGER NOT NULL,
    `expenseDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `amountLakhs` DOUBLE NOT NULL,
    `gstRate` DOUBLE NOT NULL DEFAULT 0,
    `gstAmountLakhs` DOUBLE NOT NULL DEFAULT 0,
    `narration` TEXT NOT NULL DEFAULT '',
    `vendorInvoiceNo` VARCHAR(191) NOT NULL DEFAULT '',
    `attachmentsJson` TEXT NOT NULL DEFAULT '[]',
    `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
    `voucherId` INTEGER NULL,
    `approvedById` INTEGER NULL,
    `approvedAt` DATETIME(3) NULL,
    `paidDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Expense_category_idx`(`category`),
    INDEX `Expense_vendorId_idx`(`vendorId`),
    INDEX `Expense_employeeId_idx`(`employeeId`),
    INDEX `Expense_expenseDate_idx`(`expenseDate`),
    INDEX `Expense_status_idx`(`status`),
    INDEX `Expense_customerName_idx`(`customerName`),
    INDEX `Expense_voucherId_idx`(`voucherId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Voucher` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `voucherNo` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `voucherDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `amountLakhs` DOUBLE NOT NULL,
    `narration` TEXT NOT NULL DEFAULT '',
    `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
    `pdfUrl` TEXT NOT NULL DEFAULT '',
    `voidedAt` DATETIME(3) NULL,
    `voidReason` TEXT NOT NULL DEFAULT '',
    `createdById` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Voucher_voucherNo_key`(`voucherNo`),
    INDEX `Voucher_voucherDate_idx`(`voucherDate`),
    INDEX `Voucher_type_idx`(`type`),
    INDEX `Voucher_status_idx`(`status`),
    INDEX `Voucher_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VoucherSequence` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `financialYear` VARCHAR(191) NOT NULL,
    `lastNumber` INTEGER NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `VoucherSequence_financialYear_key`(`financialYear`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmployeeAdvance` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `advanceNo` VARCHAR(191) NOT NULL,
    `employeeId` INTEGER NOT NULL,
    `purpose` TEXT NOT NULL DEFAULT '',
    `amountLakhs` DOUBLE NOT NULL,
    `requestDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `requiredByDate` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `approvedById` INTEGER NULL,
    `approvedAt` DATETIME(3) NULL,
    `disbursedDate` DATETIME(3) NULL,
    `disbursedAmountLakhs` DOUBLE NULL,
    `disbursedFromType` VARCHAR(191) NOT NULL DEFAULT '',
    `disbursedFromId` INTEGER NULL,
    `settledDate` DATETIME(3) NULL,
    `settledAmountLakhs` DOUBLE NULL,
    `balanceLakhs` DOUBLE NOT NULL DEFAULT 0,
    `voucherId` INTEGER NULL,
    `remarks` TEXT NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `EmployeeAdvance_advanceNo_key`(`advanceNo`),
    INDEX `EmployeeAdvance_employeeId_idx`(`employeeId`),
    INDEX `EmployeeAdvance_status_idx`(`status`),
    INDEX `EmployeeAdvance_requestDate_idx`(`requestDate`),
    INDEX `EmployeeAdvance_voucherId_idx`(`voucherId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TravelClaim` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `claimNo` VARCHAR(191) NOT NULL,
    `employeeId` INTEGER NOT NULL,
    `travelDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fromLocation` TEXT NOT NULL DEFAULT '',
    `toLocation` TEXT NOT NULL DEFAULT '',
    `fromLat` DOUBLE NULL,
    `fromLng` DOUBLE NULL,
    `toLat` DOUBLE NULL,
    `toLng` DOUBLE NULL,
    `distanceKm` DOUBLE NOT NULL DEFAULT 0,
    `mode` VARCHAR(191) NOT NULL DEFAULT 'bike',
    `ratePerKm` DOUBLE NOT NULL DEFAULT 0,
    `amountRupees` DOUBLE NOT NULL DEFAULT 0,
    `amountLakhs` DOUBLE NOT NULL DEFAULT 0,
    `purpose` TEXT NOT NULL DEFAULT '',
    `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
    `approvedById` INTEGER NULL,
    `approvedAt` DATETIME(3) NULL,
    `voucherId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TravelClaim_claimNo_key`(`claimNo`),
    INDEX `TravelClaim_employeeId_idx`(`employeeId`),
    INDEX `TravelClaim_travelDate_idx`(`travelDate`),
    INDEX `TravelClaim_status_idx`(`status`),
    INDEX `TravelClaim_voucherId_idx`(`voucherId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ApprovalRule` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL DEFAULT 'all',
    `autoApproveLimit` DOUBLE NOT NULL DEFAULT 0,
    `level1Limit` DOUBLE NOT NULL DEFAULT 0,
    `level1Role` VARCHAR(191) NOT NULL DEFAULT '',
    `level2Limit` DOUBLE NULL,
    `level2Role` VARCHAR(191) NULL,
    `level3Limit` DOUBLE NULL,
    `level3Role` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ApprovalRule_entityType_idx`(`entityType`),
    INDEX `ApprovalRule_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` INTEGER NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `performedById` INTEGER NOT NULL,
    `changes` TEXT NOT NULL DEFAULT '',
    `notes` TEXT NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `AuditLog_performedById_idx`(`performedById`),
    INDEX `AuditLog_action_idx`(`action`),
    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Ledger` ADD CONSTRAINT `Ledger_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `FinAccount`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ledger` ADD CONSTRAINT `Ledger_voucherId_fkey` FOREIGN KEY (`voucherId`) REFERENCES `Voucher`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ledger` ADD CONSTRAINT `Ledger_recordedById_fkey` FOREIGN KEY (`recordedById`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Expense` ADD CONSTRAINT `Expense_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `Vendor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Expense` ADD CONSTRAINT `Expense_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Expense` ADD CONSTRAINT `Expense_voucherId_fkey` FOREIGN KEY (`voucherId`) REFERENCES `Voucher`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Expense` ADD CONSTRAINT `Expense_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `Employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Voucher` ADD CONSTRAINT `Voucher_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmployeeAdvance` ADD CONSTRAINT `EmployeeAdvance_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmployeeAdvance` ADD CONSTRAINT `EmployeeAdvance_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `Employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmployeeAdvance` ADD CONSTRAINT `EmployeeAdvance_voucherId_fkey` FOREIGN KEY (`voucherId`) REFERENCES `Voucher`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TravelClaim` ADD CONSTRAINT `TravelClaim_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TravelClaim` ADD CONSTRAINT `TravelClaim_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `Employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TravelClaim` ADD CONSTRAINT `TravelClaim_voucherId_fkey` FOREIGN KEY (`voucherId`) REFERENCES `Voucher`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_performedById_fkey` FOREIGN KEY (`performedById`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;


-- ===== 20260604000000_admin_console_foundation =====
-- Admin Console Phase 2 â€” Foundation
-- Modules: Tenant, Company, Branch, Department, Team, Designation,
--          EmployeeProfile, Role, Permission, RolePermission, UserRole,
--          DataAccessPolicy
-- Generated offline (no local MySQL). Apply via: npx prisma migrate deploy
-- All existing tables are preserved; only new tables are created.
-- Backward-compatible: no ALTER TABLE on existing tables.

-- â”€â”€ Tenant â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE `Tenant` (
    `id`        INTEGER       NOT NULL AUTO_INCREMENT,
    `name`      VARCHAR(191)  NOT NULL,
    `code`      VARCHAR(191)  NOT NULL,
    `status`    VARCHAR(191)  NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3)   NOT NULL,

    UNIQUE INDEX `Tenant_code_key`(`code`),
    INDEX `Tenant_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- â”€â”€ Company â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE `Company` (
    `id`          INTEGER       NOT NULL AUTO_INCREMENT,
    `tenantId`    INTEGER       NOT NULL,
    `companyName` VARCHAR(191)  NOT NULL,
    `legalName`   VARCHAR(191)  NOT NULL DEFAULT '',
    `companyCode` VARCHAR(191)  NOT NULL DEFAULT '',
    `gstNumber`   VARCHAR(191)  NOT NULL DEFAULT '',
    `panNumber`   VARCHAR(191)  NOT NULL DEFAULT '',
    `email`       VARCHAR(191)  NOT NULL DEFAULT '',
    `phone`       VARCHAR(191)  NOT NULL DEFAULT '',
    `website`     VARCHAR(191)  NOT NULL DEFAULT '',
    `status`      VARCHAR(191)  NOT NULL DEFAULT 'ACTIVE',
    `createdAt`   DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`   DATETIME(3)   NOT NULL,

    INDEX `Company_tenantId_idx`(`tenantId`),
    INDEX `Company_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- â”€â”€ Branch â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE `Branch` (
    `id`         INTEGER       NOT NULL AUTO_INCREMENT,
    `companyId`  INTEGER       NOT NULL,
    `branchName` VARCHAR(191)  NOT NULL,
    `branchCode` VARCHAR(191)  NOT NULL DEFAULT '',
    `address`    TEXT          NOT NULL DEFAULT '',
    `city`       VARCHAR(191)  NOT NULL DEFAULT '',
    `state`      VARCHAR(191)  NOT NULL DEFAULT '',
    `country`    VARCHAR(191)  NOT NULL DEFAULT 'India',
    `timezone`   VARCHAR(191)  NOT NULL DEFAULT 'Asia/Kolkata',
    `status`     VARCHAR(191)  NOT NULL DEFAULT 'ACTIVE',
    `createdAt`  DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`  DATETIME(3)   NOT NULL,

    INDEX `Branch_companyId_idx`(`companyId`),
    INDEX `Branch_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- â”€â”€ Department â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE `Department` (
    `id`          INTEGER       NOT NULL AUTO_INCREMENT,
    `companyId`   INTEGER       NOT NULL,
    `name`        VARCHAR(191)  NOT NULL,
    `code`        VARCHAR(191)  NOT NULL DEFAULT '',
    `description` TEXT          NOT NULL DEFAULT '',
    `status`      VARCHAR(191)  NOT NULL DEFAULT 'ACTIVE',
    `createdAt`   DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`   DATETIME(3)   NOT NULL,

    INDEX `Department_companyId_idx`(`companyId`),
    INDEX `Department_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- â”€â”€ Team â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE `Team` (
    `id`           INTEGER       NOT NULL AUTO_INCREMENT,
    `departmentId` INTEGER       NOT NULL,
    `name`         VARCHAR(191)  NOT NULL,
    `teamLeadId`   INTEGER       NULL,
    `status`       VARCHAR(191)  NOT NULL DEFAULT 'ACTIVE',
    `createdAt`    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`    DATETIME(3)   NOT NULL,

    INDEX `Team_departmentId_idx`(`departmentId`),
    INDEX `Team_teamLeadId_idx`(`teamLeadId`),
    INDEX `Team_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- â”€â”€ Designation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE `Designation` (
    `id`          INTEGER       NOT NULL AUTO_INCREMENT,
    `companyId`   INTEGER       NOT NULL,
    `title`       VARCHAR(191)  NOT NULL,
    `level`       INTEGER       NOT NULL DEFAULT 1,
    `description` TEXT          NOT NULL DEFAULT '',
    `status`      VARCHAR(191)  NOT NULL DEFAULT 'ACTIVE',
    `createdAt`   DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`   DATETIME(3)   NOT NULL,

    INDEX `Designation_companyId_idx`(`companyId`),
    INDEX `Designation_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- â”€â”€ EmployeeProfile â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- employmentStatus: DRAFT | ACTIVE | SUSPENDED | INACTIVE
CREATE TABLE `EmployeeProfile` (
    `id`                 INTEGER       NOT NULL AUTO_INCREMENT,
    `userId`             INTEGER       NOT NULL,
    `employeeCode`       VARCHAR(191)  NOT NULL DEFAULT '',
    `companyId`          INTEGER       NULL,
    `branchId`           INTEGER       NULL,
    `departmentId`       INTEGER       NULL,
    `teamId`             INTEGER       NULL,
    `designationId`      INTEGER       NULL,
    `reportingManagerId` INTEGER       NULL,
    `joiningDate`        DATETIME(3)   NULL,
    `employmentStatus`   VARCHAR(191)  NOT NULL DEFAULT 'ACTIVE',
    `createdAt`          DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`          DATETIME(3)   NOT NULL,

    UNIQUE INDEX `EmployeeProfile_userId_key`(`userId`),
    INDEX `EmployeeProfile_companyId_idx`(`companyId`),
    INDEX `EmployeeProfile_branchId_idx`(`branchId`),
    INDEX `EmployeeProfile_departmentId_idx`(`departmentId`),
    INDEX `EmployeeProfile_teamId_idx`(`teamId`),
    INDEX `EmployeeProfile_designationId_idx`(`designationId`),
    INDEX `EmployeeProfile_reportingManagerId_idx`(`reportingManagerId`),
    INDEX `EmployeeProfile_employmentStatus_idx`(`employmentStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- â”€â”€ Role (enterprise role â€” AppRole legacy kept) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE `Role` (
    `id`           INTEGER       NOT NULL AUTO_INCREMENT,
    `tenantId`     INTEGER       NULL,
    `name`         VARCHAR(191)  NOT NULL,
    `description`  TEXT          NOT NULL DEFAULT '',
    `level`        INTEGER       NOT NULL DEFAULT 1,
    `isSystemRole` BOOLEAN       NOT NULL DEFAULT false,
    `status`       VARCHAR(191)  NOT NULL DEFAULT 'ACTIVE',
    `createdAt`    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`    DATETIME(3)   NOT NULL,

    INDEX `Role_tenantId_idx`(`tenantId`),
    INDEX `Role_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- â”€â”€ Permission â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Unique per (module, resource, action); global across tenants.
CREATE TABLE `Permission` (
    `id`          INTEGER       NOT NULL AUTO_INCREMENT,
    `module`      VARCHAR(191)  NOT NULL,
    `resource`    VARCHAR(191)  NOT NULL,
    `action`      VARCHAR(191)  NOT NULL,
    `description` TEXT          NOT NULL DEFAULT '',

    UNIQUE INDEX `Permission_module_resource_action_key`(`module`, `resource`, `action`),
    INDEX `Permission_module_idx`(`module`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- â”€â”€ RolePermission â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE `RolePermission` (
    `id`           INTEGER       NOT NULL AUTO_INCREMENT,
    `roleId`       INTEGER       NOT NULL,
    `permissionId` INTEGER       NOT NULL,
    `createdAt`    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `RolePermission_roleId_permissionId_key`(`roleId`, `permissionId`),
    INDEX `RolePermission_roleId_idx`(`roleId`),
    INDEX `RolePermission_permissionId_idx`(`permissionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- â”€â”€ UserRole (many roles per employee) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE `UserRole` (
    `id`        INTEGER       NOT NULL AUTO_INCREMENT,
    `userId`    INTEGER       NOT NULL,
    `roleId`    INTEGER       NOT NULL,
    `createdAt` DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `UserRole_userId_roleId_key`(`userId`, `roleId`),
    INDEX `UserRole_userId_idx`(`userId`),
    INDEX `UserRole_roleId_idx`(`roleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- â”€â”€ DataAccessPolicy â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- scope: OWN | TEAM | DEPARTMENT | BRANCH | COMPANY | ALL
CREATE TABLE `DataAccessPolicy` (
    `id`         INTEGER       NOT NULL AUTO_INCREMENT,
    `roleId`     INTEGER       NOT NULL,
    `module`     VARCHAR(191)  NOT NULL DEFAULT '',
    `scope`      VARCHAR(191)  NOT NULL DEFAULT 'OWN',
    `filterJson` TEXT          NULL,
    `createdAt`  DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`  DATETIME(3)   NOT NULL,

    UNIQUE INDEX `DataAccessPolicy_roleId_module_key`(`roleId`, `module`),
    INDEX `DataAccessPolicy_roleId_idx`(`roleId`),
    INDEX `DataAccessPolicy_scope_idx`(`scope`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- â”€â”€ Foreign Keys â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

ALTER TABLE `Company`
    ADD CONSTRAINT `Company_tenantId_fkey`
    FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Branch`
    ADD CONSTRAINT `Branch_companyId_fkey`
    FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Department`
    ADD CONSTRAINT `Department_companyId_fkey`
    FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Team`
    ADD CONSTRAINT `Team_departmentId_fkey`
    FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Team`
    ADD CONSTRAINT `Team_teamLeadId_fkey`
    FOREIGN KEY (`teamLeadId`) REFERENCES `Employee`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Designation`
    ADD CONSTRAINT `Designation_companyId_fkey`
    FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `EmployeeProfile`
    ADD CONSTRAINT `EmployeeProfile_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `Employee`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `EmployeeProfile`
    ADD CONSTRAINT `EmployeeProfile_companyId_fkey`
    FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `EmployeeProfile`
    ADD CONSTRAINT `EmployeeProfile_branchId_fkey`
    FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `EmployeeProfile`
    ADD CONSTRAINT `EmployeeProfile_departmentId_fkey`
    FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `EmployeeProfile`
    ADD CONSTRAINT `EmployeeProfile_teamId_fkey`
    FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `EmployeeProfile`
    ADD CONSTRAINT `EmployeeProfile_designationId_fkey`
    FOREIGN KEY (`designationId`) REFERENCES `Designation`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `EmployeeProfile`
    ADD CONSTRAINT `EmployeeProfile_reportingManagerId_fkey`
    FOREIGN KEY (`reportingManagerId`) REFERENCES `Employee`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Role`
    ADD CONSTRAINT `Role_tenantId_fkey`
    FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `RolePermission`
    ADD CONSTRAINT `RolePermission_roleId_fkey`
    FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `RolePermission`
    ADD CONSTRAINT `RolePermission_permissionId_fkey`
    FOREIGN KEY (`permissionId`) REFERENCES `Permission`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `UserRole`
    ADD CONSTRAINT `UserRole_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `Employee`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `UserRole`
    ADD CONSTRAINT `UserRole_roleId_fkey`
    FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `DataAccessPolicy`
    ADD CONSTRAINT `DataAccessPolicy_roleId_fkey`
    FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;


-- ===== 20260604120000_policy_engine_foundation =====
-- Phase 5 â€” Policy Engine Foundation
-- New tables: PolicyCategory, Policy, PolicyRule, PolicyVersion,
--             PolicyAudit, ConfigurationVersion
-- Generated offline (no local MySQL). Apply via: npx prisma migrate deploy
-- Backward-compatible: no modifications to existing tables.

-- â”€â”€ PolicyCategory â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE `PolicyCategory` (
    `id`          INTEGER       NOT NULL AUTO_INCREMENT,
    `name`        VARCHAR(191)  NOT NULL,
    `code`        VARCHAR(191)  NOT NULL,
    `description` LONGTEXT      NOT NULL DEFAULT '',
    `status`      VARCHAR(191)  NOT NULL DEFAULT 'ACTIVE',
    `createdAt`   DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`   DATETIME(3)   NOT NULL,

    UNIQUE INDEX `PolicyCategory_code_key`(`code`),
    INDEX `PolicyCategory_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- â”€â”€ Policy â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE `Policy` (
    `id`            INTEGER       NOT NULL AUTO_INCREMENT,
    `categoryId`    INTEGER       NOT NULL,
    `name`          VARCHAR(191)  NOT NULL,
    `code`          VARCHAR(191)  NOT NULL,
    `description`   LONGTEXT      NOT NULL DEFAULT '',
    `scopeType`     VARCHAR(191)  NOT NULL DEFAULT 'GLOBAL',
    `scopeId`       INTEGER       NULL,
    `status`        VARCHAR(191)  NOT NULL DEFAULT 'DRAFT',
    `version`       INTEGER       NOT NULL DEFAULT 1,
    `effectiveFrom` DATETIME(3)   NULL,
    `effectiveTo`   DATETIME(3)   NULL,
    `createdBy`     INTEGER       NOT NULL,
    `approvedBy`    INTEGER       NULL,
    `createdAt`     DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`     DATETIME(3)   NOT NULL,

    UNIQUE INDEX `Policy_code_key`(`code`),
    INDEX `Policy_categoryId_idx`(`categoryId`),
    INDEX `Policy_status_idx`(`status`),
    INDEX `Policy_scopeType_scopeId_idx`(`scopeType`, `scopeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- â”€â”€ PolicyRule â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE `PolicyRule` (
    `id`            INTEGER       NOT NULL AUTO_INCREMENT,
    `policyId`      INTEGER       NOT NULL,
    `ruleName`      VARCHAR(191)  NOT NULL,
    `priority`      INTEGER       NOT NULL DEFAULT 10,
    `conditionJson` LONGTEXT      NOT NULL,
    `actionJson`    LONGTEXT      NOT NULL,
    `isActive`      BOOLEAN       NOT NULL DEFAULT TRUE,
    `createdAt`     DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`     DATETIME(3)   NOT NULL,

    INDEX `PolicyRule_policyId_idx`(`policyId`),
    INDEX `PolicyRule_priority_idx`(`priority`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- â”€â”€ PolicyVersion â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE `PolicyVersion` (
    `id`            INTEGER       NOT NULL AUTO_INCREMENT,
    `policyId`      INTEGER       NOT NULL,
    `versionNumber` INTEGER       NOT NULL,
    `snapshotJson`  LONGTEXT      NOT NULL,
    `changeReason`  LONGTEXT      NOT NULL DEFAULT '',
    `createdBy`     INTEGER       NOT NULL,
    `createdAt`     DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PolicyVersion_policyId_versionNumber_key`(`policyId`, `versionNumber`),
    INDEX `PolicyVersion_policyId_idx`(`policyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- â”€â”€ PolicyAudit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE `PolicyAudit` (
    `id`          INTEGER       NOT NULL AUTO_INCREMENT,
    `policyId`    INTEGER       NOT NULL,
    `action`      VARCHAR(191)  NOT NULL,
    `oldValue`    LONGTEXT      NULL,
    `newValue`    LONGTEXT      NULL,
    `performedBy` INTEGER       NOT NULL,
    `createdAt`   DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PolicyAudit_policyId_idx`(`policyId`),
    INDEX `PolicyAudit_performedBy_idx`(`performedBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- â”€â”€ ConfigurationVersion â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE `ConfigurationVersion` (
    `id`           INTEGER       NOT NULL AUTO_INCREMENT,
    `settingKey`   VARCHAR(191)  NOT NULL,
    `value`        LONGTEXT      NOT NULL,
    `version`      INTEGER       NOT NULL,
    `module`       VARCHAR(191)  NOT NULL,
    `status`       VARCHAR(191)  NOT NULL DEFAULT 'draft',
    `changedById`  INTEGER       NOT NULL,
    `reviewedById` INTEGER       NULL,
    `publishedAt`  DATETIME(3)   NULL,
    `note`         LONGTEXT      NULL,
    `createdAt`    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ConfigurationVersion_settingKey_version_key`(`settingKey`, `version`),
    INDEX `ConfigurationVersion_settingKey_status_idx`(`settingKey`, `status`),
    INDEX `ConfigurationVersion_changedById_idx`(`changedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- â”€â”€ Foreign Keys (separate ALTER TABLE per MySQL best practice) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE `Policy`
    ADD CONSTRAINT `Policy_categoryId_fkey`
        FOREIGN KEY (`categoryId`) REFERENCES `PolicyCategory`(`id`)
            ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `Policy_createdBy_fkey`
        FOREIGN KEY (`createdBy`) REFERENCES `Employee`(`id`)
            ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `Policy_approvedBy_fkey`
        FOREIGN KEY (`approvedBy`) REFERENCES `Employee`(`id`)
            ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `PolicyRule`
    ADD CONSTRAINT `PolicyRule_policyId_fkey`
        FOREIGN KEY (`policyId`) REFERENCES `Policy`(`id`)
            ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `PolicyVersion`
    ADD CONSTRAINT `PolicyVersion_policyId_fkey`
        FOREIGN KEY (`policyId`) REFERENCES `Policy`(`id`)
            ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `PolicyVersion_createdBy_fkey`
        FOREIGN KEY (`createdBy`) REFERENCES `Employee`(`id`)
            ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `PolicyAudit`
    ADD CONSTRAINT `PolicyAudit_policyId_fkey`
        FOREIGN KEY (`policyId`) REFERENCES `Policy`(`id`)
            ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `PolicyAudit_performedBy_fkey`
        FOREIGN KEY (`performedBy`) REFERENCES `Employee`(`id`)
            ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `ConfigurationVersion`
    ADD CONSTRAINT `ConfigurationVersion_changedById_fkey`
        FOREIGN KEY (`changedById`) REFERENCES `Employee`(`id`)
            ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `ConfigurationVersion_reviewedById_fkey`
        FOREIGN KEY (`reviewedById`) REFERENCES `Employee`(`id`)
            ON DELETE SET NULL ON UPDATE CASCADE;


-- ===== 20260604180000_workflow_engine =====
-- Phase 6: Workflow Engine Foundation
-- 7 new tables: workflow_definition, workflow_step, approval_request,
--               approval_action, delegation_rule, escalation_rule, workflow_audit_log
-- All FKs added in separate ALTER TABLE statements (MySQL best practice)
-- Safe to run multiple times (CREATE TABLE IF NOT EXISTS)

-- â”€â”€ 19. WorkflowDefinition â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS `workflow_definition` (
  `id`            INT          NOT NULL AUTO_INCREMENT,
  `name`          VARCHAR(191) NOT NULL,
  `code`          VARCHAR(191) NOT NULL,
  `description`   LONGTEXT     NOT NULL DEFAULT '',
  `module`        VARCHAR(191) NOT NULL,
  `triggerEvent`  VARCHAR(191) NOT NULL,
  `status`        VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
  `conditionJson` LONGTEXT     NULL,
  `version`       INT          NOT NULL DEFAULT 1,
  `createdBy`     INT          NOT NULL,
  `createdAt`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`     DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `workflow_definition_code_key` (`code`),
  INDEX `workflow_definition_module_triggerEvent_idx` (`module`, `triggerEvent`),
  INDEX `workflow_definition_status_idx` (`status`),
  INDEX `workflow_definition_createdBy_idx` (`createdBy`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- â”€â”€ 20. WorkflowStep â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS `workflow_step` (
  `id`              INT          NOT NULL AUTO_INCREMENT,
  `workflowId`      INT          NOT NULL,
  `stepNumber`      INT          NOT NULL,
  `stepName`        VARCHAR(191) NOT NULL,
  `approvalType`    VARCHAR(191) NOT NULL DEFAULT 'REPORTING_MANAGER',
  `approverId`      INT          NULL,
  `approverRoleId`  INT          NULL,
  `approvalMode`    VARCHAR(191) NOT NULL DEFAULT 'SEQUENTIAL',
  `isMandatory`     TINYINT(1)   NOT NULL DEFAULT 1,
  `timeoutHours`    INT          NOT NULL DEFAULT 24,
  `requireComments` TINYINT(1)   NOT NULL DEFAULT 0,
  `createdAt`       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`       DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `workflow_step_workflowId_idx` (`workflowId`),
  INDEX `workflow_step_stepNumber_idx` (`stepNumber`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- â”€â”€ 21. ApprovalRequest â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS `approval_request` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `workflowId`  INT          NOT NULL,
  `entityType`  VARCHAR(191) NOT NULL,
  `entityId`    VARCHAR(191) NOT NULL,
  `requestedBy` INT          NOT NULL,
  `status`      VARCHAR(191) NOT NULL DEFAULT 'PENDING',
  `currentStep` INT          NOT NULL DEFAULT 1,
  `contextJson` LONGTEXT     NULL,
  `submittedAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `completedAt` DATETIME(3)  NULL,
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`   DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `approval_request_workflowId_idx` (`workflowId`),
  INDEX `approval_request_requestedBy_idx` (`requestedBy`),
  INDEX `approval_request_status_idx` (`status`),
  INDEX `approval_request_entityType_entityId_idx` (`entityType`, `entityId`(100))
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- â”€â”€ 22. ApprovalAction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS `approval_action` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `requestId`  INT          NOT NULL,
  `stepId`     INT          NOT NULL,
  `approverId` INT          NOT NULL,
  `action`     VARCHAR(191) NOT NULL,
  `comments`   LONGTEXT     NULL,
  `toUserId`   INT          NULL,
  `createdAt`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `approval_action_requestId_idx` (`requestId`),
  INDEX `approval_action_stepId_idx` (`stepId`),
  INDEX `approval_action_approverId_idx` (`approverId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- â”€â”€ 23. DelegationRule â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS `delegation_rule` (
  `id`        INT          NOT NULL AUTO_INCREMENT,
  `fromUser`  INT          NOT NULL,
  `toUser`    INT          NOT NULL,
  `module`    VARCHAR(191) NULL,
  `startDate` DATETIME(3)  NOT NULL,
  `endDate`   DATETIME(3)  NOT NULL,
  `status`    VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
  `reason`    LONGTEXT     NULL,
  `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `delegation_rule_fromUser_idx` (`fromUser`),
  INDEX `delegation_rule_toUser_idx` (`toUser`),
  INDEX `delegation_rule_status_idx` (`status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- â”€â”€ 24. EscalationRule â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS `escalation_rule` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `workflowId`  INT          NOT NULL,
  `stepId`      INT          NULL,
  `afterHours`  INT          NOT NULL DEFAULT 24,
  `escalateTo`  INT          NULL,
  `action`      VARCHAR(191) NOT NULL DEFAULT 'REMIND',
  `repeatEvery` INT          NULL,
  `maxTriggers` INT          NOT NULL DEFAULT 3,
  `isActive`    TINYINT(1)   NOT NULL DEFAULT 1,
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`   DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `escalation_rule_workflowId_idx` (`workflowId`),
  INDEX `escalation_rule_stepId_idx` (`stepId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- â”€â”€ 25. WorkflowAuditLog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS `workflow_audit_log` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `entityType` VARCHAR(191) NOT NULL,
  `entityId`   INT          NOT NULL,
  `action`     VARCHAR(191) NOT NULL,
  `actorId`    INT          NOT NULL,
  `details`    LONGTEXT     NULL,
  `createdAt`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `workflow_audit_log_entityType_entityId_idx` (`entityType`, `entityId`),
  INDEX `workflow_audit_log_actorId_idx` (`actorId`),
  INDEX `workflow_audit_log_createdAt_idx` (`createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- â”€â”€ Foreign Keys (separate ALTER TABLE â€” MySQL best practice) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

ALTER TABLE `workflow_definition`
  ADD CONSTRAINT `workflow_definition_createdBy_fkey`
    FOREIGN KEY (`createdBy`) REFERENCES `Employee`(`id`);

ALTER TABLE `workflow_step`
  ADD CONSTRAINT `workflow_step_workflowId_fkey`
    FOREIGN KEY (`workflowId`) REFERENCES `workflow_definition`(`id`) ON DELETE CASCADE;

ALTER TABLE `approval_request`
  ADD CONSTRAINT `approval_request_workflowId_fkey`
    FOREIGN KEY (`workflowId`) REFERENCES `workflow_definition`(`id`),
  ADD CONSTRAINT `approval_request_requestedBy_fkey`
    FOREIGN KEY (`requestedBy`) REFERENCES `Employee`(`id`);

ALTER TABLE `approval_action`
  ADD CONSTRAINT `approval_action_requestId_fkey`
    FOREIGN KEY (`requestId`) REFERENCES `approval_request`(`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `approval_action_stepId_fkey`
    FOREIGN KEY (`stepId`) REFERENCES `workflow_step`(`id`),
  ADD CONSTRAINT `approval_action_approverId_fkey`
    FOREIGN KEY (`approverId`) REFERENCES `Employee`(`id`);

ALTER TABLE `delegation_rule`
  ADD CONSTRAINT `delegation_rule_fromUser_fkey`
    FOREIGN KEY (`fromUser`) REFERENCES `Employee`(`id`),
  ADD CONSTRAINT `delegation_rule_toUser_fkey`
    FOREIGN KEY (`toUser`) REFERENCES `Employee`(`id`);

ALTER TABLE `escalation_rule`
  ADD CONSTRAINT `escalation_rule_workflowId_fkey`
    FOREIGN KEY (`workflowId`) REFERENCES `workflow_definition`(`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `escalation_rule_stepId_fkey`
    FOREIGN KEY (`stepId`) REFERENCES `workflow_step`(`id`),
  ADD CONSTRAINT `escalation_rule_escalateTo_fkey`
    FOREIGN KEY (`escalateTo`) REFERENCES `Employee`(`id`);

ALTER TABLE `workflow_audit_log`
  ADD CONSTRAINT `workflow_audit_log_actorId_fkey`
    FOREIGN KEY (`actorId`) REFERENCES `Employee`(`id`);


-- ===== 20260604220000_master_data_management =====
-- Phase 7: Master Data Management
-- 8 new tables: master_category, master_definition, master_value, master_override,
--               master_validation_rule, master_audit, customer_policy, vendor_policy
-- All FKs added in separate ALTER TABLE statements (MySQL best practice)
-- Safe to run multiple times (CREATE TABLE IF NOT EXISTS)

-- â”€â”€ 26. MasterCategory â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS `master_category` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(191) NOT NULL,
  `code`        VARCHAR(191) NOT NULL,
  `description` LONGTEXT     NOT NULL DEFAULT '',
  `status`      VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`   DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `master_category_code_key` (`code`),
  INDEX `master_category_status_idx` (`status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- â”€â”€ 27. MasterDefinition â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS `master_definition` (
  `id`                   INT          NOT NULL AUTO_INCREMENT,
  `categoryId`           INT          NOT NULL,
  `name`                 VARCHAR(191) NOT NULL,
  `code`                 VARCHAR(191) NOT NULL,
  `description`          LONGTEXT     NOT NULL DEFAULT '',
  `allowCompanyOverride` TINYINT(1)   NOT NULL DEFAULT 1,
  `allowBranchOverride`  TINYINT(1)   NOT NULL DEFAULT 0,
  `requiresApproval`     TINYINT(1)   NOT NULL DEFAULT 0,
  `status`               VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
  `createdAt`            DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`            DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `master_definition_code_key` (`code`),
  INDEX `master_definition_categoryId_idx` (`categoryId`),
  INDEX `master_definition_status_idx` (`status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- â”€â”€ 28. MasterValue â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS `master_value` (
  `id`                 INT          NOT NULL AUTO_INCREMENT,
  `masterDefinitionId` INT          NOT NULL,
  `parentId`           INT          NULL,
  `value`              VARCHAR(191) NOT NULL,
  `code`               VARCHAR(191) NOT NULL,
  `description`        LONGTEXT     NOT NULL DEFAULT '',
  `metadataJson`       LONGTEXT     NULL,
  `sortOrder`          INT          NOT NULL DEFAULT 0,
  `status`             VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
  `createdAt`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`          DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `master_value_masterDefinitionId_code_key` (`masterDefinitionId`, `code`),
  INDEX `master_value_masterDefinitionId_idx` (`masterDefinitionId`),
  INDEX `master_value_parentId_idx` (`parentId`),
  INDEX `master_value_status_idx` (`status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- â”€â”€ 29. MasterOverride â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS `master_override` (
  `id`            INT          NOT NULL AUTO_INCREMENT,
  `masterValueId` INT          NOT NULL,
  `scopeType`     VARCHAR(191) NOT NULL,
  `scopeId`       INT          NOT NULL,
  `customValue`   VARCHAR(191) NOT NULL DEFAULT '',
  `isEnabled`     TINYINT(1)   NOT NULL DEFAULT 1,
  `createdAt`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`     DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `master_override_masterValueId_scopeType_scopeId_key` (`masterValueId`, `scopeType`, `scopeId`),
  INDEX `master_override_masterValueId_idx` (`masterValueId`),
  INDEX `master_override_scopeType_scopeId_idx` (`scopeType`, `scopeId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- â”€â”€ 30. MasterValidationRule â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS `master_validation_rule` (
  `id`                 INT          NOT NULL AUTO_INCREMENT,
  `masterDefinitionId` INT          NOT NULL,
  `policyId`           INT          NULL,
  `ruleName`           VARCHAR(191) NOT NULL,
  `isActive`           TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  INDEX `master_validation_rule_masterDefinitionId_idx` (`masterDefinitionId`),
  INDEX `master_validation_rule_policyId_idx` (`policyId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- â”€â”€ 31. MasterAudit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS `master_audit` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `masterId`    INT          NOT NULL,
  `masterType`  VARCHAR(191) NOT NULL,
  `action`      VARCHAR(191) NOT NULL,
  `oldValue`    LONGTEXT     NULL,
  `newValue`    LONGTEXT     NULL,
  `performedBy` INT          NOT NULL,
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `master_audit_masterId_masterType_idx` (`masterId`, `masterType`),
  INDEX `master_audit_performedBy_idx` (`performedBy`),
  INDEX `master_audit_createdAt_idx` (`createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- â”€â”€ 32. CustomerPolicy â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS `customer_policy` (
  `id`                     INT          NOT NULL AUTO_INCREMENT,
  `companyId`              INT          NULL,
  `customerType`           VARCHAR(191) NOT NULL DEFAULT 'ALL',
  `gstRequired`            TINYINT(1)   NOT NULL DEFAULT 1,
  `panRequired`            TINYINT(1)   NOT NULL DEFAULT 0,
  `duplicateThreshold`     INT          NOT NULL DEFAULT 80,
  `creditApprovalRequired` TINYINT(1)   NOT NULL DEFAULT 0,
  `status`                 VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
  `createdAt`              DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`              DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `customer_policy_companyId_idx` (`companyId`),
  INDEX `customer_policy_customerType_idx` (`customerType`),
  INDEX `customer_policy_status_idx` (`status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- â”€â”€ 33. VendorPolicy â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS `vendor_policy` (
  `id`                       INT          NOT NULL AUTO_INCREMENT,
  `companyId`                INT          NULL,
  `gstRequired`              TINYINT(1)   NOT NULL DEFAULT 1,
  `panRequired`              TINYINT(1)   NOT NULL DEFAULT 0,
  `bankVerificationRequired` TINYINT(1)   NOT NULL DEFAULT 0,
  `approvalRequired`         TINYINT(1)   NOT NULL DEFAULT 1,
  `status`                   VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
  `createdAt`                DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`                DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `vendor_policy_companyId_idx` (`companyId`),
  INDEX `vendor_policy_status_idx` (`status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- â”€â”€ Foreign Keys (separate ALTER TABLE â€” MySQL best practice) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

ALTER TABLE `master_definition`
  ADD CONSTRAINT `master_definition_categoryId_fkey`
    FOREIGN KEY (`categoryId`) REFERENCES `master_category`(`id`);

ALTER TABLE `master_value`
  ADD CONSTRAINT `master_value_masterDefinitionId_fkey`
    FOREIGN KEY (`masterDefinitionId`) REFERENCES `master_definition`(`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `master_value_parentId_fkey`
    FOREIGN KEY (`parentId`) REFERENCES `master_value`(`id`) ON DELETE SET NULL;

ALTER TABLE `master_override`
  ADD CONSTRAINT `master_override_masterValueId_fkey`
    FOREIGN KEY (`masterValueId`) REFERENCES `master_value`(`id`) ON DELETE CASCADE;

ALTER TABLE `master_validation_rule`
  ADD CONSTRAINT `master_validation_rule_masterDefinitionId_fkey`
    FOREIGN KEY (`masterDefinitionId`) REFERENCES `master_definition`(`id`) ON DELETE CASCADE;

ALTER TABLE `master_audit`
  ADD CONSTRAINT `master_audit_performedBy_fkey`
    FOREIGN KEY (`performedBy`) REFERENCES `Employee`(`id`);


-- ===== 20260605000000_opportunity_discount_pct =====
-- Add discountPct to CrmOpportunity
-- Stores the discount percentage (0-100) requested on an opportunity.
-- A non-zero value triggers the DISCOUNT_APPROVAL workflow.
ALTER TABLE `CrmOpportunity` ADD COLUMN `discountPct` DOUBLE NOT NULL DEFAULT 0;


-- ===== 20260605010000_crm_admin_engine =====
-- Phase 8: CRM Administration Engine
-- Creates 7 new tables: pipeline_definition, pipeline_stage, territory,
-- territory_rule, account_assignment_rule, crm_automation_rule, sla_rule

CREATE TABLE `pipeline_definition` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `companyId`   INT          NULL,
  `name`        VARCHAR(191) NOT NULL,
  `code`        VARCHAR(191) NOT NULL,
  `description` TEXT         NOT NULL DEFAULT '',
  `isDefault`   TINYINT(1)   NOT NULL DEFAULT 0,
  `status`      VARCHAR(191) NOT NULL DEFAULT 'active',
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`   DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pipeline_definition_code_key` (`code`),
  KEY `pipeline_definition_companyId_idx` (`companyId`),
  KEY `pipeline_definition_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `pipeline_stage` (
  `id`                  INT          NOT NULL AUTO_INCREMENT,
  `pipelineId`          INT          NOT NULL,
  `stageName`           VARCHAR(191) NOT NULL,
  `stageCode`           VARCHAR(191) NOT NULL,
  `sequence`            INT          NOT NULL,
  `probability`         INT          NOT NULL DEFAULT 50,
  `stageType`           VARCHAR(191) NOT NULL DEFAULT 'OPEN',
  `requiresApproval`    TINYINT(1)   NOT NULL DEFAULT 0,
  `mandatoryFieldsJson` TEXT         NOT NULL DEFAULT '[]',
  `entryRuleId`         INT          NULL,
  `exitRuleId`          INT          NULL,
  `status`              VARCHAR(191) NOT NULL DEFAULT 'active',
  `createdAt`           DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`           DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `pipeline_stage_pipelineId_idx` (`pipelineId`),
  KEY `pipeline_stage_pipelineId_sequence_idx` (`pipelineId`, `sequence`),
  CONSTRAINT `pipeline_stage_pipelineId_fkey`
    FOREIGN KEY (`pipelineId`) REFERENCES `pipeline_definition` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `territory` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `companyId`   INT          NULL,
  `name`        VARCHAR(191) NOT NULL,
  `description` TEXT         NOT NULL DEFAULT '',
  `status`      VARCHAR(191) NOT NULL DEFAULT 'active',
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`   DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `territory_companyId_idx` (`companyId`),
  KEY `territory_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `territory_rule` (
  `id`            INT         NOT NULL AUTO_INCREMENT,
  `territoryId`   INT         NOT NULL,
  `conditionJson` TEXT        NOT NULL,
  `createdAt`     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `territory_rule_territoryId_idx` (`territoryId`),
  CONSTRAINT `territory_rule_territoryId_fkey`
    FOREIGN KEY (`territoryId`) REFERENCES `territory` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `account_assignment_rule` (
  `id`            INT          NOT NULL AUTO_INCREMENT,
  `name`          VARCHAR(191) NOT NULL,
  `priority`      INT          NOT NULL DEFAULT 10,
  `conditionJson` TEXT         NOT NULL,
  `assignToType`  VARCHAR(191) NOT NULL,
  `assignToId`    INT          NULL,
  `assignToName`  VARCHAR(191) NOT NULL DEFAULT '',
  `status`        VARCHAR(191) NOT NULL DEFAULT 'active',
  `createdAt`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`     DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `account_assignment_rule_status_priority_idx` (`status`, `priority`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `crm_automation_rule` (
  `id`            INT          NOT NULL AUTO_INCREMENT,
  `name`          VARCHAR(191) NOT NULL,
  `event`         VARCHAR(191) NOT NULL,
  `conditionJson` TEXT         NOT NULL DEFAULT '{}',
  `actionJson`    TEXT         NOT NULL,
  `status`        VARCHAR(191) NOT NULL DEFAULT 'active',
  `createdAt`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`     DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `crm_automation_rule_event_status_idx` (`event`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sla_rule` (
  `id`                 INT          NOT NULL AUTO_INCREMENT,
  `module`             VARCHAR(191) NOT NULL,
  `event`              VARCHAR(191) NOT NULL,
  `label`              VARCHAR(191) NOT NULL DEFAULT '',
  `durationHours`      INT          NOT NULL,
  `warningHours`       INT          NOT NULL DEFAULT 0,
  `escalationPolicyId` INT          NULL,
  `status`             VARCHAR(191) NOT NULL DEFAULT 'active',
  `createdAt`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`          DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sla_rule_module_event_idx` (`module`, `event`),
  KEY `sla_rule_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ===== 20260605020000_opportunity_won_fields =====
-- Add closed-deal fields to CrmOpportunity
-- dealValueExTax: deal value without tax (â‚¹L) â€” mandatory when stage = WON
-- netMargin:      net margin % â€” mandatory when stage = WON
-- poNumber:       purchase order number â€” mandatory when stage = WON
-- poDate:         PO date (optional)

ALTER TABLE `CrmOpportunity`
  ADD COLUMN `dealValueExTax` DOUBLE       NOT NULL DEFAULT 0,
  ADD COLUMN `netMargin`      DOUBLE       NOT NULL DEFAULT 0,
  ADD COLUMN `poNumber`       VARCHAR(191) NOT NULL DEFAULT '',
  ADD COLUMN `poDate`         DATETIME(3)  NULL;


-- ===== 20260605030000_legacy_promote_and_net_profit =====
-- Rename CrmOpportunity.netMargin â†’ netProfitLakhs (absolute net profit in â‚¹L, not a %)
ALTER TABLE `CrmOpportunity`
  CHANGE COLUMN `netMargin` `netProfitLakhs` DOUBLE NOT NULL DEFAULT 0;

-- Track promotion of a legacy SalesFunnel deal to a real CrmOpportunity
ALTER TABLE `SalesFunnel`
  ADD COLUMN `crmOpportunityId` INT NULL;


-- ===== 20260605050000_finance_admin_engine =====
-- Phase 9: Finance Administration Engine
-- 8 new tables: finance_policy, expense_category, expense_limit_rule,
-- conveyance_policy, advance_policy, customer_credit_policy,
-- voucher_configuration, collection_policy

CREATE TABLE `finance_policy` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `companyId`   INT          NULL,
  `policyName`  VARCHAR(191) NOT NULL,
  `policyType`  VARCHAR(191) NOT NULL,
  `policyCode`  VARCHAR(191) NOT NULL DEFAULT '',
  `description` TEXT         NOT NULL DEFAULT '',
  `status`      VARCHAR(191) NOT NULL DEFAULT 'active',
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`   DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `finance_policy_companyId_idx`  (`companyId`),
  KEY `finance_policy_policyType_idx` (`policyType`),
  KEY `finance_policy_status_idx`     (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `expense_category` (
  `id`               INT          NOT NULL AUTO_INCREMENT,
  `companyId`        INT          NULL,
  `name`             VARCHAR(191) NOT NULL,
  `code`             VARCHAR(191) NOT NULL,
  `description`      TEXT         NOT NULL DEFAULT '',
  `requiresReceipt`  TINYINT(1)   NOT NULL DEFAULT 0,
  `requiresApproval` TINYINT(1)   NOT NULL DEFAULT 0,
  `parentId`         INT          NULL,
  `status`           VARCHAR(191) NOT NULL DEFAULT 'active',
  `createdAt`        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`        DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `expense_category_code_key`      (`code`),
  KEY `expense_category_companyId_idx`        (`companyId`),
  KEY `expense_category_parentId_idx`         (`parentId`),
  KEY `expense_category_status_idx`           (`status`),
  CONSTRAINT `expense_category_parentId_fkey` FOREIGN KEY (`parentId`)
    REFERENCES `expense_category` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `expense_limit_rule` (
  `id`                INT          NOT NULL AUTO_INCREMENT,
  `expenseCategoryId` INT          NOT NULL,
  `scopeType`         VARCHAR(191) NOT NULL,
  `scopeId`           VARCHAR(191) NOT NULL,
  `dailyLimit`        DOUBLE       NOT NULL DEFAULT 0,
  `monthlyLimit`      DOUBLE       NOT NULL DEFAULT 0,
  `yearlyLimit`       DOUBLE       NOT NULL DEFAULT 0,
  `policyCode`        VARCHAR(191) NOT NULL DEFAULT '',
  `createdAt`         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`         DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `expense_limit_rule_expenseCategoryId_idx`    (`expenseCategoryId`),
  KEY `expense_limit_rule_scopeType_scopeId_idx`    (`scopeType`, `scopeId`),
  CONSTRAINT `expense_limit_rule_expenseCategoryId_fkey` FOREIGN KEY (`expenseCategoryId`)
    REFERENCES `expense_category` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `conveyance_policy` (
  `id`                       INT          NOT NULL AUTO_INCREMENT,
  `companyId`                INT          NULL,
  `vehicleType`              VARCHAR(191) NOT NULL,
  `ratePerKm`                DOUBLE       NOT NULL DEFAULT 0,
  `monthlyLimitRupees`       DOUBLE       NOT NULL DEFAULT 0,
  `googleMapRequired`        TINYINT(1)   NOT NULL DEFAULT 0,
  `allowManualOverride`      TINYINT(1)   NOT NULL DEFAULT 1,
  `overrideApprovalRequired` TINYINT(1)   NOT NULL DEFAULT 0,
  `status`                   VARCHAR(191) NOT NULL DEFAULT 'active',
  `createdAt`                DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`                DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `conveyance_policy_companyId_idx`   (`companyId`),
  KEY `conveyance_policy_vehicleType_idx` (`vehicleType`),
  KEY `conveyance_policy_status_idx`      (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `advance_policy` (
  `id`               INT          NOT NULL AUTO_INCREMENT,
  `companyId`        INT          NULL,
  `maxAdvanceLakhs`  DOUBLE       NOT NULL DEFAULT 0,
  `settlementDays`   INT          NOT NULL DEFAULT 30,
  `approvalRequired` TINYINT(1)   NOT NULL DEFAULT 1,
  `policyCode`       VARCHAR(191) NOT NULL DEFAULT '',
  `status`           VARCHAR(191) NOT NULL DEFAULT 'active',
  `createdAt`        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`        DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `advance_policy_companyId_idx` (`companyId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `customer_credit_policy` (
  `id`                      INT          NOT NULL AUTO_INCREMENT,
  `companyId`               INT          NULL,
  `customerType`            VARCHAR(191) NOT NULL DEFAULT 'STANDARD',
  `defaultCreditLimitLakhs` DOUBLE       NOT NULL DEFAULT 0,
  `maxCreditLimitLakhs`     DOUBLE       NOT NULL DEFAULT 0,
  `approvalAboveLimit`      TINYINT(1)   NOT NULL DEFAULT 1,
  `paymentTermsDays`        INT          NOT NULL DEFAULT 30,
  `status`                  VARCHAR(191) NOT NULL DEFAULT 'active',
  `createdAt`               DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`               DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `customer_credit_policy_companyId_idx`    (`companyId`),
  KEY `customer_credit_policy_customerType_idx` (`customerType`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `voucher_configuration` (
  `id`                 INT          NOT NULL AUTO_INCREMENT,
  `companyId`          INT          NULL,
  `voucherType`        VARCHAR(191) NOT NULL,
  `prefix`             VARCHAR(191) NOT NULL DEFAULT '',
  `numberFormat`       VARCHAR(191) NOT NULL DEFAULT 'PREFIX-YEAR-SEQ',
  `runningNumber`      INT          NOT NULL DEFAULT 0,
  `financialYearReset` TINYINT(1)   NOT NULL DEFAULT 1,
  `financialYear`      VARCHAR(191) NOT NULL DEFAULT '',
  `status`             VARCHAR(191) NOT NULL DEFAULT 'active',
  `createdAt`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`          DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `voucher_configuration_companyId_idx`   (`companyId`),
  KEY `voucher_configuration_voucherType_idx` (`voucherType`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `collection_policy` (
  `id`             INT          NOT NULL AUTO_INCREMENT,
  `companyId`      INT          NULL,
  `reminderDays`   INT          NOT NULL DEFAULT 7,
  `escalationDays` INT          NOT NULL DEFAULT 14,
  `creditHoldDays` INT          NOT NULL DEFAULT 30,
  `policyCode`     VARCHAR(191) NOT NULL DEFAULT '',
  `status`         VARCHAR(191) NOT NULL DEFAULT 'active',
  `createdAt`      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`      DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `collection_policy_companyId_idx` (`companyId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ===== 20260609060000_performance_management_engine =====
-- Phase 10: Enterprise Performance Management Engine
-- 9 new tables: performance_period, kra_metric, kra_template, kra_template_item,
-- employee_target, team_target, kra_achievement, performance_review, performance_audit

CREATE TABLE `performance_period` (
  `id`            INT          NOT NULL AUTO_INCREMENT,
  `companyId`     INT          NULL,
  `name`          VARCHAR(191) NOT NULL,
  `financialYear` VARCHAR(191) NOT NULL DEFAULT '',
  `periodType`    VARCHAR(191) NOT NULL DEFAULT 'YEARLY',
  `startDate`     DATETIME(3)  NOT NULL,
  `endDate`       DATETIME(3)  NOT NULL,
  `status`        VARCHAR(191) NOT NULL DEFAULT 'active',
  `createdAt`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`     DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `performance_period_companyId_idx` (`companyId`),
  KEY `performance_period_periodType_idx` (`periodType`),
  KEY `performance_period_status_idx` (`status`),
  KEY `performance_period_financialYear_idx` (`financialYear`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `kra_metric` (
  `id`                INT          NOT NULL AUTO_INCREMENT,
  `companyId`         INT          NULL,
  `name`              VARCHAR(191) NOT NULL,
  `code`              VARCHAR(191) NOT NULL,
  `description`       TEXT         NOT NULL DEFAULT '',
  `metricType`        VARCHAR(191) NOT NULL DEFAULT 'CUSTOM',
  `calculationSource` VARCHAR(191) NOT NULL DEFAULT 'MANUAL',
  `formulaJson`       TEXT         NOT NULL DEFAULT '',
  `status`            VARCHAR(191) NOT NULL DEFAULT 'active',
  `createdAt`         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`         DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `kra_metric_code_key` (`code`),
  KEY `kra_metric_companyId_idx` (`companyId`),
  KEY `kra_metric_metricType_idx` (`metricType`),
  KEY `kra_metric_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `kra_template` (
  `id`           INT          NOT NULL AUTO_INCREMENT,
  `companyId`    INT          NULL,
  `name`         VARCHAR(191) NOT NULL,
  `description`  TEXT         NOT NULL DEFAULT '',
  `roleId`       INT          NULL,
  `departmentId` INT          NULL,
  `status`       VARCHAR(191) NOT NULL DEFAULT 'draft',
  `createdAt`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`    DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `kra_template_companyId_idx` (`companyId`),
  KEY `kra_template_roleId_idx` (`roleId`),
  KEY `kra_template_departmentId_idx` (`departmentId`),
  KEY `kra_template_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `kra_template_item` (
  `id`             INT          NOT NULL AUTO_INCREMENT,
  `templateId`     INT          NOT NULL,
  `metricId`       INT          NOT NULL,
  `weightage`      DOUBLE       NOT NULL DEFAULT 0,
  `targetType`     VARCHAR(191) NOT NULL DEFAULT 'AMOUNT',
  `minimumTarget`  DOUBLE       NOT NULL DEFAULT 0,
  `expectedTarget` DOUBLE       NOT NULL DEFAULT 0,
  `stretchTarget`  DOUBLE       NOT NULL DEFAULT 0,
  `sortOrder`      INT          NOT NULL DEFAULT 0,
  `status`         VARCHAR(191) NOT NULL DEFAULT 'active',
  PRIMARY KEY (`id`),
  KEY `kra_template_item_templateId_idx` (`templateId`),
  KEY `kra_template_item_metricId_idx` (`metricId`),
  CONSTRAINT `kra_template_item_templateId_fkey` FOREIGN KEY (`templateId`)
    REFERENCES `kra_template` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `kra_template_item_metricId_fkey` FOREIGN KEY (`metricId`)
    REFERENCES `kra_metric` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `employee_target` (
  `id`                INT          NOT NULL AUTO_INCREMENT,
  `employeeProfileId` INT          NOT NULL,
  `periodId`          INT          NOT NULL,
  `templateId`        INT          NULL,
  `targetJson`        TEXT         NOT NULL DEFAULT '',
  `status`            VARCHAR(191) NOT NULL DEFAULT 'active',
  `createdAt`         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`         DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `employee_target_employeeProfileId_idx` (`employeeProfileId`),
  KEY `employee_target_periodId_idx` (`periodId`),
  KEY `employee_target_templateId_idx` (`templateId`),
  KEY `employee_target_status_idx` (`status`),
  CONSTRAINT `employee_target_periodId_fkey` FOREIGN KEY (`periodId`)
    REFERENCES `performance_period` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `team_target` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `teamId`     INT          NOT NULL,
  `periodId`   INT          NOT NULL,
  `targetJson` TEXT         NOT NULL DEFAULT '',
  `status`     VARCHAR(191) NOT NULL DEFAULT 'active',
  `createdAt`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`  DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `team_target_teamId_idx` (`teamId`),
  KEY `team_target_periodId_idx` (`periodId`),
  CONSTRAINT `team_target_periodId_fkey` FOREIGN KEY (`periodId`)
    REFERENCES `performance_period` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `kra_achievement` (
  `id`                   INT          NOT NULL AUTO_INCREMENT,
  `employeeTargetId`     INT          NOT NULL,
  `metricId`             INT          NOT NULL,
  `actualValue`          DOUBLE       NOT NULL DEFAULT 0,
  `achievementPct`       DOUBLE       NOT NULL DEFAULT 0,
  `weightedScore`        DOUBLE       NOT NULL DEFAULT 0,
  `sourceReference`      VARCHAR(191) NOT NULL DEFAULT '',
  `calculatedAt`         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `status`               VARCHAR(191) NOT NULL DEFAULT 'active',
  PRIMARY KEY (`id`),
  KEY `kra_achievement_employeeTargetId_idx` (`employeeTargetId`),
  KEY `kra_achievement_metricId_idx` (`metricId`),
  CONSTRAINT `kra_achievement_employeeTargetId_fkey` FOREIGN KEY (`employeeTargetId`)
    REFERENCES `employee_target` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `kra_achievement_metricId_fkey` FOREIGN KEY (`metricId`)
    REFERENCES `kra_metric` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `performance_review` (
  `id`                INT          NOT NULL AUTO_INCREMENT,
  `employeeTargetId`  INT          NOT NULL,
  `reviewerId`        INT          NOT NULL,
  `workflowRequestId` INT          NULL,
  `selfRating`        DOUBLE       NOT NULL DEFAULT 0,
  `managerRating`     DOUBLE       NOT NULL DEFAULT 0,
  `finalRating`       DOUBLE       NOT NULL DEFAULT 0,
  `comments`          TEXT         NOT NULL DEFAULT '',
  `status`            VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
  `createdAt`         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`         DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `performance_review_employeeTargetId_idx` (`employeeTargetId`),
  KEY `performance_review_reviewerId_idx` (`reviewerId`),
  KEY `performance_review_status_idx` (`status`),
  CONSTRAINT `performance_review_employeeTargetId_fkey` FOREIGN KEY (`employeeTargetId`)
    REFERENCES `employee_target` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `performance_audit` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `entityType`  VARCHAR(191) NOT NULL,
  `entityId`    INT          NOT NULL,
  `action`      VARCHAR(191) NOT NULL,
  `oldValue`    TEXT         NOT NULL DEFAULT '',
  `newValue`    TEXT         NOT NULL DEFAULT '',
  `performedBy` INT          NOT NULL,
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `performance_audit_entityType_entityId_idx` (`entityType`, `entityId`),
  KEY `performance_audit_performedBy_idx` (`performedBy`),
  KEY `performance_audit_createdAt_idx` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ===== 20260609070000_communication_engine =====
-- Phase 11: Communication Center
-- 7 new tables: communication_event, notification_channel, notification_template,
-- notification_rule, notification_queue, notification_delivery_log, communication_audit

CREATE TABLE `communication_event` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `module`      VARCHAR(191) NOT NULL,
  `eventCode`   VARCHAR(191) NOT NULL,
  `eventName`   VARCHAR(191) NOT NULL,
  `description` TEXT         NOT NULL DEFAULT '',
  `status`      VARCHAR(191) NOT NULL DEFAULT 'active',
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`   DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `communication_event_eventCode_key` (`eventCode`),
  KEY `communication_event_module_idx` (`module`),
  KEY `communication_event_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `notification_channel` (
  `id`           INT          NOT NULL AUTO_INCREMENT,
  `channelName`  VARCHAR(191) NOT NULL,
  `channelCode`  VARCHAR(191) NOT NULL,
  `provider`     VARCHAR(191) NOT NULL DEFAULT '',
  `status`       VARCHAR(191) NOT NULL DEFAULT 'inactive',
  `configJson`   TEXT         NOT NULL DEFAULT '',
  `createdAt`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`    DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `notification_channel_channelCode_key` (`channelCode`),
  KEY `notification_channel_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `notification_template` (
  `id`            INT          NOT NULL AUTO_INCREMENT,
  `eventId`       INT          NULL,
  `channelId`     INT          NULL,
  `templateName`  VARCHAR(191) NOT NULL,
  `subject`       VARCHAR(191) NOT NULL DEFAULT '',
  `body`          TEXT         NOT NULL DEFAULT '',
  `variablesJson` TEXT         NOT NULL DEFAULT '',
  `status`        VARCHAR(191) NOT NULL DEFAULT 'active',
  `createdAt`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`     DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `notification_template_eventId_idx` (`eventId`),
  KEY `notification_template_channelId_idx` (`channelId`),
  KEY `notification_template_status_idx` (`status`),
  CONSTRAINT `notification_template_eventId_fkey` FOREIGN KEY (`eventId`)
    REFERENCES `communication_event` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `notification_template_channelId_fkey` FOREIGN KEY (`channelId`)
    REFERENCES `notification_channel` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `notification_rule` (
  `id`            INT          NOT NULL AUTO_INCREMENT,
  `eventId`       INT          NOT NULL,
  `policyId`      INT          NULL,
  `ruleName`      VARCHAR(191) NOT NULL,
  `conditionJson` TEXT         NOT NULL DEFAULT '',
  `recipientJson` TEXT         NOT NULL DEFAULT '',
  `channelJson`   TEXT         NOT NULL DEFAULT '',
  `frequencyJson` TEXT         NOT NULL DEFAULT '',
  `status`        VARCHAR(191) NOT NULL DEFAULT 'active',
  `createdAt`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`     DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `notification_rule_eventId_idx` (`eventId`),
  KEY `notification_rule_status_idx` (`status`),
  CONSTRAINT `notification_rule_eventId_fkey` FOREIGN KEY (`eventId`)
    REFERENCES `communication_event` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `notification_queue` (
  `id`              INT          NOT NULL AUTO_INCREMENT,
  `eventId`         INT          NOT NULL,
  `templateId`      INT          NULL,
  `recipientUserId` INT          NULL,
  `channel`         VARCHAR(191) NOT NULL DEFAULT 'IN_APP',
  `payloadJson`     TEXT         NOT NULL DEFAULT '',
  `status`          VARCHAR(191) NOT NULL DEFAULT 'PENDING',
  `scheduledAt`     DATETIME(3)  NULL,
  `sentAt`          DATETIME(3)  NULL,
  `failureReason`   TEXT         NOT NULL DEFAULT '',
  `createdAt`       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`       DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `notification_queue_eventId_idx` (`eventId`),
  KEY `notification_queue_recipientUserId_idx` (`recipientUserId`),
  KEY `notification_queue_status_idx` (`status`),
  KEY `notification_queue_channel_idx` (`channel`),
  KEY `notification_queue_scheduledAt_idx` (`scheduledAt`),
  CONSTRAINT `notification_queue_eventId_fkey` FOREIGN KEY (`eventId`)
    REFERENCES `communication_event` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `notification_delivery_log` (
  `id`           INT          NOT NULL AUTO_INCREMENT,
  `queueId`      INT          NOT NULL,
  `channel`      VARCHAR(191) NOT NULL,
  `provider`     VARCHAR(191) NOT NULL DEFAULT '',
  `status`       VARCHAR(191) NOT NULL DEFAULT 'PENDING',
  `responseJson` TEXT         NOT NULL DEFAULT '',
  `createdAt`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `notification_delivery_log_queueId_idx` (`queueId`),
  KEY `notification_delivery_log_status_idx` (`status`),
  KEY `notification_delivery_log_channel_idx` (`channel`),
  CONSTRAINT `notification_delivery_log_queueId_fkey` FOREIGN KEY (`queueId`)
    REFERENCES `notification_queue` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `communication_audit` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `entityType`  VARCHAR(191) NOT NULL,
  `entityId`    INT          NOT NULL,
  `action`      VARCHAR(191) NOT NULL,
  `oldValue`    TEXT         NOT NULL DEFAULT '',
  `newValue`    TEXT         NOT NULL DEFAULT '',
  `performedBy` INT          NOT NULL,
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `communication_audit_entityType_entityId_idx` (`entityType`, `entityId`),
  KEY `communication_audit_performedBy_idx` (`performedBy`),
  KEY `communication_audit_createdAt_idx` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ===== 20260610080000_integration_center =====
-- Phase 12: Integration Center
-- Tables: integration_provider, integration_connection, integration_usage_rule, integration_log, api_key_reference

CREATE TABLE IF NOT EXISTS `integration_provider` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(120) NOT NULL,
  `code`        VARCHAR(60)  NOT NULL,
  `category`    VARCHAR(40)  NOT NULL DEFAULT 'CUSTOM_API',
  `description` TEXT         NOT NULL DEFAULT '',
  `logoUrl`     VARCHAR(255) NULL,
  `docsUrl`     VARCHAR(255) NULL,
  `status`      VARCHAR(20)  NOT NULL DEFAULT 'INACTIVE',
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `integration_provider_code_key` (`code`),
  KEY `integration_provider_category_idx` (`category`),
  KEY `integration_provider_status_idx` (`status`)
);

CREATE TABLE IF NOT EXISTS `integration_connection` (
  `id`             INT          NOT NULL AUTO_INCREMENT,
  `providerId`     INT          NOT NULL,
  `companyId`      INT          NULL,
  `connectionName` VARCHAR(120) NOT NULL,
  `authType`       VARCHAR(30)  NOT NULL DEFAULT 'ENV_REFERENCE',
  `configJson`     TEXT         NOT NULL DEFAULT '{}',
  `secretRef`      VARCHAR(255) NULL,
  `status`         VARCHAR(20)  NOT NULL DEFAULT 'INACTIVE',
  `lastTestedAt`   DATETIME(3)  NULL,
  `lastTestStatus` VARCHAR(20)  NULL,
  `createdAt`      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `integration_connection_providerId_idx` (`providerId`),
  KEY `integration_connection_companyId_idx` (`companyId`),
  KEY `integration_connection_status_idx` (`status`),
  CONSTRAINT `fk_ic_provider` FOREIGN KEY (`providerId`) REFERENCES `integration_provider` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `integration_usage_rule` (
  `id`           INT         NOT NULL AUTO_INCREMENT,
  `connectionId` INT         NOT NULL,
  `module`       VARCHAR(60) NOT NULL,
  `event`        VARCHAR(60) NOT NULL,
  `policyId`     INT         NULL,
  `status`       VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  `createdAt`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `integration_usage_rule_connectionId_idx` (`connectionId`),
  KEY `integration_usage_rule_module_idx` (`module`),
  CONSTRAINT `fk_iur_connection` FOREIGN KEY (`connectionId`) REFERENCES `integration_connection` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `integration_log` (
  `id`                  INT          NOT NULL AUTO_INCREMENT,
  `connectionId`        INT          NOT NULL,
  `module`              VARCHAR(60)  NOT NULL DEFAULT '',
  `event`               VARCHAR(60)  NOT NULL DEFAULT '',
  `requestSummaryJson`  TEXT         NOT NULL DEFAULT '{}',
  `responseSummaryJson` TEXT         NOT NULL DEFAULT '{}',
  `status`              VARCHAR(20)  NOT NULL DEFAULT 'SUCCESS',
  `errorMessage`        TEXT         NULL,
  `createdAt`           DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `integration_log_connectionId_idx` (`connectionId`),
  KEY `integration_log_status_idx` (`status`),
  KEY `integration_log_createdAt_idx` (`createdAt`),
  CONSTRAINT `fk_il_connection` FOREIGN KEY (`connectionId`) REFERENCES `integration_connection` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `api_key_reference` (
  `id`                    INT          NOT NULL AUTO_INCREMENT,
  `companyId`             INT          NULL,
  `name`                  VARCHAR(120) NOT NULL,
  `keyType`               VARCHAR(60)  NOT NULL DEFAULT 'API_KEY',
  `environmentVariableName` VARCHAR(120) NOT NULL,
  `description`           TEXT         NOT NULL DEFAULT '',
  `status`                VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
  `createdAt`             DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`             DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `api_key_reference_envVar_key` (`environmentVariableName`),
  KEY `api_key_reference_companyId_idx` (`companyId`),
  KEY `api_key_reference_status_idx` (`status`)
);


-- ===== 20260610090000_security_center =====
-- Phase 13: Enterprise Security Center
-- 7 tables: security_policy, password_policy, mfa_policy, session_policy,
--           access_restriction_policy, data_protection_policy, security_event_log

CREATE TABLE IF NOT EXISTS `security_policy` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `companyId`  INT          NULL,
  `policyName` VARCHAR(120) NOT NULL,
  `policyType` VARCHAR(30)  NOT NULL DEFAULT 'PASSWORD',
  `policyJson` TEXT         NOT NULL DEFAULT '{}',
  `status`     VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
  `createdAt`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `security_policy_companyId_idx` (`companyId`),
  KEY `security_policy_policyType_idx` (`policyType`),
  KEY `security_policy_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `password_policy` (
  `id`                    INT         NOT NULL AUTO_INCREMENT,
  `companyId`             INT         NULL,
  `minimumLength`         INT         NOT NULL DEFAULT 8,
  `requireUppercase`      TINYINT(1)  NOT NULL DEFAULT 1,
  `requireLowercase`      TINYINT(1)  NOT NULL DEFAULT 1,
  `requireNumber`         TINYINT(1)  NOT NULL DEFAULT 1,
  `requireSpecialCharacter` TINYINT(1) NOT NULL DEFAULT 0,
  `expiryDays`            INT         NOT NULL DEFAULT 90,
  `passwordHistoryCount`  INT         NOT NULL DEFAULT 5,
  `failedAttemptLimit`    INT         NOT NULL DEFAULT 5,
  `lockDurationMinutes`   INT         NOT NULL DEFAULT 30,
  `status`                VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  `createdAt`             DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`             DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `password_policy_companyId_idx` (`companyId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `mfa_policy` (
  `id`                INT         NOT NULL AUTO_INCREMENT,
  `companyId`         INT         NULL,
  `enabled`           TINYINT(1)  NOT NULL DEFAULT 0,
  `requiredRolesJson` TEXT        NOT NULL DEFAULT '[]',
  `methodsJson`       TEXT        NOT NULL DEFAULT '["EMAIL"]',
  `rememberDeviceDays` INT        NOT NULL DEFAULT 30,
  `status`            VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  `createdAt`         DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`         DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `mfa_policy_companyId_idx` (`companyId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `session_policy` (
  `id`                    INT         NOT NULL AUTO_INCREMENT,
  `companyId`             INT         NULL,
  `idleTimeoutMinutes`    INT         NOT NULL DEFAULT 480,
  `maxSessionHours`       INT         NOT NULL DEFAULT 8,
  `allowConcurrentLogin`  TINYINT(1)  NOT NULL DEFAULT 1,
  `maxConcurrentSessions` INT         NOT NULL DEFAULT 3,
  `rememberMeAllowed`     TINYINT(1)  NOT NULL DEFAULT 1,
  `status`                VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  `createdAt`             DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`             DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `session_policy_companyId_idx` (`companyId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `access_restriction_policy` (
  `id`                       INT         NOT NULL AUTO_INCREMENT,
  `companyId`                INT         NULL,
  `ipRestrictionEnabled`     TINYINT(1)  NOT NULL DEFAULT 0,
  `allowedIpJson`            TEXT        NOT NULL DEFAULT '[]',
  `businessHourRestriction`  TINYINT(1)  NOT NULL DEFAULT 0,
  `allowedHoursJson`         TEXT        NOT NULL DEFAULT '{"start":"09:00","end":"18:00","days":[1,2,3,4,5]}',
  `locationRestrictionJson`  TEXT        NOT NULL DEFAULT '{}',
  `status`                   VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  `createdAt`                DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`                DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `access_restriction_policy_companyId_idx` (`companyId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `data_protection_policy` (
  `id`                    INT         NOT NULL AUTO_INCREMENT,
  `companyId`             INT         NULL,
  `exportLimit`           INT         NOT NULL DEFAULT 1000,
  `exportApprovalRequired` TINYINT(1) NOT NULL DEFAULT 0,
  `downloadRestriction`   TINYINT(1)  NOT NULL DEFAULT 0,
  `sensitiveFieldsJson`   TEXT        NOT NULL DEFAULT '[]',
  `maskingRulesJson`      TEXT        NOT NULL DEFAULT '[]',
  `status`                VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  `createdAt`             DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`             DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `data_protection_policy_companyId_idx` (`companyId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `security_event_log` (
  `id`           INT          NOT NULL AUTO_INCREMENT,
  `userId`       INT          NULL,
  `eventType`    VARCHAR(60)  NOT NULL,
  `metadataJson` TEXT         NOT NULL DEFAULT '{}',
  `ipAddress`    VARCHAR(60)  NULL,
  `userAgent`    TEXT         NULL,
  `createdAt`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `security_event_log_userId_idx` (`userId`),
  KEY `security_event_log_eventType_idx` (`eventType`),
  KEY `security_event_log_createdAt_idx` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ===== 20260615000000_add_advance_category =====
ALTER TABLE `EmployeeAdvance` ADD COLUMN `category` VARCHAR(191) NOT NULL DEFAULT 'Other';


-- ===== 20260617100000_employeetarget_relations =====
-- AddForeignKey: EmployeeTarget â†’ EmployeeProfile
ALTER TABLE `employee_target` ADD CONSTRAINT `employee_target_employeeProfileId_fkey`
  FOREIGN KEY (`employeeProfileId`) REFERENCES `EmployeeProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: EmployeeTarget â†’ KRATemplate
ALTER TABLE `employee_target` ADD CONSTRAINT `employee_target_templateId_fkey`
  FOREIGN KEY (`templateId`) REFERENCES `kra_template`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;


-- ===== 20260618000000_master_data_linkage =====
-- Phase 17: Master Data Linkage
-- Adds nullable customerId FK to 4 operational tables, and expenseCategoryId FK to Expense.
-- String fields (customerName, category) are KEPT for backward compatibility.
-- Backfill is handled separately by scripts/phase17-backfill-customer-fks.mjs

-- LeadGeneration â†’ Customer
ALTER TABLE `LeadGeneration`
  ADD COLUMN `customerId` INT NULL;
ALTER TABLE `LeadGeneration`
  ADD CONSTRAINT `LeadGeneration_customerId_fkey`
  FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX `LeadGeneration_customerId_idx` ON `LeadGeneration`(`customerId`);

-- SalesFunnel â†’ Customer
ALTER TABLE `SalesFunnel`
  ADD COLUMN `customerId` INT NULL;
ALTER TABLE `SalesFunnel`
  ADD CONSTRAINT `SalesFunnel_customerId_fkey`
  FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX `SalesFunnel_customerId_idx` ON `SalesFunnel`(`customerId`);

-- Collection â†’ Customer
ALTER TABLE `Collection`
  ADD COLUMN `customerId` INT NULL;
ALTER TABLE `Collection`
  ADD CONSTRAINT `Collection_customerId_fkey`
  FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX `Collection_customerId_idx` ON `Collection`(`customerId`);

-- OrderAdvance â†’ Customer
ALTER TABLE `OrderAdvance`
  ADD COLUMN `customerId` INT NULL;
ALTER TABLE `OrderAdvance`
  ADD CONSTRAINT `OrderAdvance_customerId_fkey`
  FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX `OrderAdvance_customerId_idx` ON `OrderAdvance`(`customerId`);

-- Expense â†’ ExpenseCategory
ALTER TABLE `Expense`
  ADD COLUMN `expenseCategoryId` INT NULL;
ALTER TABLE `Expense`
  ADD CONSTRAINT `Expense_expenseCategoryId_fkey`
  FOREIGN KEY (`expenseCategoryId`) REFERENCES `expense_category`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX `Expense_expenseCategoryId_idx` ON `Expense`(`expenseCategoryId`);


-- ===== 20260618100000_crm_lead_customer_ref =====
-- CrmLead: add customerRefId FK â†’ Customer master
ALTER TABLE `CrmLead` ADD COLUMN `customerRefId` INT NULL;
ALTER TABLE `CrmLead` ADD CONSTRAINT `CrmLead_customerRefId_fkey` FOREIGN KEY (`customerRefId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX `CrmLead_customerRefId_idx` ON `CrmLead`(`customerRefId`);




-- ===== Prisma migration tracking (marks all migrations as applied) =====
CREATE TABLE IF NOT EXISTS _prisma_migrations (
  id varchar(36) NOT NULL,
  checksum varchar(64) NOT NULL,
  inished_at datetime(3) DEFAULT NULL,
  migration_name varchar(255) NOT NULL,
  logs text DEFAULT NULL,
  olled_back_at datetime(3) DEFAULT NULL,
  started_at datetime(3) NOT NULL DEFAULT current_timestamp(3),
  pplied_steps_count int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO `_prisma_migrations` (`id`, `checksum`, `finished_at`, `migration_name`, `applied_steps_count`) VALUES ('5d99bb98-a2a9-483a-a0aa-8de831dada8f', 'uat-init', NOW(3), '20260601000000_init_mysql', 1);
INSERT INTO `_prisma_migrations` (`id`, `checksum`, `finished_at`, `migration_name`, `applied_steps_count`) VALUES ('0bd35b75-859d-495b-93ef-97a4f1a6cbaf', 'uat-init', NOW(3), '20260602120000_finance_operations_phase1', 1);
INSERT INTO `_prisma_migrations` (`id`, `checksum`, `finished_at`, `migration_name`, `applied_steps_count`) VALUES ('421b60ca-07fa-4257-9d39-595017c9ca79', 'uat-init', NOW(3), '20260604000000_admin_console_foundation', 1);
INSERT INTO `_prisma_migrations` (`id`, `checksum`, `finished_at`, `migration_name`, `applied_steps_count`) VALUES ('d85bc55a-cd6b-4d30-b498-f940ea41263c', 'uat-init', NOW(3), '20260604120000_policy_engine_foundation', 1);
INSERT INTO `_prisma_migrations` (`id`, `checksum`, `finished_at`, `migration_name`, `applied_steps_count`) VALUES ('a6dd26bb-1731-4131-91c3-32fddbd5e0b9', 'uat-init', NOW(3), '20260604180000_workflow_engine', 1);
INSERT INTO `_prisma_migrations` (`id`, `checksum`, `finished_at`, `migration_name`, `applied_steps_count`) VALUES ('812eb8e5-d612-430a-9447-6efdd8809aad', 'uat-init', NOW(3), '20260604220000_master_data_management', 1);
INSERT INTO `_prisma_migrations` (`id`, `checksum`, `finished_at`, `migration_name`, `applied_steps_count`) VALUES ('532013ce-4e8a-4a95-bcbb-22cca5ff8fac', 'uat-init', NOW(3), '20260605000000_opportunity_discount_pct', 1);
INSERT INTO `_prisma_migrations` (`id`, `checksum`, `finished_at`, `migration_name`, `applied_steps_count`) VALUES ('b2951cbd-f72c-491a-971b-50d74f3eb49e', 'uat-init', NOW(3), '20260605010000_crm_admin_engine', 1);
INSERT INTO `_prisma_migrations` (`id`, `checksum`, `finished_at`, `migration_name`, `applied_steps_count`) VALUES ('362ce431-526f-4922-acea-3f7b84ab72e0', 'uat-init', NOW(3), '20260605020000_opportunity_won_fields', 1);
INSERT INTO `_prisma_migrations` (`id`, `checksum`, `finished_at`, `migration_name`, `applied_steps_count`) VALUES ('6143626e-b974-4bfe-9f3b-b37c9ed426d2', 'uat-init', NOW(3), '20260605030000_legacy_promote_and_net_profit', 1);
INSERT INTO `_prisma_migrations` (`id`, `checksum`, `finished_at`, `migration_name`, `applied_steps_count`) VALUES ('243e8243-c77d-4e4f-b580-5d45399dbc8a', 'uat-init', NOW(3), '20260605050000_finance_admin_engine', 1);
INSERT INTO `_prisma_migrations` (`id`, `checksum`, `finished_at`, `migration_name`, `applied_steps_count`) VALUES ('5200cb6c-2e33-491a-926b-6ff527424565', 'uat-init', NOW(3), '20260609060000_performance_management_engine', 1);
INSERT INTO `_prisma_migrations` (`id`, `checksum`, `finished_at`, `migration_name`, `applied_steps_count`) VALUES ('53d77b52-ff59-4e6f-895a-51d95390279a', 'uat-init', NOW(3), '20260609070000_communication_engine', 1);
INSERT INTO `_prisma_migrations` (`id`, `checksum`, `finished_at`, `migration_name`, `applied_steps_count`) VALUES ('5b9e9f47-480c-43de-b62e-8b1488d253e4', 'uat-init', NOW(3), '20260610080000_integration_center', 1);
INSERT INTO `_prisma_migrations` (`id`, `checksum`, `finished_at`, `migration_name`, `applied_steps_count`) VALUES ('a60350dd-7165-4c15-ae0d-fff6cd4b1ce1', 'uat-init', NOW(3), '20260610090000_security_center', 1);
INSERT INTO `_prisma_migrations` (`id`, `checksum`, `finished_at`, `migration_name`, `applied_steps_count`) VALUES ('8c9b130d-77b5-4359-bcb8-47225ec350ae', 'uat-init', NOW(3), '20260615000000_add_advance_category', 1);
INSERT INTO `_prisma_migrations` (`id`, `checksum`, `finished_at`, `migration_name`, `applied_steps_count`) VALUES ('b964356a-3351-47bb-8b32-9936a6e2fbe9', 'uat-init', NOW(3), '20260617100000_employeetarget_relations', 1);
INSERT INTO `_prisma_migrations` (`id`, `checksum`, `finished_at`, `migration_name`, `applied_steps_count`) VALUES ('19857507-2399-4a89-bb84-4a792ad1b419', 'uat-init', NOW(3), '20260618000000_master_data_linkage', 1);
INSERT INTO `_prisma_migrations` (`id`, `checksum`, `finished_at`, `migration_name`, `applied_steps_count`) VALUES ('f74411b1-31a4-40c4-9fce-b5680e8f2a45', 'uat-init', NOW(3), '20260618100000_crm_lead_customer_ref', 1);

