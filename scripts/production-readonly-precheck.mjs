/**
 * Production READ-ONLY pre-check runner — Decimal / INR migration readiness (Step 3Y).
 *
 * THIS SCRIPT IS READ-ONLY. It runs only SELECT/SHOW/INFORMATION_SCHEMA queries — every query
 * string below is also scanned at runtime against a forbidden-keyword list before it is ever
 * sent to the database, as a second, independent safety net beyond "we wrote it carefully."
 *
 * This script must be run only by a human, directly against a CONFIRMED production database,
 * after reading docs/database/production-precheck/README.md and
 * docs/database/production-precheck/production-precheck-safety-checklist.md.
 *
 * It will refuse to run unless:
 *   - CONFIRM_PRODUCTION_READONLY_PRECHECK=YES is set in the environment
 *   - DATABASE_URL is set in the environment
 *   - DATABASE_URL does not resolve to the known dev database name (u686730471_caveodev) —
 *     this script's whole purpose is a production check; running it against dev is always a
 *     mistake, not a valid use, so it refuses rather than silently doing the wrong thing
 *
 * It never prints DATABASE_URL, the password, or the username. It prints only the database
 * name and a masked host (first label only, e.g. "srv2201.***").
 *
 * Usage (on the machine with confirmed production access only):
 *   CONFIRM_PRODUCTION_READONLY_PRECHECK=YES DATABASE_URL="<production-url>" \
 *     node scripts/production-readonly-precheck.mjs
 *
 * Output is written to a local Markdown file
 * (production-precheck-output-<timestamp>.md in the current working directory) — never printed
 * with secrets, and never sent anywhere automatically.
 */

import { createRequire } from "module";
import { writeFileSync } from "fs";

const require = createRequire(import.meta.url);

// ── Guard 1: explicit opt-in ────────────────────────────────────────────────────────────────────
if (process.env.CONFIRM_PRODUCTION_READONLY_PRECHECK !== "YES") {
  console.error(
    "Refusing to run: set CONFIRM_PRODUCTION_READONLY_PRECHECK=YES to confirm you intend to run " +
      "this READ-ONLY check against a database you have already confirmed is production.\n" +
      "Read docs/database/production-precheck/README.md and " +
      "production-precheck-safety-checklist.md first."
  );
  process.exit(2);
}

// ── Guard 2: DATABASE_URL must be present, never printed ───────────────────────────────────────
const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) {
  console.error("Refusing to run: DATABASE_URL is not set in the current environment.");
  process.exit(2);
}

let parsed;
try {
  // Mirror src/lib/prisma.ts's stray-backslash-escape stripping (Hostinger/Passenger gotcha)
  parsed = new URL(rawUrl.replace(/\\(.)/g, "$1"));
} catch {
  console.error("Refusing to run: DATABASE_URL could not be parsed as a URL. No value printed.");
  process.exit(2);
}

const dbName = parsed.pathname.replace(/^\//, "");
const maskedHost = `${(parsed.hostname || "").split(".")[0]}.***`;

// ── Guard 3: refuse the known dev database — this script is for production only ────────────────
if (dbName === "u686730471_caveodev") {
  console.error(
    "Refusing to run: DATABASE_URL resolves to the known DEV database " +
      `("${dbName}"). This script exists to check PRODUCTION readiness — running it against ` +
      "dev is always a mistake here. Use the existing dev-only verification scripts/docs " +
      "instead (see docs/database/DECIMAL_RELEASE2_MIGRATION_RESULTS.md for the dev-equivalent " +
      "checks already run)."
  );
  process.exit(2);
}

console.log(`Target database name: ${dbName}`);
console.log(`Target host (masked): ${maskedHost}`);
console.log("DATABASE_URL, username, and password are never printed by this script.\n");

// ── Guard 4: every query is scanned for forbidden keywords before it is ever executed ──────────
const FORBIDDEN_KEYWORDS =
  /\b(INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE|CREATE|REPLACE|RENAME|GRANT|REVOKE|SET\s+FOREIGN_KEY_CHECKS)\b/i;

function assertReadOnly(sql) {
  if (FORBIDDEN_KEYWORDS.test(sql)) {
    throw new Error(
      `Refusing to execute — forbidden keyword detected in query:\n${sql}\n` +
        "This script only ever executes SELECT/SHOW/INFORMATION_SCHEMA queries."
    );
  }
  if (!/^\s*(SELECT|SHOW)\b/i.test(sql)) {
    throw new Error(
      `Refusing to execute — query does not start with SELECT or SHOW:\n${sql}`
    );
  }
}

const QUERIES = {
  dbIdentity: [
    "SELECT DATABASE() AS current_database",
    "SELECT VERSION() AS mysql_version",
    "SELECT NOW() AS server_time",
  ],
  migrationHistory: [
    "SELECT migration_name, started_at, finished_at, rolled_back_at, applied_steps_count FROM `_prisma_migrations` ORDER BY started_at",
  ],
  schemaColumns: [
    `SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND (
         (TABLE_NAME = 'Expense' AND COLUMN_NAME IN ('amountLakhs', 'gstAmountLakhs')) OR
         (TABLE_NAME = 'EmployeeAdvance' AND COLUMN_NAME IN ('amountLakhs', 'disbursedAmountLakhs', 'settledAmountLakhs', 'balanceLakhs')) OR
         (TABLE_NAME = 'TravelClaim' AND COLUMN_NAME IN ('amountLakhs', 'amountRupees', 'ratePerKm')) OR
         (TABLE_NAME = 'Payment' AND COLUMN_NAME IN ('amountLakhs')) OR
         (TABLE_NAME = 'Collection' AND COLUMN_NAME IN ('invoiceValueLakhs', 'amountWithoutGstLakhs', 'amountReceivedLakhs')) OR
         (TABLE_NAME = 'OrderAdvance' AND COLUMN_NAME IN ('amountLakhs')) OR
         (TABLE_NAME = 'CrmLead' AND COLUMN_NAME IN ('expectedValue')) OR
         (TABLE_NAME = 'CrmOpportunity' AND COLUMN_NAME IN ('value', 'dealValueExTax', 'netProfitLakhs')) OR
         (TABLE_NAME = 'SalesFunnel' AND COLUMN_NAME IN ('dealValueLakhs', 'billingValueLakhs')) OR
         (TABLE_NAME = 'kra_template_item' AND COLUMN_NAME IN ('expectedTarget', 'stretchTarget', 'minimumTarget')) OR
         (TABLE_NAME = 'KRA' AND COLUMN_NAME IN ('target')) OR
         (TABLE_NAME = 'employee_target' AND COLUMN_NAME IN ('targetJson')) OR
         (TABLE_NAME = 'team_target' AND COLUMN_NAME IN ('targetJson')) OR
         (TABLE_NAME = 'Voucher' AND COLUMN_NAME IN ('amountLakhs')) OR
         (TABLE_NAME = 'Ledger' AND COLUMN_NAME IN ('amountLakhs'))
       )
     ORDER BY TABLE_NAME, COLUMN_NAME`,
  ],
  rowCounts: [
    "SELECT 'Expense' AS table_name, COUNT(*) AS row_count FROM `Expense`",
    "SELECT 'EmployeeAdvance' AS table_name, COUNT(*) AS row_count FROM `EmployeeAdvance`",
    "SELECT 'TravelClaim' AS table_name, COUNT(*) AS row_count FROM `TravelClaim`",
    "SELECT 'Payment' AS table_name, COUNT(*) AS row_count FROM `Payment`",
    "SELECT 'Collection' AS table_name, COUNT(*) AS row_count FROM `Collection`",
    "SELECT 'OrderAdvance' AS table_name, COUNT(*) AS row_count FROM `OrderAdvance`",
    "SELECT 'CrmLead' AS table_name, COUNT(*) AS row_count FROM `CrmLead`",
    "SELECT 'CrmOpportunity' AS table_name, COUNT(*) AS row_count FROM `CrmOpportunity`",
    "SELECT 'SalesFunnel' AS table_name, COUNT(*) AS row_count FROM `SalesFunnel`",
    "SELECT 'kra_template_item' AS table_name, COUNT(*) AS row_count FROM `kra_template_item`",
    "SELECT 'KRA' AS table_name, COUNT(*) AS row_count FROM `KRA`",
    "SELECT 'employee_target' AS table_name, COUNT(*) AS row_count FROM `employee_target`",
    "SELECT 'team_target' AS table_name, COUNT(*) AS row_count FROM `team_target`",
    "SELECT 'Voucher' AS table_name, COUNT(*) AS row_count FROM `Voucher`",
    "SELECT 'Ledger' AS table_name, COUNT(*) AS row_count FROM `Ledger`",
    "SELECT 'FinAccount' AS table_name, COUNT(*) AS row_count FROM `FinAccount`",
  ],
  kraMetricTaxonomy: ["SELECT id, name, code, metricType, calculationSource, status FROM `kra_metric` ORDER BY id"],
  kraTemplateItemMismatch: [
    `SELECT kti.id AS template_item_id, kti.targetType, km.metricType, kti.minimumTarget, kti.expectedTarget, kti.stretchTarget
     FROM \`kra_template_item\` kti
     JOIN \`kra_metric\` km ON kti.metricId = km.id
     WHERE kti.targetType <> km.metricType`,
  ],
  teamTargetCount: ["SELECT COUNT(*) AS team_target_row_count FROM `team_target`"],
};

// Validate every query before connecting to anything.
for (const [section, list] of Object.entries(QUERIES)) {
  for (const sql of list) assertReadOnly(sql);
}
console.log("All queries passed the read-only keyword guard.\n");

async function main() {
  const mariadb = require("mariadb");
  const conn = await mariadb.createConnection({
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: dbName,
    connectTimeout: 15000,
  });

  const results = {};
  try {
    for (const [section, list] of Object.entries(QUERIES)) {
      results[section] = [];
      for (const sql of list) {
        assertReadOnly(sql); // re-check immediately before execution, not just at startup
        const rows = await conn.query(sql);
        results[section].push({ sql, rows });
      }
    }
  } finally {
    await conn.end();
  }
  return results;
}

function toMarkdown(results) {
  const lines = [
    "# Production Read-Only Pre-Check — Script Output",
    "",
    `Database name: ${dbName}`,
    `Host (masked): ${maskedHost}`,
    `Generated: ${new Date(Date.now()).toISOString()}`,
    "",
    "> Review this file yourself before sharing it — confirm it contains no sensitive value.",
    "",
  ];
  for (const [section, entries] of Object.entries(results)) {
    lines.push(`## ${section}`, "");
    for (const { sql, rows } of entries) {
      lines.push("```sql", sql.trim(), "```", "", "```json", JSON.stringify(rows, null, 2), "```", "");
    }
  }
  return lines.join("\n");
}

main()
  .then((results) => {
    const stamp = new Date(Date.now()).toISOString().replace(/[:.]/g, "-");
    const outPath = `production-precheck-output-${stamp}.md`;
    writeFileSync(outPath, toMarkdown(results), "utf8");
    console.log(`\nDone. Output written to: ${outPath}`);
    console.log("Review this file yourself, then transcribe sanitized findings into");
    console.log("docs/database/production-precheck/production-precheck-result-template.md");
  })
  .catch((err) => {
    console.error("\nFailed:", err.message);
    process.exit(1);
  });
