/**
 * Expense Register — types, mock data, helpers (Phase 2, UI only).
 *
 * Mirrors the Cash/Bank Book modules and re-uses their money/date helpers and
 * source documents so the finance modules stay consistent. No backend/Prisma.
 * Money in ₹ (rupees). Voucher numbers follow CI/YY-YY/00001.
 */

export { fmtINR, fmtINRorDash, fmtDate, fmtDateTime, todayISO } from "../bank-book/data";
export { OPEN_COLLECTIONS, CUSTOMER_ADVANCES } from "../bank-book/data";

export const FY = "26-27";

// ── Enumerations ──────────────────────────────────────────────────────────────

export const EXPENSE_TYPES = ["General Expense", "Customer Expense", "Employee Expense", "Vendor Expense"] as const;
export type ExpenseType = (typeof EXPENSE_TYPES)[number];

export const PAYMENT_MODES = ["Cash", "Bank Transfer", "UPI", "Cheque", "Corporate Card"] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export const APPROVAL_STATUSES = ["Draft", "Pending Approval", "Approved", "Rejected", "Paid"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const PAYMENT_STATUSES = ["Unpaid", "Paid"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const BRANCHES = ["Head Office", "Bangalore", "Chennai"] as const;
export const DEPARTMENTS = ["Sales", "Presales", "Operations", "Accounts", "Admin"] as const;

export const CATEGORIES: Record<string, string[]> = {
  Travel: ["Air", "Train", "Cab / Taxi", "Fuel", "Toll / Parking"],
  Accommodation: ["Hotel", "Guest House", "Per Diem"],
  Meals: ["Team Meal", "Client Meal", "Self"],
  "Office Supplies": ["Stationery", "Printing", "Pantry"],
  Vehicle: ["Fuel", "Maintenance", "Insurance"],
  Communication: ["Mobile", "Internet", "Courier"],
  "Professional Services": ["Consultancy", "Legal", "Audit"],
  "Local Conveyance": ["Bike", "Car", "Auto", "Public Transport"],
  Other: ["Miscellaneous"],
};

export const GST_RATES = [0, 5, 12, 18, 28];

// ── Approval / payment badge mapping ──────────────────────────────────────────

export const approvalBadge = (s: ApprovalStatus): string =>
  s === "Approved" ? "badge-success"
  : s === "Paid" ? "badge-accent"
  : s === "Pending Approval" ? "badge-warning"
  : s === "Rejected" ? "badge-danger"
  : "badge-neutral";

export const paymentBadge = (s: PaymentStatus): string => (s === "Paid" ? "badge-success" : "badge-neutral");

// ── RBAC ──────────────────────────────────────────────────────────────────────

export interface ExpenseCaps {
  roleLabel: string;
  scope: "all" | "own";   // which expenses are visible
  canApprove: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
}

export function deriveExpenseCaps(f: { isManager: boolean; isAccounts: boolean; isOpsHead: boolean }): ExpenseCaps {
  if (f.isOpsHead) return { roleLabel: "Accounts Admin", scope: "all", canApprove: true, canEdit: true, canDelete: true, canExport: true };
  if (f.isAccounts) return { roleLabel: "Accounts Team", scope: "all", canApprove: false, canEdit: true, canDelete: false, canExport: true };
  if (f.isManager) return { roleLabel: "Manager", scope: "all", canApprove: true, canEdit: false, canDelete: false, canExport: true };
  return { roleLabel: "Employee", scope: "own", canApprove: false, canEdit: true, canDelete: false, canExport: false };
}

// ── Model ─────────────────────────────────────────────────────────────────────

export interface ApprovalEvent { stage: string; by: string; date: string; note?: string; state: "done" | "rejected" | "pending" }

export interface Expense {
  id: number;
  expenseNo: string;       // EXP/26-27/0001
  date: string;
  branch: string;
  department: string;
  type: ExpenseType;
  category: string;
  subCategory: string;
  description: string;
  paymentMode: PaymentMode;
  cashAccount: string;
  bankAccount: string;
  // related
  customer: string;
  opportunity: string;
  salesOrder: string;
  project: string;
  ticketRef: string;
  vendor: string;
  employee: string;
  claimRef: string;
  advanceAdjustment: number;
  reimbursementRequired: boolean;
  // money
  baseAmount: number;
  gstApplicable: boolean;
  gstNumber: string;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  gstAmount: number;
  totalAmount: number;
  // docs / status
  billAvailable: boolean;
  invoiceNo: string;
  invoiceDate: string;
  voucherGenerated: boolean;
  voucherNo: string;
  approvalStatus: ApprovalStatus;
  paymentStatus: PaymentStatus;
  createdBy: string;
  modifiedBy?: string;
  attachments: { name: string; kind: "image" | "pdf" }[];
  approvalHistory: ApprovalEvent[];
}

// ── Mock customer revenue (for profitability panel) ───────────────────────────

export const CUSTOMER_REVENUE: Record<string, number> = {
  "Tata Projects Ltd": 500000,
  "Biocon Ltd": 320000,
  "Wipro Ltd": 410000,
  "Infosys BPM": 275000,
  "L&T Construction": 612500,
};

// ── Mock employee advances (for advance panel) ────────────────────────────────

export const EMPLOYEE_ADVANCES: Record<string, number> = {
  "Rahul M": 10000, "Sneha K": 25000, "Deepak N": 0,
};

// ── Mock expenses ─────────────────────────────────────────────────────────────

const mk = (e: Partial<Expense> & Pick<Expense, "id" | "date" | "type" | "category" | "description" | "baseAmount" | "createdBy">): Expense => {
  const gstAmount = (e.cgst ?? 0) + (e.sgst ?? 0) + (e.igst ?? 0);
  const base = e.baseAmount;
  return {
    expenseNo: `EXP/${FY}/${String(e.id).padStart(4, "0")}`,
    branch: "Head Office", department: "Sales", subCategory: "",
    paymentMode: "Cash", cashAccount: "Cash — Head Office", bankAccount: "",
    customer: "", opportunity: "", salesOrder: "", project: "", ticketRef: "",
    vendor: "", employee: "", claimRef: "", advanceAdjustment: 0, reimbursementRequired: false,
    gstApplicable: false, gstNumber: "", taxable: e.gstApplicable ? base : 0, cgst: 0, sgst: 0, igst: 0,
    gstAmount, totalAmount: base + gstAmount,
    billAvailable: true, invoiceNo: "", invoiceDate: "",
    voucherGenerated: false, voucherNo: "",
    approvalStatus: "Approved", paymentStatus: "Unpaid",
    attachments: [], approvalHistory: [],
    ...e,
  } as Expense;
};

const hist = (status: ApprovalStatus, who: string): ApprovalEvent[] => {
  const created: ApprovalEvent = { stage: "Created", by: who, date: "2026-06-01", state: "done" };
  if (status === "Draft") return [created];
  if (status === "Rejected") return [created, { stage: "Manager Approval", by: "Vijesh V", date: "2026-06-02", state: "rejected", note: "Missing bill" }];
  const mgr: ApprovalEvent = { stage: "Manager Approval", by: "Vijesh V", date: "2026-06-02", state: "done" };
  if (status === "Pending Approval") return [created, { stage: "Manager Approval", by: "Vijesh V", date: "", state: "pending" }];
  const acc: ApprovalEvent = { stage: "Accounts Approval", by: "Priyadharshini R", date: "2026-06-03", state: "done" };
  if (status === "Approved") return [created, mgr, acc];
  return [created, mgr, acc, { stage: "Paid", by: "Priyadharshini R", date: "2026-06-04", state: "done" }];
};

export const EXPENSES: Expense[] = [
  mk({ id: 1, date: "2026-06-01", type: "Vendor Expense", category: "Office Supplies", subCategory: "Pantry", description: "Pantry & supplies", baseAmount: 4200, vendor: "Croma Retail", paymentMode: "Cash", createdBy: "Priyadharshini R", gstApplicable: true, gstNumber: "29AABCC1234A1Z5", taxable: 4200, cgst: 378, sgst: 378, voucherGenerated: true, voucherNo: "CI/26-27/0011", approvalStatus: "Paid", paymentStatus: "Paid", invoiceNo: "INV-8841", invoiceDate: "2026-06-01", attachments: [{ name: "INV-8841.pdf", kind: "pdf" }] }),
  mk({ id: 2, date: "2026-06-02", type: "Customer Expense", category: "Travel", subCategory: "Cab / Taxi", description: "Client meeting cab", baseAmount: 1850, customer: "Tata Projects Ltd", project: "Falcon", salesOrder: "SO-2207", opportunity: "OPP-1190", createdBy: "Deepak N", approvalStatus: "Approved", attachments: [{ name: "cab.jpg", kind: "image" }] }),
  mk({ id: 3, date: "2026-06-03", type: "Employee Expense", category: "Local Conveyance", subCategory: "Bike", description: "Local travel reimbursement", baseAmount: 6400, employee: "Rahul M", claimRef: "CLM-0042", reimbursementRequired: true, createdBy: "Rahul M", approvalStatus: "Pending Approval", paymentStatus: "Unpaid" }),
  mk({ id: 4, date: "2026-06-03", type: "Customer Expense", category: "Vehicle", subCategory: "Fuel", description: "Fuel — site visit", baseAmount: 3300, customer: "Biocon Ltd", project: "Helix", salesOrder: "SO-2231", createdBy: "Rahul M", approvalStatus: "Approved" }),
  mk({ id: 5, date: "2026-06-04", type: "Vendor Expense", category: "Professional Services", subCategory: "Consultancy", description: "AMC renewal Q1", baseAmount: 75000, vendor: "Sify Technologies", paymentMode: "Bank Transfer", bankAccount: "HDFC Current", cashAccount: "", createdBy: "Priyadharshini R", gstApplicable: true, gstNumber: "29AAACS1234B1Z5", taxable: 75000, igst: 13500, approvalStatus: "Pending Approval", invoiceNo: "SIFY-220", invoiceDate: "2026-06-04", attachments: [{ name: "amc.pdf", kind: "pdf" }] }),
  mk({ id: 6, date: "2026-06-04", type: "Employee Expense", category: "Meals", subCategory: "Client Meal", description: "Client lunch claim", baseAmount: 2800, employee: "Sneha K", claimRef: "CLM-0043", advanceAdjustment: 2800, reimbursementRequired: false, createdBy: "Sneha K", approvalStatus: "Draft", paymentStatus: "Unpaid", billAvailable: false }),
  mk({ id: 7, date: "2026-06-05", type: "General Expense", category: "Communication", subCategory: "Courier", description: "Courier — tender docs", baseAmount: 980, vendor: "Blue Dart", createdBy: "Deepak N", approvalStatus: "Approved" }),
  mk({ id: 8, date: "2026-06-05", type: "General Expense", category: "Office Supplies", subCategory: "Stationery", description: "Stationery purchase", baseAmount: 1200, vendor: "Local Store", branch: "Bangalore", createdBy: "Sneha K", approvalStatus: "Rejected", paymentStatus: "Unpaid" }),
  mk({ id: 9, date: "2026-06-05", type: "Customer Expense", category: "Meals", subCategory: "Client Meal", description: "Client lunch — Wipro", baseAmount: 2800, customer: "Wipro Ltd", project: "Atlas", salesOrder: "SO-2190", branch: "Bangalore", createdBy: "Deepak N", approvalStatus: "Approved" }),
  mk({ id: 10, date: "2026-06-06", type: "Vendor Expense", category: "Professional Services", subCategory: "Audit", description: "Statutory audit fee", baseAmount: 120000, vendor: "KPMG", paymentMode: "Bank Transfer", bankAccount: "ICICI Current", cashAccount: "", createdBy: "Priyadharshini R", gstApplicable: true, gstNumber: "29AAACK5678C1Z5", taxable: 120000, cgst: 10800, sgst: 10800, approvalStatus: "Approved", invoiceNo: "KPMG-9981", invoiceDate: "2026-06-06" }),
  mk({ id: 11, date: "2026-06-06", type: "Employee Expense", category: "Travel", subCategory: "Air", description: "Flight — Chennai client visit", baseAmount: 8800, employee: "Deepak N", claimRef: "CLM-0044", reimbursementRequired: true, createdBy: "Deepak N", approvalStatus: "Pending Approval" }),
  mk({ id: 12, date: "2026-06-02", type: "General Expense", category: "Vehicle", subCategory: "Maintenance", description: "Office vehicle service", baseAmount: 5400, vendor: "Bosch Service", createdBy: "Priyadharshini R", approvalStatus: "Approved", voucherGenerated: true, voucherNo: "CI/26-27/0014" }),
].map((e) => ({ ...e, approvalHistory: hist(e.approvalStatus, e.createdBy) }));
