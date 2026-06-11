import { createPool } from "mariadb";
import { readFileSync } from "fs";
const env = readFileSync(".env", "utf8");
const dbUrl = env.match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/)?.[1]?.trim();
const clean = dbUrl.replace(/\\(.)/g, "$1");
const url = new URL(clean);
const pool = createPool({
  host: url.hostname, port: Number(url.port) || 3306,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.replace(/^\//, ""),
  connectionLimit: 1, connectTimeout: 5000,
});
const tables = await pool.query("SHOW TABLES");
console.log("Tables:", tables.map(r => Object.values(r)[0]));
try {
  const emps = await pool.query("SELECT id, name, isManager FROM Employee LIMIT 5");
  console.log("Employees (id 1-5):", emps);
} catch(e) { console.log("Employee query:", e.message); }
await pool.end();
