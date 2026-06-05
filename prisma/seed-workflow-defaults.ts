/**
 * Seeds 5 default workflow definitions with their approval steps.
 * Idempotent — skips any workflow whose `code` already exists.
 *
 * Run: npx tsx prisma/seed-workflow-defaults.ts
 */

import prismaDefault from "../src/lib/prisma";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prismaDefault as any;

const SYSTEM_ACTOR = 2; // First dev employee (Vijesh Vijayan, id 2)

const WORKFLOWS = [
  {
    code:         "EXPENSE_APPROVAL",
    name:         "Expense Approval",
    description:  "Multi-level approval for employee expense reimbursements",
    module:       "FINANCE",
    triggerEvent: "EXPENSE_SUBMITTED",
    steps: [
      { stepNumber: 1, stepName: "Reporting Manager Review", approvalType: "REPORTING_MANAGER", approvalMode: "SEQUENTIAL", isMandatory: true, timeoutHours: 24, requireComments: false },
      { stepNumber: 2, stepName: "Accounts Review",          approvalType: "ROLE",              approvalMode: "SEQUENTIAL", isMandatory: true, timeoutHours: 48, requireComments: true  },
    ],
  },
  {
    code:         "CUSTOMER_CREATION",
    name:         "Customer Creation Approval",
    description:  "Approval before a new customer record is activated in the master",
    module:       "MASTERS",
    triggerEvent: "CUSTOMER_CREATION_REQUESTED",
    steps: [
      { stepNumber: 1, stepName: "Manager Approval", approvalType: "REPORTING_MANAGER", approvalMode: "SEQUENTIAL", isMandatory: true,  timeoutHours: 24, requireComments: false },
      { stepNumber: 2, stepName: "Ops Head Sign-off", approvalType: "ROLE",             approvalMode: "SEQUENTIAL", isMandatory: false, timeoutHours: 48, requireComments: false },
    ],
  },
  {
    code:         "LARGE_DEAL_APPROVAL",
    name:         "Large Deal Approval",
    description:  "Triggered when an opportunity deal value exceeds ₹50 Lakhs",
    module:       "CRM",
    triggerEvent: "OPPORTUNITY_LARGE_DEAL",
    steps: [
      { stepNumber: 1, stepName: "Sales Manager",    approvalType: "REPORTING_MANAGER", approvalMode: "SEQUENTIAL", isMandatory: true, timeoutHours: 24, requireComments: false },
      { stepNumber: 2, stepName: "Head of Sales",    approvalType: "DEPARTMENT_HEAD",   approvalMode: "SEQUENTIAL", isMandatory: true, timeoutHours: 48, requireComments: true  },
      { stepNumber: 3, stepName: "Management",       approvalType: "ROLE",              approvalMode: "SEQUENTIAL", isMandatory: true, timeoutHours: 72, requireComments: true  },
    ],
  },
  {
    code:         "DISCOUNT_APPROVAL",
    name:         "Discount Approval",
    description:  "Approval chain for discounts above the standard threshold",
    module:       "CRM",
    triggerEvent: "DISCOUNT_REQUESTED",
    steps: [
      { stepNumber: 1, stepName: "Sales Manager",  approvalType: "REPORTING_MANAGER", approvalMode: "SEQUENTIAL", isMandatory: true, timeoutHours: 24, requireComments: true },
      { stepNumber: 2, stepName: "Head of Sales",  approvalType: "DEPARTMENT_HEAD",   approvalMode: "SEQUENTIAL", isMandatory: true, timeoutHours: 48, requireComments: true },
    ],
  },
  {
    code:         "VENDOR_CREATION",
    name:         "Vendor Creation Approval",
    description:  "Approval before a new vendor is activated in the master",
    module:       "MASTERS",
    triggerEvent: "VENDOR_CREATION_REQUESTED",
    steps: [
      { stepNumber: 1, stepName: "Department Head", approvalType: "DEPARTMENT_HEAD", approvalMode: "SEQUENTIAL", isMandatory: true,  timeoutHours: 48, requireComments: false },
      { stepNumber: 2, stepName: "Accounts Review", approvalType: "ROLE",            approvalMode: "SEQUENTIAL", isMandatory: false, timeoutHours: 72, requireComments: false },
    ],
  },
];

async function main() {
  let created = 0;
  let skipped = 0;

  for (const wf of WORKFLOWS) {
    const existing = await db.workflowDefinition.findFirst({ where: { code: wf.code } });
    if (existing) {
      console.log(`  skip  ${wf.code} (already exists)`);
      skipped++;
      continue;
    }

    await db.workflowDefinition.create({
      data: {
        name:          wf.name,
        code:          wf.code,
        description:   wf.description,
        module:        wf.module,
        triggerEvent:  wf.triggerEvent,
        status:        "ACTIVE",
        version:       1,
        creator:       { connect: { id: SYSTEM_ACTOR } },
        steps:         { create: wf.steps },
      },
    });
    console.log(`  create ${wf.code}`);
    created++;
  }

  console.log(`\nWorkflow seed done — ${created} created, ${skipped} skipped.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
