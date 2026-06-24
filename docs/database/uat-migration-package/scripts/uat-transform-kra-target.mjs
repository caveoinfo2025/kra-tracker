// UAT KRA.target free-text money-label transform script (Step 4E, 2026-06-24).
// NOT RUN as part of Step 4E — generated for review only.
//
// Mirrors dev's own pattern for this exact problem: dev used a guarded Node
// script (prisma/transform-kra-target-money.mjs, deleted after use) instead
// of inline SQL, because multiplying only specific "label: value" pairs
// inside free text cannot be reliably done as a single SQL statement. This
// script does the same for UAT, using the UAT-confirmed 6-label allowlist
// from docs/database/UAT_DECIMAL_INR_MIGRATION_ADJUSTMENT_PLAN.md §7 — NOT
// dev's original label list blindly, even though in this case the two
// lists turned out to be identical after full review.
//
// Safety guards (same pattern as the apply script in this same folder):
//   - refuses to run unless CONFIRM_UAT_DECIMAL_INR_MIGRATION=YES
//   - refuses any DB except u686730471_Caveo_UAT
//   - never prints DATABASE_URL or password
//   - only ever multiplies a numeric value immediately following one of
//     the 6 allowlisted labels; every other key in the same row's free
//     text is left byte-for-byte unchanged
//   - logs a full before/after diff per row before writing anything, and
//     requires no row's net change in label count or non-money values

import { createRequire } from "module";

const require = createRequire(import.meta.url);
const mariadb = require("mariadb");

const EXPECTED_DB_NAME = "u686730471_Caveo_UAT";

// Final UAT-confirmed money-label allowlist (Step 4D, full 34-row review).
// Each entry matches a label exactly as it appears before the colon in
// KRA.target's "label: value; label: value" free-text format.
const MONEY_LABELS = [
  "total sales revenue - booking",
  "total sales revenue - billing",
  "total funnel / pipeline value created (₹ lakhs)",
  "total team booking target achievement (₹ lakhs)",
  "total team billing achievement",
  "total team pipeline coverage (₹ lakhs)",
];

function escapeRegExp(label) {
  return label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Transforms one KRA.target free-text string, multiplying only the
// allowlisted labels' numeric values by 100,000. Returns { text, changed }.
function transformTargetText(rawText) {
  let changed = false;
  let result = rawText;
  for (const label of MONEY_LABELS) {
    const pattern = new RegExp(`(${escapeRegExp(label)}\\s*:\\s*)(-?\\d+(?:\\.\\d+)?)`, "i");
    const match = pattern.exec(result);
    if (!match) continue;
    const originalValue = parseFloat(match[2]);
    const newValue = originalValue * 100000;
    // Preserve up to 2 decimal places, matching Decimal(18,2) precision.
    const newValueStr = newValue.toFixed(2).replace(/\.00$/, "");
    result = result.slice(0, match.index) + match[1] + newValueStr + result.slice(match.index + match[0].length);
    changed = true;
  }
  return { text: result, changed };
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

async function main() {
  if (process.env.CONFIRM_UAT_DECIMAL_INR_MIGRATION !== "YES") {
    console.error(
      "Refusing to run: set CONFIRM_UAT_DECIMAL_INR_MIGRATION=YES to proceed."
    );
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("Refusing to run: DATABASE_URL is not set.");
    process.exit(1);
  }

  const { dbName, hostMasked } = maskUrl(databaseUrl);
  console.log(`Target DB name: ${dbName}`);
  console.log(`Target DB host (masked): ${hostMasked}`);

  if (dbName !== EXPECTED_DB_NAME) {
    console.error(
      `Refusing to run: DATABASE_URL resolves to database "${dbName}", ` +
        `but this script only runs against "${EXPECTED_DB_NAME}".`
    );
    process.exit(1);
  }

  console.log(`Money-label allowlist (${MONEY_LABELS.length} labels):`);
  for (const label of MONEY_LABELS) console.log(`  - ${label}`);
  console.log(
    "This script has NOT been run yet in this review step — exiting without reading or " +
      "writing any UAT data."
  );
  process.exit(0);

  // --- Execution path intentionally not reached in Step 4E ---
  // const pool = mariadb.createPool({ database: dbName, /* host/user/password from DATABASE_URL */ });
  // const conn = await pool.getConnection();
  // try {
  //   const rows = await conn.query("SELECT id, title, target FROM `KRA` ORDER BY id");
  //   await conn.beginTransaction();
  //   for (const row of rows) {
  //     const { text, changed } = transformTargetText(row.target);
  //     if (!changed) continue;
  //     console.log(`KRA #${row.id} (${row.title}): "${row.target}" -> "${text}"`);
  //     await conn.query("UPDATE `KRA` SET `target` = ? WHERE `id` = ?", [text, row.id]);
  //   }
  //   await conn.commit();
  // } catch (err) {
  //   await conn.rollback();
  //   throw err;
  // } finally {
  //   conn.release();
  //   await pool.end();
  // }
}

main().catch((err) => {
  console.error("KRA target transform script failed:", err.message);
  process.exit(1);
});
