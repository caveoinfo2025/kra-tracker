-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Collection" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "invoiceDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invoiceNo" TEXT NOT NULL DEFAULT '',
    "employeeId" INTEGER NOT NULL,
    "customerName" TEXT NOT NULL,
    "invoiceValueLakhs" REAL NOT NULL,
    "amountWithoutGstLakhs" REAL NOT NULL DEFAULT 0,
    "dueDate" DATETIME NOT NULL,
    "amountReceivedLakhs" REAL NOT NULL DEFAULT 0,
    "collectionStatus" TEXT NOT NULL DEFAULT 'Pending',
    "remarks" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Collection_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Collection" ("amountReceivedLakhs", "collectionStatus", "createdAt", "customerName", "dueDate", "employeeId", "id", "invoiceDate", "invoiceNo", "invoiceValueLakhs", "remarks") SELECT "amountReceivedLakhs", "collectionStatus", "createdAt", "customerName", "dueDate", "employeeId", "id", "invoiceDate", "invoiceNo", "invoiceValueLakhs", "remarks" FROM "Collection";
DROP TABLE "Collection";
ALTER TABLE "new_Collection" RENAME TO "Collection";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
