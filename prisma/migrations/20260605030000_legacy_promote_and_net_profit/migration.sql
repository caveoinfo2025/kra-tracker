-- Rename CrmOpportunity.netMargin → netProfitLakhs (absolute net profit in ₹L, not a %)
ALTER TABLE `CrmOpportunity`
  CHANGE COLUMN `netMargin` `netProfitLakhs` DOUBLE NOT NULL DEFAULT 0;

-- Track promotion of a legacy SalesFunnel deal to a real CrmOpportunity
ALTER TABLE `SalesFunnel`
  ADD COLUMN `crmOpportunityId` INT NULL;
