// Seed default Communication Center data (Phase 11) — uses mariadb driver directly.
// Usage: $env:DATABASE_URL="mysql://..."; node prisma/seed-communication-defaults.mjs
import { createConnection } from "mariadb";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }

const clean = url.replace(/\\%/g, "%");
const m     = clean.match(/^mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/);
if (!m) { console.error("Cannot parse DATABASE_URL"); process.exit(1); }
const [, user, rawPassword, host, port, database] = m;
const password = decodeURIComponent(rawPassword);

const conn = await createConnection({ host, port: Number(port), user, password, database });
console.log("🌱  Seeding Communication Center defaults…");

// ── 1. Channels ───────────────────────────────────────────────────────────────
const channels = [
  { channelCode: "IN_APP",   channelName: "In-App Notification",  provider: "internal",       status: "active",   configJson: "{}" },
  { channelCode: "EMAIL",    channelName: "Email",                 provider: "smtp",           status: "inactive", configJson: JSON.stringify({ SMTP_HOST: "SMTP_HOST", SMTP_PORT: "SMTP_PORT", SMTP_USER: "SMTP_USER", SMTP_PASS: "SMTP_PASS", EMAIL_FROM: "EMAIL_FROM" }) },
  { channelCode: "SMS",      channelName: "SMS",                   provider: "sms_gateway",    status: "inactive", configJson: JSON.stringify({ SMS_API_KEY: "SMS_API_KEY", SMS_SENDER_ID: "SMS_SENDER_ID", SMS_PROVIDER: "SMS_PROVIDER" }) },
  { channelCode: "WHATSAPP", channelName: "WhatsApp Business",     provider: "whatsapp_cloud", status: "inactive", configJson: JSON.stringify({ WHATSAPP_API_KEY: "WHATSAPP_API_KEY", WHATSAPP_PHONE_ID: "WHATSAPP_PHONE_ID", WHATSAPP_BUSINESS_ACCOUNT_ID: "WHATSAPP_BUSINESS_ACCOUNT_ID" }) },
  { channelCode: "TEAMS",    channelName: "Microsoft Teams",       provider: "teams_webhook",  status: "inactive", configJson: JSON.stringify({ TEAMS_WEBHOOK_URL: "TEAMS_WEBHOOK_URL" }) },
];

for (const ch of channels) {
  await conn.query(
    `INSERT INTO notification_channel (channelCode, channelName, provider, status, configJson, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE channelName = VALUES(channelName), provider = VALUES(provider)`,
    [ch.channelCode, ch.channelName, ch.provider, ch.status, ch.configJson]
  );
  console.log(`  ✓  Channel: ${ch.channelCode}`);
}

// ── 2. Events ─────────────────────────────────────────────────────────────────
const events = [
  ["CRM",         "LEAD_CREATED",              "Lead Created",               "Triggered when a new lead is added"],
  ["CRM",         "LEAD_ASSIGNED",             "Lead Assigned",              "Triggered when a lead is assigned to a rep"],
  ["CRM",         "OPPORTUNITY_CREATED",       "Opportunity Created",        "Triggered when an opportunity is created"],
  ["CRM",         "OPPORTUNITY_STAGE_CHANGED", "Opportunity Stage Changed",  "Triggered when an opp moves to a new stage"],
  ["CRM",         "OPPORTUNITY_WON",           "Opportunity Won",            "Triggered when an opportunity is marked Won"],
  ["CRM",         "OPPORTUNITY_LOST",          "Opportunity Lost",           "Triggered when an opportunity is marked Lost"],
  ["Workflow",    "APPROVAL_REQUEST_CREATED",  "Approval Request Created",   "New approval request submitted"],
  ["Workflow",    "APPROVAL_APPROVED",         "Approval Approved",          "An approval request was approved"],
  ["Workflow",    "APPROVAL_REJECTED",         "Approval Rejected",          "An approval request was rejected"],
  ["Workflow",    "APPROVAL_ESCALATED",        "Approval Escalated",         "Approval escalated due to SLA breach"],
  ["Finance",     "EXPENSE_SUBMITTED",         "Expense Submitted",          "Employee submitted an expense claim"],
  ["Finance",     "PAYMENT_RECEIVED",          "Payment Received",           "A customer payment was recorded"],
  ["Finance",     "ADVANCE_REQUESTED",         "Advance Requested",          "Employee requested a salary advance"],
  ["Performance", "KRA_REVIEW_STARTED",        "KRA Review Started",         "A performance review period has begun"],
  ["Performance", "KRA_REVIEW_COMPLETED",      "KRA Review Completed",       "Performance review has been finalised"],
  ["Security",    "LOGIN_FAILED",              "Login Failed",               "Failed login attempt detected"],
  ["Security",    "PERMISSION_CHANGED",        "Permission Changed",         "A user's role or permission was changed"],
];

for (const [module, eventCode, eventName, description] of events) {
  await conn.query(
    `INSERT INTO communication_event (module, eventCode, eventName, description, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, 'active', NOW(), NOW())
     ON DUPLICATE KEY UPDATE eventName = VALUES(eventName), description = VALUES(description)`,
    [module, eventCode, eventName, description]
  );
  console.log(`  ✓  Event: ${eventCode}`);
}

// ── 3. Templates ──────────────────────────────────────────────────────────────
// mariadb driver: conn.query() returns the rows array directly (not [rows, fields])
const channelRows = await conn.query(
  "SELECT id FROM notification_channel WHERE channelCode = 'IN_APP' LIMIT 1"
);
const inAppId = channelRows[0]?.id ?? null;

const templateDefs = [
  { name: "Lead Created — In-App",     body: "New lead assigned to you: {{record_name}}. Review at {{link}}",                             eventCode: "LEAD_CREATED" },
  { name: "Opportunity Won — In-App",  body: "🎉 {{employee_name}} won opportunity: {{record_name}} worth ₹{{amount}}L!",                  eventCode: "OPPORTUNITY_WON" },
  { name: "Approval Request — In-App", body: "Action required: Approval request from {{employee_name}} — {{record_name}}. View: {{link}}", eventCode: "APPROVAL_REQUEST_CREATED" },
];

for (const tpl of templateDefs) {
  const existing = await conn.query(
    "SELECT id FROM notification_template WHERE templateName = ? LIMIT 1", [tpl.name]
  );
  if (existing.length > 0) { console.log(`  –  Template exists: ${tpl.name}`); continue; }

  const evRows = await conn.query(
    "SELECT id FROM communication_event WHERE eventCode = ? LIMIT 1", [tpl.eventCode]
  );
  const evId = evRows[0]?.id ?? null;

  await conn.query(
    `INSERT INTO notification_template (templateName, channelId, eventId, body, status, subject, variablesJson, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, 'active', '', '', NOW(), NOW())`,
    [tpl.name, inAppId, evId, tpl.body]
  );
  console.log(`  ✓  Template: ${tpl.name}`);
}

// ── 4. Rules ──────────────────────────────────────────────────────────────────
const ruleDefs = [
  {
    name:      "Notify Owner on Lead Created",
    eventCode: "LEAD_CREATED",
    recipient: JSON.stringify({ type: "RECORD_OWNER" }),
    channels:  JSON.stringify({ channels: ["IN_APP"] }),
    frequency: JSON.stringify({ type: "IMMEDIATE" }),
  },
  {
    name:      "Notify Approver on Approval Request",
    eventCode: "APPROVAL_REQUEST_CREATED",
    recipient: JSON.stringify({ type: "APPROVER" }),
    channels:  JSON.stringify({ channels: ["IN_APP"] }),
    frequency: JSON.stringify({ type: "IMMEDIATE" }),
  },
];

for (const rule of ruleDefs) {
  const existing = await conn.query(
    "SELECT id FROM notification_rule WHERE ruleName = ? LIMIT 1", [rule.name]
  );
  if (existing.length > 0) { console.log(`  –  Rule exists: ${rule.name}`); continue; }

  const evRows = await conn.query(
    "SELECT id FROM communication_event WHERE eventCode = ? LIMIT 1", [rule.eventCode]
  );
  const evId = evRows[0]?.id;
  if (!evId) { console.log(`  !  Event not found: ${rule.eventCode}`); continue; }

  await conn.query(
    `INSERT INTO notification_rule (ruleName, eventId, conditionJson, recipientJson, channelJson, frequencyJson, status, createdAt, updatedAt)
     VALUES (?, ?, '{}', ?, ?, ?, 'active', NOW(), NOW())`,
    [rule.name, evId, rule.recipient, rule.channels, rule.frequency]
  );
  console.log(`  ✓  Rule: ${rule.name}`);
}

await conn.end();
console.log("\n✅  Communication Center seed complete.");
