-- CreateTable
CREATE TABLE "AppRole" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6b7280',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RolePageAccess" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "roleId" INTEGER NOT NULL,
    "pageKey" TEXT NOT NULL,
    "canView" BOOLEAN NOT NULL DEFAULT false,
    "canCreate" BOOLEAN NOT NULL DEFAULT false,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,
    "canDelete" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "RolePageAccess_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "AppRole" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AppRole_name_key" ON "AppRole"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RolePageAccess_roleId_pageKey_key" ON "RolePageAccess"("roleId", "pageKey");
