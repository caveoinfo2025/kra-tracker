# UAT Migration SQL Execution Log
Executed: 2026-06-24T03:36:14.478Z
Target DB (from DATABASE_URL): u686730471_Caveo_UAT

## Statement 1 — OK
```sql
ALTER TABLE `Collection`
    ADD COLUMN IF NOT EXISTS `deleteReason` TEXT NULL,
    ADD COLUMN IF NOT EXISTS `deletedAt` DATETIME(3) NULL,
    ADD COLUMN IF NOT EXISTS `deletedById` INTEGER NULL
```
Result: affectedRows=0

## Statement 2 — OK
```sql
ALTER TABLE `Customer`
    ADD COLUMN IF NOT EXISTS `deleteReason` TEXT NULL,
    ADD COLUMN IF NOT EXISTS `deletedAt` DATETIME(3) NULL,
    ADD COLUMN IF NOT EXISTS `deletedById` INTEGER NULL
```
Result: affectedRows=0

## Statement 3 — OK
```sql
ALTER TABLE `EmployeeAdvance`
    ADD COLUMN IF NOT EXISTS `deleteReason` TEXT NULL,
    ADD COLUMN IF NOT EXISTS `deletedAt` DATETIME(3) NULL,
    ADD COLUMN IF NOT EXISTS `deletedById` INTEGER NULL
```
Result: affectedRows=0

## Statement 4 — OK
```sql
ALTER TABLE `Expense`
    ADD COLUMN IF NOT EXISTS `deleteReason` TEXT NULL,
    ADD COLUMN IF NOT EXISTS `deletedAt` DATETIME(3) NULL,
    ADD COLUMN IF NOT EXISTS `deletedById` INTEGER NULL
```
Result: affectedRows=0

## Statement 5 — OK
```sql
ALTER TABLE `Payment`
    ADD COLUMN IF NOT EXISTS `deleteReason` TEXT NULL,
    ADD COLUMN IF NOT EXISTS `deletedAt` DATETIME(3) NULL,
    ADD COLUMN IF NOT EXISTS `deletedById` INTEGER NULL
```
Result: affectedRows=0

## Statement 6 — OK
```sql
ALTER TABLE `TravelClaim`
    ADD COLUMN IF NOT EXISTS `deleteReason` TEXT NULL,
    ADD COLUMN IF NOT EXISTS `deletedAt` DATETIME(3) NULL,
    ADD COLUMN IF NOT EXISTS `deletedById` INTEGER NULL
```
Result: affectedRows=0

## Statement 7 — OK
```sql
ALTER TABLE `Vendor`
    ADD COLUMN IF NOT EXISTS `deleteReason` TEXT NULL,
    ADD COLUMN IF NOT EXISTS `deletedAt` DATETIME(3) NULL,
    ADD COLUMN IF NOT EXISTS `deletedById` INTEGER NULL
```
Result: affectedRows=0

## Statement 8 — OK
```sql
CREATE INDEX IF NOT EXISTS `Collection_deletedAt_idx` ON `Collection`(`deletedAt`)
```
Result: affectedRows=0

## Statement 9 — OK
```sql
CREATE INDEX IF NOT EXISTS `Customer_deletedAt_idx` ON `Customer`(`deletedAt`)
```
Result: affectedRows=0

## Statement 10 — OK
```sql
CREATE INDEX IF NOT EXISTS `EmployeeAdvance_deletedAt_idx` ON `EmployeeAdvance`(`deletedAt`)
```
Result: affectedRows=0

## Statement 11 — OK
```sql
CREATE INDEX IF NOT EXISTS `Expense_deletedAt_idx` ON `Expense`(`deletedAt`)
```
Result: affectedRows=0

## Statement 12 — OK
```sql
CREATE INDEX IF NOT EXISTS `Payment_deletedAt_idx` ON `Payment`(`deletedAt`)
```
Result: affectedRows=0

## Statement 13 — OK
```sql
CREATE INDEX IF NOT EXISTS `TravelClaim_deletedAt_idx` ON `TravelClaim`(`deletedAt`)
```
Result: affectedRows=0

## Statement 14 — OK
```sql
CREATE INDEX IF NOT EXISTS `Vendor_deletedAt_idx` ON `Vendor`(`deletedAt`)
```
Result: affectedRows=0

## Statement 15 — OK
```sql
UPDATE `Expense` SET `amountLakhs` = `amountLakhs` * 100000
```
Result: affectedRows=0

## Statement 16 — OK
```sql
UPDATE `Expense` SET `gstAmountLakhs` = `gstAmountLakhs` * 100000
```
Result: affectedRows=0

## Statement 17 — OK
```sql
UPDATE `EmployeeAdvance` SET `amountLakhs` = `amountLakhs` * 100000
```
Result: affectedRows=0

## Statement 18 — OK
```sql
UPDATE `EmployeeAdvance` SET `disbursedAmountLakhs` = `disbursedAmountLakhs` * 100000 WHERE `disbursedAmountLakhs` IS NOT NULL
```
Result: affectedRows=0

## Statement 19 — OK
```sql
UPDATE `EmployeeAdvance` SET `settledAmountLakhs` = `settledAmountLakhs` * 100000 WHERE `settledAmountLakhs` IS NOT NULL
```
Result: affectedRows=0

## Statement 20 — OK
```sql
UPDATE `EmployeeAdvance` SET `balanceLakhs` = `balanceLakhs` * 100000
```
Result: affectedRows=0

## Statement 21 — OK
```sql
UPDATE `TravelClaim` SET `amountLakhs` = `amountLakhs` * 100000
```
Result: affectedRows=0

## Statement 22 — OK
```sql
ALTER TABLE `EmployeeAdvance` MODIFY `amountLakhs` DECIMAL(18, 2) NOT NULL,
    MODIFY `disbursedAmountLakhs` DECIMAL(18, 2) NULL,
    MODIFY `settledAmountLakhs` DECIMAL(18, 2) NULL,
    MODIFY `balanceLakhs` DECIMAL(18, 2) NOT NULL DEFAULT 0
```
Result: affectedRows=0

## Statement 23 — OK
```sql
ALTER TABLE `Expense` MODIFY `amountLakhs` DECIMAL(18, 2) NOT NULL,
    MODIFY `gstAmountLakhs` DECIMAL(18, 2) NOT NULL DEFAULT 0
```
Result: affectedRows=0

## Statement 24 — OK
```sql
ALTER TABLE `TravelClaim` MODIFY `ratePerKm` DECIMAL(10, 4) NOT NULL DEFAULT 0,
    MODIFY `amountRupees` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    MODIFY `amountLakhs` DECIMAL(18, 2) NOT NULL DEFAULT 0
```
Result: affectedRows=0

## Statement 25 — OK
```sql
ALTER TABLE `Payment` MODIFY `amountLakhs` DECIMAL(18, 2) NOT NULL
```
Result: affectedRows=26

## Statement 26 — OK
```sql
ALTER TABLE `Collection` MODIFY `invoiceValueLakhs` DECIMAL(18, 2) NOT NULL,
    MODIFY `amountWithoutGstLakhs` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    MODIFY `amountReceivedLakhs` DECIMAL(18, 2) NOT NULL DEFAULT 0
```
Result: affectedRows=141

## Statement 27 — OK
```sql
ALTER TABLE `OrderAdvance` MODIFY `amountLakhs` DECIMAL(18, 2) NOT NULL
```
Result: affectedRows=3

## Statement 28 — OK
```sql
UPDATE `CrmLead` SET `expectedValue` = `expectedValue` * 100000
```
Result: affectedRows=280

## Statement 29 — OK
```sql
UPDATE `CrmOpportunity` SET `value` = `value` * 100000
```
Result: affectedRows=49

## Statement 30 — OK
```sql
UPDATE `CrmOpportunity` SET `dealValueExTax` = `dealValueExTax` * 100000
```
Result: affectedRows=49

## Statement 31 — OK
```sql
UPDATE `CrmOpportunity` SET `netProfitLakhs` = `netProfitLakhs` * 100000
```
Result: affectedRows=49

## Statement 32 — OK
```sql
UPDATE `SalesFunnel` SET `dealValueLakhs` = `dealValueLakhs` * 100000
```
Result: affectedRows=100

## Statement 33 — OK
```sql
UPDATE `SalesFunnel` SET `billingValueLakhs` = `billingValueLakhs` * 100000
```
Result: affectedRows=100

## Statement 34 — OK
```sql
ALTER TABLE `CrmLead` MODIFY `expectedValue` DECIMAL(18, 2) NOT NULL DEFAULT 0
```
Result: affectedRows=280

## Statement 35 — OK
```sql
ALTER TABLE `CrmOpportunity` MODIFY `value` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    MODIFY `dealValueExTax` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    MODIFY `netProfitLakhs` DECIMAL(18, 2) NOT NULL DEFAULT 0
```
Result: affectedRows=49

## Statement 36 — OK
```sql
ALTER TABLE `SalesFunnel` MODIFY `dealValueLakhs` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    MODIFY `billingValueLakhs` DECIMAL(18, 2) NOT NULL DEFAULT 0
```
Result: affectedRows=100
