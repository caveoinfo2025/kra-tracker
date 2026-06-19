/**
 * One-time UAT seed: create/promote Vijesh Vijayan as manager so sign-in
 * via Microsoft Entra ID resolves to a full-access employee record.
 * Run: DATABASE_URL=<uat url> node prisma/seed-uat-manager.mjs
 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const mariadb = require("mariadb/promise.js");

const url = process.env.DATABASE_URL || "";
const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
if (!m) { console.error("Could not parse DATABASE_URL"); process.exit(1); }

const conn = await mariadb.createConnection({
  host: m[3], port: Number(m[4]), user: m[1],
  password: decodeURIComponent(m[2]), database: m[5],
});

const email = "vijesh@caveoinfosystems.com";
const existing = await conn.query("SELECT id FROM Employee WHERE email = ? OR msEmail = ?", [email, email]);

if (existing.length) {
  await conn.query("UPDATE Employee SET isManager = 1, msEmail = ? WHERE id = ?", [email, existing[0].id]);
  console.log("✅ Updated existing employee id", existing[0].id, "to manager");
} else {
  await conn.query(
    "INSERT INTO Employee (name, email, msEmail, department, role, isManager) VALUES (?, ?, ?, ?, ?, 1)",
    ["Vijesh Vijayan", email, email, "Management", "Operations Head"]
  );
  console.log("✅ Created new manager employee:", email);
}

await conn.end();
