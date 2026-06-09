-- Phase 11: Communication Center
-- 7 new tables: communication_event, notification_channel, notification_template,
-- notification_rule, notification_queue, notification_delivery_log, communication_audit

CREATE TABLE `communication_event` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `module`      VARCHAR(191) NOT NULL,
  `eventCode`   VARCHAR(191) NOT NULL,
  `eventName`   VARCHAR(191) NOT NULL,
  `description` TEXT         NOT NULL DEFAULT '',
  `status`      VARCHAR(191) NOT NULL DEFAULT 'active',
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`   DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `communication_event_eventCode_key` (`eventCode`),
  KEY `communication_event_module_idx` (`module`),
  KEY `communication_event_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `notification_channel` (
  `id`           INT          NOT NULL AUTO_INCREMENT,
  `channelName`  VARCHAR(191) NOT NULL,
  `channelCode`  VARCHAR(191) NOT NULL,
  `provider`     VARCHAR(191) NOT NULL DEFAULT '',
  `status`       VARCHAR(191) NOT NULL DEFAULT 'inactive',
  `configJson`   TEXT         NOT NULL DEFAULT '',
  `createdAt`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`    DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `notification_channel_channelCode_key` (`channelCode`),
  KEY `notification_channel_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `notification_template` (
  `id`            INT          NOT NULL AUTO_INCREMENT,
  `eventId`       INT          NULL,
  `channelId`     INT          NULL,
  `templateName`  VARCHAR(191) NOT NULL,
  `subject`       VARCHAR(191) NOT NULL DEFAULT '',
  `body`          TEXT         NOT NULL DEFAULT '',
  `variablesJson` TEXT         NOT NULL DEFAULT '',
  `status`        VARCHAR(191) NOT NULL DEFAULT 'active',
  `createdAt`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`     DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `notification_template_eventId_idx` (`eventId`),
  KEY `notification_template_channelId_idx` (`channelId`),
  KEY `notification_template_status_idx` (`status`),
  CONSTRAINT `notification_template_eventId_fkey` FOREIGN KEY (`eventId`)
    REFERENCES `communication_event` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `notification_template_channelId_fkey` FOREIGN KEY (`channelId`)
    REFERENCES `notification_channel` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `notification_rule` (
  `id`            INT          NOT NULL AUTO_INCREMENT,
  `eventId`       INT          NOT NULL,
  `policyId`      INT          NULL,
  `ruleName`      VARCHAR(191) NOT NULL,
  `conditionJson` TEXT         NOT NULL DEFAULT '',
  `recipientJson` TEXT         NOT NULL DEFAULT '',
  `channelJson`   TEXT         NOT NULL DEFAULT '',
  `frequencyJson` TEXT         NOT NULL DEFAULT '',
  `status`        VARCHAR(191) NOT NULL DEFAULT 'active',
  `createdAt`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`     DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `notification_rule_eventId_idx` (`eventId`),
  KEY `notification_rule_status_idx` (`status`),
  CONSTRAINT `notification_rule_eventId_fkey` FOREIGN KEY (`eventId`)
    REFERENCES `communication_event` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `notification_queue` (
  `id`              INT          NOT NULL AUTO_INCREMENT,
  `eventId`         INT          NOT NULL,
  `templateId`      INT          NULL,
  `recipientUserId` INT          NULL,
  `channel`         VARCHAR(191) NOT NULL DEFAULT 'IN_APP',
  `payloadJson`     TEXT         NOT NULL DEFAULT '',
  `status`          VARCHAR(191) NOT NULL DEFAULT 'PENDING',
  `scheduledAt`     DATETIME(3)  NULL,
  `sentAt`          DATETIME(3)  NULL,
  `failureReason`   TEXT         NOT NULL DEFAULT '',
  `createdAt`       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`       DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `notification_queue_eventId_idx` (`eventId`),
  KEY `notification_queue_recipientUserId_idx` (`recipientUserId`),
  KEY `notification_queue_status_idx` (`status`),
  KEY `notification_queue_channel_idx` (`channel`),
  KEY `notification_queue_scheduledAt_idx` (`scheduledAt`),
  CONSTRAINT `notification_queue_eventId_fkey` FOREIGN KEY (`eventId`)
    REFERENCES `communication_event` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `notification_delivery_log` (
  `id`           INT          NOT NULL AUTO_INCREMENT,
  `queueId`      INT          NOT NULL,
  `channel`      VARCHAR(191) NOT NULL,
  `provider`     VARCHAR(191) NOT NULL DEFAULT '',
  `status`       VARCHAR(191) NOT NULL DEFAULT 'PENDING',
  `responseJson` TEXT         NOT NULL DEFAULT '',
  `createdAt`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `notification_delivery_log_queueId_idx` (`queueId`),
  KEY `notification_delivery_log_status_idx` (`status`),
  KEY `notification_delivery_log_channel_idx` (`channel`),
  CONSTRAINT `notification_delivery_log_queueId_fkey` FOREIGN KEY (`queueId`)
    REFERENCES `notification_queue` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `communication_audit` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `entityType`  VARCHAR(191) NOT NULL,
  `entityId`    INT          NOT NULL,
  `action`      VARCHAR(191) NOT NULL,
  `oldValue`    TEXT         NOT NULL DEFAULT '',
  `newValue`    TEXT         NOT NULL DEFAULT '',
  `performedBy` INT          NOT NULL,
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `communication_audit_entityType_entityId_idx` (`entityType`, `entityId`),
  KEY `communication_audit_performedBy_idx` (`performedBy`),
  KEY `communication_audit_createdAt_idx` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
