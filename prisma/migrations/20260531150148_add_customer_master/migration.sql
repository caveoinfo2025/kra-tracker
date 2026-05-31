-- CreateTable
CREATE TABLE "Customer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL DEFAULT '',
    "district" TEXT NOT NULL DEFAULT '',
    "state" TEXT NOT NULL DEFAULT '',
    "pincode" TEXT NOT NULL DEFAULT '',
    "gstNo" TEXT NOT NULL DEFAULT '',
    "officeType" TEXT NOT NULL DEFAULT 'HO',
    "parentId" INTEGER,
    "crmSource" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Customer_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
