-- Add discountPct to CrmOpportunity
-- Stores the discount percentage (0-100) requested on an opportunity.
-- A non-zero value triggers the DISCOUNT_APPROVAL workflow.
ALTER TABLE `CrmOpportunity` ADD COLUMN `discountPct` DOUBLE NOT NULL DEFAULT 0;
