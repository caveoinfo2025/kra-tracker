-- Pipeline Module: Lead Qualification & Opportunity Funnel

CREATE TABLE IF NOT EXISTS "CrmLead" (
    "id"            INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title"         TEXT     NOT NULL,
    "companyName"   TEXT     NOT NULL,
    "contactPerson" TEXT     NOT NULL,
    "email"         TEXT     NOT NULL DEFAULT '',
    "phone"         TEXT     NOT NULL DEFAULT '',
    "source"        TEXT     NOT NULL DEFAULT 'Direct',
    "categoryId"    TEXT,
    "categoryName"  TEXT     NOT NULL DEFAULT '',
    "oemId"         TEXT,
    "oemName"       TEXT     NOT NULL DEFAULT '',
    "productId"     TEXT,
    "productName"   TEXT     NOT NULL DEFAULT '',
    "customerId"    TEXT,
    "customerName"  TEXT     NOT NULL DEFAULT '',
    "stage"         TEXT     NOT NULL DEFAULT 'NEW_LEAD',
    "expectedValue" REAL     NOT NULL DEFAULT 0,
    "remarks"       TEXT     NOT NULL DEFAULT '',
    "assignedToId"  INTEGER  NOT NULL,
    "createdById"   INTEGER  NOT NULL,
    "createdAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CrmLead_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CrmLead_createdById_fkey"  FOREIGN KEY ("createdById")  REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "CrmOpportunity" (
    "id"                  INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT,
    "leadId"              INTEGER  NOT NULL UNIQUE,
    "stage"               TEXT     NOT NULL DEFAULT 'PROPOSAL_SENT',
    "value"               REAL     NOT NULL DEFAULT 0,
    "expectedClosureDate" DATETIME,
    "probability"         INTEGER  NOT NULL DEFAULT 50,
    "lostReason"          TEXT     NOT NULL DEFAULT '',
    "status"              TEXT     NOT NULL DEFAULT 'active',
    "createdAt"           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CrmOpportunity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "CrmLead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "CrmTask" (
    "id"            INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title"         TEXT     NOT NULL,
    "description"   TEXT     NOT NULL DEFAULT '',
    "dueDate"       DATETIME NOT NULL,
    "assignedToId"  INTEGER  NOT NULL,
    "status"        TEXT     NOT NULL DEFAULT 'pending',
    "priority"      TEXT     NOT NULL DEFAULT 'medium',
    "leadId"        INTEGER,
    "opportunityId" INTEGER,
    "createdAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CrmTask_assignedToId_fkey"  FOREIGN KEY ("assignedToId")  REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CrmTask_leadId_fkey"        FOREIGN KEY ("leadId")        REFERENCES "CrmLead" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CrmTask_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "CrmOpportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "CrmMeeting" (
    "id"            INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title"         TEXT     NOT NULL,
    "meetingDate"   DATETIME NOT NULL,
    "notes"         TEXT     NOT NULL DEFAULT '',
    "attendees"     TEXT     NOT NULL DEFAULT '',
    "location"      TEXT     NOT NULL DEFAULT '',
    "leadId"        INTEGER,
    "opportunityId" INTEGER,
    "employeeId"    INTEGER  NOT NULL,
    "createdAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CrmMeeting_leadId_fkey"        FOREIGN KEY ("leadId")        REFERENCES "CrmLead" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CrmMeeting_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "CrmOpportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CrmMeeting_employeeId_fkey"    FOREIGN KEY ("employeeId")    REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "CrmActivity" (
    "id"            INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT,
    "entityType"    TEXT     NOT NULL,
    "entityId"      INTEGER  NOT NULL,
    "action"        TEXT     NOT NULL,
    "description"   TEXT     NOT NULL DEFAULT '',
    "meta"          TEXT     NOT NULL DEFAULT '',
    "performedById" INTEGER  NOT NULL,
    "timestamp"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leadId"        INTEGER,
    "opportunityId" INTEGER,
    CONSTRAINT "CrmActivity_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CrmActivity_leadId_fkey"        FOREIGN KEY ("leadId")        REFERENCES "CrmLead" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CrmActivity_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "CrmOpportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "CrmNote" (
    "id"        INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT,
    "content"   TEXT     NOT NULL,
    "leadId"    INTEGER  NOT NULL,
    "authorId"  INTEGER  NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CrmNote_leadId_fkey"   FOREIGN KEY ("leadId")   REFERENCES "CrmLead" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CrmNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
