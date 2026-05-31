-- CreateTable
CREATE TABLE "LeadGeneration" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "employeeId" INTEGER NOT NULL,
    "territory" TEXT NOT NULL DEFAULT '',
    "leadSource" TEXT NOT NULL DEFAULT '',
    "customerName" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL DEFAULT '',
    "phoneEmail" TEXT NOT NULL DEFAULT '',
    "activityType" TEXT NOT NULL DEFAULT '',
    "activityCount" INTEGER NOT NULL DEFAULT 1,
    "leadStatus" TEXT NOT NULL DEFAULT 'New',
    "qualifiedFlag" BOOLEAN NOT NULL DEFAULT false,
    "nextActionDate" DATETIME,
    "remarks" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeadGeneration_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalesFunnel" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "opportunityId" TEXT NOT NULL DEFAULT '',
    "createdDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "employeeId" INTEGER NOT NULL,
    "territory" TEXT NOT NULL DEFAULT '',
    "customerName" TEXT NOT NULL,
    "solutionCategory" TEXT NOT NULL DEFAULT '',
    "opportunityName" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'Lead',
    "dealValueLakhs" REAL NOT NULL DEFAULT 0,
    "billingValueLakhs" REAL NOT NULL DEFAULT 0,
    "grossProfitPct" REAL NOT NULL DEFAULT 0,
    "proposalDate" DATETIME,
    "expectedCloseDate" DATETIME,
    "probabilityPct" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "newCustomerFlag" BOOLEAN NOT NULL DEFAULT false,
    "pocFlag" BOOLEAN NOT NULL DEFAULT false,
    "remarks" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SalesFunnel_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "invoiceDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invoiceNo" TEXT NOT NULL DEFAULT '',
    "employeeId" INTEGER NOT NULL,
    "customerName" TEXT NOT NULL,
    "invoiceValueLakhs" REAL NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "amountReceivedLakhs" REAL NOT NULL DEFAULT 0,
    "collectionStatus" TEXT NOT NULL DEFAULT 'Pending',
    "remarks" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Collection_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailyUpdate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "employeeId" INTEGER NOT NULL,
    "topUpdates" TEXT NOT NULL,
    "keyMovement" TEXT NOT NULL DEFAULT '',
    "blockers" TEXT NOT NULL DEFAULT '',
    "topDealThisWeek" TEXT NOT NULL DEFAULT '',
    "managerSupportRequired" BOOLEAN NOT NULL DEFAULT false,
    "updateStatus" TEXT NOT NULL DEFAULT 'On Track',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DailyUpdate_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Employee" ("createdAt", "department", "email", "id", "name", "role") SELECT "createdAt", "department", "email", "id", "name", "role" FROM "Employee";
DROP TABLE "Employee";
ALTER TABLE "new_Employee" RENAME TO "Employee";
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");
CREATE UNIQUE INDEX "Employee_msEmail_key" ON "Employee"("msEmail");
CREATE UNIQUE INDEX "Employee_msId_key" ON "Employee"("msId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
