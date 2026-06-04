-- Phase 5 — Policy Engine Foundation
-- New tables: PolicyCategory, Policy, PolicyRule, PolicyVersion,
--             PolicyAudit, ConfigurationVersion
-- Generated offline (no local MySQL). Apply via: npx prisma migrate deploy
-- Backward-compatible: no modifications to existing tables.

-- ── PolicyCategory ───────────────────────────────────────────────────────────
CREATE TABLE `PolicyCategory` (
    `id`          INTEGER       NOT NULL AUTO_INCREMENT,
    `name`        VARCHAR(191)  NOT NULL,
    `code`        VARCHAR(191)  NOT NULL,
    `description` LONGTEXT      NOT NULL DEFAULT '',
    `status`      VARCHAR(191)  NOT NULL DEFAULT 'ACTIVE',
    `createdAt`   DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`   DATETIME(3)   NOT NULL,

    UNIQUE INDEX `PolicyCategory_code_key`(`code`),
    INDEX `PolicyCategory_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── Policy ───────────────────────────────────────────────────────────────────
CREATE TABLE `Policy` (
    `id`            INTEGER       NOT NULL AUTO_INCREMENT,
    `categoryId`    INTEGER       NOT NULL,
    `name`          VARCHAR(191)  NOT NULL,
    `code`          VARCHAR(191)  NOT NULL,
    `description`   LONGTEXT      NOT NULL DEFAULT '',
    `scopeType`     VARCHAR(191)  NOT NULL DEFAULT 'GLOBAL',
    `scopeId`       INTEGER       NULL,
    `status`        VARCHAR(191)  NOT NULL DEFAULT 'DRAFT',
    `version`       INTEGER       NOT NULL DEFAULT 1,
    `effectiveFrom` DATETIME(3)   NULL,
    `effectiveTo`   DATETIME(3)   NULL,
    `createdBy`     INTEGER       NOT NULL,
    `approvedBy`    INTEGER       NULL,
    `createdAt`     DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`     DATETIME(3)   NOT NULL,

    UNIQUE INDEX `Policy_code_key`(`code`),
    INDEX `Policy_categoryId_idx`(`categoryId`),
    INDEX `Policy_status_idx`(`status`),
    INDEX `Policy_scopeType_scopeId_idx`(`scopeType`, `scopeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── PolicyRule ───────────────────────────────────────────────────────────────
CREATE TABLE `PolicyRule` (
    `id`            INTEGER       NOT NULL AUTO_INCREMENT,
    `policyId`      INTEGER       NOT NULL,
    `ruleName`      VARCHAR(191)  NOT NULL,
    `priority`      INTEGER       NOT NULL DEFAULT 10,
    `conditionJson` LONGTEXT      NOT NULL,
    `actionJson`    LONGTEXT      NOT NULL,
    `isActive`      BOOLEAN       NOT NULL DEFAULT TRUE,
    `createdAt`     DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`     DATETIME(3)   NOT NULL,

    INDEX `PolicyRule_policyId_idx`(`policyId`),
    INDEX `PolicyRule_priority_idx`(`priority`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── PolicyVersion ────────────────────────────────────────────────────────────
CREATE TABLE `PolicyVersion` (
    `id`            INTEGER       NOT NULL AUTO_INCREMENT,
    `policyId`      INTEGER       NOT NULL,
    `versionNumber` INTEGER       NOT NULL,
    `snapshotJson`  LONGTEXT      NOT NULL,
    `changeReason`  LONGTEXT      NOT NULL DEFAULT '',
    `createdBy`     INTEGER       NOT NULL,
    `createdAt`     DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PolicyVersion_policyId_versionNumber_key`(`policyId`, `versionNumber`),
    INDEX `PolicyVersion_policyId_idx`(`policyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── PolicyAudit ──────────────────────────────────────────────────────────────
CREATE TABLE `PolicyAudit` (
    `id`          INTEGER       NOT NULL AUTO_INCREMENT,
    `policyId`    INTEGER       NOT NULL,
    `action`      VARCHAR(191)  NOT NULL,
    `oldValue`    LONGTEXT      NULL,
    `newValue`    LONGTEXT      NULL,
    `performedBy` INTEGER       NOT NULL,
    `createdAt`   DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PolicyAudit_policyId_idx`(`policyId`),
    INDEX `PolicyAudit_performedBy_idx`(`performedBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── ConfigurationVersion ─────────────────────────────────────────────────────
CREATE TABLE `ConfigurationVersion` (
    `id`           INTEGER       NOT NULL AUTO_INCREMENT,
    `settingKey`   VARCHAR(191)  NOT NULL,
    `value`        LONGTEXT      NOT NULL,
    `version`      INTEGER       NOT NULL,
    `module`       VARCHAR(191)  NOT NULL,
    `status`       VARCHAR(191)  NOT NULL DEFAULT 'draft',
    `changedById`  INTEGER       NOT NULL,
    `reviewedById` INTEGER       NULL,
    `publishedAt`  DATETIME(3)   NULL,
    `note`         LONGTEXT      NULL,
    `createdAt`    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ConfigurationVersion_settingKey_version_key`(`settingKey`, `version`),
    INDEX `ConfigurationVersion_settingKey_status_idx`(`settingKey`, `status`),
    INDEX `ConfigurationVersion_changedById_idx`(`changedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── Foreign Keys (separate ALTER TABLE per MySQL best practice) ──────────────
ALTER TABLE `Policy`
    ADD CONSTRAINT `Policy_categoryId_fkey`
        FOREIGN KEY (`categoryId`) REFERENCES `PolicyCategory`(`id`)
            ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `Policy_createdBy_fkey`
        FOREIGN KEY (`createdBy`) REFERENCES `Employee`(`id`)
            ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `Policy_approvedBy_fkey`
        FOREIGN KEY (`approvedBy`) REFERENCES `Employee`(`id`)
            ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `PolicyRule`
    ADD CONSTRAINT `PolicyRule_policyId_fkey`
        FOREIGN KEY (`policyId`) REFERENCES `Policy`(`id`)
            ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `PolicyVersion`
    ADD CONSTRAINT `PolicyVersion_policyId_fkey`
        FOREIGN KEY (`policyId`) REFERENCES `Policy`(`id`)
            ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `PolicyVersion_createdBy_fkey`
        FOREIGN KEY (`createdBy`) REFERENCES `Employee`(`id`)
            ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `PolicyAudit`
    ADD CONSTRAINT `PolicyAudit_policyId_fkey`
        FOREIGN KEY (`policyId`) REFERENCES `Policy`(`id`)
            ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `PolicyAudit_performedBy_fkey`
        FOREIGN KEY (`performedBy`) REFERENCES `Employee`(`id`)
            ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `ConfigurationVersion`
    ADD CONSTRAINT `ConfigurationVersion_changedById_fkey`
        FOREIGN KEY (`changedById`) REFERENCES `Employee`(`id`)
            ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `ConfigurationVersion_reviewedById_fkey`
        FOREIGN KEY (`reviewedById`) REFERENCES `Employee`(`id`)
            ON DELETE SET NULL ON UPDATE CASCADE;
