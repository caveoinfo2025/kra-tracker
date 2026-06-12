/**
 * Bank Book — shared types, mock data, and helpers (Phase 2, UI only).
 *
 * No backend/Prisma yet (finance APIs land in Phase 5+). All data here is
 * illustrative and lives in the browser. Money is in ₹ (rupees), consistent
 * with the Cash Book register.
 */

export const FY = "26-27";

// ── Enumerations ──────────────────────────────────────────────────────────────

export const TXN_TYPES = [
  "Cash Withdrawal", "Cash Deposit", "Bank Transfer", "Customer Receipt",
  "Vendor Payment", "Employee Reimbursement", "Employee Advance",
  "Expense Payment", "Interest Credit", "Bank Charges", "Refund", "Other",
] as const;
export type TxnType = (typeof TXN_TYPES)[number];

export const PAYMENT_MODES = ["NEFT", "RTGS", "IMPS", "UPI", "Cheque", "Bank Transfer", "Cash"] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export const RECON_STATUSES = ["Reconciled", "Unreconciled", "Partially Reconciled"] as const;
export type ReconStatus = (typeof RECON_STATUSES)[number];

export const APPROVAL_STATUSES = ["Approved", "Pending"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const BRANCHES = ["Head Office", "Bangalore", "Chennai"] as const;

// ── Models ────────────────────────────────────────────────────────────────────

export interface BankAccount {
  id: string;
  name: string;        // "HDFC Current"
  maskedNo: string;    // "****4521"
  branch: string;
  openingBalance: number;
  overdraftLimit: number; // for "available balance"
}

/**
 * A bank line can settle one source document elsewhere in the system:
 *  - "collection" → a customer payment against an invoice (Collection/Payment)
 *  - "advance"    → an advance received from a customer (OrderAdvance)
 *  - "expense"    → an approved expense paid by bank/card (Expense)
 */
export type SourceKind = "collection" | "advance" | "expense";
export interface SourceLink {
  kind: SourceKind;
  id: string;      // soft reference to the source record
  label: string;   // human label, e.g. "INV-2207 · Tata Projects"
}

export const SOURCE_META: Record<SourceKind, { label: string; badge: string }> = {
  collection: { label: "Collection", badge: "badge-success" },
  advance:    { label: "Advance",    badge: "badge-info" },
  expense:    { label: "Expense",    badge: "badge-warning" },
};

export interface BankTxn {
  id: number;
  accountId: string;
  date: string;        // ISO yyyy-mm-dd
  txnNo: string;       // BB/26-27/0001
  refNo: string;
  type: TxnType;
  description: string;
  party: string;       // customer / vendor / employee name
  partyKind: "customer" | "vendor" | "employee" | "";
  mode: PaymentMode;
  debit: number;       // money out of the bank
  credit: number;      // money into the bank
  createdBy: string;
  recon: ReconStatus;
  approval: ApprovalStatus;
  imported: boolean;
  importRef?: string;
  attachments?: { name: string }[];
  voucherRef?: string;
  expenseRef?: string;
  source?: SourceLink; // ← link to Collection / Advance / Expense
  approvedBy?: string;
  modifiedBy?: string;
}

// ── Linkable source documents (mock, would come from existing tables) ─────────

export interface OpenCollection { id: string; invoiceNo: string; customer: string; amount: number; dueDate: string; }
export interface CustomerAdvance { id: string; ref: string; customer: string; amount: number; }
export interface PayableExpense { id: string; expenseNo: string; vendor: string; amount: number; mode: string; category: string; }

/** Unpaid / partially-paid invoices awaiting a customer receipt. */
export const OPEN_COLLECTIONS: OpenCollection[] = [
  { id: "col-1", invoiceNo: "INV-2207", customer: "Tata Projects Ltd", amount: 450000, dueDate: "2026-06-10" },
  { id: "col-2", invoiceNo: "INV-2231", customer: "Biocon Ltd",        amount: 318000, dueDate: "2026-06-14" },
  { id: "col-3", invoiceNo: "INV-2240", customer: "L&T Construction",  amount: 612500, dueDate: "2026-06-20" },
  { id: "col-4", invoiceNo: "INV-2190", customer: "Wipro Ltd",         amount: 310000, dueDate: "2026-06-08" },
];

/** Advances received against customers/orders, not yet applied to an invoice. */
export const CUSTOMER_ADVANCES: CustomerAdvance[] = [
  { id: "adv-1", ref: "ADV-0021", customer: "Infosys BPM",   amount: 275000 },
  { id: "adv-2", ref: "ADV-0022", customer: "Embassy Group", amount: 150000 },
];

/** Approved expenses awaiting payment by bank / card. */
export const PAYABLE_EXPENSES: PayableExpense[] = [
  { id: "exp-1", expenseNo: "EXP-0051", vendor: "Croma Retail",      amount: 128400, mode: "RTGS",  category: "Office Supplies" },
  { id: "exp-2", expenseNo: "EXP-0052", vendor: "Amazon Web Services", amount: 162000, mode: "RTGS", category: "Professional Services" },
  { id: "exp-3", expenseNo: "EXP-0053", vendor: "Sify Technologies", amount: 75000,  mode: "Cheque", category: "Professional Services" },
];

export interface ImportHistoryRow {
  id: number;
  fileName: string;
  importedBy: string;
  importedAt: string;  // ISO datetime
  added: number;
  updated: number;
  amended: number;
  status: "Completed" | "Partial" | "Failed";
}

// ── Capabilities (RBAC) ───────────────────────────────────────────────────────

export interface BankCaps {
  roleLabel: string;
  canAdd: boolean;
  canEdit: boolean;
  canImport: boolean;
  canApproveRecon: boolean;
  branchOnly: boolean;
}

export function deriveCaps(f: { isManager: boolean; isAccounts: boolean; isOpsHead: boolean }): BankCaps {
  if (f.isOpsHead) {
    return { roleLabel: "Accounts Admin", canAdd: true, canEdit: true, canImport: true, canApproveRecon: true, branchOnly: false };
  }
  if (f.isAccounts) {
    return { roleLabel: "Accounts Team", canAdd: true, canEdit: true, canImport: true, canApproveRecon: false, branchOnly: false };
  }
  if (f.isManager) {
    return { roleLabel: "Manager", canAdd: false, canEdit: false, canImport: false, canApproveRecon: true, branchOnly: false };
  }
  return { roleLabel: "Branch User", canAdd: false, canEdit: false, canImport: false, canApproveRecon: false, branchOnly: true };
}

// ── Mock accounts ─────────────────────────────────────────────────────────────

export const BANK_ACCOUNTS: BankAccount[] = [
  { id: "hdfc",  name: "HDFC Current",  maskedNo: "****4521", branch: "Head Office", openingBalance: 1850000, overdraftLimit: 500000 },
  { id: "icici", name: "ICICI Current", maskedNo: "****8830", branch: "Bangalore",   openingBalance: 920000,  overdraftLimit: 300000 },
  { id: "axis",  name: "Axis Current",  maskedNo: "****1207", branch: "Chennai",     openingBalance: 480000,  overdraftLimit: 200000 },
];

// ── Mock transactions ─────────────────────────────────────────────────────────

export const BANK_TXNS: BankTxn[] = [
  { id: 1,  accountId: "hdfc",  date: "2026-06-01", txnNo: "BB/26-27/0001", refNo: "NEFT-558210", type: "Customer Receipt",       description: "Invoice INV-2207 settlement",      party: "Tata Projects Ltd", partyKind: "customer", mode: "NEFT",   debit: 0,      credit: 450000, createdBy: "Priyadharshini R", recon: "Reconciled",            approval: "Approved", imported: false, voucherRef: "CI/26-27/0009", attachments: [{ name: "INV-2207.pdf" }], source: { kind: "collection", id: "col-1", label: "INV-2207 · Tata Projects Ltd" } },
  { id: 2,  accountId: "hdfc",  date: "2026-06-02", txnNo: "BB/26-27/0002", refNo: "RTGS-771902", type: "Vendor Payment",          description: "Hardware procurement — Croma",     party: "Croma Retail",      partyKind: "vendor",   mode: "RTGS",   debit: 128400, credit: 0,      createdBy: "Priyadharshini R", recon: "Reconciled",            approval: "Approved", imported: true,  importRef: "STMT-0601", voucherRef: "CI/26-27/0010", source: { kind: "expense", id: "exp-1", label: "EXP-0051 · Croma Retail" } },
  { id: 3,  accountId: "hdfc",  date: "2026-06-03", txnNo: "BB/26-27/0003", refNo: "CHQ-009912",  type: "Vendor Payment",          description: "AMC renewal — Q1",                 party: "Sify Technologies", partyKind: "vendor",   mode: "Cheque", debit: 75000,  credit: 0,      createdBy: "Deepak N",         recon: "Unreconciled",          approval: "Pending",  imported: false },
  { id: 4,  accountId: "hdfc",  date: "2026-06-03", txnNo: "BB/26-27/0004", refNo: "IMPS-330021", type: "Employee Reimbursement",  description: "Travel claim — June",              party: "Rahul M",           partyKind: "employee", mode: "IMPS",   debit: 18500,  credit: 0,      createdBy: "Priyadharshini R", recon: "Unreconciled",          approval: "Approved", imported: false, expenseRef: "EXP-0042" },
  { id: 5,  accountId: "hdfc",  date: "2026-06-04", txnNo: "BB/26-27/0005", refNo: "INT-JUN26",   type: "Interest Credit",         description: "Savings interest credit",          party: "HDFC Bank",         partyKind: "",         mode: "Bank Transfer", debit: 0, credit: 3120, createdBy: "System",          recon: "Reconciled",            approval: "Approved", imported: true,  importRef: "STMT-0601" },
  { id: 6,  accountId: "hdfc",  date: "2026-06-05", txnNo: "BB/26-27/0006", refNo: "CHG-JUN26",   type: "Bank Charges",            description: "RTGS & processing charges",        party: "HDFC Bank",         partyKind: "",         mode: "Bank Transfer", debit: 590, credit: 0, createdBy: "System",          recon: "Reconciled",            approval: "Approved", imported: true,  importRef: "STMT-0601" },
  { id: 7,  accountId: "hdfc",  date: "2026-06-05", txnNo: "BB/26-27/0007", refNo: "UPI-882201",  type: "Cash Withdrawal",         description: "Petty cash top-up",                party: "Cash — HO",         partyKind: "",         mode: "UPI",    debit: 50000,  credit: 0,      createdBy: "Priyadharshini R", recon: "Partially Reconciled",  approval: "Approved", imported: false },
  { id: 8,  accountId: "hdfc",  date: "2026-06-06", txnNo: "BB/26-27/0008", refNo: "NEFT-559930", type: "Customer Receipt",        description: "Advance — project Falcon",         party: "Infosys BPM",       partyKind: "customer", mode: "NEFT",   debit: 0,      credit: 275000, createdBy: "Deepak N",         recon: "Unreconciled",          approval: "Pending",  imported: false, source: { kind: "advance", id: "adv-1", label: "ADV-0021 · Infosys BPM" } },
  { id: 9,  accountId: "icici", date: "2026-06-02", txnNo: "BB/26-27/0009", refNo: "NEFT-220114", type: "Customer Receipt",        description: "Invoice INV-2190 settlement",      party: "Wipro Ltd",         partyKind: "customer", mode: "NEFT",   debit: 0,      credit: 310000, createdBy: "Priyadharshini R", recon: "Reconciled",            approval: "Approved", imported: true,  importRef: "STMT-ICICI-06" },
  { id: 10, accountId: "icici", date: "2026-06-04", txnNo: "BB/26-27/0010", refNo: "RTGS-220880", type: "Vendor Payment",          description: "Cloud subscription — annual",      party: "Amazon Web Services", partyKind: "vendor", mode: "RTGS",   debit: 162000, credit: 0,      createdBy: "Priyadharshini R", recon: "Unreconciled",          approval: "Approved", imported: false },
  { id: 11, accountId: "icici", date: "2026-06-05", txnNo: "BB/26-27/0011", refNo: "IMPS-221190", type: "Employee Advance",        description: "Site visit advance",               party: "Sneha K",           partyKind: "employee", mode: "IMPS",   debit: 25000,  credit: 0,      createdBy: "Deepak N",         recon: "Unreconciled",          approval: "Pending",  imported: false },
  { id: 12, accountId: "icici", date: "2026-06-06", txnNo: "BB/26-27/0012", refNo: "REF-009921",  type: "Refund",                  description: "Vendor refund — short delivery",   party: "Ingram Micro",      partyKind: "vendor",   mode: "NEFT",   debit: 0,      credit: 14200,  createdBy: "Priyadharshini R", recon: "Unreconciled",          approval: "Approved", imported: false },
  { id: 13, accountId: "axis",  date: "2026-06-03", txnNo: "BB/26-27/0013", refNo: "TRF-330012",  type: "Bank Transfer",           description: "Inter-account transfer to HDFC",   party: "HDFC Current",      partyKind: "",         mode: "Bank Transfer", debit: 200000, credit: 0, createdBy: "Priyadharshini R", recon: "Reconciled",   approval: "Approved", imported: false },
  { id: 14, accountId: "axis",  date: "2026-06-05", txnNo: "BB/26-27/0014", refNo: "CASH-0099",   type: "Cash Deposit",            description: "Branch cash deposit",              party: "Cash — Chennai",    partyKind: "",         mode: "Cash",   debit: 0,      credit: 90000,  createdBy: "Deepak N",         recon: "Unreconciled",          approval: "Pending",  imported: false },
];

// ── Mock import history ───────────────────────────────────────────────────────

export const IMPORT_HISTORY: ImportHistoryRow[] = [
  { id: 1, fileName: "HDFC_Statement_Jun01.csv",  importedBy: "Priyadharshini R", importedAt: "2026-06-01T18:22:00", added: 3, updated: 1, amended: 0, status: "Completed" },
  { id: 2, fileName: "ICICI_Statement_Jun.xlsx",  importedBy: "Priyadharshini R", importedAt: "2026-06-04T11:05:00", added: 1, updated: 2, amended: 1, status: "Partial" },
];

// ── API response types (Step 2B wiring) ──────────────────────────────────────

export interface ApiAccount {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  branchId: string;
  branchName: string;
  bankName: string;
  accountNo: string;
  ifscCode: string;
  accountHolder: string;
  openingBalance: string;   // ₹ Lakhs, e.g. "18.50"
  currentBalance: string;   // ₹ Lakhs
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiTransaction {
  id: string;
  transactionDate: string;  // YYYY-MM-DD
  transactionNumber: string;
  referenceNumber: string;
  transactionType: string;
  description: string;
  partyName: string;
  paymentMode: string;
  debit: string;            // ₹ Lakhs, e.g. "1.28"
  credit: string;           // ₹ Lakhs
  runningBalance: string;   // ₹ Lakhs
  createdBy: string;
  status: string;           // "RECONCILED" | "UNRECONCILED"
  voucherRef: string | null;
  createdAt: string;
}

export interface ApiSummary {
  openingBalance: string;
  totalCredits: string;
  totalDebits: string;
  closingBalance: string;
}

export interface ApiPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export const fmtINR = (n: number) =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export const fmtINRorDash = (n: number) => (n === 0 ? "—" : fmtINR(n));

/** Convert an API ₹-Lakhs string to ₹ rupees display string. */
export function fmtINRfromLakhs(s: string): string {
  const rupees = Math.round((parseFloat(s) || 0) * 100000 * 100) / 100;
  return fmtINR(rupees);
}

/** Convert an API ₹-Lakhs string to a rupees number for legacy components. */
export function lakhsToRupees(s: string): number {
  return Math.round((parseFloat(s) || 0) * 100000 * 100) / 100;
}

/** Map an ApiAccount to the legacy BankAccount shape used by existing components. */
export function mapApiBankAccount(a: ApiAccount): BankAccount {
  return {
    id: a.id,
    name: a.accountName,
    maskedNo: a.bankName ? `(${a.bankName})` : "",
    branch: a.branchName,
    openingBalance: lakhsToRupees(a.openingBalance),
    overdraftLimit: 0,
  };
}

/** Map an ApiTransaction to the legacy BankTxn shape used by existing components. */
export function mapApiTransaction(t: ApiTransaction, accountId: string): BankTxn {
  return {
    id: parseInt(t.id, 10),
    accountId,
    date: t.transactionDate,
    txnNo: t.transactionNumber,
    refNo: t.referenceNumber,
    type: t.transactionType as TxnType,
    description: t.description,
    party: t.partyName,
    partyKind: "",
    mode: t.paymentMode as PaymentMode,
    debit: lakhsToRupees(t.debit),
    credit: lakhsToRupees(t.credit),
    createdBy: t.createdBy,
    recon: (t.status === "RECONCILED" ? "Reconciled" : "Unreconciled") as ReconStatus,
    approval: "Approved",
    imported: false,
    voucherRef: t.voucherRef ?? undefined,
  };
}

export const fmtDate = (iso: string) =>
  new Date(iso + (iso.length === 10 ? "T00:00:00" : "")).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "2-digit",
  });

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export const todayISO = () => new Date().toISOString().slice(0, 10);

/** Reconciliation status → badge class. */
export const reconBadge = (s: ReconStatus): string =>
  s === "Reconciled" ? "badge-success" : s === "Partially Reconciled" ? "badge-warning" : "badge-neutral";

/** Credit types get a green tint; debit types red — used for the type chip. */
export const isCreditType = (t: TxnType): boolean =>
  ["Cash Deposit", "Customer Receipt", "Interest Credit", "Refund"].includes(t);

/**
 * Compute a chronological running balance per account.
 * Returns a Map of txn.id → balance-after.
 */
export function computeBalances(account: BankAccount, txns: BankTxn[]): Map<number, number> {
  const m = new Map<number, number>();
  let running = account.openingBalance;
  [...txns]
    .filter((t) => t.accountId === account.id)
    .sort((a, b) => (a.date === b.date ? a.id - b.id : a.date.localeCompare(b.date)))
    .forEach((t) => { running += t.credit - t.debit; m.set(t.id, running); });
  return m;
}
