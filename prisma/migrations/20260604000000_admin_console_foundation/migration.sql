-- Admin Console Phase 2 — Foundation
-- Modules: Tenant, Company, Branch, Department, Team, Designation,
--          EmployeeProfile, Role, Permission, RolePermission, UserRole,
--          DataAccessPolicy
-- Generated offline (no local MySQL). Apply via: npx prisma migrate deploy
-- All existing tables are preserved; only new tables are created.
-- Backward-compatible: no ALTER TABLE on existing tables.

-- ── Tenant ──────────────────────────────────────────────────────────────────
CREATE TABLE `Tenant` (
    `id`        INTEGER       NOT NULL AUTO_INCREMENT,
    `name`      VARCHAR(191)  NOT NULL,
    `code`      VARCHAR(191)  NOT NULL,
    `status`    VARCHAR(191)  NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3)   NOT NULL,

    UNIQUE INDEX `Tenant_code_key`(`code`),
    INDEX `Tenant_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── Company ──────────────────────────────────────────────────────────────────
CREATE TABLE `Company` (
    `id`          INTEGER       NOT NULL AUTO_INCREMENT,
    `tenantId`    INTEGER       NOT NULL,
    `companyName` VARCHAR(191)  NOT NULL,
    `legalName`   VARCHAR(191)  NOT NULL DEFAULT '',
    `companyCode` VARCHAR(191)  NOT NULL DEFAULT '',
    `gstNumber`   VARCHAR(191)  NOT NULL DEFAULT '',
    `panNumber`   VARCHAR(191)  NOT NULL DEFAULT '',
    `email`       VARCHAR(191)  NOT NULL DEFAULT '',
    `phone`       VARCHAR(191)  NOT NULL DEFAULT '',
    `website`     VARCHAR(191)  NOT NULL DEFAULT '',
    `status`      VARCHAR(191)  NOT NULL DEFAULT 'ACTIVE',
    `createdAt`   DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`   DATETIME(3)   NOT NULL,

    INDEX `Company_tenantId_idx`(`tenantId`),
    INDEX `Company_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── Branch ───────────────────────────────────────────────────────────────────
CREATE TABLE `Branch` (
    `id`         INTEGER       NOT NULL AUTO_INCREMENT,
    `companyId`  INTEGER       NOT NULL,
    `branchName` VARCHAR(191)  NOT NULL,
    `branchCode` VARCHAR(191)  NOT NULL DEFAULT '',
    `address`    TEXT          NOT NULL DEFAULT '',
    `city`       VARCHAR(191)  NOT NULL DEFAULT '',
    `state`      VARCHAR(191)  NOT NULL DEFAULT '',
    `country`    VARCHAR(191)  NOT NULL DEFAULT 'India',
    `timezone`   VARCHAR(191)  NOT NULL DEFAULT 'Asia/Kolkata',
    `status`     VARCHAR(191)  NOT NULL DEFAULT 'ACTIVE',
    `createdAt`  DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`  DATETIME(3)   NOT NULL,

    INDEX `Branch_companyId_idx`(`companyId`),
    INDEX `Branch_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── Department ───────────────────────────────────────────────────────────────
CREATE TABLE `Department` (
    `id`          INTEGER       NOT NULL AUTO_INCREMENT,
    `companyId`   INTEGER       NOT NULL,
    `name`        VARCHAR(191)  NOT NULL,
    `code`        VARCHAR(191)  NOT NULL DEFAULT '',
    `description` TEXT          NOT NULL DEFAULT '',
    `status`      VARCHAR(191)  NOT NULL DEFAULT 'ACTIVE',
    `createdAt`   DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`   DATETIME(3)   NOT NULL,

    INDEX `Department_companyId_idx`(`companyId`),
    INDEX `Department_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── Team ─────────────────────────────────────────────────────────────────────
CREATE TABLE `Team` (
    `id`           INTEGER       NOT NULL AUTO_INCREMENT,
    `departmentId` INTEGER       NOT NULL,
    `name`         VARCHAR(191)  NOT NULL,
    `teamLeadId`   INTEGER       NULL,
    `status`       VARCHAR(191)  NOT NULL DEFAULT 'ACTIVE',
    `createdAt`    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`    DATETIME(3)   NOT NULL,

    INDEX `Team_departmentId_idx`(`departmentId`),
    INDEX `Team_teamLeadId_idx`(`teamLeadId`),
    INDEX `Team_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── Designation ──────────────────────────────────────────────────────────────
CREATE TABLE `Designation` (
    `id`          INTEGER       NOT NULL AUTO_INCREMENT,
    `companyId`   INTEGER       NOT NULL,
    `title`       VARCHAR(191)  NOT NULL,
    `level`       INTEGER       NOT NULL DEFAULT 1,
    `description` TEXT          NOT NULL DEFAULT '',
    `status`      VARCHAR(191)  NOT NULL DEFAULT 'ACTIVE',
    `createdAt`   DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`   DATETIME(3)   NOT NULL,

    INDEX `Designation_companyId_idx`(`companyId`),
    INDEX `Designation_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── EmployeeProfile ──────────────────────────────────────────────────────────
-- employmentStatus: DRAFT | ACTIVE | SUSPENDED | INACTIVE
CREATE TABLE `EmployeeProfile` (
    `id`                 INTEGER       NOT NULL AUTO_INCREMENT,
    `userId`             INTEGER       NOT NULL,
    `employeeCode`       VARCHAR(191)  NOT NULL DEFAULT '',
    `companyId`          INTEGER       NULL,
    `branchId`           INTEGER       NULL,
    `departmentId`       INTEGER       NULL,
    `teamId`             INTEGER       NULL,
    `designationId`      INTEGER       NULL,
    `reportingManagerId` INTEGER       NULL,
    `joiningDate`        DATETIME(3)   NULL,
    `employmentStatus`   VARCHAR(191)  NOT NULL DEFAULT 'ACTIVE',
    `createdAt`          DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`          DATETIME(3)   NOT NULL,

    UNIQUE INDEX `EmployeeProfile_userId_key`(`userId`),
    INDEX `EmployeeProfile_companyId_idx`(`companyId`),
    INDEX `EmployeeProfile_branchId_idx`(`branchId`),
    INDEX `EmployeeProfile_departmentId_idx`(`departmentId`),
    INDEX `EmployeeProfile_teamId_idx`(`teamId`),
    INDEX `EmployeeProfile_designationId_idx`(`designationId`),
    INDEX `EmployeeProfile_reportingManagerId_idx`(`reportingManagerId`),
    INDEX `EmployeeProfile_employmentStatus_idx`(`employmentStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── Role (enterprise role — AppRole legacy kept) ────────────────────────────
CREATE TABLE `Role` (
    `id`           INTEGER       NOT NULL AUTO_INCREMENT,
    `tenantId`     INTEGER       NULL,
    `name`         VARCHAR(191)  NOT NULL,
    `description`  TEXT          NOT NULL DEFAULT '',
    `level`        INTEGER       NOT NULL DEFAULT 1,
    `isSystemRole` BOOLEAN       NOT NULL DEFAULT false,
    `status`       VARCHAR(191)  NOT NULL DEFAULT 'ACTIVE',
    `createdAt`    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`    DATETIME(3)   NOT NULL,

    INDEX `Role_tenantId_idx`(`tenantId`),
    INDEX `Role_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── Permission ───────────────────────────────────────────────────────────────
-- Unique per (module, resource, action); global across tenants.
CREATE TABLE `Permission` (
    `id`          INTEGER       NOT NULL AUTO_INCREMENT,
    `module`      VARCHAR(191)  NOT NULL,
    `resource`    VARCHAR(191)  NOT NULL,
    `action`      VARCHAR(191)  NOT NULL,
    `description` TEXT          NOT NULL DEFAULT '',

    UNIQUE INDEX `Permission_module_resource_action_key`(`module`, `resource`, `action`),
    INDEX `Permission_module_idx`(`module`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── RolePermission ───────────────────────────────────────────────────────────
CREATE TABLE `RolePermission` (
    `id`           INTEGER       NOT NULL AUTO_INCREMENT,
    `roleId`       INTEGER       NOT NULL,
    `permissionId` INTEGER       NOT NULL,
    `createdAt`    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `RolePermission_roleId_permissionId_key`(`roleId`, `permissionId`),
    INDEX `RolePermission_roleId_idx`(`roleId`),
    INDEX `RolePermission_permissionId_idx`(`permissionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── UserRole (many roles per employee) ──────────────────────────────────────
CREATE TABLE `UserRole` (
    `id`        INTEGER       NOT NULL AUTO_INCREMENT,
    `userId`    INTEGER       NOT NULL,
    `roleId`    INTEGER       NOT NULL,
    `createdAt` DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `UserRole_userId_roleId_key`(`userId`, `roleId`),
    INDEX `UserRole_userId_idx`(`userId`),
    INDEX `UserRole_roleId_idx`(`roleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── DataAccessPolicy ─────────────────────────────────────────────────────────
-- scope: OWN | TEAM | DEPARTMENT | BRANCH | COMPANY | ALL
CREATE TABLE `DataAccessPolicy` (
    `id`         INTEGER       NOT NULL AUTO_INCREMENT,
    `roleId`     INTEGER       NOT NULL,
    `module`     VARCHAR(191)  NOT NULL DEFAULT '',
    `scope`      VARCHAR(191)  NOT NULL DEFAULT 'OWN',
    `filterJson` TEXT          NULL,
    `createdAt`  DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`  DATETIME(3)   NOT NULL,

    UNIQUE INDEX `DataAccessPolicy_roleId_module_key`(`roleId`, `module`),
    INDEX `DataAccessPolicy_roleId_idx`(`roleId`),
    INDEX `DataAccessPolicy_scope_idx`(`scope`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── Foreign Keys ─────────────────────────────────────────────────────────────

ALTER TABLE `Company`
    ADD CONSTRAINT `Company_tenantId_fkey`
    FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Branch`
    ADD CONSTRAINT `Branch_companyId_fkey`
    FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Department`
    ADD CONSTRAINT `Department_companyId_fkey`
    FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Team`
    ADD CONSTRAINT `Team_departmentId_fkey`
    FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Team`
    ADD CONSTRAINT `Team_teamLeadId_fkey`
    FOREIGN KEY (`teamLeadId`) REFERENCES `Employee`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Designation`
    ADD CONSTRAINT `Designation_companyId_fkey`
    FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `EmployeeProfile`
    ADD CONSTRAINT `EmployeeProfile_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `Employee`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `EmployeeProfile`
    ADD CONSTRAINT `EmployeeProfile_companyId_fkey`
    FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `EmployeeProfile`
    ADD CONSTRAINT `EmployeeProfile_branchId_fkey`
    FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `EmployeeProfile`
    ADD CONSTRAINT `EmployeeProfile_departmentId_fkey`
    FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `EmployeeProfile`
    ADD CONSTRAINT `EmployeeProfile_teamId_fkey`
    FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `EmployeeProfile`
    ADD CONSTRAINT `EmployeeProfile_designationId_fkey`
    FOREIGN KEY (`designationId`) REFERENCES `Designation`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `EmployeeProfile`
    ADD CONSTRAINT `EmployeeProfile_reportingManagerId_fkey`
    FOREIGN KEY (`reportingManagerId`) REFERENCES `Employee`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Role`
    ADD CONSTRAINT `Role_tenantId_fkey`
    FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `RolePermission`
    ADD CONSTRAINT `RolePermission_roleId_fkey`
    FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `RolePermission`
    ADD CONSTRAINT `RolePermission_permissionId_fkey`
    FOREIGN KEY (`permissionId`) REFERENCES `Permission`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `UserRole`
    ADD CONSTRAINT `UserRole_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `Employee`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `UserRole`
    ADD CONSTRAINT `UserRole_roleId_fkey`
    FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `DataAccessPolicy`
    ADD CONSTRAINT `DataAccessPolicy_roleId_fkey`
    FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
