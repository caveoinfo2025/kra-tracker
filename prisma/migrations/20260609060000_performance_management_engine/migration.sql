-- Phase 10: Enterprise Performance Management Engine
-- 9 new tables: performance_period, kra_metric, kra_template, kra_template_item,
-- employee_target, team_target, kra_achievement, performance_review, performance_audit

CREATE TABLE `performance_period` (
  `id`            INT          NOT NULL AUTO_INCREMENT,
  `companyId`     INT          NULL,
  `name`          VARCHAR(191) NOT NULL,
  `financialYear` VARCHAR(191) NOT NULL DEFAULT '',
  `periodType`    VARCHAR(191) NOT NULL DEFAULT 'YEARLY',
  `startDate`     DATETIME(3)  NOT NULL,
  `endDate`       DATETIME(3)  NOT NULL,
  `status`        VARCHAR(191) NOT NULL DEFAULT 'active',
  `createdAt`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`     DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `performance_period_companyId_idx` (`companyId`),
  KEY `performance_period_periodType_idx` (`periodType`),
  KEY `performance_period_status_idx` (`status`),
  KEY `performance_period_financialYear_idx` (`financialYear`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `kra_metric` (
  `id`                INT          NOT NULL AUTO_INCREMENT,
  `companyId`         INT          NULL,
  `name`              VARCHAR(191) NOT NULL,
  `code`              VARCHAR(191) NOT NULL,
  `description`       TEXT         NOT NULL DEFAULT '',
  `metricType`        VARCHAR(191) NOT NULL DEFAULT 'CUSTOM',
  `calculationSource` VARCHAR(191) NOT NULL DEFAULT 'MANUAL',
  `formulaJson`       TEXT         NOT NULL DEFAULT '',
  `status`            VARCHAR(191) NOT NULL DEFAULT 'active',
  `createdAt`         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`         DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `kra_metric_code_key` (`code`),
  KEY `kra_metric_companyId_idx` (`companyId`),
  KEY `kra_metric_metricType_idx` (`metricType`),
  KEY `kra_metric_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `kra_template` (
  `id`           INT          NOT NULL AUTO_INCREMENT,
  `companyId`    INT          NULL,
  `name`         VARCHAR(191) NOT NULL,
  `description`  TEXT         NOT NULL DEFAULT '',
  `roleId`       INT          NULL,
  `departmentId` INT          NULL,
  `status`       VARCHAR(191) NOT NULL DEFAULT 'draft',
  `createdAt`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`    DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `kra_template_companyId_idx` (`companyId`),
  KEY `kra_template_roleId_idx` (`roleId`),
  KEY `kra_template_departmentId_idx` (`departmentId`),
  KEY `kra_template_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `kra_template_item` (
  `id`             INT          NOT NULL AUTO_INCREMENT,
  `templateId`     INT          NOT NULL,
  `metricId`       INT          NOT NULL,
  `weightage`      DOUBLE       NOT NULL DEFAULT 0,
  `targetType`     VARCHAR(191) NOT NULL DEFAULT 'AMOUNT',
  `minimumTarget`  DOUBLE       NOT NULL DEFAULT 0,
  `expectedTarget` DOUBLE       NOT NULL DEFAULT 0,
  `stretchTarget`  DOUBLE       NOT NULL DEFAULT 0,
  `sortOrder`      INT          NOT NULL DEFAULT 0,
  `status`         VARCHAR(191) NOT NULL DEFAULT 'active',
  PRIMARY KEY (`id`),
  KEY `kra_template_item_templateId_idx` (`templateId`),
  KEY `kra_template_item_metricId_idx` (`metricId`),
  CONSTRAINT `kra_template_item_templateId_fkey` FOREIGN KEY (`templateId`)
    REFERENCES `kra_template` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `kra_template_item_metricId_fkey` FOREIGN KEY (`metricId`)
    REFERENCES `kra_metric` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `employee_target` (
  `id`                INT          NOT NULL AUTO_INCREMENT,
  `employeeProfileId` INT          NOT NULL,
  `periodId`          INT          NOT NULL,
  `templateId`        INT          NULL,
  `targetJson`        TEXT         NOT NULL DEFAULT '',
  `status`            VARCHAR(191) NOT NULL DEFAULT 'active',
  `createdAt`         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`         DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `employee_target_employeeProfileId_idx` (`employeeProfileId`),
  KEY `employee_target_periodId_idx` (`periodId`),
  KEY `employee_target_templateId_idx` (`templateId`),
  KEY `employee_target_status_idx` (`status`),
  CONSTRAINT `employee_target_periodId_fkey` FOREIGN KEY (`periodId`)
    REFERENCES `performance_period` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `team_target` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `teamId`     INT          NOT NULL,
  `periodId`   INT          NOT NULL,
  `targetJson` TEXT         NOT NULL DEFAULT '',
  `status`     VARCHAR(191) NOT NULL DEFAULT 'active',
  `createdAt`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`  DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `team_target_teamId_idx` (`teamId`),
  KEY `team_target_periodId_idx` (`periodId`),
  CONSTRAINT `team_target_periodId_fkey` FOREIGN KEY (`periodId`)
    REFERENCES `performance_period` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `kra_achievement` (
  `id`                   INT          NOT NULL AUTO_INCREMENT,
  `employeeTargetId`     INT          NOT NULL,
  `metricId`             INT          NOT NULL,
  `actualValue`          DOUBLE       NOT NULL DEFAULT 0,
  `achievementPct`       DOUBLE       NOT NULL DEFAULT 0,
  `weightedScore`        DOUBLE       NOT NULL DEFAULT 0,
  `sourceReference`      VARCHAR(191) NOT NULL DEFAULT '',
  `calculatedAt`         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `status`               VARCHAR(191) NOT NULL DEFAULT 'active',
  PRIMARY KEY (`id`),
  KEY `kra_achievement_employeeTargetId_idx` (`employeeTargetId`),
  KEY `kra_achievement_metricId_idx` (`metricId`),
  CONSTRAINT `kra_achievement_employeeTargetId_fkey` FOREIGN KEY (`employeeTargetId`)
    REFERENCES `employee_target` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `kra_achievement_metricId_fkey` FOREIGN KEY (`metricId`)
    REFERENCES `kra_metric` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `performance_review` (
  `id`                INT          NOT NULL AUTO_INCREMENT,
  `employeeTargetId`  INT          NOT NULL,
  `reviewerId`        INT          NOT NULL,
  `workflowRequestId` INT          NULL,
  `selfRating`        DOUBLE       NOT NULL DEFAULT 0,
  `managerRating`     DOUBLE       NOT NULL DEFAULT 0,
  `finalRating`       DOUBLE       NOT NULL DEFAULT 0,
  `comments`          TEXT         NOT NULL DEFAULT '',
  `status`            VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
  `createdAt`         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`         DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `performance_review_employeeTargetId_idx` (`employeeTargetId`),
  KEY `performance_review_reviewerId_idx` (`reviewerId`),
  KEY `performance_review_status_idx` (`status`),
  CONSTRAINT `performance_review_employeeTargetId_fkey` FOREIGN KEY (`employeeTargetId`)
    REFERENCES `employee_target` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `performance_audit` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `entityType`  VARCHAR(191) NOT NULL,
  `entityId`    INT          NOT NULL,
  `action`      VARCHAR(191) NOT NULL,
  `oldValue`    TEXT         NOT NULL DEFAULT '',
  `newValue`    TEXT         NOT NULL DEFAULT '',
  `performedBy` INT          NOT NULL,
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `performance_audit_entityType_entityId_idx` (`entityType`, `entityId`),
  KEY `performance_audit_performedBy_idx` (`performedBy`),
  KEY `performance_audit_createdAt_idx` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
