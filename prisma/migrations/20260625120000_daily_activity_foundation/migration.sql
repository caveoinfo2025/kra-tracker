-- Daily Activity & Productivity — Phase W1 schema foundation (DRAFT, NOT APPLIED).
-- See docs/webapp/DAILY_ACTIVITY_SCHEMA_DESIGN_REVIEW.md for the full design review.
--
-- Hand-written rather than tool-generated: `prisma migrate dev` requires a shadow database
-- (this project's Hostinger MySQL user has no CREATE DATABASE privilege for one — the same
-- documented limitation prior migrations in this repo hit, see docs/PROJECT_MEMORY.md and
-- docs/RBAC_MIGRATION_TRACKER.md row 3B), and `prisma migrate diff --from-config-datasource`
-- requires connecting to the live configured database to introspect it, which was correctly
-- declined for this draft-only step. This file was authored directly from the new
-- `prisma/schema.prisma` models below, following this project's existing MySQL/Prisma DDL
-- conventions (column types, FK naming, index naming) as seen in every prior migration in
-- this folder. It has NOT been applied, executed, or run against any database.
--
-- Additive only: 6 new tables, 2 new columns + 1 new index on an existing table (CrmMeeting).
-- No DROP, no ALTER...MODIFY, no data migration, no destructive SQL of any kind.

-- AlterTable: CrmMeeting — add status field so meeting completion can later be detected as a
-- SCHEDULED → COMPLETED transition (mirrors the existing CrmTask.status pattern). No capture
-- logic added in this step — schema only.
ALTER TABLE `CrmMeeting` ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'SCHEDULED';

-- CreateIndex
CREATE INDEX `CrmMeeting_status_idx` ON `CrmMeeting`(`status`);

-- CreateTable
CREATE TABLE `DailyActivityLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER NOT NULL,
    `activityDate` DATE NOT NULL,
    `activityType` VARCHAR(191) NOT NULL,
    `sourceType` VARCHAR(191) NOT NULL,
    `sourceId` INTEGER NULL,
    `sourceTable` VARCHAR(191) NOT NULL DEFAULT '',
    `sourceAction` VARCHAR(191) NOT NULL DEFAULT '',
    `points` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'CAPTURED',
    `capturedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `countedAt` DATETIME(3) NULL,
    `isCorrection` BOOLEAN NOT NULL DEFAULT false,
    `correctionRequestId` INTEGER NULL,
    `metadataJson` TEXT NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DailyActivityLog_employeeId_activityDate_idx`(`employeeId`, `activityDate`),
    INDEX `DailyActivityLog_activityType_idx`(`activityType`),
    INDEX `DailyActivityLog_sourceType_sourceId_idx`(`sourceType`, `sourceId`),
    INDEX `DailyActivityLog_correctionRequestId_idx`(`correctionRequestId`),
    UNIQUE INDEX `uq_activity_log_event_per_day`(`employeeId`, `sourceType`, `sourceId`, `sourceAction`, `activityDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DailyActivitySummary` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER NOT NULL,
    `summaryDate` DATE NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'NO_ACTIVITY',
    `productivityBand` VARCHAR(191) NOT NULL DEFAULT 'NO_ACTIVITY',
    `totalPoints` INTEGER NOT NULL DEFAULT 0,
    `autoSummaryJson` TEXT NOT NULL DEFAULT '',
    `blockers` TEXT NOT NULL DEFAULT '',
    `nextDayPlan` TEXT NOT NULL DEFAULT '',
    `finalRemarks` TEXT NOT NULL DEFAULT '',
    `submittedAt` DATETIME(3) NULL,
    `closedAt` DATETIME(3) NULL,
    `lockedAt` DATETIME(3) NULL,
    `reopenedAt` DATETIME(3) NULL,
    `reopenedById` INTEGER NULL,
    `lateSubmittedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DailyActivitySummary_employeeId_summaryDate_key`(`employeeId`, `summaryDate`),
    INDEX `DailyActivitySummary_status_idx`(`status`),
    INDEX `DailyActivitySummary_summaryDate_idx`(`summaryDate`),
    INDEX `DailyActivitySummary_reopenedById_idx`(`reopenedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DailyActivityCorrectionRequest` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER NOT NULL,
    `summaryId` INTEGER NOT NULL,
    `activityLogId` INTEGER NULL,
    `requestedActivityType` VARCHAR(191) NOT NULL DEFAULT '',
    `requestedSourceType` VARCHAR(191) NOT NULL DEFAULT '',
    `requestedSourceId` INTEGER NULL,
    `reason` TEXT NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `managerId` INTEGER NULL,
    `managerDecisionAt` DATETIME(3) NULL,
    `managerRemarks` TEXT NOT NULL DEFAULT '',
    `approvedPoints` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DailyActivityCorrectionRequest_summaryId_status_idx`(`summaryId`, `status`),
    INDEX `DailyActivityCorrectionRequest_employeeId_status_idx`(`employeeId`, `status`),
    INDEX `DailyActivityCorrectionRequest_activityLogId_idx`(`activityLogId`),
    INDEX `DailyActivityCorrectionRequest_managerId_idx`(`managerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DailyProductivityScore` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER NOT NULL,
    `periodType` VARCHAR(191) NOT NULL,
    `periodStart` DATE NOT NULL,
    `periodEnd` DATE NOT NULL,
    `totalPoints` INTEGER NOT NULL DEFAULT 0,
    `closedDays` INTEGER NOT NULL DEFAULT 0,
    `incompleteDays` INTEGER NOT NULL DEFAULT 0,
    `absentDays` INTEGER NOT NULL DEFAULT 0,
    `productivityBand` VARCHAR(191) NOT NULL DEFAULT 'NO_ACTIVITY',
    `kraEligiblePoints` INTEGER NOT NULL DEFAULT 0,
    `qualityIndicatorJson` TEXT NOT NULL DEFAULT '',
    `generatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DailyProductivityScore_employeeId_periodType_periodStart_periodEnd_key`(`employeeId`, `periodType`, `periodStart`, `periodEnd`),
    INDEX `DailyProductivityScore_periodType_periodStart_idx`(`periodType`, `periodStart`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductivityActivityRule` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `activityType` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL DEFAULT '',
    `points` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `appliesToRole` VARCHAR(191) NULL,
    `effectiveFrom` DATETIME(3) NULL,
    `effectiveTo` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ProductivityActivityRule_activityType_isActive_idx`(`activityType`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductivityRoleTarget` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `roleName` VARCHAR(191) NOT NULL,
    `dailyTargetPoints` INTEGER NULL,
    `weeklyTargetPoints` INTEGER NULL,
    `monthlyTargetPoints` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `effectiveFrom` DATETIME(3) NULL,
    `effectiveTo` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ProductivityRoleTarget_roleName_isActive_idx`(`roleName`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `DailyActivityLog` ADD CONSTRAINT `DailyActivityLog_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DailyActivityLog` ADD CONSTRAINT `DailyActivityLog_correctionRequestId_fkey` FOREIGN KEY (`correctionRequestId`) REFERENCES `DailyActivityCorrectionRequest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DailyActivitySummary` ADD CONSTRAINT `DailyActivitySummary_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DailyActivitySummary` ADD CONSTRAINT `DailyActivitySummary_reopenedById_fkey` FOREIGN KEY (`reopenedById`) REFERENCES `Employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DailyActivityCorrectionRequest` ADD CONSTRAINT `DailyActivityCorrectionRequest_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DailyActivityCorrectionRequest` ADD CONSTRAINT `DailyActivityCorrectionRequest_summaryId_fkey` FOREIGN KEY (`summaryId`) REFERENCES `DailyActivitySummary`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DailyActivityCorrectionRequest` ADD CONSTRAINT `DailyActivityCorrectionRequest_activityLogId_fkey` FOREIGN KEY (`activityLogId`) REFERENCES `DailyActivityLog`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DailyActivityCorrectionRequest` ADD CONSTRAINT `DailyActivityCorrectionRequest_managerId_fkey` FOREIGN KEY (`managerId`) REFERENCES `Employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DailyProductivityScore` ADD CONSTRAINT `DailyProductivityScore_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
