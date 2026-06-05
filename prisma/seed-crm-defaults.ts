/**
 * Seed default CRM admin engine data:
 *  - 1 default pipeline (7 stages matching OPP_STAGES)
 *  - 3 default automation rules
 *  - 5 default SLA rules
 *
 * Run: npx tsx prisma/seed-crm-defaults.ts
 */

import { createPipeline, upsertStage, createAutomationRule, createSLARule } from "../src/lib/crm-engine";

async function main() {
  console.log("Seeding CRM defaults...");

  // ── Default pipeline ──────────────────────────────────────────────────────
  const existing = await import("../src/lib/crm-engine").then((m) => m.getDefaultPipeline());

  let pipelineId: number;
  if (existing) {
    console.log(`  Pipeline already exists: ${existing.name} (id=${existing.id})`);
    pipelineId = existing.id;
  } else {
    const pipeline = await createPipeline({
      name: "Standard Sales Pipeline",
      code: "STANDARD_SALES",
      description: "Default B2B sales pipeline for Caveo CRM",
      isDefault: true,
    });
    pipelineId = pipeline.id;
    console.log(`  Created pipeline: ${pipeline.name} (id=${pipelineId})`);
  }

  // ── Pipeline stages (map to OPP_STAGES from src/types/pipeline.ts) ────────
  const stages = [
    { stageName: "Prospect",     stageCode: "PROSPECT",     sequence: 1, probability: 10, stageType: "OPEN" },
    { stageName: "Qualified",    stageCode: "QUALIFIED",    sequence: 2, probability: 25, stageType: "OPEN" },
    { stageName: "Demo",         stageCode: "DEMO",         sequence: 3, probability: 40, stageType: "OPEN" },
    { stageName: "Proposal",     stageCode: "PROPOSAL",     sequence: 4, probability: 60, stageType: "OPEN" },
    { stageName: "Negotiation",  stageCode: "NEGOTIATION",  sequence: 5, probability: 75, stageType: "OPEN" },
    { stageName: "Closed Won",   stageCode: "CLOSED_WON",   sequence: 6, probability: 100, stageType: "WON" },
    { stageName: "Closed Lost",  stageCode: "CLOSED_LOST",  sequence: 7, probability: 0,   stageType: "LOST" },
  ];

  for (const stage of stages) {
    await upsertStage({ pipelineId, ...stage, requiresApproval: false, mandatoryFieldsJson: "[]" });
    console.log(`  Stage: ${stage.stageName}`);
  }

  // ── Default automation rules ───────────────────────────────────────────────
  const automations = [
    {
      name: "Notify on lead creation",
      event: "lead.created",
      conditionJson: "{}",
      actionJson: JSON.stringify({ type: "send_notification", template: "lead_created" }),
    },
    {
      name: "Create follow-up task when lead assigned",
      event: "lead.assigned",
      conditionJson: "{}",
      actionJson: JSON.stringify({ type: "create_task", title: "Initial Follow-up", taskType: "FOLLOW_UP", dueDaysFromNow: 1 }),
    },
    {
      name: "Alert on opportunity won",
      event: "opportunity.won",
      conditionJson: "{}",
      actionJson: JSON.stringify({ type: "send_notification", template: "opportunity_won" }),
    },
  ];

  for (const auto of automations) {
    await createAutomationRule(auto);
    console.log(`  Automation: ${auto.name}`);
  }

  // ── Default SLA rules ──────────────────────────────────────────────────────
  const slaRules = [
    { module: "LEAD",        event: "first_contact",   label: "First contact within 4 hours",    durationHours: 4,  warningHours: 1  },
    { module: "LEAD",        event: "follow_up",       label: "Follow-up within 24 hours",        durationHours: 24, warningHours: 4  },
    { module: "OPPORTUNITY", event: "proposal_sent",   label: "Proposal within 48 hours",         durationHours: 48, warningHours: 8  },
    { module: "TASK",        event: "due",             label: "Task completion",                  durationHours: 0,  warningHours: 2  },
    { module: "SUPPORT",     event: "first_response",  label: "Support first response within 2h", durationHours: 2,  warningHours: 1  },
  ];

  for (const sla of slaRules) {
    await createSLARule(sla);
    console.log(`  SLA: ${sla.label}`);
  }

  console.log("CRM defaults seeded successfully.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
