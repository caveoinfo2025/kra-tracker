// Types and mock data for the Policy Engine admin UI.
// These shapes are the exact contract the API must return.

export type PolicyStatus = "DRAFT" | "REVIEW" | "ACTIVE" | "INACTIVE" | "ARCHIVED";
export type ScopeType    = "GLOBAL" | "COMPANY" | "BRANCH" | "DEPARTMENT" | "ROLE" | "USER";
export type ActionType   = "ALLOW" | "BLOCK" | "REQUIRE_APPROVAL" | "SEND_NOTIFICATION" | "CREATE_TASK" | "ESCALATE";
export type Operator     = "=" | "!=" | ">" | "<" | ">=" | "<=" | "IN" | "NOT_IN" | "CONTAINS";
export type AuditAction  = "CREATED" | "UPDATED" | "STATUS_CHANGED" | "RULE_ADDED" | "RULE_REMOVED" | "PUBLISHED" | "ARCHIVED";

export interface PolicyCategory {
  id:   number;
  name: string;
  code: string;
}

export interface PolicyCondition {
  field:    string;
  operator: Operator;
  value:    string | number | string[];
}

export interface PolicyAction {
  type:         ActionType;
  level?:       number;
  reason?:      string;
  templateKey?: string;
  title?:       string;
}

export interface PolicyRuleUI {
  id?:           number;
  ruleName:      string;
  priority:      number;
  conditionJson: string;
  actionJson:    string;
  isActive:      boolean;
  // Parsed for UI only (not sent to API)
  condition?:    PolicyCondition;
  action?:       PolicyAction;
}

export interface PolicySummary {
  id:            number;
  code:          string;
  name:          string;
  description:   string;
  categoryId:    number;
  categoryName:  string;
  scopeType:     ScopeType;
  scopeId:       number | null;
  status:        PolicyStatus;
  version:       number;
  effectiveFrom: string | null;
  effectiveTo:   string | null;
  ruleCount:     number;
  createdAt:     string;
  updatedAt:     string;
  rules?:        PolicyRuleUI[];
}

export interface PolicyAuditRecord {
  id:          number;
  policyId:    number;
  policyName:  string;
  action:      AuditAction;
  oldValue:    string | null;
  newValue:    string | null;
  performedBy: string;
  createdAt:   string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function statusBadge(s: PolicyStatus): string {
  switch (s) {
    case "ACTIVE":   return "badge-success";
    case "REVIEW":   return "badge-warning";
    case "DRAFT":    return "badge-neutral";
    case "INACTIVE": return "badge-neutral";
    case "ARCHIVED": return "badge-neutral";
  }
}

export function statusColor(s: PolicyStatus): string {
  switch (s) {
    case "ACTIVE":   return "#1F9D55";
    case "REVIEW":   return "#FF6B00";
    case "DRAFT":    return "#6B7280";
    case "INACTIVE": return "#9CA3AF";
    case "ARCHIVED": return "#D1D5DB";
  }
}

export function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return iso; }
}

// ── Mock categories ───────────────────────────────────────────────────────────

export const MOCK_CATEGORIES: PolicyCategory[] = [
  { id: 1, code: "CRM",          name: "CRM"              },
  { id: 2, code: "FINANCE",      name: "Finance"          },
  { id: 3, code: "SECURITY",     name: "Security"         },
  { id: 4, code: "WORKFLOW",     name: "Workflow"         },
  { id: 5, code: "MASTER_DATA",  name: "Master Data"      },
  { id: 6, code: "PERFORMANCE",  name: "Performance"      },
];

// ── Mock policies (3 seeded defaults) ────────────────────────────────────────

export const MOCK_POLICIES: PolicySummary[] = [
  {
    id: 1,
    code: "CRM_LARGE_DEAL_REVIEW",
    name: "Large Deal Review",
    description: "Requires Sales Head approval for deals above ₹50 lakhs.",
    categoryId: 1,
    categoryName: "CRM",
    scopeType: "GLOBAL",
    scopeId: null,
    status: "ACTIVE",
    version: 2,
    effectiveFrom: "2026-01-01T00:00:00Z",
    effectiveTo: null,
    ruleCount: 1,
    createdAt: "2026-05-01T09:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
    rules: [
      {
        id: 1,
        ruleName: "Deal > ₹50L requires approval",
        priority: 10,
        conditionJson: JSON.stringify({ field: "amount", operator: ">", value: 5000000 }),
        actionJson:    JSON.stringify({ type: "REQUIRE_APPROVAL", level: 2 }),
        isActive: true,
        condition: { field: "amount", operator: ">", value: 5000000 },
        action:    { type: "REQUIRE_APPROVAL", level: 2 },
      },
    ],
  },
  {
    id: 2,
    code: "FINANCE_EXPENSE_APPROVAL",
    name: "Expense Approval Threshold",
    description: "Expenses above ₹10,000 require manager approval.",
    categoryId: 2,
    categoryName: "Finance",
    scopeType: "GLOBAL",
    scopeId: null,
    status: "ACTIVE",
    version: 1,
    effectiveFrom: "2026-04-01T00:00:00Z",
    effectiveTo: null,
    ruleCount: 2,
    createdAt: "2026-04-01T09:00:00Z",
    updatedAt: "2026-04-01T09:00:00Z",
    rules: [
      {
        id: 2,
        ruleName: "Expense > ₹10,000 requires approval",
        priority: 10,
        conditionJson: JSON.stringify({ field: "amount", operator: ">", value: 10000 }),
        actionJson:    JSON.stringify({ type: "REQUIRE_APPROVAL", level: 1 }),
        isActive: true,
        condition: { field: "amount", operator: ">", value: 10000 },
        action:    { type: "REQUIRE_APPROVAL", level: 1 },
      },
      {
        id: 3,
        ruleName: "Expense > ₹50,000 requires Finance Manager",
        priority: 5,
        conditionJson: JSON.stringify({ field: "amount", operator: ">", value: 50000 }),
        actionJson:    JSON.stringify({ type: "REQUIRE_APPROVAL", level: 2 }),
        isActive: true,
        condition: { field: "amount", operator: ">", value: 50000 },
        action:    { type: "REQUIRE_APPROVAL", level: 2 },
      },
    ],
  },
  {
    id: 3,
    code: "SECURITY_EXPORT_CONTROL",
    name: "Export Data Control",
    description: "Blocks bulk data exports above 1,000 rows without Super Admin approval.",
    categoryId: 3,
    categoryName: "Security",
    scopeType: "GLOBAL",
    scopeId: null,
    status: "ACTIVE",
    version: 1,
    effectiveFrom: "2026-04-01T00:00:00Z",
    effectiveTo: null,
    ruleCount: 1,
    createdAt: "2026-04-01T09:00:00Z",
    updatedAt: "2026-04-01T09:00:00Z",
    rules: [
      {
        id: 4,
        ruleName: "Export > 1000 rows requires approval",
        priority: 10,
        conditionJson: JSON.stringify({ field: "rowCount", operator: ">", value: 1000 }),
        actionJson:    JSON.stringify({ type: "REQUIRE_APPROVAL", level: 3 }),
        isActive: true,
        condition: { field: "rowCount", operator: ">", value: 1000 },
        action:    { type: "REQUIRE_APPROVAL", level: 3 },
      },
    ],
  },
];

export const MOCK_AUDIT: PolicyAuditRecord[] = [
  { id: 1, policyId: 1, policyName: "Large Deal Review",        action: "STATUS_CHANGED", oldValue: "REVIEW", newValue: "ACTIVE",           performedBy: "Deepak Sharma",  createdAt: "2026-06-01T10:00:00Z" },
  { id: 2, policyId: 1, policyName: "Large Deal Review",        action: "STATUS_CHANGED", oldValue: "DRAFT",  newValue: "REVIEW",           performedBy: "Vijesh Vijayan", createdAt: "2026-05-30T14:00:00Z" },
  { id: 3, policyId: 2, policyName: "Expense Approval Threshold", action: "RULE_ADDED",   oldValue: null,    newValue: "Expense > ₹50,000",  performedBy: "Vijesh Vijayan", createdAt: "2026-04-01T09:30:00Z" },
  { id: 4, policyId: 2, policyName: "Expense Approval Threshold", action: "CREATED",      oldValue: null,    newValue: "DRAFT",              performedBy: "Vijesh Vijayan", createdAt: "2026-04-01T09:00:00Z" },
  { id: 5, policyId: 3, policyName: "Export Data Control",      action: "CREATED",        oldValue: null,    newValue: "DRAFT",              performedBy: "Deepak Sharma",  createdAt: "2026-04-01T09:00:00Z" },
];
