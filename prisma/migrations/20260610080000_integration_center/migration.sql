-- Phase 12: Integration Center
-- Tables: integration_provider, integration_connection, integration_usage_rule, integration_log, api_key_reference

CREATE TABLE IF NOT EXISTS `integration_provider` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(120) NOT NULL,
  `code`        VARCHAR(60)  NOT NULL,
  `category`    VARCHAR(40)  NOT NULL DEFAULT 'CUSTOM_API',
  `description` TEXT         NOT NULL DEFAULT '',
  `logoUrl`     VARCHAR(255) NULL,
  `docsUrl`     VARCHAR(255) NULL,
  `status`      VARCHAR(20)  NOT NULL DEFAULT 'INACTIVE',
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `integration_provider_code_key` (`code`),
  KEY `integration_provider_category_idx` (`category`),
  KEY `integration_provider_status_idx` (`status`)
);

CREATE TABLE IF NOT EXISTS `integration_connection` (
  `id`             INT          NOT NULL AUTO_INCREMENT,
  `providerId`     INT          NOT NULL,
  `companyId`      INT          NULL,
  `connectionName` VARCHAR(120) NOT NULL,
  `authType`       VARCHAR(30)  NOT NULL DEFAULT 'ENV_REFERENCE',
  `configJson`     TEXT         NOT NULL DEFAULT '{}',
  `secretRef`      VARCHAR(255) NULL,
  `status`         VARCHAR(20)  NOT NULL DEFAULT 'INACTIVE',
  `lastTestedAt`   DATETIME(3)  NULL,
  `lastTestStatus` VARCHAR(20)  NULL,
  `createdAt`      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `integration_connection_providerId_idx` (`providerId`),
  KEY `integration_connection_companyId_idx` (`companyId`),
  KEY `integration_connection_status_idx` (`status`),
  CONSTRAINT `fk_ic_provider` FOREIGN KEY (`providerId`) REFERENCES `integration_provider` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `integration_usage_rule` (
  `id`           INT         NOT NULL AUTO_INCREMENT,
  `connectionId` INT         NOT NULL,
  `module`       VARCHAR(60) NOT NULL,
  `event`        VARCHAR(60) NOT NULL,
  `policyId`     INT         NULL,
  `status`       VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  `createdAt`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `integration_usage_rule_connectionId_idx` (`connectionId`),
  KEY `integration_usage_rule_module_idx` (`module`),
  CONSTRAINT `fk_iur_connection` FOREIGN KEY (`connectionId`) REFERENCES `integration_connection` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `integration_log` (
  `id`                  INT          NOT NULL AUTO_INCREMENT,
  `connectionId`        INT          NOT NULL,
  `module`              VARCHAR(60)  NOT NULL DEFAULT '',
  `event`               VARCHAR(60)  NOT NULL DEFAULT '',
  `requestSummaryJson`  TEXT         NOT NULL DEFAULT '{}',
  `responseSummaryJson` TEXT         NOT NULL DEFAULT '{}',
  `status`              VARCHAR(20)  NOT NULL DEFAULT 'SUCCESS',
  `errorMessage`        TEXT         NULL,
  `createdAt`           DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `integration_log_connectionId_idx` (`connectionId`),
  KEY `integration_log_status_idx` (`status`),
  KEY `integration_log_createdAt_idx` (`createdAt`),
  CONSTRAINT `fk_il_connection` FOREIGN KEY (`connectionId`) REFERENCES `integration_connection` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `api_key_reference` (
  `id`                    INT          NOT NULL AUTO_INCREMENT,
  `companyId`             INT          NULL,
  `name`                  VARCHAR(120) NOT NULL,
  `keyType`               VARCHAR(60)  NOT NULL DEFAULT 'API_KEY',
  `environmentVariableName` VARCHAR(120) NOT NULL,
  `description`           TEXT         NOT NULL DEFAULT '',
  `status`                VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
  `createdAt`             DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`             DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `api_key_reference_envVar_key` (`environmentVariableName`),
  KEY `api_key_reference_companyId_idx` (`companyId`),
  KEY `api_key_reference_status_idx` (`status`)
);
