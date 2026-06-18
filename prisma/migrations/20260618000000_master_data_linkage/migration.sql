-- Phase 17: Master Data Linkage
-- Adds nullable customerId FK to 4 operational tables, and expenseCategoryId FK to Expense.
-- String fields (customerName, category) are KEPT for backward compatibility.
-- Backfill is handled separately by scripts/phase17-backfill-customer-fks.mjs

-- LeadGeneration → Customer
ALTER TABLE `LeadGeneration`
  ADD COLUMN `customerId` INT NULL;
ALTER TABLE `LeadGeneration`
  ADD CONSTRAINT `LeadGeneration_customerId_fkey`
  FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX `LeadGeneration_customerId_idx` ON `LeadGeneration`(`customerId`);

-- SalesFunnel → Customer
ALTER TABLE `SalesFunnel`
  ADD COLUMN `customerId` INT NULL;
ALTER TABLE `SalesFunnel`
  ADD CONSTRAINT `SalesFunnel_customerId_fkey`
  FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX `SalesFunnel_customerId_idx` ON `SalesFunnel`(`customerId`);

-- Collection → Customer
ALTER TABLE `Collection`
  ADD COLUMN `customerId` INT NULL;
ALTER TABLE `Collection`
  ADD CONSTRAINT `Collection_customerId_fkey`
  FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX `Collection_customerId_idx` ON `Collection`(`customerId`);

-- OrderAdvance → Customer
ALTER TABLE `OrderAdvance`
  ADD COLUMN `customerId` INT NULL;
ALTER TABLE `OrderAdvance`
  ADD CONSTRAINT `OrderAdvance_customerId_fkey`
  FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX `OrderAdvance_customerId_idx` ON `OrderAdvance`(`customerId`);

-- Expense → ExpenseCategory
ALTER TABLE `Expense`
  ADD COLUMN `expenseCategoryId` INT NULL;
ALTER TABLE `Expense`
  ADD CONSTRAINT `Expense_expenseCategoryId_fkey`
  FOREIGN KEY (`expenseCategoryId`) REFERENCES `expense_category`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX `Expense_expenseCategoryId_idx` ON `Expense`(`expenseCategoryId`);
