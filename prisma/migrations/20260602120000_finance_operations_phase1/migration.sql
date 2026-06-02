-- Finance Operations Module — Phase 1 (database only)
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
