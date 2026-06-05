-- Add closed-deal fields to CrmOpportunity
-- dealValueExTax: deal value without tax (₹L) — mandatory when stage = WON
-- netMargin:      net margin % — mandatory when stage = WON
-- poNumber:       purchase order number — mandatory when stage = WON
-- poDate:         PO date (optional)

ALTER TABLE `CrmOpportunity`
  ADD COLUMN `dealValueExTax` DOUBLE       NOT NULL DEFAULT 0,
  ADD COLUMN `netMargin`      DOUBLE       NOT NULL DEFAULT 0,
  ADD COLUMN `poNumber`       VARCHAR(191) NOT NULL DEFAULT '',
  ADD COLUMN `poDate`         DATETIME(3)  NULL;
