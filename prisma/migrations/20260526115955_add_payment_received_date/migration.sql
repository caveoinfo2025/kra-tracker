-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WeeklyCommit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeId" INTEGER NOT NULL,
    "kraId" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "commitText" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WeeklyCommit_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WeeklyCommit_kraId_fkey" FOREIGN KEY ("kraId") REFERENCES "KRA" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_WeeklyCommit" ("commitText", "createdAt", "employeeId", "id", "kraId", "updatedAt", "week", "year") SELECT "commitText", "createdAt", "employeeId", "id", "kraId", "updatedAt", "week", "year" FROM "WeeklyCommit";
DROP TABLE "WeeklyCommit";
ALTER TABLE "new_WeeklyCommit" RENAME TO "WeeklyCommit";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
