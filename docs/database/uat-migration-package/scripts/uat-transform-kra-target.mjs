// UAT KRA.target free-text money-label transform script.
// Step 4E (2026-06-24): generated for review only, execution path commented out.
// Step 4G-1 (2026-06-24): execution path finalized. Defaults to DRY RUN (read-only,
// no write) unless CONFIRM_UAT_KRA_TARGET_TRANSFORM=YES is explicitly set.
//
// Mirrors dev's own pattern for this exact problem: dev used a guarded Node
// script (prisma/transform-kra-target-money.mjs, deleted after use) instead
// of inline SQL, because multiplying only specific "label: value" pairs
// inside free text cannot be reliably done as a single SQL statement. This
// script does the same for UAT, using the UAT-confirmed 6-label allowlist
// from docs/database/UAT_DECIMAL_INR_MIGRATION_ADJUSTMENT_PLAN.md §7.
//
// Safety guards:
//   - refuses any DB except u686730471_Caveo_UAT
//   - never prints DATABASE_URL or password — only a masked DB identity
//   - DRY RUN by default; only writes when CONFIRM_UAT_KRA_TARGET_TRANSFORM=YES
//   - only ever multiplies a numeric value immediately following one of
//     the 6 allowlisted money labels; every other label in the same row's
//     free text is left byte-for-byte unchanged
//   - parses every "label: value" pair in every row and ABORTS (no write,
//     even in dry-run) if any label is not on either the money allowlist or
//     the known-non-money allowlist below — an unrecognized label means the
//     34-row classification in Step 4D may be incomplete, and this script
//     must not guess
//   - logs a full before/after diff per changed row
//   - real writes run inside a single transaction (all-or-nothing)
//   - does not touch EmployeeTarget or TeamTarget (both confirmed 0 rows on
//     UAT — see Step 4D) and does not touch any structured KRA template table
//     (also confirmed 0 rows on UAT)
//
// Usage:
//   Dry run (default, read-only):
//     DATABASE_URL="mysql://..." node scripts/uat-transform-kra-target.mjs
//   Real execution (writes, transactional):
//     CONFIRM_UAT_KRA_TARGET_TRANSFORM=YES DATABASE_URL="mysql://..." node \
//       scripts/uat-transform-kra-target.mjs

import { createRequire } from "module";

const require = createRequire(import.meta.url);
const mariadb = require("mariadb");

const EXPECTED_DB_NAME = "u686730471_Caveo_UAT";

// Final UAT-confirmed money-label allowlist (Step 4D, full 34-row review).
const MONEY_LABELS = [
  "total sales revenue - booking",
  "total sales revenue - billing",
  "total funnel / pipeline value created (₹ lakhs)",
  "total team booking target achievement (₹ lakhs)",
  "total team billing achievement",
  "total team pipeline coverage (₹ lakhs)",
];

// Every non-money label independently confirmed during the Step 4D full
// 34-row review (docs/database/UAT_DECIMAL_INR_MIGRATION_ADJUSTMENT_PLAN.md
// §7's allowlist table). Any label encountered that is NOT in this list and
// NOT in MONEY_LABELS is "unexpected" and aborts the run.
const KNOWN_NON_MONEY_LABELS = [
  "average gross profit margin",
  "gross profit margin (%)",
  "payment collections within due dates & credit days reduction",
  "customer retention rate",
  "qualified leads generation",
  "qualified leads generated",
  "new customers",
  "new customers or upsell closure",
  "non-obligatory proof of concept (poc)",
  "pipeline",
  "network & security",
  "server & storage",
  "mssp services",
  "cloud security & services",
  "forecast accuracy",
  "certification and product training",
  "crm data accuracy & timely lead updates",
  "total outbound calls made",
  "meaningful connects achieved",
  "appointments fixed for bdm / sales closure team",
  "number of funnel opportunities created",
  "customer webinars organised",
  "blitz days conducted",
  "collections efficiency (% within due dates)",
  "new logos / strategic accounts acquired by team",
  "new projects & strategic deals initiated",
  "focus area revenue mix achievement (n&s, s&s, mssp, cloud)",
  "team aggregate kra achievement rate",
  "sales talent retention (attrition below threshold)",
  "team training & certification completion rate",
  "average deal win rate",
];

const KNOWN_LABELS_LOWER = new Set(
  [...MONEY_LABELS, ...KNOWN_NON_MONEY_LABELS].map((l) => l.toLowerCase())
);
const MONEY_LABELS_LOWER = new Set(MONEY_LABELS.map((l) => l.toLowerCase()));

function escapeRegExp(label) {
  return label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Parses a "label: value; label: value" free-text string into [{label, value}].
// Tolerant of surrounding whitespace; splits each segment on the FIRST colon
// only (labels themselves may contain no colon in this dataset).
function parseLabels(rawText) {
  return rawText
    .split(";")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .map((segment) => {
      const colonIndex = segment.indexOf(":");
      if (colonIndex === -1) return { label: segment, value: null, raw: segment };
      return {
        label: segment.slice(0, colonIndex).trim(),
        value: segment.slice(colonIndex + 1).trim(),
        raw: segment,
      };
    });
}

// Transforms one KRA.target free-text string, multiplying only the
// allowlisted labels' numeric values by 100,000. Returns
// { text, changed, changes: [{label, before, after}] }.
function transformTargetText(rawText) {
  let changed = false;
  let result = rawText;
  const changes = [];
  for (const label of MONEY_LABELS) {
    const pattern = new RegExp(`(${escapeRegExp(label)}\\s*:\\s*)(-?\\d+(?:\\.\\d+)?)`, "i");
    const match = pattern.exec(result);
    if (!match) continue;
    const originalValue = parseFloat(match[2]);
    const newValue = originalValue * 100000;
    const newValueStr = newValue.toFixed(2).replace(/\.00$/, "");
    result = result.slice(0, match.index) + match[1] + newValueStr + result.slice(match.index + match[0].length);
    changes.push({ label, before: match[2], after: newValueStr });
    changed = true;
  }
  return { text: result, changed, changes };
}

function maskUrl(databaseUrl) {
  try {
    const url = new URL(databaseUrl);
    const dbName = url.pathname.replace(/^\//, "");
    const hostLabel = url.hostname.split(".")[0];
    return { dbName, hostMasked: `${hostLabel}.***` };
  } catch {
    return { dbName: "(unparsable)", hostMasked: "(unparsable)" };
  }
}

// Mirrors src/lib/prisma.ts's resolveDbConfig() — strip stray backslash
// escapes (Hostinger/Passenger's %->\% env-injection bug) before parsing.
function resolveDbConfig(databaseUrl) {
  const url = new URL(databaseUrl.replace(/\\(.)/g, "$1"));
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
  };
}

async function main() {
  const isLiveRun = process.env.CONFIRM_UAT_KRA_TARGET_TRANSFORM === "YES";

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("Refusing to run: DATABASE_URL is not set.");
    process.exit(1);
  }

  const { dbName, hostMasked } = maskUrl(databaseUrl);
  console.log(`Target DB name: ${dbName}`);
  console.log(`Target DB host (masked): ${hostMasked}`);
  console.log(`Mode: ${isLiveRun ? "LIVE WRITE (CONFIRM_UAT_KRA_TARGET_TRANSFORM=YES)" : "DRY RUN (read-only, no confirmation set)"}`);

  if (dbName !== EXPECTED_DB_NAME) {
    console.error(
      `Refusing to run: DATABASE_URL resolves to database "${dbName}", ` +
        `but this script only runs against "${EXPECTED_DB_NAME}". Aborting before any statement runs.`
    );
    process.exit(1);
  }

  console.log(`Money-label allowlist (${MONEY_LABELS.length} labels):`);
  for (const label of MONEY_LABELS) console.log(`  - ${label}`);
  console.log(`Known non-money labels (${KNOWN_NON_MONEY_LABELS.length} labels) — left unchanged.`);
  console.log("EmployeeTarget / TeamTarget / structured KRA template tables are NOT touched (all confirmed 0 rows on UAT).");

  const dbConfig = resolveDbConfig(databaseUrl);
  const pool = mariadb.createPool({ ...dbConfig, connectionLimit: 1, connectTimeout: 10_000 });
  let conn;
  try {
    conn = await pool.getConnection();

    const liveDbCheck = await conn.query("SELECT DATABASE() AS db");
    const liveDbName = liveDbCheck[0].db;
    if (liveDbName !== EXPECTED_DB_NAME) {
      console.error(
        `Refusing to run: live connection resolves to "${liveDbName}", expected "${EXPECTED_DB_NAME}". Aborting.`
      );
      process.exit(1);
    }
    console.log(`Live DB identity confirmed: ${liveDbName}`);

    const rows = await conn.query("SELECT id, title, target FROM `KRA` ORDER BY id");
    console.log(`Fetched ${rows.length} KRA row(s).`);

    const planned = [];
    let unexpectedLabelFound = false;

    for (const row of rows) {
      const parsedLabels = parseLabels(row.target);
      for (const { label } of parsedLabels) {
        // Normalize stray embedded quote characters (a known UAT data-entry
        // artifact on rows 40/45/50/55/60, e.g. `non-obligatory" proof of
        // concept (poc)`) before classification matching. This does not
        // change any label's money/non-money classification — it only makes
        // matching tolerant of this literal-character quirk.
        const normalizedLabel = label.replace(/"/g, "").trim();
        if (!KNOWN_LABELS_LOWER.has(normalizedLabel.toLowerCase())) {
          console.error(
            `UNEXPECTED LABEL on KRA #${row.id} ("${row.title}"): "${label}" is not in the ` +
              `money allowlist or the known-non-money allowlist. Aborting without writing anything — ` +
              `this label needs explicit classification before the transform can proceed.`
          );
          unexpectedLabelFound = true;
        }
      }

      const { text, changed, changes } = transformTargetText(row.target);
      if (changed) {
        planned.push({ id: row.id, title: row.title, before: row.target, after: text, changes });
      }
    }

    if (unexpectedLabelFound) {
      console.error("Aborting: one or more unexpected labels found. No row was changed.");
      process.exit(1);
    }

    console.log(`\nRows with at least one money-label change: ${planned.length} of ${rows.length}.`);
    for (const p of planned) {
      console.log(`\nKRA #${p.id} (${p.title}):`);
      for (const c of p.changes) {
        console.log(`  - "${c.label}": ${c.before} -> ${c.after}`);
      }
      console.log(`  BEFORE: ${p.before}`);
      console.log(`  AFTER:  ${p.after}`);
    }

    if (!isLiveRun) {
      console.log(
        `\nDRY RUN complete. ${planned.length} row(s) would be updated. No data was written. ` +
          "Set CONFIRM_UAT_KRA_TARGET_TRANSFORM=YES to execute for real."
      );
      process.exit(0);
    }

    if (planned.length === 0) {
      console.log("\nLIVE RUN: no rows require a change. Nothing to commit.");
      process.exit(0);
    }

    console.log(`\nLIVE RUN: writing ${planned.length} row(s) inside a transaction...`);
    await conn.beginTransaction();
    try {
      for (const p of planned) {
        await conn.query("UPDATE `KRA` SET `target` = ? WHERE `id` = ?", [p.after, p.id]);
      }
      await conn.commit();
      console.log(`LIVE RUN: committed. ${planned.length} row(s) updated.`);
    } catch (err) {
      await conn.rollback();
      console.error("LIVE RUN: error during write — rolled back. No row was changed.", err.message);
      throw err;
    }
  } finally {
    if (conn) conn.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("KRA target transform script failed:", err.message);
  process.exit(1);
});
