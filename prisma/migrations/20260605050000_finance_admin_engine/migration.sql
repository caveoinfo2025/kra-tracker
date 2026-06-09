-- Phase 9: Finance Administration Engine
-- 8 new tables: finance_policy, expense_category, expense_limit_rule,
-- conveyance_policy, advance_policy, customer_credit_policy,
-- voucher_configuration, collection_policy

CREATE TABLE `finance_policy` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `companyId`   INT          NULL,
  `policyName`  VARCHAR(191) NOT NULL,
  `policyType`  VARCHAR(191) NOT NULL,
  `policyCode`  VARCHAR(191) NOT NULL DEFAULT '',
  `description` TEXT         NOT NULL DEFAULT '',
  `status`      VARCHAR(191) NOT NULL DEFAULT 'active',
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`   DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `finance_policy_companyId_idx`  (`companyId`),
  KEY `finance_policy_policyType_idx` (`policyType`),
  KEY `finance_policy_status_idx`     (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `expense_category` (
  `id`               INT          NOT NULL AUTO_INCREMENT,
  `companyId`        INT          NULL,
  `name`             VARCHAR(191) NOT NULL,
  `code`             VARCHAR(191) NOT NULL,
  `description`      TEXT         NOT NULL DEFAULT '',
  `requiresReceipt`  TINYINT(1)   NOT NULL DEFAULT 0,
  `requiresApproval` TINYINT(1)   NOT NULL DEFAULT 0,
  `parentId`         INT          NULL,
  `status`           VARCHAR(191) NOT NULL DEFAULT 'active',
  `createdAt`        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`        DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `expense_category_code_key`      (`code`),
  KEY `expense_category_companyId_idx`        (`companyId`),
  KEY `expense_category_parentId_idx`         (`parentId`),
  KEY `expense_category_status_idx`           (`status`),
  CONSTRAINT `expense_category_parentId_fkey` FOREIGN KEY (`parentId`)
    REFERENCES `expense_category` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `expense_limit_rule` (
  `id`                INT          NOT NULL AUTO_INCREMENT,
  `expenseCategoryId` INT          NOT NULL,
  `scopeType`         VARCHAR(191) NOT NULL,
  `scopeId`           VARCHAR(191) NOT NULL,
  `dailyLimit`        DOUBLE       NOT NULL DEFAULT 0,
  `monthlyLimit`      DOUBLE       NOT NULL DEFAULT 0,
  `yearlyLimit`       DOUBLE       NOT NULL DEFAULT 0,
  `policyCode`        VARCHAR(191) NOT NULL DEFAULT '',
  `createdAt`         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`         DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `expense_limit_rule_expenseCategoryId_idx`    (`expenseCategoryId`),
  KEY `expense_limit_rule_scopeType_scopeId_idx`    (`scopeType`, `scopeId`),
  CONSTRAINT `expense_limit_rule_expenseCategoryId_fkey` FOREIGN KEY (`expenseCategoryId`)
    REFERENCES `expense_category` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `conveyance_policy` (
  `id`                       INT          NOT NULL AUTO_INCREMENT,
  `companyId`                INT          NULL,
  `vehicleType`              VARCHAR(191) NOT NULL,
  `ratePerKm`                DOUBLE       NOT NULL DEFAULT 0,
  `monthlyLimitRupees`       DOUBLE       NOT NULL DEFAULT 0,
  `googleMapRequired`        TINYINT(1)   NOT NULL DEFAULT 0,
  `allowManualOverride`      TINYINT(1)   NOT NULL DEFAULT 1,
  `overrideApprovalRequired` TINYINT(1)   NOT NULL DEFAULT 0,
  `status`                   VARCHAR(191) NOT NULL DEFAULT 'active',
  `createdAt`                DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`                DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `conveyance_policy_companyId_idx`   (`companyId`),
  KEY `conveyance_policy_vehicleType_idx` (`vehicleType`),
  KEY `conveyance_policy_status_idx`      (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `advance_policy` (
  `id`               INT          NOT NULL AUTO_INCREMENT,
  `companyId`        INT          NULL,
  `maxAdvanceLakhs`  DOUBLE       NOT NULL DEFAULT 0,
  `settlementDays`   INT          NOT NULL DEFAULT 30,
  `approvalRequired` TINYINT(1)   NOT NULL DEFAULT 1,
  `policyCode`       VARCHAR(191) NOT NULL DEFAULT '',
  `status`           VARCHAR(191) NOT NULL DEFAULT 'active',
  `createdAt`        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`        DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `advance_policy_companyId_idx` (`companyId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `customer_credit_policy` (
  `id`                      INT          NOT NULL AUTO_INCREMENT,
  `companyId`               INT          NULL,
  `customerType`            VARCHAR(191) NOT NULL DEFAULT 'STANDARD',
  `defaultCreditLimitLakhs` DOUBLE       NOT NULL DEFAULT 0,
  `maxCreditLimitLakhs`     DOUBLE       NOT NULL DEFAULT 0,
  `approvalAboveLimit`      TINYINT(1)   NOT NULL DEFAULT 1,
  `paymentTermsDays`        INT          NOT NULL DEFAULT 30,
  `status`                  VARCHAR(191) NOT NULL DEFAULT 'active',
  `createdAt`               DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`               DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `customer_credit_policy_companyId_idx`    (`companyId`),
  KEY `customer_credit_policy_customerType_idx` (`customerType`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `voucher_configuration` (
  `id`                 INT          NOT NULL AUTO_INCREMENT,
  `companyId`          INT          NULL,
  `voucherType`        VARCHAR(191) NOT NULL,
  `prefix`             VARCHAR(191) NOT NULL DEFAULT '',
  `numberFormat`       VARCHAR(191) NOT NULL DEFAULT 'PREFIX-YEAR-SEQ',
  `runningNumber`      INT          NOT NULL DEFAULT 0,
  `financialYearReset` TINYINT(1)   NOT NULL DEFAULT 1,
  `financialYear`      VARCHAR(191) NOT NULL DEFAULT '',
  `status`             VARCHAR(191) NOT NULL DEFAULT 'active',
  `createdAt`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`          DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `voucher_configuration_companyId_idx`   (`companyId`),
  KEY `voucher_configuration_voucherType_idx` (`voucherType`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `collection_policy` (
  `id`             INT          NOT NULL AUTO_INCREMENT,
  `companyId`      INT          NULL,
  `reminderDays`   INT          NOT NULL DEFAULT 7,
  `escalationDays` INT          NOT NULL DEFAULT 14,
  `creditHoldDays` INT          NOT NULL DEFAULT 30,
  `policyCode`     VARCHAR(191) NOT NULL DEFAULT '',
  `status`         VARCHAR(191) NOT NULL DEFAULT 'active',
  `createdAt`      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`      DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `collection_policy_companyId_idx` (`companyId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
