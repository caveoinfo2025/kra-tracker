-- Phase 8: CRM Administration Engine
-- Creates 7 new tables: pipeline_definition, pipeline_stage, territory,
-- territory_rule, account_assignment_rule, crm_automation_rule, sla_rule

CREATE TABLE `pipeline_definition` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `companyId`   INT          NULL,
  `name`        VARCHAR(191) NOT NULL,
  `code`        VARCHAR(191) NOT NULL,
  `description` TEXT         NOT NULL DEFAULT '',
  `isDefault`   TINYINT(1)   NOT NULL DEFAULT 0,
  `status`      VARCHAR(191) NOT NULL DEFAULT 'active',
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`   DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pipeline_definition_code_key` (`code`),
  KEY `pipeline_definition_companyId_idx` (`companyId`),
  KEY `pipeline_definition_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `pipeline_stage` (
  `id`                  INT          NOT NULL AUTO_INCREMENT,
  `pipelineId`          INT          NOT NULL,
  `stageName`           VARCHAR(191) NOT NULL,
  `stageCode`           VARCHAR(191) NOT NULL,
  `sequence`            INT          NOT NULL,
  `probability`         INT          NOT NULL DEFAULT 50,
  `stageType`           VARCHAR(191) NOT NULL DEFAULT 'OPEN',
  `requiresApproval`    TINYINT(1)   NOT NULL DEFAULT 0,
  `mandatoryFieldsJson` TEXT         NOT NULL DEFAULT '[]',
  `entryRuleId`         INT          NULL,
  `exitRuleId`          INT          NULL,
  `status`              VARCHAR(191) NOT NULL DEFAULT 'active',
  `createdAt`           DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`           DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `pipeline_stage_pipelineId_idx` (`pipelineId`),
  KEY `pipeline_stage_pipelineId_sequence_idx` (`pipelineId`, `sequence`),
  CONSTRAINT `pipeline_stage_pipelineId_fkey`
    FOREIGN KEY (`pipelineId`) REFERENCES `pipeline_definition` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `territory` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `companyId`   INT          NULL,
  `name`        VARCHAR(191) NOT NULL,
  `description` TEXT         NOT NULL DEFAULT '',
  `status`      VARCHAR(191) NOT NULL DEFAULT 'active',
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`   DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `territory_companyId_idx` (`companyId`),
  KEY `territory_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `territory_rule` (
  `id`            INT         NOT NULL AUTO_INCREMENT,
  `territoryId`   INT         NOT NULL,
  `conditionJson` TEXT        NOT NULL,
  `createdAt`     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `territory_rule_territoryId_idx` (`territoryId`),
  CONSTRAINT `territory_rule_territoryId_fkey`
    FOREIGN KEY (`territoryId`) REFERENCES `territory` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `account_assignment_rule` (
  `id`            INT          NOT NULL AUTO_INCREMENT,
  `name`          VARCHAR(191) NOT NULL,
  `priority`      INT          NOT NULL DEFAULT 10,
  `conditionJson` TEXT         NOT NULL,
  `assignToType`  VARCHAR(191) NOT NULL,
  `assignToId`    INT          NULL,
  `assignToName`  VARCHAR(191) NOT NULL DEFAULT '',
  `status`        VARCHAR(191) NOT NULL DEFAULT 'active',
  `createdAt`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`     DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `account_assignment_rule_status_priority_idx` (`status`, `priority`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `crm_automation_rule` (
  `id`            INT          NOT NULL AUTO_INCREMENT,
  `name`          VARCHAR(191) NOT NULL,
  `event`         VARCHAR(191) NOT NULL,
  `conditionJson` TEXT         NOT NULL DEFAULT '{}',
  `actionJson`    TEXT         NOT NULL,
  `status`        VARCHAR(191) NOT NULL DEFAULT 'active',
  `createdAt`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`     DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `crm_automation_rule_event_status_idx` (`event`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sla_rule` (
  `id`                 INT          NOT NULL AUTO_INCREMENT,
  `module`             VARCHAR(191) NOT NULL,
  `event`              VARCHAR(191) NOT NULL,
  `label`              VARCHAR(191) NOT NULL DEFAULT '',
  `durationHours`      INT          NOT NULL,
  `warningHours`       INT          NOT NULL DEFAULT 0,
  `escalationPolicyId` INT          NULL,
  `status`             VARCHAR(191) NOT NULL DEFAULT 'active',
  `createdAt`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`          DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sla_rule_module_event_idx` (`module`, `event`),
  KEY `sla_rule_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
