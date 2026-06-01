-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Employee" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "isManager" BOOLEAN NOT NULL DEFAULT false,
    "msEmail" TEXT,
    "msId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reportsToId" INTEGER,
    CONSTRAINT "Employee_reportsToId_fkey" FOREIGN KEY ("reportsToId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Employee" ("createdAt", "department", "email", "id", "isManager", "msEmail", "msId", "name", "role") SELECT "createdAt", "department", "email", "id", "isManager", "msEmail", "msId", "name", "role" FROM "Employee";
DROP TABLE "Employee";
ALTER TABLE "new_Employee" RENAME TO "Employee";
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");
CREATE UNIQUE INDEX "Employee_msEmail_key" ON "Employee"("msEmail");
CREATE UNIQUE INDEX "Employee_msId_key" ON "Employee"("msId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
