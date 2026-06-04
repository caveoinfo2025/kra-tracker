/**
 * Expense Categories — types, mock data, helpers (Phase 2, UI-only).
 * No backend/Prisma yet. Shapes defined here become the API contract.
 */

export const FY = "26-27";

// ── Enumerations ──────────────────────────────────────────────────────────────

export const CATEGORY_STATUSES = ["Active", "Inactive"] as const;
export type CategoryStatus = (typeof CATEGORY_STATUSES)[number];

export const USAGE_KEYS = [
  "forGeneral", "forCustomer", "forEmployee",
  "forAdvanceSettlement", "forConveyance", "forVendor",
] as const;
export type UsageKey = (typeof USAGE_KEYS)[number];

export const USAGE_LABELS: Record<UsageKey, string> = {
  forGeneral: "General Expense",
  forCustomer: "Customer Expense",
  forEmployee: "Employee Claim",
  forAdvanceSettlement: "Advance Settlement",
  forConveyance: "Local Conveyance",
  forVendor: "Vendor Expense",
};

export const USAGE_SHORT: Record<UsageKey, string> = {
  forGeneral: "General",
  forCustomer: "Customer",
  forEmployee: "Employee",
  forAdvanceSettlement: "Advance",
  forConveyance: "Conveyance",
  forVendor: "Vendor",
};

export const CAT_PAYMENT_MODES = ["Cash", "Bank Transfer", "UPI", "Cheque", "Corporate Card"] as const;
export const ATTACHMENT_TYPES = ["Image", "PDF"] as const;
export const GST_RATES = [0, 5, 12, 18, 28] as const;
export const APPROVER_OPTIONS = ["Manager", "Accounts Head", "Director"] as const;
export const EMPLOYEE_GRADES = [
  "Engineer", "Senior Engineer", "Manager", "Senior Manager", "Director",
] as const;

export type BillRequired = "always" | "amount_based" | "optional";
export const BILL_LABELS: Record<BillRequired, string> = {
  always: "Always Required",
  amount_based: "Amount Based",
  optional: "Optional",
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GradePolicy {
  grade: string;
  dailyLimit: number;
  monthlyLimit: number;
  requiresApproval: boolean;
}

export interface AuditEntry {
  action: string;
  by: string;
  at: string;
  oldVal?: string;
  newVal?: string;
  reason?: string;
}

export interface ExpenseCategory {
  id: number;
  code: string;
  name: string;
  description: string;
  parentId: number | null;
  status: CategoryStatus;
  createdBy: string;
  createdAt: string;
  modifiedBy?: string;
  modifiedAt?: string;
  auditHistory: AuditEntry[];
  // B. Usage
  forGeneral: boolean;
  forCustomer: boolean;
  forEmployee: boolean;
  forAdvanceSettlement: boolean;
  forConveyance: boolean;
  forVendor: boolean;
  // C. Payment Modes
  allowedPaymentModes: string[];
  // D. Document Rules
  billRequired: BillRequired;
  billAmountThreshold: number;
  allowedAttachments: string[];
  // E. GST
  gstEnabled: boolean;
  gstRate: number;
  gstType: "goods" | "services";
  inputCreditEligible: boolean;
  // F. Approval
  approvalRequired: boolean;
  approvalRule: "always" | "amount_based";
  approvalThreshold: number;
  approvers: string[];
  // G. Employee Policy
  hrRulesEnabled: boolean;
  gradePolicies: GradePolicy[];
  // H. Customer Expense
  customerTrackingEnabled: boolean;
  allowLinkCustomer: boolean;
  allowLinkProject: boolean;
  allowLinkSalesOrder: boolean;
  allowLinkTicket: boolean;
  // I. Tally
  tallyLedger: string;
  tallyCostCenterRequired: boolean;
  tallyGSTLedger: string;
  tallyExportEnabled: boolean;
}

// ── RBAC ─────────────────────────────────────────────────────────────────────

export interface CatCaps {
  roleLabel: string;
  canCreate: boolean;
  canEdit: boolean;
  canDisable: boolean;
  canConfigureRules: boolean;
  canExport: boolean;
}

export function deriveCatCaps(f: {
  isManager: boolean;
  isAccounts: boolean;
  isOpsHead: boolean;
}): CatCaps {
  if (f.isOpsHead)
    return { roleLabel: "Accounts Admin", canCreate: true, canEdit: true, canDisable: true, canConfigureRules: true, canExport: true };
  if (f.isAccounts)
    return { roleLabel: "Accounts Team", canCreate: false, canEdit: false, canDisable: false, canConfigureRules: false, canExport: true };
  if (f.isManager)
    return { roleLabel: "Manager", canCreate: false, canEdit: false, canDisable: false, canConfigureRules: false, canExport: true };
  return { roleLabel: "Employee", canCreate: false, canEdit: false, canDisable: false, canConfigureRules: false, canExport: false };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getParentName(cats: ExpenseCategory[], parentId: number | null): string {
  if (!parentId) return "—";
  return cats.find((c) => c.id === parentId)?.name ?? "—";
}

export function catStats(cats: ExpenseCategory[]) {
  return {
    total: cats.length,
    active: cats.filter((c) => c.status === "Active").length,
    subCategories: cats.filter((c) => c.parentId !== null).length,
    gstEnabled: cats.filter((c) => c.gstEnabled).length,
    approvalRequired: cats.filter((c) => c.approvalRequired).length,
    customerEnabled: cats.filter((c) => c.customerTrackingEnabled).length,
  };
}

export function statusBadge(s: CategoryStatus): string {
  return s === "Active" ? "badge-success" : "badge-neutral";
}

export function enabledUsages(cat: ExpenseCategory): UsageKey[] {
  return USAGE_KEYS.filter((k) => cat[k]);
}

export function fmtDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Default Templates ─────────────────────────────────────────────────────────

export interface CategoryTemplate {
  parentCode: string;
  parentName: string;
  tallyLedger: string;
  icon: string;
  subCategories: { code: string; name: string }[];
}

export const DEFAULT_TEMPLATES: CategoryTemplate[] = [
  {
    parentCode: "OFFC", parentName: "Office Expenses", tallyLedger: "Office Expense", icon: "🏢",
    subCategories: [
      { code: "OFFC-TCF", name: "Tea / Coffee" },
      { code: "OFFC-STN", name: "Stationery" },
      { code: "OFFC-PRN", name: "Printing" },
      { code: "OFFC-CRR", name: "Courier" },
      { code: "OFFC-HSK", name: "Housekeeping" },
    ],
  },
  {
    parentCode: "TRVL", parentName: "Travel", tallyLedger: "Travelling Expense", icon: "✈️",
    subCategories: [
      { code: "TRVL-FUL", name: "Fuel" },
      { code: "TRVL-CAB", name: "Taxi / Cab" },
      { code: "TRVL-PRK", name: "Parking" },
      { code: "TRVL-TOL", name: "Toll" },
      { code: "TRVL-HTL", name: "Hotel" },
    ],
  },
  {
    parentCode: "EMPL", parentName: "Employee Expenses", tallyLedger: "Employee Expense", icon: "👤",
    subCategories: [
      { code: "EMPL-FD", name: "Food" },
      { code: "EMPL-LT", name: "Local Travel" },
      { code: "EMPL-RMB", name: "Reimbursement" },
    ],
  },
  {
    parentCode: "BSNS", parentName: "Business Expenses", tallyLedger: "Business Promotion", icon: "💼",
    subCategories: [
      { code: "BSNS-CV", name: "Customer Visit" },
      { code: "BSNS-DE", name: "Demo Expense" },
    ],
  },
  {
    parentCode: "MNTN", parentName: "Maintenance", tallyLedger: "Repairs & Maintenance", icon: "🔧",
    subCategories: [
      { code: "MNTN-ELC", name: "Electrical" },
      { code: "MNTN-RPR", name: "Office Repair" },
    ],
  },
  {
    parentCode: "IT", parentName: "IT Expenses", tallyLedger: "Computer Expense", icon: "💻",
    subCategories: [
      { code: "IT-HW", name: "Hardware" },
      { code: "IT-SW", name: "Software" },
      { code: "IT-ACC", name: "Accessories" },
    ],
  },
  {
    parentCode: "CUST", parentName: "Customer Expenses", tallyLedger: "Customer Project Expense", icon: "🤝",
    subCategories: [
      { code: "CUST-INS", name: "Installation Expense" },
      { code: "CUST-PM", name: "Project Material" },
      { code: "CUST-ET", name: "Engineer Travel" },
    ],
  },
];

// ── Mock data ─────────────────────────────────────────────────────────────────

const DEF: Omit<ExpenseCategory, "id" | "code" | "name" | "parentId" | "createdBy" | "createdAt"> = {
  description: "",
  status: "Active",
  auditHistory: [],
  forGeneral: true, forCustomer: false, forEmployee: false,
  forAdvanceSettlement: false, forConveyance: false, forVendor: false,
  allowedPaymentModes: ["Cash", "Bank Transfer", "UPI", "Cheque", "Corporate Card"],
  billRequired: "amount_based", billAmountThreshold: 500,
  allowedAttachments: ["Image", "PDF"],
  gstEnabled: false, gstRate: 18, gstType: "services", inputCreditEligible: false,
  approvalRequired: false, approvalRule: "amount_based", approvalThreshold: 5000, approvers: ["Manager"],
  hrRulesEnabled: false, gradePolicies: [],
  customerTrackingEnabled: false, allowLinkCustomer: false, allowLinkProject: false,
  allowLinkSalesOrder: false, allowLinkTicket: false,
  tallyLedger: "", tallyCostCenterRequired: false, tallyGSTLedger: "", tallyExportEnabled: true,
};

const mkCat = (
  c: Pick<ExpenseCategory, "id" | "code" | "name" | "parentId" | "createdBy" | "createdAt"> &
    Partial<typeof DEF>
): ExpenseCategory => ({ ...DEF, ...c } as ExpenseCategory);

export const CATEGORIES: ExpenseCategory[] = [
  // ── Parent categories ─────────────────────────────────────────────────────
  mkCat({
    id: 1, code: "OFFC", name: "Office Expenses", parentId: null,
    createdBy: "Priyadharshini R", createdAt: "2026-06-01",
    description: "Day-to-day office running expenses.",
    forGeneral: true, forVendor: true,
    approvalRequired: true, approvalRule: "amount_based", approvalThreshold: 2000,
    tallyLedger: "Office Expense", tallyExportEnabled: true,
    auditHistory: [{ action: "Created", by: "Priyadharshini R", at: "2026-06-01" }],
  }),
  mkCat({
    id: 2, code: "TRVL", name: "Travel", parentId: null,
    createdBy: "Priyadharshini R", createdAt: "2026-06-01",
    description: "All travel-related expenses — air, train, cab, fuel, accommodation.",
    forGeneral: true, forEmployee: true, forCustomer: true, forConveyance: true,
    approvalRequired: true, approvalRule: "amount_based", approvalThreshold: 2000,
    approvers: ["Manager", "Accounts Head"],
    hrRulesEnabled: true, gradePolicies: [
      { grade: "Engineer", dailyLimit: 500, monthlyLimit: 5000, requiresApproval: false },
      { grade: "Manager", dailyLimit: 2000, monthlyLimit: 20000, requiresApproval: true },
    ],
    tallyLedger: "Travelling Expense", tallyExportEnabled: true,
    auditHistory: [{ action: "Created", by: "Priyadharshini R", at: "2026-06-01" }],
  }),
  mkCat({
    id: 3, code: "EMPL", name: "Employee Expenses", parentId: null,
    createdBy: "Priyadharshini R", createdAt: "2026-06-01",
    description: "Employee reimbursement and advance-settlement claims.",
    forEmployee: true, forAdvanceSettlement: true,
    approvalRequired: true, approvalRule: "always", approvers: ["Manager"],
    hrRulesEnabled: true, gradePolicies: [
      { grade: "Engineer", dailyLimit: 300, monthlyLimit: 3000, requiresApproval: false },
      { grade: "Senior Engineer", dailyLimit: 500, monthlyLimit: 5000, requiresApproval: false },
      { grade: "Manager", dailyLimit: 1000, monthlyLimit: 10000, requiresApproval: false },
    ],
    tallyLedger: "Employee Expense", tallyExportEnabled: true,
    auditHistory: [{ action: "Created", by: "Priyadharshini R", at: "2026-06-01" }],
  }),
  mkCat({
    id: 4, code: "BSNS", name: "Business Expenses", parentId: null,
    createdBy: "Vijesh V", createdAt: "2026-06-01",
    description: "Customer visits, demos, and business development expenses.",
    forGeneral: true, forCustomer: true,
    approvalRequired: true, approvalRule: "amount_based", approvalThreshold: 3000, approvers: ["Manager"],
    customerTrackingEnabled: true, allowLinkCustomer: true, allowLinkProject: true, allowLinkSalesOrder: true,
    tallyLedger: "Business Promotion", tallyExportEnabled: true,
    auditHistory: [{ action: "Created", by: "Vijesh V", at: "2026-06-01" }],
  }),
  mkCat({
    id: 5, code: "MNTN", name: "Maintenance", parentId: null,
    createdBy: "Priyadharshini R", createdAt: "2026-06-01",
    description: "Office maintenance, electrical, and repair works.",
    forGeneral: true, forVendor: true,
    gstEnabled: true, gstRate: 18, gstType: "services",
    approvalRequired: true, approvalRule: "amount_based", approvalThreshold: 5000,
    approvers: ["Manager", "Accounts Head"],
    tallyLedger: "Repairs & Maintenance", tallyGSTLedger: "GST Input - Services 18%",
    auditHistory: [{ action: "Created", by: "Priyadharshini R", at: "2026-06-01" }],
  }),
  mkCat({
    id: 6, code: "IT", name: "IT Expenses", parentId: null,
    createdBy: "Vijesh V", createdAt: "2026-06-01",
    description: "Hardware, software, and IT accessories purchases.",
    forGeneral: true, forVendor: true,
    gstEnabled: true, gstRate: 18, gstType: "goods", inputCreditEligible: true,
    billRequired: "always",
    approvalRequired: true, approvalRule: "amount_based", approvalThreshold: 5000,
    approvers: ["Manager", "Director"],
    tallyLedger: "Computer Expense", tallyGSTLedger: "GST Input - Goods 18%",
    tallyCostCenterRequired: true,
    auditHistory: [{ action: "Created", by: "Vijesh V", at: "2026-06-01" }],
  }),
  mkCat({
    id: 7, code: "CUST", name: "Customer Expenses", parentId: null,
    createdBy: "Vijesh V", createdAt: "2026-06-02",
    description: "Expenses incurred for customer projects — tracked against customer profitability.",
    forCustomer: true,
    approvalRequired: true, approvalRule: "always", approvers: ["Manager", "Accounts Head"],
    customerTrackingEnabled: true, allowLinkCustomer: true, allowLinkProject: true,
    allowLinkSalesOrder: true, allowLinkTicket: true,
    tallyLedger: "Customer Project Expense", tallyCostCenterRequired: true,
    auditHistory: [{ action: "Created", by: "Vijesh V", at: "2026-06-02" }],
  }),

  // ── Office Expenses sub-categories ───────────────────────────────────────
  mkCat({ id: 11, code: "OFFC-TCF", name: "Tea / Coffee", parentId: 1, createdBy: "Priyadharshini R", createdAt: "2026-06-01", description: "Daily pantry — tea, coffee, snacks.", forGeneral: true, forVendor: true, billRequired: "optional", billAmountThreshold: 0, tallyLedger: "Office Expense", auditHistory: [{ action: "Created", by: "Priyadharshini R", at: "2026-06-01" }] }),
  mkCat({ id: 12, code: "OFFC-STN", name: "Stationery", parentId: 1, createdBy: "Priyadharshini R", createdAt: "2026-06-01", description: "Pens, paper, notebooks, filing.", forGeneral: true, forVendor: true, tallyLedger: "Office Expense", auditHistory: [{ action: "Created", by: "Priyadharshini R", at: "2026-06-01" }] }),
  mkCat({ id: 13, code: "OFFC-PRN", name: "Printing", parentId: 1, createdBy: "Priyadharshini R", createdAt: "2026-06-01", description: "Printing and photocopying charges.", forGeneral: true, forVendor: true, tallyLedger: "Office Expense", auditHistory: [{ action: "Created", by: "Priyadharshini R", at: "2026-06-01" }] }),
  mkCat({ id: 14, code: "OFFC-CRR", name: "Courier", parentId: 1, createdBy: "Priyadharshini R", createdAt: "2026-06-01", description: "Courier and parcel services.", forGeneral: true, forVendor: true, tallyLedger: "Office Expense", auditHistory: [{ action: "Created", by: "Priyadharshini R", at: "2026-06-01" }] }),
  mkCat({ id: 15, code: "OFFC-HSK", name: "Housekeeping", parentId: 1, createdBy: "Priyadharshini R", createdAt: "2026-06-01", description: "Office cleaning and housekeeping.", forGeneral: true, forVendor: true, tallyLedger: "Office Expense", auditHistory: [{ action: "Created", by: "Priyadharshini R", at: "2026-06-01" }] }),

  // ── Travel sub-categories ─────────────────────────────────────────────────
  mkCat({ id: 21, code: "TRVL-FUL", name: "Fuel", parentId: 2, createdBy: "Priyadharshini R", createdAt: "2026-06-01", description: "Fuel reimbursement for official travel.", forEmployee: true, forConveyance: true, billRequired: "always", tallyLedger: "Travelling Expense", auditHistory: [{ action: "Created", by: "Priyadharshini R", at: "2026-06-01" }] }),
  mkCat({ id: 22, code: "TRVL-CAB", name: "Taxi / Cab", parentId: 2, createdBy: "Priyadharshini R", createdAt: "2026-06-01", description: "Cab and taxi fares for official travel.", forEmployee: true, forCustomer: true, forConveyance: true, tallyLedger: "Travelling Expense", auditHistory: [{ action: "Created", by: "Priyadharshini R", at: "2026-06-01" }] }),
  mkCat({ id: 23, code: "TRVL-PRK", name: "Parking", parentId: 2, createdBy: "Priyadharshini R", createdAt: "2026-06-01", description: "Parking charges during official travel.", forGeneral: true, forEmployee: true, billRequired: "optional", tallyLedger: "Travelling Expense", auditHistory: [{ action: "Created", by: "Priyadharshini R", at: "2026-06-01" }] }),
  mkCat({ id: 24, code: "TRVL-TOL", name: "Toll", parentId: 2, createdBy: "Priyadharshini R", createdAt: "2026-06-01", description: "Toll charges on highway travel.", forGeneral: true, forEmployee: true, billRequired: "optional", tallyLedger: "Travelling Expense", auditHistory: [{ action: "Created", by: "Priyadharshini R", at: "2026-06-01" }] }),
  mkCat({ id: 25, code: "TRVL-HTL", name: "Hotel", parentId: 2, createdBy: "Priyadharshini R", createdAt: "2026-06-01", description: "Hotel and accommodation expenses.", forEmployee: true, billRequired: "always", gstEnabled: true, gstRate: 12, gstType: "services", approvalRequired: true, approvalRule: "always", approvers: ["Manager"], tallyLedger: "Travelling Expense", tallyGSTLedger: "GST Input - Services 12%", auditHistory: [{ action: "Created", by: "Priyadharshini R", at: "2026-06-01" }] }),

  // ── Employee Expenses sub-categories ──────────────────────────────────────
  mkCat({ id: 31, code: "EMPL-FD", name: "Food", parentId: 3, createdBy: "Priyadharshini R", createdAt: "2026-06-01", description: "Meal expenses during official travel or client meetings.", forEmployee: true, billRequired: "amount_based", billAmountThreshold: 500, tallyLedger: "Employee Expense", auditHistory: [{ action: "Created", by: "Priyadharshini R", at: "2026-06-01" }] }),
  mkCat({ id: 32, code: "EMPL-LT", name: "Local Travel", parentId: 3, createdBy: "Priyadharshini R", createdAt: "2026-06-01", description: "Daily local travel reimbursement.", forEmployee: true, forConveyance: true, billRequired: "optional", tallyLedger: "Employee Expense", auditHistory: [{ action: "Created", by: "Priyadharshini R", at: "2026-06-01" }] }),
  mkCat({ id: 33, code: "EMPL-RMB", name: "Reimbursement", parentId: 3, createdBy: "Priyadharshini R", createdAt: "2026-06-01", description: "General employee reimbursement claims.", forEmployee: true, forAdvanceSettlement: true, approvalRequired: true, approvalRule: "always", tallyLedger: "Employee Expense", auditHistory: [{ action: "Created", by: "Priyadharshini R", at: "2026-06-01" }] }),

  // ── Business Expenses sub-categories ─────────────────────────────────────
  mkCat({ id: 41, code: "BSNS-CV", name: "Customer Visit", parentId: 4, createdBy: "Vijesh V", createdAt: "2026-06-01", description: "Expenses during customer site visits.", forCustomer: true, approvalRequired: true, approvalRule: "always", customerTrackingEnabled: true, allowLinkCustomer: true, allowLinkProject: true, allowLinkSalesOrder: true, tallyLedger: "Business Promotion", auditHistory: [{ action: "Created", by: "Vijesh V", at: "2026-06-01" }] }),
  mkCat({ id: 42, code: "BSNS-DE", name: "Demo Expense", parentId: 4, createdBy: "Vijesh V", createdAt: "2026-06-01", description: "Product demo and presales-related expenses.", forCustomer: true, forGeneral: true, customerTrackingEnabled: true, allowLinkCustomer: true, allowLinkProject: true, tallyLedger: "Business Promotion", auditHistory: [{ action: "Created", by: "Vijesh V", at: "2026-06-01" }] }),

  // ── Maintenance sub-categories ────────────────────────────────────────────
  mkCat({ id: 51, code: "MNTN-ELC", name: "Electrical", parentId: 5, createdBy: "Priyadharshini R", createdAt: "2026-06-01", description: "Electrical work and repairs.", forGeneral: true, forVendor: true, gstEnabled: true, gstRate: 18, gstType: "services", tallyLedger: "Repairs & Maintenance", auditHistory: [{ action: "Created", by: "Priyadharshini R", at: "2026-06-01" }] }),
  mkCat({
    id: 52, code: "MNTN-RPR", name: "Office Repair", parentId: 5, createdBy: "Priyadharshini R", createdAt: "2026-06-01",
    description: "General office repair and maintenance.", forGeneral: true, forVendor: true, gstEnabled: true, gstRate: 18, gstType: "services",
    status: "Inactive", tallyLedger: "Repairs & Maintenance",
    auditHistory: [
      { action: "Created", by: "Priyadharshini R", at: "2026-06-01" },
      { action: "Status Changed", by: "Vijesh V", at: "2026-06-02", oldVal: "Active", newVal: "Inactive", reason: "Consolidated into Electrical" },
    ],
  }),

  // ── IT Expenses sub-categories ────────────────────────────────────────────
  mkCat({ id: 61, code: "IT-HW", name: "Hardware", parentId: 6, createdBy: "Vijesh V", createdAt: "2026-06-01", description: "Desktops, laptops, peripherals.", forGeneral: true, forVendor: true, gstEnabled: true, gstRate: 18, gstType: "goods", inputCreditEligible: true, billRequired: "always", tallyLedger: "Computer Expense", tallyGSTLedger: "GST Input - Goods 18%", auditHistory: [{ action: "Created", by: "Vijesh V", at: "2026-06-01" }] }),
  mkCat({ id: 62, code: "IT-SW", name: "Software", parentId: 6, createdBy: "Vijesh V", createdAt: "2026-06-01", description: "Software licenses and subscriptions.", forGeneral: true, forVendor: true, gstEnabled: true, gstRate: 18, gstType: "services", inputCreditEligible: true, billRequired: "always", tallyLedger: "Computer Expense", tallyGSTLedger: "GST Input - Services 18%", auditHistory: [{ action: "Created", by: "Vijesh V", at: "2026-06-01" }] }),
  mkCat({ id: 63, code: "IT-ACC", name: "Accessories", parentId: 6, createdBy: "Vijesh V", createdAt: "2026-06-01", description: "Keyboards, mice, cables, USB hubs.", forGeneral: true, forVendor: true, gstEnabled: true, gstRate: 18, gstType: "goods", inputCreditEligible: true, tallyLedger: "Computer Expense", auditHistory: [{ action: "Created", by: "Vijesh V", at: "2026-06-01" }] }),

  // ── Customer Expenses sub-categories ─────────────────────────────────────
  mkCat({ id: 71, code: "CUST-INS", name: "Installation Expense", parentId: 7, createdBy: "Vijesh V", createdAt: "2026-06-02", description: "On-site installation charges.", forCustomer: true, customerTrackingEnabled: true, allowLinkCustomer: true, allowLinkProject: true, allowLinkSalesOrder: true, approvalRequired: true, approvalRule: "always", tallyLedger: "Customer Project Expense", tallyCostCenterRequired: true, auditHistory: [{ action: "Created", by: "Vijesh V", at: "2026-06-02" }] }),
  mkCat({ id: 72, code: "CUST-PM", name: "Project Material", parentId: 7, createdBy: "Vijesh V", createdAt: "2026-06-02", description: "Materials procured for customer projects.", forCustomer: true, forVendor: true, customerTrackingEnabled: true, allowLinkCustomer: true, allowLinkProject: true, allowLinkSalesOrder: true, gstEnabled: true, gstRate: 18, gstType: "goods", billRequired: "always", approvalRequired: true, approvalRule: "always", approvers: ["Manager", "Accounts Head"], tallyLedger: "Customer Project Expense", tallyCostCenterRequired: true, auditHistory: [{ action: "Created", by: "Vijesh V", at: "2026-06-02" }] }),
  mkCat({ id: 73, code: "CUST-ET", name: "Engineer Travel", parentId: 7, createdBy: "Vijesh V", createdAt: "2026-06-02", description: "Travel expenses incurred by engineers for customer site work.", forCustomer: true, forEmployee: true, customerTrackingEnabled: true, allowLinkCustomer: true, allowLinkProject: true, allowLinkTicket: true, approvalRequired: true, approvalRule: "always", tallyLedger: "Customer Project Expense", tallyCostCenterRequired: true, auditHistory: [{ action: "Created", by: "Vijesh V", at: "2026-06-02" }] }),
];
