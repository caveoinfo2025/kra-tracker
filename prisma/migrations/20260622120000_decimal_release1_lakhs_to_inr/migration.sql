-- Step 3Q Release 1 (2026-06-22): Decimal + Lakhs-to-INR migration for Expense,
-- EmployeeAdvance, and TravelClaim ONLY. Payment, Collection, Voucher, Ledger,
-- FinAccount, OrderAdvance, Notification, CRM Lead/Opportunity/SalesFunnel, and KRA
-- target values are explicitly NOT touched by this migration.
--
-- Value transformation runs BEFORE the column type change, while the columns are
-- still DOUBLE — this multiplies each genuine ₹-Lakhs value by 100,000 to store the
-- actual ₹ INR amount, with the arithmetic happening in double precision (more than
-- enough headroom for these values; confirmed exact for the existing/seeded data).
-- TravelClaim.amountRupees and TravelClaim.ratePerKm are NOT multiplied — they already
-- store actual INR / actual ₹-per-km values today.

-- Expense
UPDATE `Expense` SET `amountLakhs` = `amountLakhs` * 100000;
UPDATE `Expense` SET `gstAmountLakhs` = `gstAmountLakhs` * 100000;

-- EmployeeAdvance
UPDATE `EmployeeAdvance` SET `amountLakhs` = `amountLakhs` * 100000;
UPDATE `EmployeeAdvance` SET `disbursedAmountLakhs` = `disbursedAmountLakhs` * 100000 WHERE `disbursedAmountLakhs` IS NOT NULL;
UPDATE `EmployeeAdvance` SET `settledAmountLakhs` = `settledAmountLakhs` * 100000 WHERE `settledAmountLakhs` IS NOT NULL;
UPDATE `EmployeeAdvance` SET `balanceLakhs` = `balanceLakhs` * 100000;

-- TravelClaim (amountLakhs only)
UPDATE `TravelClaim` SET `amountLakhs` = `amountLakhs` * 100000;

-- AlterTable: column type changes, applied AFTER the value transformation above.
ALTER TABLE `EmployeeAdvance` MODIFY `amountLakhs` DECIMAL(18, 2) NOT NULL,
    MODIFY `disbursedAmountLakhs` DECIMAL(18, 2) NULL,
    MODIFY `settledAmountLakhs` DECIMAL(18, 2) NULL,
    MODIFY `balanceLakhs` DECIMAL(18, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `Expense` MODIFY `amountLakhs` DECIMAL(18, 2) NOT NULL,
    MODIFY `gstAmountLakhs` DECIMAL(18, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `TravelClaim` MODIFY `ratePerKm` DECIMAL(10, 4) NOT NULL DEFAULT 0,
    MODIFY `amountRupees` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    MODIFY `amountLakhs` DECIMAL(18, 2) NOT NULL DEFAULT 0;
