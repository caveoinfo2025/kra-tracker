-- Phase 13: Enterprise Security Center
-- 7 tables: security_policy, password_policy, mfa_policy, session_policy,
--           access_restriction_policy, data_protection_policy, security_event_log

CREATE TABLE IF NOT EXISTS `security_policy` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `companyId`  INT          NULL,
  `policyName` VARCHAR(120) NOT NULL,
  `policyType` VARCHAR(30)  NOT NULL DEFAULT 'PASSWORD',
  `policyJson` TEXT         NOT NULL DEFAULT '{}',
  `status`     VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
  `createdAt`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `security_policy_companyId_idx` (`companyId`),
  KEY `security_policy_policyType_idx` (`policyType`),
  KEY `security_policy_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `password_policy` (
  `id`                    INT         NOT NULL AUTO_INCREMENT,
  `companyId`             INT         NULL,
  `minimumLength`         INT         NOT NULL DEFAULT 8,
  `requireUppercase`      TINYINT(1)  NOT NULL DEFAULT 1,
  `requireLowercase`      TINYINT(1)  NOT NULL DEFAULT 1,
  `requireNumber`         TINYINT(1)  NOT NULL DEFAULT 1,
  `requireSpecialCharacter` TINYINT(1) NOT NULL DEFAULT 0,
  `expiryDays`            INT         NOT NULL DEFAULT 90,
  `passwordHistoryCount`  INT         NOT NULL DEFAULT 5,
  `failedAttemptLimit`    INT         NOT NULL DEFAULT 5,
  `lockDurationMinutes`   INT         NOT NULL DEFAULT 30,
  `status`                VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  `createdAt`             DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`             DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `password_policy_companyId_idx` (`companyId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `mfa_policy` (
  `id`                INT         NOT NULL AUTO_INCREMENT,
  `companyId`         INT         NULL,
  `enabled`           TINYINT(1)  NOT NULL DEFAULT 0,
  `requiredRolesJson` TEXT        NOT NULL DEFAULT '[]',
  `methodsJson`       TEXT        NOT NULL DEFAULT '["EMAIL"]',
  `rememberDeviceDays` INT        NOT NULL DEFAULT 30,
  `status`            VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  `createdAt`         DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`         DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `mfa_policy_companyId_idx` (`companyId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `session_policy` (
  `id`                    INT         NOT NULL AUTO_INCREMENT,
  `companyId`             INT         NULL,
  `idleTimeoutMinutes`    INT         NOT NULL DEFAULT 480,
  `maxSessionHours`       INT         NOT NULL DEFAULT 8,
  `allowConcurrentLogin`  TINYINT(1)  NOT NULL DEFAULT 1,
  `maxConcurrentSessions` INT         NOT NULL DEFAULT 3,
  `rememberMeAllowed`     TINYINT(1)  NOT NULL DEFAULT 1,
  `status`                VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  `createdAt`             DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`             DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `session_policy_companyId_idx` (`companyId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `access_restriction_policy` (
  `id`                       INT         NOT NULL AUTO_INCREMENT,
  `companyId`                INT         NULL,
  `ipRestrictionEnabled`     TINYINT(1)  NOT NULL DEFAULT 0,
  `allowedIpJson`            TEXT        NOT NULL DEFAULT '[]',
  `businessHourRestriction`  TINYINT(1)  NOT NULL DEFAULT 0,
  `allowedHoursJson`         TEXT        NOT NULL DEFAULT '{"start":"09:00","end":"18:00","days":[1,2,3,4,5]}',
  `locationRestrictionJson`  TEXT        NOT NULL DEFAULT '{}',
  `status`                   VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  `createdAt`                DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`                DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `access_restriction_policy_companyId_idx` (`companyId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `data_protection_policy` (
  `id`                    INT         NOT NULL AUTO_INCREMENT,
  `companyId`             INT         NULL,
  `exportLimit`           INT         NOT NULL DEFAULT 1000,
  `exportApprovalRequired` TINYINT(1) NOT NULL DEFAULT 0,
  `downloadRestriction`   TINYINT(1)  NOT NULL DEFAULT 0,
  `sensitiveFieldsJson`   TEXT        NOT NULL DEFAULT '[]',
  `maskingRulesJson`      TEXT        NOT NULL DEFAULT '[]',
  `status`                VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  `createdAt`             DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`             DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `data_protection_policy_companyId_idx` (`companyId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `security_event_log` (
  `id`           INT          NOT NULL AUTO_INCREMENT,
  `userId`       INT          NULL,
  `eventType`    VARCHAR(60)  NOT NULL,
  `metadataJson` TEXT         NOT NULL DEFAULT '{}',
  `ipAddress`    VARCHAR(60)  NULL,
  `userAgent`    TEXT         NULL,
  `createdAt`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `security_event_log_userId_idx` (`userId`),
  KEY `security_event_log_eventType_idx` (`eventType`),
  KEY `security_event_log_createdAt_idx` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
