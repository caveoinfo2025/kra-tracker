/**
 * Vendor Master — global CRM master data (UI-only, mock data).
 * Referenced by Finance, Expense, Procurement, Inventory, Projects, Support, AMC, Assets, Tally.
 * No backend/Prisma changes this session — shapes defined here are the backend contract.
 */

// ── Enumerations ──────────────────────────────────────────────────────────────

export const VENDOR_TYPES = [
  "Manufacturer", "Distributor", "Supplier", "Service Provider",
  "Contractor", "Consultant", "Freelancer", "Utility Provider",
] as const;
export type VendorType = (typeof VENDOR_TYPES)[number];

export const COMPANY_TYPES = [
  "Proprietorship", "Partnership", "LLP", "Private Limited", "Public Limited",
] as const;
export type CompanyType = (typeof COMPANY_TYPES)[number];

export const VENDOR_STATUSES = ["Active", "Inactive", "Pending Verification"] as const;
export type VendorStatus = (typeof VENDOR_STATUSES)[number];

export const ADDRESS_TYPES = [
  "Registered Office", "Branch Office", "Warehouse", "Service Location",
] as const;
export type AddressType = (typeof ADDRESS_TYPES)[number];

export const GST_STATUSES = ["Verified", "Not Verified", "Invalid"] as const;
export type GSTStatus = (typeof GST_STATUSES)[number];

export const CONTACT_TYPES = ["Sales", "Accounts", "Support", "Management"] as const;
export type ContactType = (typeof CONTACT_TYPES)[number];

export const ACCOUNT_TYPES = ["Current", "Savings", "Cash Credit"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const DOC_TYPES = [
  "GST Certificate", "PAN", "MSME Certificate", "Agreement", "Bank Proof", "Other",
] as const;
export type DocType = (typeof DOC_TYPES)[number];

export const VERIFICATION_STATUSES = ["Verified", "Pending", "Failed"] as const;

export const BUSINESS_CATEGORIES = [
  "IT Infrastructure", "IT Security", "Networking", "Cloud Services", "Software",
  "Hardware", "Courier & Logistics", "Professional Services", "Electrical & Civil",
  "Utilities", "Office Supplies", "Maintenance", "Other",
] as const;

// ── GST State Code Map (complete India) ───────────────────────────────────────

export const GST_STATE_CODES: Record<string, string> = {
  "01": "Jammu & Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra & Nagar Haveli and Daman & Diu",
  "27": "Maharashtra",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman & Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
  "97": "Other Territory",
  "99": "Centre Jurisdiction",
};

// Reverse map: state name → code
export const STATE_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(GST_STATE_CODES).map(([code, state]) => [state, code])
);

export const STATE_NAMES = Object.values(GST_STATE_CODES);

// ── GSTIN Validator ───────────────────────────────────────────────────────────

export interface GSTINValidation {
  valid: boolean;
  stateCode: string;
  stateName: string;
  warning?: string;
  error?: string;
}

export function validateGSTIN(gstin: string, branchStateCode?: string): GSTINValidation {
  const cleaned = gstin.trim().toUpperCase();
  // Format: 15 alphanumeric chars, first 2 digits = state code
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!cleaned) return { valid: false, stateCode: "", stateName: "", error: "GSTIN is required" };
  if (cleaned.length !== 15) return { valid: false, stateCode: "", stateName: "", error: `GSTIN must be 15 characters (got ${cleaned.length})` };
  if (!regex.test(cleaned)) return { valid: false, stateCode: "", stateName: "", error: "Invalid GSTIN format. Expected: 33ABCDE1234F1Z5" };
  const stateCode = cleaned.slice(0, 2);
  const stateName = GST_STATE_CODES[stateCode] ?? "Unknown State";
  let warning: string | undefined;
  if (branchStateCode && branchStateCode !== stateCode) {
    warning = `GST state code (${stateCode} — ${stateName}) does not match branch state (${branchStateCode} — ${GST_STATE_CODES[branchStateCode] ?? branchStateCode})`;
  }
  return { valid: true, stateCode, stateName, warning };
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VendorBranch {
  id: number;
  branchName: string;
  addressType: AddressType;
  address: string;
  city: string;
  state: string;
  stateCode: string;
  country: string;
  pinCode: string;
  contactPerson: string;
  phone: string;
  email: string;
  isPrimary: boolean;
  // GST
  gstRegistered: boolean;
  gstin: string;
  gstLegalName: string;
  gstStatus: GSTStatus;
  // Tally
  gstLedgerMapping: string;
}

export interface VendorContact {
  id: number;
  name: string;
  designation: string;
  department: string;
  mobile: string;
  email: string;
  contactType: ContactType;
  isPrimary: boolean;
}

export interface VendorBankAccount {
  id: number;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  branch: string;
  accountType: AccountType;
  linkedBranchId: number | null;
  isPrimary: boolean;
  verificationStatus: "Verified" | "Pending" | "Failed";
}

export interface VendorDocument {
  id: number;
  docType: DocType;
  fileName: string;
  fileType: "pdf" | "image";
  uploadedBy: string;
  uploadedAt: string;
  expiryDate?: string;
  size: string;
}

export interface VendorAuditEntry {
  action: string;
  by: string;
  at: string;
  field?: string;
  oldVal?: string;
  newVal?: string;
}

export interface Vendor {
  id: number;
  vendorCode: string;         // VEN-0001
  legalName: string;
  tradeName: string;
  vendorType: VendorType;
  businessCategory: string;
  status: VendorStatus;
  // Registration
  pan: string;
  msmeRegistered: boolean;
  msmeNumber: string;
  companyType: CompanyType;
  // Relations
  branches: VendorBranch[];
  contacts: VendorContact[];
  bankAccounts: VendorBankAccount[];
  documents: VendorDocument[];
  // Tally
  tallyLedger: string;
  // Audit
  createdBy: string;
  createdAt: string;
  modifiedBy?: string;
  modifiedAt?: string;
  auditHistory: VendorAuditEntry[];
}

// ── RBAC ─────────────────────────────────────────────────────────────────────

export interface VendorCaps {
  roleLabel: string;
  canCreate: boolean;
  canEdit: boolean;
  canDisable: boolean;
  canManageBank: boolean;
  canManageGST: boolean;
  canViewFinance: boolean;
  canExport: boolean;
}

// TODO: Migrate button-level capability checks to access-control actions after page guard migration.
export function deriveVendorCaps(f: {
  isManager: boolean;
  isAccounts: boolean;
  isOpsHead: boolean;
}): VendorCaps {
  if (f.isOpsHead)
    return { roleLabel: "Accounts Admin", canCreate: true, canEdit: true, canDisable: true, canManageBank: true, canManageGST: true, canViewFinance: true, canExport: true };
  if (f.isAccounts)
    return { roleLabel: "Accounts Team", canCreate: false, canEdit: true, canDisable: false, canManageBank: true, canManageGST: true, canViewFinance: true, canExport: true };
  if (f.isManager)
    return { roleLabel: "Manager", canCreate: true, canEdit: true, canDisable: true, canManageBank: false, canManageGST: false, canViewFinance: true, canExport: true };
  return { roleLabel: "Staff", canCreate: false, canEdit: false, canDisable: false, canManageBank: false, canManageGST: false, canViewFinance: false, canExport: false };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function fmtDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
export function todayISO(): string { return new Date().toISOString().slice(0, 10); }
export function nextVendorCode(vendors: Vendor[]): string {
  const max = vendors.reduce((m, v) => {
    const n = parseInt(v.vendorCode.replace("VEN-", "")) || 0;
    return n > m ? n : m;
  }, 0);
  return `VEN-${String(max + 1).padStart(4, "0")}`;
}

export function vendorStats(vendors: Vendor[]) {
  const gstCount = vendors.filter((v) => v.branches.some((b) => b.gstRegistered)).length;
  const multiBranch = vendors.filter((v) => v.branches.length > 1).length;
  const msme = vendors.filter((v) => v.msmeRegistered).length;
  const pending = vendors.filter((v) => v.status === "Pending Verification").length;
  return {
    total: vendors.length,
    active: vendors.filter((v) => v.status === "Active").length,
    gstRegistered: gstCount,
    multiBranch,
    msme,
    pendingVerification: pending,
  };
}

export function primaryBranch(v: Vendor): VendorBranch | undefined {
  return v.branches.find((b) => b.isPrimary) ?? v.branches[0];
}
export function primaryContact(v: Vendor): VendorContact | undefined {
  return v.contacts.find((c) => c.isPrimary) ?? v.contacts[0];
}
export function allGSTINs(v: Vendor): VendorBranch[] {
  return v.branches.filter((b) => b.gstRegistered && b.gstin);
}

export function statusBadge(s: VendorStatus): string {
  return s === "Active" ? "badge-success" : s === "Pending Verification" ? "badge-warning" : "badge-neutral";
}
export function gstStatusBadge(s: GSTStatus): string {
  return s === "Verified" ? "badge-success" : s === "Invalid" ? "badge-danger" : "badge-neutral";
}
export function verifyBadge(s: string): string {
  return s === "Verified" ? "badge-success" : s === "Failed" ? "badge-danger" : "badge-neutral";
}

// ── Mock Data ─────────────────────────────────────────────────────────────────

const mkBranch = (b: Partial<VendorBranch> & Pick<VendorBranch, "id" | "branchName" | "city" | "state" | "stateCode">): VendorBranch => ({
  addressType: "Registered Office", address: "123, Industrial Area", country: "India",
  pinCode: "600001", contactPerson: "", phone: "", email: "", isPrimary: true,
  gstRegistered: false, gstin: "", gstLegalName: "", gstStatus: "Not Verified", gstLedgerMapping: "",
  ...b,
});

const mkContact = (c: Partial<VendorContact> & Pick<VendorContact, "id" | "name" | "mobile">): VendorContact => ({
  designation: "", department: "", email: "", contactType: "Sales", isPrimary: false, ...c,
});

const mkBank = (b: Partial<VendorBankAccount> & Pick<VendorBankAccount, "id" | "bankName" | "accountNumber" | "ifsc">): VendorBankAccount => ({
  accountHolderName: "", branch: "", accountType: "Current", linkedBranchId: null,
  isPrimary: true, verificationStatus: "Verified", ...b,
});

export const VENDORS: Vendor[] = [
  {
    id: 1, vendorCode: "VEN-0001", legalName: "Sify Technologies Limited",
    tradeName: "Sify Technologies", vendorType: "Service Provider",
    businessCategory: "IT Infrastructure", status: "Active",
    pan: "AAICS0892Q", msmeRegistered: false, msmeNumber: "", companyType: "Public Limited",
    tallyLedger: "Sify Technologies Ltd",
    branches: [
      mkBranch({ id: 1, branchName: "Chennai HQ", city: "Chennai", state: "Tamil Nadu", stateCode: "33", address: "No.2 Rayala Towers, Anna Salai", pinCode: "600002", isPrimary: true, gstRegistered: true, gstin: "33AAICS0892Q1ZM", gstLegalName: "Sify Technologies Limited", gstStatus: "Verified", gstLedgerMapping: "GST Input - Services 18%", contactPerson: "Rajesh Kumar", phone: "9876543210", email: "chennai@sify.com" }),
      mkBranch({ id: 2, branchName: "Bangalore Branch", city: "Bangalore", state: "Karnataka", stateCode: "29", address: "RMZ Infinity, Old Madras Road", pinCode: "560016", isPrimary: false, addressType: "Branch Office", gstRegistered: true, gstin: "29AAICS0892Q1ZO", gstLegalName: "Sify Technologies Limited", gstStatus: "Verified", gstLedgerMapping: "GST Input - Services 18%", contactPerson: "Priya Nair", phone: "9988776655", email: "blr@sify.com" }),
    ],
    contacts: [
      mkContact({ id: 1, name: "Rajesh Kumar", designation: "Account Manager", department: "Sales", mobile: "9876543210", email: "rajesh.k@sify.com", contactType: "Sales", isPrimary: true }),
      mkContact({ id: 2, name: "Santhosh V", designation: "Finance", department: "Accounts", mobile: "9876543211", email: "accounts@sify.com", contactType: "Accounts" }),
    ],
    bankAccounts: [mkBank({ id: 1, accountHolderName: "Sify Technologies Limited", bankName: "HDFC Bank", accountNumber: "****4521", ifsc: "HDFC0001234", branch: "Anna Salai Branch" })],
    documents: [
      { id: 1, docType: "GST Certificate", fileName: "Sify_GST_TN.pdf", fileType: "pdf", uploadedBy: "Priyadharshini R", uploadedAt: "2026-06-01", size: "245 KB" },
      { id: 2, docType: "PAN", fileName: "Sify_PAN.pdf", fileType: "pdf", uploadedBy: "Priyadharshini R", uploadedAt: "2026-06-01", size: "180 KB" },
    ],
    createdBy: "Priyadharshini R", createdAt: "2026-06-01",
    auditHistory: [{ action: "Created", by: "Priyadharshini R", at: "2026-06-01" }],
  },
  {
    id: 2, vendorCode: "VEN-0002", legalName: "Blue Dart Express Limited",
    tradeName: "Blue Dart", vendorType: "Supplier",
    businessCategory: "Courier & Logistics", status: "Active",
    pan: "AABCB8872R", msmeRegistered: false, msmeNumber: "", companyType: "Public Limited",
    tallyLedger: "Blue Dart Express Ltd",
    branches: [mkBranch({ id: 3, branchName: "Mumbai HQ", city: "Mumbai", state: "Maharashtra", stateCode: "27", address: "Blue Dart Centre, Sahar Airport Road", pinCode: "400099", isPrimary: true, gstRegistered: true, gstin: "27AABCB8872R1ZK", gstLegalName: "Blue Dart Express Limited", gstStatus: "Verified", gstLedgerMapping: "GST Input - Services 18%", contactPerson: "Rohan Shah", phone: "9001234567", email: "rohan.shah@bluedart.com" })],
    contacts: [mkContact({ id: 3, name: "Rohan Shah", designation: "Key Account Manager", department: "Sales", mobile: "9001234567", email: "rohan.shah@bluedart.com", contactType: "Sales", isPrimary: true })],
    bankAccounts: [mkBank({ id: 2, accountHolderName: "Blue Dart Express Ltd", bankName: "ICICI Bank", accountNumber: "****8832", ifsc: "ICIC0000521", branch: "Andheri Branch" })],
    documents: [{ id: 3, docType: "Agreement", fileName: "BD_Service_Agreement.pdf", fileType: "pdf", uploadedBy: "Vijesh V", uploadedAt: "2026-05-15", expiryDate: "2027-05-14", size: "512 KB" }],
    createdBy: "Vijesh V", createdAt: "2026-05-15",
    auditHistory: [{ action: "Created", by: "Vijesh V", at: "2026-05-15" }],
  },
  {
    id: 3, vendorCode: "VEN-0003", legalName: "KPMG Advisory LLP",
    tradeName: "KPMG", vendorType: "Consultant",
    businessCategory: "Professional Services", status: "Active",
    pan: "AAACK5678C", msmeRegistered: false, msmeNumber: "", companyType: "LLP",
    tallyLedger: "KPMG Advisory LLP",
    branches: [
      mkBranch({ id: 4, branchName: "Delhi Office", city: "New Delhi", state: "Delhi", stateCode: "07", address: "DLF Building 10, Cyber City, Gurugram", pinCode: "122002", isPrimary: true, gstRegistered: true, gstin: "07AAACK5678C1ZV", gstLegalName: "KPMG Advisory LLP", gstStatus: "Verified", gstLedgerMapping: "GST Input - Services 18%", contactPerson: "Anita Sharma", phone: "9111222333", email: "anita.s@kpmg.com" }),
      mkBranch({ id: 5, branchName: "Bangalore Office", city: "Bangalore", state: "Karnataka", stateCode: "29", address: "Prestige Shantiniketan, ITPL Road", pinCode: "560037", isPrimary: false, addressType: "Branch Office", gstRegistered: true, gstin: "29AAACK5678C1ZX", gstLegalName: "KPMG Advisory LLP", gstStatus: "Verified", gstLedgerMapping: "GST Input - Services 18%", contactPerson: "Vivek Rao", phone: "9822344556", email: "vivek.r@kpmg.com" }),
    ],
    contacts: [
      mkContact({ id: 4, name: "Anita Sharma", designation: "Partner", department: "Audit", mobile: "9111222333", email: "anita.s@kpmg.com", contactType: "Management", isPrimary: true }),
      mkContact({ id: 5, name: "Ramesh B", designation: "Senior Manager", department: "Accounts", mobile: "9822344557", email: "ramesh.b@kpmg.com", contactType: "Accounts" }),
    ],
    bankAccounts: [mkBank({ id: 3, accountHolderName: "KPMG Advisory LLP", bankName: "Axis Bank", accountNumber: "****9981", ifsc: "UTIB0001234", branch: "Cyber City Branch" })],
    documents: [{ id: 4, docType: "Agreement", fileName: "KPMG_Audit_Agreement.pdf", fileType: "pdf", uploadedBy: "Priyadharshini R", uploadedAt: "2026-04-01", expiryDate: "2027-03-31", size: "890 KB" }],
    createdBy: "Priyadharshini R", createdAt: "2026-04-01",
    auditHistory: [{ action: "Created", by: "Priyadharshini R", at: "2026-04-01" }],
  },
  {
    id: 4, vendorCode: "VEN-0004", legalName: "Croma Retail India Limited",
    tradeName: "Croma", vendorType: "Distributor",
    businessCategory: "Hardware", status: "Active",
    pan: "AABCC1234A", msmeRegistered: false, msmeNumber: "", companyType: "Private Limited",
    tallyLedger: "Croma Retail",
    branches: [mkBranch({ id: 6, branchName: "Chennai Branch", city: "Chennai", state: "Tamil Nadu", stateCode: "33", address: "4/60 Chennai One IT SEZ, Thoraipakkam", pinCode: "600097", isPrimary: true, gstRegistered: true, gstin: "33AABCC1234A1Z5", gstLegalName: "Croma Retail India Limited", gstStatus: "Verified", gstLedgerMapping: "GST Input - Goods 18%", contactPerson: "Suresh P", phone: "9444122233", email: "suresh.p@croma.com" })],
    contacts: [mkContact({ id: 6, name: "Suresh P", designation: "Sales Executive", department: "Sales", mobile: "9444122233", email: "suresh.p@croma.com", contactType: "Sales", isPrimary: true })],
    bankAccounts: [mkBank({ id: 4, accountHolderName: "Croma Retail India Ltd", bankName: "SBI", accountNumber: "****7763", ifsc: "SBIN0001122", branch: "T Nagar Branch" })],
    documents: [],
    createdBy: "Vijesh V", createdAt: "2026-05-20",
    auditHistory: [{ action: "Created", by: "Vijesh V", at: "2026-05-20" }],
  },
  {
    id: 5, vendorCode: "VEN-0005", legalName: "Robert Bosch Engineering and Business Solutions",
    tradeName: "Bosch Service", vendorType: "Service Provider",
    businessCategory: "Maintenance", status: "Active",
    pan: "AAACR3628K", msmeRegistered: false, msmeNumber: "", companyType: "Private Limited",
    tallyLedger: "Bosch Service Center",
    branches: [mkBranch({ id: 7, branchName: "Chennai Service Centre", city: "Chennai", state: "Tamil Nadu", stateCode: "33", address: "6 GST Road, Chromepet", pinCode: "600044", isPrimary: true, gstRegistered: true, gstin: "33AAACR3628K1ZG", gstLegalName: "Robert Bosch Engineering", gstStatus: "Verified", gstLedgerMapping: "GST Input - Services 18%", contactPerson: "Arun M", phone: "9345678901", email: "arun.m@bosch.com" })],
    contacts: [mkContact({ id: 7, name: "Arun M", designation: "Service Manager", department: "Operations", mobile: "9345678901", email: "arun.m@bosch.com", contactType: "Support", isPrimary: true })],
    bankAccounts: [mkBank({ id: 5, accountHolderName: "Robert Bosch Eng.", bankName: "Deutsche Bank", accountNumber: "****3312", ifsc: "DEUT0784CHE", branch: "Chennai Branch" })],
    documents: [],
    createdBy: "Priyadharshini R", createdAt: "2026-05-22",
    auditHistory: [{ action: "Created", by: "Priyadharshini R", at: "2026-05-22" }],
  },
  {
    id: 6, vendorCode: "VEN-0006", legalName: "IT Zone Solutions",
    tradeName: "IT Zone", vendorType: "Supplier",
    businessCategory: "IT Infrastructure", status: "Active",
    pan: "AABCI9012P", msmeRegistered: true, msmeNumber: "UDYAM-KA-12-0034567", companyType: "Proprietorship",
    tallyLedger: "IT Zone Solutions",
    branches: [mkBranch({ id: 8, branchName: "Bangalore Office", city: "Bangalore", state: "Karnataka", stateCode: "29", address: "HSR Layout, Sector 6", pinCode: "560102", isPrimary: true, gstRegistered: true, gstin: "29AABCI9012P1ZQ", gstLegalName: "IT Zone Solutions", gstStatus: "Verified", gstLedgerMapping: "GST Input - Goods 18%", contactPerson: "Karthik S", phone: "9731234567", email: "karthik@itzonesolns.com" })],
    contacts: [mkContact({ id: 8, name: "Karthik S", designation: "Proprietor", department: "", mobile: "9731234567", email: "karthik@itzonesolns.com", contactType: "Management", isPrimary: true })],
    bankAccounts: [mkBank({ id: 6, accountHolderName: "IT Zone Solutions", bankName: "Canara Bank", accountNumber: "****2211", ifsc: "CNRB0001544", branch: "HSR Layout" })],
    documents: [{ id: 5, docType: "MSME Certificate", fileName: "ITZone_Udyam.pdf", fileType: "pdf", uploadedBy: "Priyadharshini R", uploadedAt: "2026-06-01", size: "145 KB" }],
    createdBy: "Priyadharshini R", createdAt: "2026-06-01",
    auditHistory: [{ action: "Created", by: "Priyadharshini R", at: "2026-06-01" }],
  },
  {
    id: 7, vendorCode: "VEN-0007", legalName: "Spark Electricals",
    tradeName: "Spark Electricals", vendorType: "Contractor",
    businessCategory: "Electrical & Civil", status: "Active",
    pan: "AABPS4561H", msmeRegistered: true, msmeNumber: "UDYAM-TN-22-0012345", companyType: "Proprietorship",
    tallyLedger: "Spark Electricals",
    branches: [mkBranch({ id: 9, branchName: "Chennai", city: "Chennai", state: "Tamil Nadu", stateCode: "33", address: "12 Poonamallee High Rd, Kilpauk", pinCode: "600010", isPrimary: true, gstRegistered: true, gstin: "33AABPS4561H1ZB", gstLegalName: "Spark Electricals", gstStatus: "Not Verified", gstLedgerMapping: "", contactPerson: "Selvam K", phone: "9841122334", email: "spark.elec@gmail.com" })],
    contacts: [mkContact({ id: 9, name: "Selvam K", designation: "Owner", department: "", mobile: "9841122334", email: "spark.elec@gmail.com", contactType: "Management", isPrimary: true })],
    bankAccounts: [mkBank({ id: 7, accountHolderName: "Spark Electricals", bankName: "Indian Bank", accountNumber: "****9944", ifsc: "IDIB000S508", branch: "Kilpauk", verificationStatus: "Pending" })],
    documents: [{ id: 6, docType: "MSME Certificate", fileName: "Spark_Udyam.pdf", fileType: "pdf", uploadedBy: "Priyadharshini R", uploadedAt: "2026-06-03", size: "132 KB" }],
    createdBy: "Priyadharshini R", createdAt: "2026-06-03",
    auditHistory: [{ action: "Created", by: "Priyadharshini R", at: "2026-06-03" }],
  },
  {
    id: 8, vendorCode: "VEN-0008", legalName: "CloudMinds Technologies Private Limited",
    tradeName: "CloudMinds", vendorType: "Service Provider",
    businessCategory: "Cloud Services", status: "Pending Verification",
    pan: "AABCC9912Z", msmeRegistered: false, msmeNumber: "", companyType: "Private Limited",
    tallyLedger: "",
    branches: [mkBranch({ id: 10, branchName: "Hyderabad Office", city: "Hyderabad", state: "Telangana", stateCode: "36", address: "Building 11A, HITEC City", pinCode: "500081", isPrimary: true, gstRegistered: true, gstin: "36AABCC9912Z1ZY", gstLegalName: "CloudMinds Technologies Pvt Ltd", gstStatus: "Not Verified", gstLedgerMapping: "", contactPerson: "Nikhil Reddy", phone: "9848001122", email: "nikhil@cloudminds.in" })],
    contacts: [mkContact({ id: 10, name: "Nikhil Reddy", designation: "Founder", department: "", mobile: "9848001122", email: "nikhil@cloudminds.in", contactType: "Management", isPrimary: true })],
    bankAccounts: [mkBank({ id: 8, accountHolderName: "CloudMinds Technologies", bankName: "HDFC Bank", accountNumber: "****5566", ifsc: "HDFC0002211", branch: "HITEC City", verificationStatus: "Pending" })],
    documents: [],
    createdBy: "Vijesh V", createdAt: "2026-06-02",
    auditHistory: [{ action: "Created", by: "Vijesh V", at: "2026-06-02" }, { action: "Pending Verification triggered", by: "System", at: "2026-06-02" }],
  },
];
