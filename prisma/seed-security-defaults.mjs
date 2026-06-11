// Seed: Phase 13 Security Center — default policies
// Usage: node prisma/seed-security-defaults.mjs
import { createConnection } from "mariadb";
import { readFileSync }     from "fs";

const envRaw = readFileSync(".env", "utf8");
const dbUrl  = envRaw.match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/)?.[1]?.trim();
if (!dbUrl) { console.error("DATABASE_URL not in .env"); process.exit(1); }

const clean = dbUrl.replace(/\\%/g, "%");
const m     = clean.match(/^mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/);
if (!m) { console.error("Cannot parse DATABASE_URL"); process.exit(1); }
const [, user, rawPass, host, port, database] = m;
const password = decodeURIComponent(rawPass);

const conn = await createConnection({ host, port: Number(port), user, password, database });

async function seedIfEmpty(table, insertSql, params, label) {
  const rows = await conn.query(`SELECT COUNT(*) AS c FROM \`${table}\``);
  const count = Number(rows[0].c);
  if (count > 0) { console.log(`  SKIP (${count} rows): ${label}`); return; }
  await conn.query(insertSql, params);
  console.log(`  INSERT: ${label}`);
}

// Default Password Policy
await seedIfEmpty(
  "password_policy",
  `INSERT INTO password_policy
     (minimumLength, requireUppercase, requireLowercase, requireNumber,
      requireSpecialCharacter, expiryDays, passwordHistoryCount,
      failedAttemptLimit, lockDurationMinutes, status, createdAt, updatedAt)
   VALUES (8, 1, 1, 1, 0, 90, 5, 5, 30, 'ACTIVE', NOW(3), NOW(3))`,
  [],
  "Default Password Policy (length=8, expiry=90d, 5 attempts)"
);

// Default MFA Policy (disabled)
await seedIfEmpty(
  "mfa_policy",
  `INSERT INTO mfa_policy
     (enabled, requiredRolesJson, methodsJson, rememberDeviceDays, status, createdAt, updatedAt)
   VALUES (0, '[]', '["EMAIL"]', 30, 'ACTIVE', NOW(3), NOW(3))`,
  [],
  "Default MFA Policy (disabled)"
);

// Default Session Policy (8h idle, 8h max)
await seedIfEmpty(
  "session_policy",
  `INSERT INTO session_policy
     (idleTimeoutMinutes, maxSessionHours, allowConcurrentLogin,
      maxConcurrentSessions, rememberMeAllowed, status, createdAt, updatedAt)
   VALUES (480, 8, 1, 3, 1, 'ACTIVE', NOW(3), NOW(3))`,
  [],
  "Default Session Policy (8h idle/max, concurrent allowed)"
);

// Default Access Restriction (no restrictions)
await seedIfEmpty(
  "access_restriction_policy",
  `INSERT INTO access_restriction_policy
     (ipRestrictionEnabled, allowedIpJson, businessHourRestriction,
      allowedHoursJson, locationRestrictionJson, status, createdAt, updatedAt)
   VALUES (0, '[]', 0, '{"start":"09:00","end":"18:00","days":[1,2,3,4,5]}',
           '{}', 'ACTIVE', NOW(3), NOW(3))`,
  [],
  "Default Access Restriction (no restrictions)"
);

// Default Data Protection Policy (1000-record export limit)
await seedIfEmpty(
  "data_protection_policy",
  `INSERT INTO data_protection_policy
     (exportLimit, exportApprovalRequired, downloadRestriction,
      sensitiveFieldsJson, maskingRulesJson, status, createdAt, updatedAt)
   VALUES (1000, 0, 0, '["mobile","email","pan","aadhar"]',
           '[]', 'ACTIVE', NOW(3), NOW(3))`,
  [],
  "Default Data Protection Policy (1000 records, mobile/email masked)"
);

await conn.end();
console.log("\nDone. All default security policies seeded.");
console.log("Policies are ACTIVE but non-enforcing until integrated into auth flows.");
