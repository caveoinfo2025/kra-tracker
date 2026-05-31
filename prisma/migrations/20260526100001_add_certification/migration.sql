-- CreateTable
CREATE TABLE IF NOT EXISTS "Certification" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeId" INTEGER NOT NULL,
    "kraId" INTEGER NOT NULL,
    "certName" TEXT NOT NULL,
    "issuingBody" TEXT NOT NULL DEFAULT '',
    "dateObtained" DATETIME NOT NULL,
    "expiryDate" DATETIME,
    "attachmentUrl" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approvedBy" INTEGER,
    "approvedAt" DATETIME,
    "remarks" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Certification_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Certification_kraId_fkey" FOREIGN KEY ("kraId") REFERENCES "KRA" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
