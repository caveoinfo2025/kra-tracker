// Seed: Phase 12 Integration Center — default providers
// Usage: node prisma/seed-integration-defaults.mjs
// All providers seeded as INACTIVE — activate individually in the UI.
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

const conn = await createConnection({ host, port: Number(port), user, password, database, multipleStatements: false });

const PROVIDERS = [
  { name: "SMTP Email",              code: "SMTP_EMAIL",        category: "EMAIL",      description: "Send transactional emails via any SMTP server" },
  { name: "Microsoft 365 Email",     code: "M365_EMAIL",        category: "EMAIL",      description: "Send emails via Microsoft Graph API (Office 365)" },
  { name: "Google Workspace Email",  code: "GOOGLE_WORKSPACE",  category: "EMAIL",      description: "Send emails via Google Workspace SMTP relay" },
  { name: "GST Validation API",      code: "GST_VALIDATION",    category: "GST",        description: "Validate GSTIN numbers against government tax registry" },
  { name: "PAN Validation API",      code: "PAN_VALIDATION",    category: "PAN",        description: "Verify PAN numbers via NSDL or third-party service" },
  { name: "Google Maps",             code: "GOOGLE_MAPS",       category: "MAPS",       description: "Geocoding, reverse geocoding and distance matrix API" },
  { name: "WhatsApp Business API",   code: "WHATSAPP_BUSINESS", category: "WHATSAPP",   description: "Send WhatsApp messages via Meta Business Cloud API" },
  { name: "SMS Gateway",             code: "SMS_GATEWAY",       category: "SMS",        description: "Send SMS notifications via a third-party SMS gateway" },
  { name: "Microsoft Teams Webhook", code: "TEAMS_WEBHOOK",     category: "TEAMS",      description: "Post messages to Microsoft Teams channels via incoming webhooks" },
  { name: "Tally Export",            code: "TALLY_EXPORT",      category: "ACCOUNTING", description: "Export vouchers and ledger data to Tally ERP via TDL HTTP" },
  { name: "Generic Webhook",         code: "GENERIC_WEBHOOK",   category: "WEBHOOK",    description: "Send event payloads to any HTTPS webhook endpoint" },
];

let inserted = 0;
let skipped  = 0;

for (const p of PROVIDERS) {
  try {
    await conn.query(
      `INSERT INTO integration_provider (name, code, category, description, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, 'INACTIVE', NOW(3), NOW(3))`,
      [p.name, p.code, p.category, p.description],
    );
    console.log(`  INSERT: ${p.name}`);
    inserted++;
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") {
      console.log(`  SKIP (exists): ${p.name}`);
      skipped++;
    } else {
      console.error(`  ERROR (${p.name}): ${e.message}`);
    }
  }
}

await conn.end();
console.log(`\nDone. ${inserted} inserted, ${skipped} skipped.`);
console.log("Activate providers in Settings → Integration Center.");
