/**
 * Cash Book — shared types, mock data, and helpers (Phase 2, UI only).
 *
 * Mirrors the Bank Book architecture (`../bank-book/data.ts`) and re-uses its
 * money/date helpers, RBAC tiers, and source-link model so both modules stay
 * consistent. No backend/Prisma — illustrative data lives in the browser.
 * Money in ₹ (rupees), consistent with the Bank Book register.
 */

// Re-use the Bank Book primitives (single source of truth across both modules).
export {
  fmtINR, fmtINRorDash, fmtDate, fmtDateTime, todayISO, reconBadge, deriveCaps,
  SOURCE_META,
} from "../bank-book/data";
export type {
  ReconStatus, ApprovalStatus, BankCaps as CashCaps, SourceKind, SourceLink,
} from "../bank-book/data";

import type { ReconStatus, ApprovalStatus, SourceLink } from "../bank-book/data";

export const FY = "26-27";

// ── Enumerations ──────────────────────────────────────────────────────────────

export const CASH_TXN_TYPES = [
  "Opening Balance", "Cash In", "Cash Withdrawal", "Expense Payment",
  "Customer Expense", "Employee Advance", "Advance Settlement",
  "Employee Reimbursement", "Bank Transfer In", "Bank Transfer Out",
  "Cash Adjustment", "Refund", "Other",
] as const;
export type CashTxnType = (typeof CASH_TXN_TYPES)[number];

export const EXPENSE_CATEGORIES = [
  "Travel", "Meals", "Office Supplies", "Vehicle", "Communication",
  "Professional Services", "Pantry", "Other",
] as const;

export const BRANCHES = ["Head Office", "Bangalore", "Chennai"] as const;

// Which types increase cash on hand (credits).
const CREDIT_TYPES: CashTxnType[] = [
  "Opening Balance", "Cash In", "Bank Transfer In", "Advance Settlement", "Refund",
];
export const isCashCredit = (t: CashTxnType): boolean => CREDIT_TYPES.includes(t);

// ── Models ────────────────────────────────────────────────────────────────────

export interface CashAccount {
  id: string;
  name: string;        // "Cash — Head Office"
  branch: string;
  openingBalance: number;
  reservedFloat: number; // min float to keep on hand (for "available")
}

export interface CashTxn {
  id: number;
  accountId: string;
  date: string;        // ISO yyyy-mm-dd
  txnNo: string;       // CB/26-27/0001
  refNo: string;
  type: CashTxnType;
  description: string;
  category: string;    // expense category (for expense types)
  customer: string;
  project: string;
  salesOrder: string;
  vendor: string;
  employee: string;
  debit: number;       // cash out
  credit: number;      // cash in
  createdBy: string;
  recon: ReconStatus;
  approval: ApprovalStatus;
  adjusted: boolean;   // amended via a cash adjustment
  reversed: boolean;   // reversed/voided entry
  source?: SourceLink; // link to Collection / Advance / Expense
  voucherRef?: string;
  expenseRef?: string;
  bankTransferRef?: string; // paired Bank Book entry
  attachments?: { name: string }[];
  approvedBy?: string;
  approvedDate?: string;
  modifiedBy?: string;
  modifiedDate?: string;
}

export interface ReconHistoryRow {
  id: number;
  accountId: string;
  date: string;        // ISO datetime
  by: string;
  systemBalance: number;
  physicalCount: number;
  variance: number;    // physical - system
  status: "Reconciled" | "Variance Found";
  remarks: string;
}

// ── Mock cash accounts ────────────────────────────────────────────────────────

export const CASH_ACCOUNTS: CashAccount[] = [
  { id: "cash-ho",  name: "Cash — Head Office", branch: "Head Office", openingBalance: 500000, reservedFloat: 50000 },
  { id: "cash-blr", name: "Cash — Bangalore",   branch: "Bangalore",   openingBalance: 120000, reservedFloat: 20000 },
  { id: "petty",    name: "Petty Cash — HO",    branch: "Head Office", openingBalance: 25000,  reservedFloat: 5000 },
];

// ── Mock transactions ─────────────────────────────────────────────────────────

const txn = (t: Partial<CashTxn> & Pick<CashTxn, "id" | "accountId" | "date" | "type" | "description" | "debit" | "credit" | "createdBy">): CashTxn => ({
  txnNo: `CB/${FY}/${String(t.id).padStart(4, "0")}`,
  refNo: "", category: "", customer: "", project: "", salesOrder: "", vendor: "", employee: "",
  recon: "Unreconciled", approval: "Approved", adjusted: false, reversed: false,
  ...t,
});

export const CASH_TXNS: CashTxn[] = [
  txn({ id: 1,  accountId: "cash-ho", date: "2026-06-01", type: "Bank Transfer In",      description: "Cash withdrawn from HDFC Current", debit: 0,      credit: 200000, createdBy: "Priyadharshini R", refNo: "WDL-3321", recon: "Reconciled", bankTransferRef: "BB/26-27/0007", source: undefined }),
  txn({ id: 2,  accountId: "cash-ho", date: "2026-06-01", type: "Expense Payment",       description: "Office pantry & supplies",          debit: 4200,   credit: 0,      createdBy: "Priyadharshini R", category: "Pantry", vendor: "Croma Retail", refNo: "INV-8841", recon: "Reconciled", voucherRef: "CI/26-27/0011" }),
  txn({ id: 3,  accountId: "cash-ho", date: "2026-06-02", type: "Customer Expense",      description: "Client meeting — cab fare",         debit: 1850,   credit: 0,      createdBy: "Deepak N", category: "Travel", customer: "Tata Projects Ltd", project: "Falcon", salesOrder: "SO-2207", refNo: "TRP-1190" }),
  txn({ id: 4,  accountId: "cash-ho", date: "2026-06-02", type: "Advance Settlement",    description: "Unspent advance returned",          debit: 0,      credit: 15000,  createdBy: "Priyadharshini R", employee: "Rahul M", refNo: "ADV-0007", source: { kind: "advance", id: "adv-emp-7", label: "ADV-0007 · Rahul M" } }),
  txn({ id: 5,  accountId: "cash-ho", date: "2026-06-03", type: "Employee Advance",      description: "Site visit advance",                debit: 25000,  credit: 0,      createdBy: "Deepak N", employee: "Sneha K", refNo: "ADV-0009", approval: "Pending", voucherRef: "CI/26-27/0012" }),
  txn({ id: 6,  accountId: "cash-ho", date: "2026-06-03", type: "Expense Payment",       description: "Courier — tender documents",        debit: 980,    credit: 0,      createdBy: "Deepak N", category: "Communication", vendor: "Blue Dart", refNo: "CN-55210" }),
  txn({ id: 7,  accountId: "cash-ho", date: "2026-06-04", type: "Customer Expense",      description: "Fuel — site visit (Whitefield)",    debit: 3300,   credit: 0,      createdBy: "Rahul M", category: "Vehicle", customer: "Biocon Ltd", project: "Helix", salesOrder: "SO-2231", refNo: "FL-2207" }),
  txn({ id: 8,  accountId: "cash-ho", date: "2026-06-04", type: "Employee Reimbursement", description: "Reimbursement — local travel",     debit: 6400,   credit: 0,      createdBy: "Priyadharshini R", employee: "Rahul M", refNo: "EXP-0042", expenseRef: "EXP-0042", approval: "Pending" }),
  txn({ id: 9,  accountId: "cash-ho", date: "2026-06-05", type: "Bank Transfer Out",     description: "Surplus cash deposited to HDFC",    debit: 100000, credit: 0,      createdBy: "Priyadharshini R", refNo: "DEP-9921", recon: "Reconciled", bankTransferRef: "BB/26-27/0020" }),
  txn({ id: 10, accountId: "cash-ho", date: "2026-06-05", type: "Cash Adjustment",       description: "Cash count short — variance",       debit: 200,    credit: 0,      createdBy: "Priyadharshini R", refNo: "ADJ-0001", adjusted: true }),
  txn({ id: 11, accountId: "cash-ho", date: "2026-06-06", type: "Refund",               description: "Vendor refund — short delivery",    debit: 0,      credit: 1400,   createdBy: "Deepak N", vendor: "Ingram Micro", refNo: "REF-0099" }),
  txn({ id: 12, accountId: "cash-ho", date: "2026-06-06", type: "Cash In",              description: "Misc cash receipt",                 debit: 0,      credit: 5000,   createdBy: "Priyadharshini R", refNo: "RCT-0050", approval: "Pending" }),
  txn({ id: 13, accountId: "petty",   date: "2026-06-02", type: "Expense Payment",       description: "Stationery purchase",               debit: 1200,   credit: 0,      createdBy: "Sneha K", category: "Office Supplies", vendor: "Local Store" }),
  txn({ id: 14, accountId: "cash-blr", date: "2026-06-03", type: "Customer Expense",     description: "Client lunch — Wipro",              debit: 2800,   credit: 0,      createdBy: "Deepak N", category: "Meals", customer: "Wipro Ltd", project: "Atlas", salesOrder: "SO-2190" }),
];

// ── Mock reconciliation history ───────────────────────────────────────────────

export const RECON_HISTORY: ReconHistoryRow[] = [
  { id: 1, accountId: "cash-ho", date: "2026-06-03T19:10:00", by: "Priyadharshini R", systemBalance: 680000, physicalCount: 680000, variance: 0,    status: "Reconciled",     remarks: "Tallied" },
  { id: 2, accountId: "cash-ho", date: "2026-06-05T18:40:00", by: "Priyadharshini R", systemBalance: 585670, physicalCount: 585470, variance: -200, status: "Variance Found", remarks: "₹200 short — rounding on cab fare" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Running balance per cash account (chronological). Returns id → balance-after. */
export function computeCashBalances(account: CashAccount, txns: CashTxn[]): Map<number, number> {
  const m = new Map<number, number>();
  let running = account.openingBalance;
  [...txns]
    .filter((t) => t.accountId === account.id)
    .sort((a, b) => (a.date === b.date ? a.id - b.id : a.date.localeCompare(b.date)))
    .forEach((t) => { running += t.credit - t.debit; m.set(t.id, running); });
  return m;
}
