/**
 * Policy Engine — Default Policy Seed
 *
 * Seeds:
 *   - 6 PolicyCategory rows (CRM, FINANCE, SECURITY, WORKFLOW, MASTER_DATA, PERFORMANCE)
 *   - 3 default Policy rows with rules (Large Deal Review, Expense Approval, Export Control)
 *
 * Idempotent — safe to run multiple times.
 *
 * Run standalone:
 *   npx tsx prisma/seed-policy-defaults.ts
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

function parseDbUrl(url: string): DbConfig {
  const u = new URL(url.replace(/^mysql:\/\//, "mariadb://"));
  return {
    host:     u.hostname,
    port:     u.port ? parseInt(u.port) : 3306,
    user:     u.username,
    password: decodeURIComponent(u.password.replace(/\\%/g, "%")),
    database: u.pathname.slice(1),
  };
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL not set");

  const adapter = new PrismaMariaDb(parseDbUrl(dbUrl));
  const prisma  = new PrismaClient({ adapter } as never);

  // ── 1. Policy categories ──────────────────────────────────────────────────────
  const CATEGORIES = [
    { code: "CRM",          name: "CRM",           description: "Customer relationship management policies" },
    { code: "FINANCE",      name: "Finance",        description: "Financial controls and expense policies"  },
    { code: "SECURITY",     name: "Security",       description: "Data security and access control policies" },
    { code: "WORKFLOW",     name: "Workflow",        description: "Process automation and approval workflow rules" },
    { code: "MASTER_DATA",  name: "Master Data",    description: "Data quality and master data governance" },
    { code: "PERFORMANCE",  name: "Performance",    description: "KRA, KPI and performance management rules" },
  ];

  const catMap: Record<string, number> = {};
  for (const cat of CATEGORIES) {
    const existing = await (prisma as never as { policyCategory: { findUnique: (a: unknown) => Promise<{ id: number } | null> } })
      .policyCategory.findUnique({ where: { code: cat.code } });
    if (existing) {
      catMap[cat.code] = existing.id;
      console.log(`  Category ${cat.code} already exists (id=${existing.id})`);
    } else {
      const created = await (prisma as never as { policyCategory: { create: (a: unknown) => Promise<{ id: number }> } })
        .policyCategory.create({ data: cat });
      catMap[cat.code] = created.id;
      console.log(`  Created category ${cat.code} (id=${created.id})`);
    }
  }

  // ── 2. Default policies ────────────────────────────────────────────────────────
  const DEFAULT_POLICIES = [
    {
      code:        "CRM_LARGE_DEAL_REVIEW",
      name:        "Large Deal Review",
      description: "Requires Sales Head approval for deals above ₹50 lakhs.",
      categoryCode: "CRM",
      status:      "ACTIVE",
      version:     1,
      effectiveFrom: new Date("2026-01-01"),
      rules: [
        {
          ruleName:      "Deal > ₹50L requires approval",
          priority:      10,
          conditionJson: JSON.stringify({ field: "amount", operator: ">", value: 5000000 }),
          actionJson:    JSON.stringify({ type: "REQUIRE_APPROVAL", level: 2 }),
          isActive:      true,
        },
      ],
    },
    {
      code:        "FINANCE_EXPENSE_APPROVAL",
      name:        "Expense Approval Threshold",
      description: "Expenses above ₹10,000 require manager approval; above ₹50,000 require Finance Manager.",
      categoryCode: "FINANCE",
      status:      "ACTIVE",
      version:     1,
      effectiveFrom: new Date("2026-04-01"),
      rules: [
        {
          ruleName:      "Expense > ₹50,000 requires Finance Manager",
          priority:      5,
          conditionJson: JSON.stringify({ field: "amount", operator: ">", value: 50000 }),
          actionJson:    JSON.stringify({ type: "REQUIRE_APPROVAL", level: 2 }),
          isActive:      true,
        },
        {
          ruleName:      "Expense > ₹10,000 requires approval",
          priority:      10,
          conditionJson: JSON.stringify({ field: "amount", operator: ">", value: 10000 }),
          actionJson:    JSON.stringify({ type: "REQUIRE_APPROVAL", level: 1 }),
          isActive:      true,
        },
      ],
    },
    {
      code:        "SECURITY_EXPORT_CONTROL",
      name:        "Export Data Control",
      description: "Blocks bulk data exports above 1,000 rows without Super Admin approval.",
      categoryCode: "SECURITY",
      status:      "ACTIVE",
      version:     1,
      effectiveFrom: new Date("2026-04-01"),
      rules: [
        {
          ruleName:      "Export > 1000 rows requires approval",
          priority:      10,
          conditionJson: JSON.stringify({ field: "rowCount", operator: ">", value: 1000 }),
          actionJson:    JSON.stringify({ type: "REQUIRE_APPROVAL", level: 3 }),
          isActive:      true,
        },
      ],
    },
  ];

  type PolicyModel = {
    findUnique: (a: unknown) => Promise<{ id: number } | null>;
    create:     (a: unknown) => Promise<{ id: number }>;
  };
  type PolicyRuleModel = {
    createMany: (a: unknown) => Promise<{ count: number }>;
    deleteMany: (a: unknown) => Promise<{ count: number }>;
  };

  const policyModel    = (prisma as never as { policy:     PolicyModel     }).policy;
  const ruleModel      = (prisma as never as { policyRule: PolicyRuleModel }).policyRule;

  for (const def of DEFAULT_POLICIES) {
    const catId = catMap[def.categoryCode];
    if (!catId) { console.warn(`  Category ${def.categoryCode} not found — skipping ${def.code}`); continue; }

    const existing = await policyModel.findUnique({ where: { code: def.code } } as never);
    if (existing) {
      console.log(`  Policy ${def.code} already exists (id=${existing.id})`);
      continue;
    }

    const policy = await policyModel.create({
      data: {
        categoryId:    catId,
        code:          def.code,
        name:          def.name,
        description:   def.description,
        status:        def.status,
        scopeType:     "GLOBAL",
        version:       def.version,
        effectiveFrom: def.effectiveFrom,
      },
    } as never);

    await ruleModel.createMany({
      data: def.rules.map((r) => ({ ...r, policyId: policy.id })),
    } as never);

    console.log(`  Created policy ${def.code} with ${def.rules.length} rule(s) (id=${policy.id})`);
  }

  await prisma.$disconnect();
  console.log("Policy seed complete.");
}

main().catch((e) => { console.error(e); process.exit(1); });
