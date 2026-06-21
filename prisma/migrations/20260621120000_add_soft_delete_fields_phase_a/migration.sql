-- Step 3B: add deletedAt/deletedById/deleteReason soft-delete fields to the 7 approved
-- Phase A models, per docs/database/SOFT_DELETE_DECISION_LOG.md.
-- Additive only: ADD COLUMN (all nullable) + CREATE INDEX. No drops, no NOT NULL, no data change.
-- Voucher, Ledger, Employee, and all RBAC models are intentionally excluded from this migration.

-- AlterTable
ALTER TABLE `Collection` ADD COLUMN `deleteReason` TEXT NULL,
    ADD COLUMN `deletedAt` DATETIME(3) NULL,
    ADD COLUMN `deletedById` INTEGER NULL;

-- AlterTable
ALTER TABLE `Customer` ADD COLUMN `deleteReason` TEXT NULL,
    ADD COLUMN `deletedAt` DATETIME(3) NULL,
    ADD COLUMN `deletedById` INTEGER NULL;

-- AlterTable
ALTER TABLE `EmployeeAdvance` ADD COLUMN `deleteReason` TEXT NULL,
    ADD COLUMN `deletedAt` DATETIME(3) NULL,
    ADD COLUMN `deletedById` INTEGER NULL;

-- AlterTable
ALTER TABLE `Expense` ADD COLUMN `deleteReason` TEXT NULL,
    ADD COLUMN `deletedAt` DATETIME(3) NULL,
    ADD COLUMN `deletedById` INTEGER NULL;

-- AlterTable
ALTER TABLE `Payment` ADD COLUMN `deleteReason` TEXT NULL,
    ADD COLUMN `deletedAt` DATETIME(3) NULL,
    ADD COLUMN `deletedById` INTEGER NULL;

-- AlterTable
ALTER TABLE `TravelClaim` ADD COLUMN `deleteReason` TEXT NULL,
    ADD COLUMN `deletedAt` DATETIME(3) NULL,
    ADD COLUMN `deletedById` INTEGER NULL;

-- AlterTable
ALTER TABLE `Vendor` ADD COLUMN `deleteReason` TEXT NULL,
    ADD COLUMN `deletedAt` DATETIME(3) NULL,
    ADD COLUMN `deletedById` INTEGER NULL;

-- CreateIndex
CREATE INDEX `Collection_deletedAt_idx` ON `Collection`(`deletedAt`);

-- CreateIndex
CREATE INDEX `Customer_deletedAt_idx` ON `Customer`(`deletedAt`);

-- CreateIndex
CREATE INDEX `EmployeeAdvance_deletedAt_idx` ON `EmployeeAdvance`(`deletedAt`);

-- CreateIndex
CREATE INDEX `Expense_deletedAt_idx` ON `Expense`(`deletedAt`);

-- CreateIndex
CREATE INDEX `Payment_deletedAt_idx` ON `Payment`(`deletedAt`);

-- CreateIndex
CREATE INDEX `TravelClaim_deletedAt_idx` ON `TravelClaim`(`deletedAt`);

-- CreateIndex
CREATE INDEX `Vendor_deletedAt_idx` ON `Vendor`(`deletedAt`);
