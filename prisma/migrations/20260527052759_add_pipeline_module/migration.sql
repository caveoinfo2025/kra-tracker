-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CrmLead" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'Direct',
    "categoryId" TEXT,
    "categoryName" TEXT NOT NULL DEFAULT '',
    "oemId" TEXT,
    "oemName" TEXT NOT NULL DEFAULT '',
    "productId" TEXT,
    "productName" TEXT NOT NULL DEFAULT '',
    "customerId" TEXT,
    "customerName" TEXT NOT NULL DEFAULT '',
    "stage" TEXT NOT NULL DEFAULT 'NEW_LEAD',
    "expectedValue" REAL NOT NULL DEFAULT 0,
    "remarks" TEXT NOT NULL DEFAULT '',
    "assignedToId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CrmLead_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CrmLead_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_CrmLead" ("assignedToId", "categoryId", "categoryName", "companyName", "contactPerson", "createdAt", "createdById", "customerId", "customerName", "email", "expectedValue", "id", "oemId", "oemName", "phone", "productId", "productName", "remarks", "source", "stage", "title", "updatedAt") SELECT "assignedToId", "categoryId", "categoryName", "companyName", "contactPerson", "createdAt", "createdById", "customerId", "customerName", "email", "expectedValue", "id", "oemId", "oemName", "phone", "productId", "productName", "remarks", "source", "stage", "title", "updatedAt" FROM "CrmLead";
DROP TABLE "CrmLead";
ALTER TABLE "new_CrmLead" RENAME TO "CrmLead";
CREATE TABLE "new_CrmOpportunity" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "leadId" INTEGER NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'PROPOSAL_SENT',
    "value" REAL NOT NULL DEFAULT 0,
    "expectedClosureDate" DATETIME,
    "probability" INTEGER NOT NULL DEFAULT 50,
    "lostReason" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CrmOpportunity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "CrmLead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CrmOpportunity" ("createdAt", "expectedClosureDate", "id", "leadId", "lostReason", "probability", "stage", "status", "updatedAt", "value") SELECT "createdAt", "expectedClosureDate", "id", "leadId", "lostReason", "probability", "stage", "status", "updatedAt", "value" FROM "CrmOpportunity";
DROP TABLE "CrmOpportunity";
ALTER TABLE "new_CrmOpportunity" RENAME TO "CrmOpportunity";
CREATE UNIQUE INDEX "CrmOpportunity_leadId_key" ON "CrmOpportunity"("leadId");
CREATE TABLE "new_CrmTask" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "dueDate" DATETIME NOT NULL,
    "assignedToId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "leadId" INTEGER,
    "opportunityId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CrmTask_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CrmTask_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "CrmLead" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CrmTask_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "CrmOpportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CrmTask" ("assignedToId", "createdAt", "description", "dueDate", "id", "leadId", "opportunityId", "priority", "status", "title", "updatedAt") SELECT "assignedToId", "createdAt", "description", "dueDate", "id", "leadId", "opportunityId", "priority", "status", "title", "updatedAt" FROM "CrmTask";
DROP TABLE "CrmTask";
ALTER TABLE "new_CrmTask" RENAME TO "CrmTask";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
