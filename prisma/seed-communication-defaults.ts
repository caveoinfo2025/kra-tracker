/**
 * Seed default Communication Center data (Phase 11).
 *
 * Usage (dev only):
 *   $env:DATABASE_URL="mysql://..."; npx tsx prisma/seed-communication-defaults.ts
 *
 * Idempotent — uses upsert / skipDuplicates.
 * Do NOT run against prod — this is dev-only seed data.
 */
import prisma from "../src/lib/prisma";

async function main() {
  console.log("🌱  Seeding Communication Center defaults…");

  // ── 1. Channels ─────────────────────────────────────────────────────────────
  type ChannelSeed = { channelCode: string; channelName: string; provider: string; status: string; configJson: string };
  const channels: ChannelSeed[] = [
    { channelCode: "IN_APP",    channelName: "In-App Notification",  provider: "internal",       status: "active",   configJson: "{}" },
    { channelCode: "EMAIL",     channelName: "Email",                 provider: "smtp",           status: "inactive", configJson: JSON.stringify({ SMTP_HOST: "SMTP_HOST", SMTP_PORT: "SMTP_PORT", SMTP_USER: "SMTP_USER", SMTP_PASS: "SMTP_PASS", EMAIL_FROM: "EMAIL_FROM" }) },
    { channelCode: "SMS",       channelName: "SMS",                   provider: "sms_gateway",    status: "inactive", configJson: JSON.stringify({ SMS_API_KEY: "SMS_API_KEY", SMS_SENDER_ID: "SMS_SENDER_ID", SMS_PROVIDER: "SMS_PROVIDER" }) },
    { channelCode: "WHATSAPP",  channelName: "WhatsApp Business",     provider: "whatsapp_cloud", status: "inactive", configJson: JSON.stringify({ WHATSAPP_API_KEY: "WHATSAPP_API_KEY", WHATSAPP_PHONE_ID: "WHATSAPP_PHONE_ID", WHATSAPP_BUSINESS_ACCOUNT_ID: "WHATSAPP_BUSINESS_ACCOUNT_ID" }) },
    { channelCode: "TEAMS",     channelName: "Microsoft Teams",       provider: "teams_webhook",  status: "inactive", configJson: JSON.stringify({ TEAMS_WEBHOOK_URL: "TEAMS_WEBHOOK_URL" }) },
  ];

  for (const ch of channels) {
    await prisma.notificationChannel.upsert({
      where:  { channelCode: ch.channelCode },
      update: { channelName: ch.channelName, provider: ch.provider },
      create: ch,
    });
    console.log(`  ✓  Channel: ${ch.channelCode}`);
  }

  // ── 2. Default Events ────────────────────────────────────────────────────────
  const events = [
    // CRM
    { module: "CRM",         eventCode: "LEAD_CREATED",          eventName: "Lead Created",                description: "Triggered when a new lead is added" },
    { module: "CRM",         eventCode: "LEAD_ASSIGNED",         eventName: "Lead Assigned",               description: "Triggered when a lead is assigned to a rep" },
    { module: "CRM",         eventCode: "OPPORTUNITY_CREATED",   eventName: "Opportunity Created",         description: "Triggered when an opportunity is created" },
    { module: "CRM",         eventCode: "OPPORTUNITY_STAGE_CHANGED", eventName: "Opportunity Stage Changed", description: "Triggered when an opp moves to a new stage" },
    { module: "CRM",         eventCode: "OPPORTUNITY_WON",       eventName: "Opportunity Won",             description: "Triggered when an opportunity is marked Won" },
    { module: "CRM",         eventCode: "OPPORTUNITY_LOST",      eventName: "Opportunity Lost",            description: "Triggered when an opportunity is marked Lost" },
    // Workflow
    { module: "Workflow",    eventCode: "APPROVAL_REQUEST_CREATED", eventName: "Approval Request Created", description: "New approval request submitted" },
    { module: "Workflow",    eventCode: "APPROVAL_APPROVED",     eventName: "Approval Approved",           description: "An approval request was approved" },
    { module: "Workflow",    eventCode: "APPROVAL_REJECTED",     eventName: "Approval Rejected",           description: "An approval request was rejected" },
    { module: "Workflow",    eventCode: "APPROVAL_ESCALATED",    eventName: "Approval Escalated",          description: "Approval escalated due to SLA breach" },
    // Finance
    { module: "Finance",     eventCode: "EXPENSE_SUBMITTED",     eventName: "Expense Submitted",           description: "Employee submitted an expense claim" },
    { module: "Finance",     eventCode: "PAYMENT_RECEIVED",      eventName: "Payment Received",            description: "A customer payment was recorded" },
    { module: "Finance",     eventCode: "ADVANCE_REQUESTED",     eventName: "Advance Requested",           description: "Employee requested a salary advance" },
    // Performance
    { module: "Performance", eventCode: "KRA_REVIEW_STARTED",    eventName: "KRA Review Started",          description: "A performance review period has begun" },
    { module: "Performance", eventCode: "KRA_REVIEW_COMPLETED",  eventName: "KRA Review Completed",        description: "Performance review has been finalised" },
    // Security
    { module: "Security",    eventCode: "LOGIN_FAILED",          eventName: "Login Failed",                description: "Failed login attempt detected" },
    { module: "Security",    eventCode: "PERMISSION_CHANGED",    eventName: "Permission Changed",          description: "A user's role or permission was changed" },
  ];

  for (const ev of events) {
    await prisma.communicationEvent.upsert({
      where:  { eventCode: ev.eventCode },
      update: { eventName: ev.eventName, description: ev.description, module: ev.module },
      create: { ...ev, status: "active" },
    });
    console.log(`  ✓  Event: ${ev.eventCode}`);
  }

  // ── 3. Default Templates (IN_APP only — safe for all environments) ───────────
  const inAppChannel = await prisma.notificationChannel.findUnique({ where: { channelCode: "IN_APP" } });
  const leadCreatedEvent = await prisma.communicationEvent.findUnique({ where: { eventCode: "LEAD_CREATED" } });
  const oppWonEvent      = await prisma.communicationEvent.findUnique({ where: { eventCode: "OPPORTUNITY_WON" } });
  const approvalEvent    = await prisma.communicationEvent.findUnique({ where: { eventCode: "APPROVAL_REQUEST_CREATED" } });

  type TemplateSeed = { templateName: string; body: string; eventCode?: string; channelId?: number };
  const templateSeeds: TemplateSeed[] = [
    { templateName: "Lead Created — In-App",     body: "New lead assigned to you: {{record_name}}. Review at {{link}}",                            eventCode: "LEAD_CREATED",             channelId: inAppChannel?.id },
    { templateName: "Opportunity Won — In-App",  body: "🎉 {{employee_name}} won opportunity: {{record_name}} worth ₹{{amount}}L!",                eventCode: "OPPORTUNITY_WON",          channelId: inAppChannel?.id },
    { templateName: "Approval Request — In-App", body: "Action required: Approval request from {{employee_name}} — {{record_name}}. Review at {{link}}", eventCode: "APPROVAL_REQUEST_CREATED", channelId: inAppChannel?.id },
  ];

  for (const tpl of templateSeeds) {
    const existing = await prisma.notificationTemplate.findFirst({
      where: { templateName: tpl.templateName },
    });
    if (!existing) {
      const eventRow = tpl.eventCode
        ? await prisma.communicationEvent.findUnique({ where: { eventCode: tpl.eventCode } })
        : null;
      await prisma.notificationTemplate.create({
        data: {
          templateName: tpl.templateName,
          body:         tpl.body,
          status:       "active",
          ...(tpl.channelId ? { channelId: tpl.channelId } : {}),
          ...(eventRow       ? { eventId:   eventRow.id }  : {}),
        },
      });
      console.log(`  ✓  Template: ${tpl.templateName}`);
    } else {
      console.log(`  –  Template already exists: ${tpl.templateName}`);
    }
  }

  // ── 4. Default Rules ─────────────────────────────────────────────────────────
  if (leadCreatedEvent) {
    const existingRule = await prisma.notificationRule.findFirst({
      where: { ruleName: "Notify Owner on Lead Created" },
    });
    if (!existingRule) {
      await prisma.notificationRule.create({
        data: {
          ruleName:      "Notify Owner on Lead Created",
          eventId:       leadCreatedEvent.id,
          conditionJson: "{}",
          recipientJson: JSON.stringify({ type: "RECORD_OWNER" }),
          channelJson:   JSON.stringify({ channels: ["IN_APP"] }),
          frequencyJson: JSON.stringify({ type: "IMMEDIATE" }),
          status:        "active",
        },
      });
      console.log("  ✓  Rule: Notify Owner on Lead Created");
    } else {
      console.log("  –  Rule already exists: Notify Owner on Lead Created");
    }
  }

  if (approvalEvent) {
    const existingRule = await prisma.notificationRule.findFirst({
      where: { ruleName: "Notify Approver on Approval Request" },
    });
    if (!existingRule) {
      await prisma.notificationRule.create({
        data: {
          ruleName:      "Notify Approver on Approval Request",
          eventId:       approvalEvent.id,
          conditionJson: "{}",
          recipientJson: JSON.stringify({ type: "APPROVER" }),
          channelJson:   JSON.stringify({ channels: ["IN_APP"] }),
          frequencyJson: JSON.stringify({ type: "IMMEDIATE" }),
          status:        "active",
        },
      });
      console.log("  ✓  Rule: Notify Approver on Approval Request");
    } else {
      console.log("  –  Rule already exists: Notify Approver on Approval Request");
    }
  }

  console.log("\n✅  Communication Center seed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
