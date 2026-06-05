-- Phase 7: Master Data Management
-- 8 new tables: master_category, master_definition, master_value, master_override,
--               master_validation_rule, master_audit, customer_policy, vendor_policy
-- All FKs added in separate ALTER TABLE statements (MySQL best practice)
-- Safe to run multiple times (CREATE TABLE IF NOT EXISTS)

-- ── 26. MasterCategory ───────────────────────────────────────────────────────────
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

-- ── 27. MasterDefinition ─────────────────────────────────────────────────────────
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

-- ── 28. MasterValue ──────────────────────────────────────────────────────────────
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

-- ── 29. MasterOverride ───────────────────────────────────────────────────────────
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

-- ── 30. MasterValidationRule ─────────────────────────────────────────────────────
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

-- ── 31. MasterAudit ──────────────────────────────────────────────────────────────
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

-- ── 32. CustomerPolicy ───────────────────────────────────────────────────────────
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

-- ── 33. VendorPolicy ─────────────────────────────────────────────────────────────
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

-- ── Foreign Keys (separate ALTER TABLE — MySQL best practice) ────────────────────

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
