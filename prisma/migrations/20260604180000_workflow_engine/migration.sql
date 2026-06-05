-- Phase 6: Workflow Engine Foundation
-- 7 new tables: workflow_definition, workflow_step, approval_request,
--               approval_action, delegation_rule, escalation_rule, workflow_audit_log
-- All FKs added in separate ALTER TABLE statements (MySQL best practice)
-- Safe to run multiple times (CREATE TABLE IF NOT EXISTS)

-- ── 19. WorkflowDefinition ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `workflow_definition` (
  `id`            INT          NOT NULL AUTO_INCREMENT,
  `name`          VARCHAR(191) NOT NULL,
  `code`          VARCHAR(191) NOT NULL,
  `description`   LONGTEXT     NOT NULL DEFAULT '',
  `module`        VARCHAR(191) NOT NULL,
  `triggerEvent`  VARCHAR(191) NOT NULL,
  `status`        VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
  `conditionJson` LONGTEXT     NULL,
  `version`       INT          NOT NULL DEFAULT 1,
  `createdBy`     INT          NOT NULL,
  `createdAt`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`     DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `workflow_definition_code_key` (`code`),
  INDEX `workflow_definition_module_triggerEvent_idx` (`module`, `triggerEvent`),
  INDEX `workflow_definition_status_idx` (`status`),
  INDEX `workflow_definition_createdBy_idx` (`createdBy`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── 20. WorkflowStep ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `workflow_step` (
  `id`              INT          NOT NULL AUTO_INCREMENT,
  `workflowId`      INT          NOT NULL,
  `stepNumber`      INT          NOT NULL,
  `stepName`        VARCHAR(191) NOT NULL,
  `approvalType`    VARCHAR(191) NOT NULL DEFAULT 'REPORTING_MANAGER',
  `approverId`      INT          NULL,
  `approverRoleId`  INT          NULL,
  `approvalMode`    VARCHAR(191) NOT NULL DEFAULT 'SEQUENTIAL',
  `isMandatory`     TINYINT(1)   NOT NULL DEFAULT 1,
  `timeoutHours`    INT          NOT NULL DEFAULT 24,
  `requireComments` TINYINT(1)   NOT NULL DEFAULT 0,
  `createdAt`       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`       DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `workflow_step_workflowId_idx` (`workflowId`),
  INDEX `workflow_step_stepNumber_idx` (`stepNumber`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── 21. ApprovalRequest ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `approval_request` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `workflowId`  INT          NOT NULL,
  `entityType`  VARCHAR(191) NOT NULL,
  `entityId`    VARCHAR(191) NOT NULL,
  `requestedBy` INT          NOT NULL,
  `status`      VARCHAR(191) NOT NULL DEFAULT 'PENDING',
  `currentStep` INT          NOT NULL DEFAULT 1,
  `contextJson` LONGTEXT     NULL,
  `submittedAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `completedAt` DATETIME(3)  NULL,
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`   DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `approval_request_workflowId_idx` (`workflowId`),
  INDEX `approval_request_requestedBy_idx` (`requestedBy`),
  INDEX `approval_request_status_idx` (`status`),
  INDEX `approval_request_entityType_entityId_idx` (`entityType`, `entityId`(100))
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── 22. ApprovalAction ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `approval_action` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `requestId`  INT          NOT NULL,
  `stepId`     INT          NOT NULL,
  `approverId` INT          NOT NULL,
  `action`     VARCHAR(191) NOT NULL,
  `comments`   LONGTEXT     NULL,
  `toUserId`   INT          NULL,
  `createdAt`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `approval_action_requestId_idx` (`requestId`),
  INDEX `approval_action_stepId_idx` (`stepId`),
  INDEX `approval_action_approverId_idx` (`approverId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── 23. DelegationRule ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `delegation_rule` (
  `id`        INT          NOT NULL AUTO_INCREMENT,
  `fromUser`  INT          NOT NULL,
  `toUser`    INT          NOT NULL,
  `module`    VARCHAR(191) NULL,
  `startDate` DATETIME(3)  NOT NULL,
  `endDate`   DATETIME(3)  NOT NULL,
  `status`    VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
  `reason`    LONGTEXT     NULL,
  `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `delegation_rule_fromUser_idx` (`fromUser`),
  INDEX `delegation_rule_toUser_idx` (`toUser`),
  INDEX `delegation_rule_status_idx` (`status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── 24. EscalationRule ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `escalation_rule` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `workflowId`  INT          NOT NULL,
  `stepId`      INT          NULL,
  `afterHours`  INT          NOT NULL DEFAULT 24,
  `escalateTo`  INT          NULL,
  `action`      VARCHAR(191) NOT NULL DEFAULT 'REMIND',
  `repeatEvery` INT          NULL,
  `maxTriggers` INT          NOT NULL DEFAULT 3,
  `isActive`    TINYINT(1)   NOT NULL DEFAULT 1,
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`   DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `escalation_rule_workflowId_idx` (`workflowId`),
  INDEX `escalation_rule_stepId_idx` (`stepId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── 25. WorkflowAuditLog ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `workflow_audit_log` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `entityType` VARCHAR(191) NOT NULL,
  `entityId`   INT          NOT NULL,
  `action`     VARCHAR(191) NOT NULL,
  `actorId`    INT          NOT NULL,
  `details`    LONGTEXT     NULL,
  `createdAt`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `workflow_audit_log_entityType_entityId_idx` (`entityType`, `entityId`),
  INDEX `workflow_audit_log_actorId_idx` (`actorId`),
  INDEX `workflow_audit_log_createdAt_idx` (`createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── Foreign Keys (separate ALTER TABLE — MySQL best practice) ────────────────────

ALTER TABLE `workflow_definition`
  ADD CONSTRAINT `workflow_definition_createdBy_fkey`
    FOREIGN KEY (`createdBy`) REFERENCES `Employee`(`id`);

ALTER TABLE `workflow_step`
  ADD CONSTRAINT `workflow_step_workflowId_fkey`
    FOREIGN KEY (`workflowId`) REFERENCES `workflow_definition`(`id`) ON DELETE CASCADE;

ALTER TABLE `approval_request`
  ADD CONSTRAINT `approval_request_workflowId_fkey`
    FOREIGN KEY (`workflowId`) REFERENCES `workflow_definition`(`id`),
  ADD CONSTRAINT `approval_request_requestedBy_fkey`
    FOREIGN KEY (`requestedBy`) REFERENCES `Employee`(`id`);

ALTER TABLE `approval_action`
  ADD CONSTRAINT `approval_action_requestId_fkey`
    FOREIGN KEY (`requestId`) REFERENCES `approval_request`(`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `approval_action_stepId_fkey`
    FOREIGN KEY (`stepId`) REFERENCES `workflow_step`(`id`),
  ADD CONSTRAINT `approval_action_approverId_fkey`
    FOREIGN KEY (`approverId`) REFERENCES `Employee`(`id`);

ALTER TABLE `delegation_rule`
  ADD CONSTRAINT `delegation_rule_fromUser_fkey`
    FOREIGN KEY (`fromUser`) REFERENCES `Employee`(`id`),
  ADD CONSTRAINT `delegation_rule_toUser_fkey`
    FOREIGN KEY (`toUser`) REFERENCES `Employee`(`id`);

ALTER TABLE `escalation_rule`
  ADD CONSTRAINT `escalation_rule_workflowId_fkey`
    FOREIGN KEY (`workflowId`) REFERENCES `workflow_definition`(`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `escalation_rule_stepId_fkey`
    FOREIGN KEY (`stepId`) REFERENCES `workflow_step`(`id`),
  ADD CONSTRAINT `escalation_rule_escalateTo_fkey`
    FOREIGN KEY (`escalateTo`) REFERENCES `Employee`(`id`);

ALTER TABLE `workflow_audit_log`
  ADD CONSTRAINT `workflow_audit_log_actorId_fkey`
    FOREIGN KEY (`actorId`) REFERENCES `Employee`(`id`);
