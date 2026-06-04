/**
 * Global Customer Master — enterprise customer data (UI-only, mock data).
 *
 * Single source of truth referenced by CRM Sales, Opportunities, Quotations, Orders,
 * Projects, Implementation, Support Tickets, AMC Contracts, Asset Management, Finance,
 * Customer Profitability, Engineer Visits, Local Conveyance, and future Billing.
 *
 * ARCHITECTURE: extends the existing `Customer` Prisma model (id/name/address/state/
 * gstNo/officeType/parentId/branches) — it does NOT duplicate it. The enterprise fields
 * below (type, industry, contacts, commercial, assets, profitability, documents) are
 * UI-only this phase and become the contract when the backend is wired to the existing
 * Customer table. No schema/Prisma changes this session.
 *
 * GST validation + Indian state-code map are REUSED from the Vendor Master
 * (`../vendors/data`) — one validator, shared across both global masters.
 */

import { validateGSTIN, GST_STATE_CODES, STATE_TO_CODE, STATE_NAMES } from "../vendors/data";
export { validateGSTIN, GST_STATE_CODES, STATE_TO_CODE, STATE_NAMES };

// ── Enumerations ──────────────────────────────────────────────────────────────

export const CUSTOMER_TYPES = [
  "Enterprise", "SMB", "Government", "Education", "Healthcare",
  "Manufacturing", "Partner", "Reseller",
] as const;
export type CustomerType = (typeof CUSTOMER_TYPES)[number];

export const CUSTOMER_STATUSES = ["Prospect", "Active", "Inactive"] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export const INDUSTRIES = [
  "Information Technology", "Manufacturing", "Banking & Financial Services",
  "Healthcare & Pharma", "Education", "Government & PSU", "Retail & E-commerce",
  "Construction & Infrastructure", "Telecom", "Logistics", "Energy & Utilities", "Other",
] as const;

export const SITE_TYPES = [
  "Registered Office", "Corporate Office", "Factory", "Warehouse",
  "Branch Office", "Data Center",
] as const;
export type SiteType = (typeof SITE_TYPES)[number];

export const GST_STATUSES = ["Verified", "Not Verified", "Invalid"] as const;
export type GSTStatus = (typeof GST_STATUSES)[number];

export const DEPARTMENTS = ["IT", "Purchase", "Finance", "Management", "Operations"] as const;
export type Department = (typeof DEPARTMENTS)[number];

export const DECISION_ROLES = ["Decision Maker", "Influencer", "Technical", "Commercial"] as const;
export type DecisionRole = (typeof DECISION_ROLES)[number];

export const RELATIONSHIP_TYPES = ["Subsidiary", "Division", "Group Company", "Branch", "Associate"] as const;

export const PAYMENT_TERMS = ["Advance", "Net 15", "Net 30", "Net 45", "Net 60", "Net 90"] as const;
export const CUSTOMER_RATINGS = ["A+", "A", "B", "C", "D"] as const;
export const CURRENCIES = ["INR", "USD", "EUR", "AED"] as const;
export const TAX_CATEGORIES = ["Regular", "SEZ", "Composition", "Exempt", "Export"] as const;

export const DOC_TYPES = [
  "GST Certificate", "Purchase Agreement", "MSA", "NDA", "AMC Document", "Other",
] as const;
export type DocType = (typeof DOC_TYPES)[number];

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CustomerSite {
  id: number;
  siteName: string;
  siteType: SiteType;
  address: string;
  city: string;
  state: string;
  stateCode: string;
  country: string;
  pinCode: string;
  phone: string;
  email: string;
  isPrimary: boolean;
  // GST (per site)
  gstRegistered: boolean;
  gstin: string;
  gstLegalName: string;
  gstStatus: GSTStatus;
  gstLedgerMapping: string;
  // Geo (Maps / conveyance)
  latitude: string;
  longitude: string;
  geoVerified: boolean;
}

export interface CustomerContact {
  id: number;
  name: string;
  designation: string;
  department: Department;
  mobile: string;
  email: string;
  linkedSiteId: number | null;
  decisionRole: DecisionRole;
  isPrimary: boolean;
}

export interface CustomerAsset {
  id: number;
  product: string;
  serialNo: string;
  warrantyEnd: string;
  amcStart: string;
  amcEnd: string;
  sla: string;
  siteId: number | null;
}

export interface CustomerDocument {
  id: number;
  docType: DocType;
  fileName: string;
  fileType: "pdf" | "image";
  uploadedBy: string;
  uploadedAt: string;
  expiryDate?: string;
  size: string;
}

export interface CustomerProfitability {
  revenue: number;
  productCost: number;
  serviceCost: number;
  engineerTravel: number;
  customerExpenses: number;
}

export interface CustomerCommercial {
  paymentTerms: string;
  creditLimit: number;
  rating: string;
  currency: string;
  taxCategory: string;
}

export interface CustomerAuditEntry {
  action: string;
  by: string;
  at: string;
  field?: string;
  oldVal?: string;
  newVal?: string;
}

export interface Customer {
  id: number;
  customerCode: string;       // CUST-0001
  legalName: string;
  tradeName: string;
  customerType: CustomerType;
  industry: string;
  website: string;
  status: CustomerStatus;
  accountOwner: string;
  pan: string;
  // Hierarchy
  parentId: number | null;
  relationshipType: string;
  // Relations
  sites: CustomerSite[];
  contacts: CustomerContact[];
  assets: CustomerAsset[];
  documents: CustomerDocument[];
  commercial: CustomerCommercial;
  profitability: CustomerProfitability;
  // AMC summary flag
  hasActiveAMC: boolean;
  // Audit
  createdBy: string;
  createdAt: string;
  modifiedBy?: string;
  modifiedAt?: string;
  auditHistory: CustomerAuditEntry[];
}

// ── RBAC ─────────────────────────────────────────────────────────────────────

export interface CustomerCaps {
  roleLabel: string;
  canCreate: boolean;
  canEdit: boolean;
  canDisable: boolean;
  canManageGST: boolean;
  canManageCommercial: boolean;
  canViewFinance: boolean;
  canExport: boolean;
}

export function deriveCustomerCaps(f: {
  isManager: boolean;
  isAccounts: boolean;
  isOpsHead: boolean;
}): CustomerCaps {
  // Sales Admin — full access (Manager / Operations Head)
  if (f.isManager || f.isOpsHead)
    return { roleLabel: "Sales Admin", canCreate: true, canEdit: true, canDisable: true, canManageGST: true, canManageCommercial: true, canViewFinance: true, canExport: true };
  // Finance — GST + commercial + finance, no create/disable
  if (f.isAccounts)
    return { roleLabel: "Finance", canCreate: false, canEdit: true, canDisable: false, canManageGST: true, canManageCommercial: true, canViewFinance: true, canExport: true };
  // Sales Team — create/edit assigned customers; no finance visibility
  return { roleLabel: "Sales Team", canCreate: true, canEdit: true, canDisable: false, canManageGST: false, canManageCommercial: false, canViewFinance: false, canExport: false };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function fmtINR(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
export function fmtDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
export function todayISO(): string { return new Date().toISOString().slice(0, 10); }

export function nextCustomerCode(customers: Customer[]): string {
  const max = customers.reduce((m, c) => {
    const n = parseInt(c.customerCode.replace("CUST-", "")) || 0;
    return n > m ? n : m;
  }, 0);
  return `CUST-${String(max + 1).padStart(4, "0")}`;
}

export function primarySite(c: Customer): CustomerSite | undefined {
  return c.sites.find((s) => s.isPrimary) ?? c.sites[0];
}
export function primaryContact(c: Customer): CustomerContact | undefined {
  return c.contacts.find((ct) => ct.isPrimary) ?? c.contacts[0];
}
export function allGSTINs(c: Customer): CustomerSite[] {
  return c.sites.filter((s) => s.gstRegistered && s.gstin);
}
export function grossMargin(p: CustomerProfitability): number {
  return p.revenue - p.productCost - p.serviceCost - p.engineerTravel - p.customerExpenses;
}
export function marginPct(p: CustomerProfitability): number {
  if (!p.revenue) return 0;
  return Math.round((grossMargin(p) / p.revenue) * 100);
}

export function statusBadge(s: CustomerStatus): string {
  return s === "Active" ? "badge-success" : s === "Prospect" ? "badge-info" : "badge-neutral";
}
export function gstStatusBadge(s: GSTStatus): string {
  return s === "Verified" ? "badge-success" : s === "Invalid" ? "badge-danger" : "badge-neutral";
}

const HIGH_VALUE_THRESHOLD = 5_000_000; // ₹50L+ revenue

export function customerStats(customers: Customer[]) {
  // count parent + child as customers; sites across all
  const siteCount = customers.reduce((s, c) => s + c.sites.length, 0);
  return {
    total: customers.length,
    active: customers.filter((c) => c.status === "Active").length,
    sites: siteCount,
    gstRegistered: customers.filter((c) => c.sites.some((s) => s.gstRegistered)).length,
    activeAMC: customers.filter((c) => c.hasActiveAMC).length,
    highValue: customers.filter((c) => c.profitability.revenue >= HIGH_VALUE_THRESHOLD).length,
  };
}

export function childrenOf(customers: Customer[], parentId: number): Customer[] {
  return customers.filter((c) => c.parentId === parentId);
}
export function getParentName(customers: Customer[], parentId: number | null): string {
  if (!parentId) return "—";
  return customers.find((c) => c.id === parentId)?.legalName ?? "—";
}

// ── Duplicate detection (UI-side, on create) ──────────────────────────────────

export function findPossibleDuplicates(
  customers: Customer[],
  candidate: { legalName: string; pan: string; gstin?: string; emailDomain?: string }
): Customer[] {
  const name = candidate.legalName.trim().toLowerCase();
  const pan = candidate.pan.trim().toUpperCase();
  const gstin = (candidate.gstin ?? "").trim().toUpperCase();
  const domain = (candidate.emailDomain ?? "").trim().toLowerCase();
  if (!name && !pan && !gstin && !domain) return [];
  return customers.filter((c) => {
    if (name && c.legalName.toLowerCase().includes(name)) return true;
    if (pan && c.pan.toUpperCase() === pan) return true;
    if (gstin && c.sites.some((s) => s.gstin.toUpperCase() === gstin)) return true;
    if (domain && c.contacts.some((ct) => ct.email.toLowerCase().endsWith("@" + domain))) return true;
    return false;
  });
}

// ── Mock data builders ─────────────────────────────────────────────────────────

const mkSite = (s: Partial<CustomerSite> & Pick<CustomerSite, "id" | "siteName" | "city" | "state" | "stateCode">): CustomerSite => ({
  siteType: "Corporate Office", address: "", country: "India", pinCode: "",
  phone: "", email: "", isPrimary: false,
  gstRegistered: false, gstin: "", gstLegalName: "", gstStatus: "Not Verified", gstLedgerMapping: "",
  latitude: "", longitude: "", geoVerified: false,
  ...s,
});

const mkContact = (c: Partial<CustomerContact> & Pick<CustomerContact, "id" | "name" | "mobile">): CustomerContact => ({
  designation: "", department: "Management", email: "", linkedSiteId: null,
  decisionRole: "Influencer", isPrimary: false, ...c,
});

const DEFAULT_COMMERCIAL: CustomerCommercial = {
  paymentTerms: "Net 30", creditLimit: 1_000_000, rating: "B", currency: "INR", taxCategory: "Regular",
};
const ZERO_PROFIT: CustomerProfitability = {
  revenue: 0, productCost: 0, serviceCost: 0, engineerTravel: 0, customerExpenses: 0,
};

// ── Mock customers ─────────────────────────────────────────────────────────────

export const CUSTOMERS: Customer[] = [
  // ── ABC Group (parent) + 2 child companies — hierarchy demo ──
  {
    id: 1, customerCode: "CUST-0001", legalName: "ABC Group Holdings", tradeName: "ABC Group",
    customerType: "Enterprise", industry: "Manufacturing", website: "abcgroup.in",
    status: "Active", accountOwner: "Vijesh Vijayan", pan: "AABCA1111A",
    parentId: null, relationshipType: "Group Company",
    sites: [mkSite({ id: 1, siteName: "Group Corporate Office", siteType: "Registered Office", city: "Chennai", state: "Tamil Nadu", stateCode: "33", address: "ABC House, Mount Road", pinCode: "600002", isPrimary: true, gstRegistered: true, gstin: "33AABCA1111A1Z5", gstLegalName: "ABC Group Holdings", gstStatus: "Verified", gstLedgerMapping: "Output GST 18%", phone: "044-28000000", email: "info@abcgroup.in", latitude: "13.0604", longitude: "80.2496", geoVerified: true })],
    contacts: [mkContact({ id: 1, name: "Ramesh Iyer", designation: "Group CFO", department: "Finance", mobile: "9840011111", email: "ramesh.iyer@abcgroup.in", decisionRole: "Decision Maker", isPrimary: true })],
    assets: [], documents: [{ id: 1, docType: "MSA", fileName: "ABC_Group_MSA.pdf", fileType: "pdf", uploadedBy: "Vijesh Vijayan", uploadedAt: "2026-01-10", expiryDate: "2028-01-09", size: "640 KB" }],
    commercial: { paymentTerms: "Net 45", creditLimit: 10_000_000, rating: "A+", currency: "INR", taxCategory: "Regular" },
    profitability: { revenue: 0, productCost: 0, serviceCost: 0, engineerTravel: 0, customerExpenses: 0 },
    hasActiveAMC: false, createdBy: "Vijesh Vijayan", createdAt: "2026-01-10",
    auditHistory: [{ action: "Created", by: "Vijesh Vijayan", at: "2026-01-10" }],
  },
  {
    id: 2, customerCode: "CUST-0002", legalName: "ABC Manufacturing Pvt Ltd", tradeName: "ABC Manufacturing",
    customerType: "Manufacturing", industry: "Manufacturing", website: "abcmfg.in",
    status: "Active", accountOwner: "Arun Menon", pan: "AABCA2222B",
    parentId: 1, relationshipType: "Subsidiary",
    sites: [
      mkSite({ id: 2, siteName: "Corporate Office Chennai", siteType: "Corporate Office", city: "Chennai", state: "Tamil Nadu", stateCode: "33", address: "Plot 14, Guindy Industrial Estate", pinCode: "600032", isPrimary: true, gstRegistered: true, gstin: "33AABCA2222B1ZP", gstLegalName: "ABC Manufacturing Pvt Ltd", gstStatus: "Verified", gstLedgerMapping: "Output GST 18%", phone: "044-22500000", email: "chennai@abcmfg.in", latitude: "13.0067", longitude: "80.2206", geoVerified: true }),
      mkSite({ id: 3, siteName: "Factory Sriperumbudur", siteType: "Factory", city: "Sriperumbudur", state: "Tamil Nadu", stateCode: "33", address: "SIPCOT Industrial Park", pinCode: "602105", isPrimary: false, gstRegistered: true, gstin: "33AABCA2222B1ZP", gstLegalName: "ABC Manufacturing Pvt Ltd", gstStatus: "Verified", gstLedgerMapping: "Output GST 18%", phone: "044-27100000", email: "factory@abcmfg.in", latitude: "12.9675", longitude: "79.9430", geoVerified: true }),
      mkSite({ id: 4, siteName: "Warehouse Bangalore", siteType: "Warehouse", city: "Bangalore", state: "Karnataka", stateCode: "29", address: "Peenya Industrial Area, Phase 2", pinCode: "560058", isPrimary: false, gstRegistered: true, gstin: "29AABCA2222B1ZR", gstLegalName: "ABC Manufacturing Pvt Ltd", gstStatus: "Verified", gstLedgerMapping: "Output GST 18%", phone: "080-28300000", email: "blr.wh@abcmfg.in", latitude: "13.0287", longitude: "77.5190", geoVerified: false }),
    ],
    contacts: [
      mkContact({ id: 2, name: "Suresh Babu", designation: "Head of IT", department: "IT", mobile: "9840022221", email: "suresh.babu@abcmfg.in", linkedSiteId: 2, decisionRole: "Technical", isPrimary: true }),
      mkContact({ id: 3, name: "Lakshmi Narayan", designation: "Purchase Manager", department: "Purchase", mobile: "9840022222", email: "lakshmi.n@abcmfg.in", linkedSiteId: 2, decisionRole: "Commercial" }),
      mkContact({ id: 4, name: "Karthik Raja", designation: "Plant Head", department: "Operations", mobile: "9840022223", email: "karthik.raja@abcmfg.in", linkedSiteId: 3, decisionRole: "Influencer" }),
    ],
    assets: [
      { id: 1, product: "Fortinet FortiGate 200F Firewall", serialNo: "FG200F-TN-0098", warrantyEnd: "2027-03-31", amcStart: "2026-04-01", amcEnd: "2027-03-31", sla: "24x7 4-hour", siteId: 2 },
      { id: 2, product: "Cisco Catalyst 9300 Switch x4", serialNo: "C9300-BLR-0212", warrantyEnd: "2026-12-31", amcStart: "2026-01-01", amcEnd: "2026-12-31", sla: "8x5 NBD", siteId: 4 },
    ],
    documents: [
      { id: 2, docType: "GST Certificate", fileName: "ABCMfg_GST_TN.pdf", fileType: "pdf", uploadedBy: "Arun Menon", uploadedAt: "2026-02-01", size: "210 KB" },
      { id: 3, docType: "AMC Document", fileName: "ABCMfg_AMC_2026.pdf", fileType: "pdf", uploadedBy: "Priyadharshini R", uploadedAt: "2026-04-01", expiryDate: "2027-03-31", size: "380 KB" },
    ],
    commercial: { paymentTerms: "Net 30", creditLimit: 5_000_000, rating: "A", currency: "INR", taxCategory: "Regular" },
    profitability: { revenue: 8_500_000, productCost: 5_900_000, serviceCost: 620_000, engineerTravel: 145_000, customerExpenses: 95_000 },
    hasActiveAMC: true, createdBy: "Arun Menon", createdAt: "2026-02-01",
    auditHistory: [
      { action: "Created", by: "Arun Menon", at: "2026-02-01" },
      { action: "Site Added", by: "Arun Menon", at: "2026-02-15", field: "Warehouse Bangalore" },
      { action: "AMC Activated", by: "Priyadharshini R", at: "2026-04-01" },
    ],
  },
  {
    id: 3, customerCode: "CUST-0003", legalName: "ABC Technologies Pvt Ltd", tradeName: "ABC Technologies",
    customerType: "Enterprise", industry: "Information Technology", website: "abctech.in",
    status: "Active", accountOwner: "Arun Menon", pan: "AABCA3333C",
    parentId: 1, relationshipType: "Subsidiary",
    sites: [mkSite({ id: 5, siteName: "Tech Park Bangalore", siteType: "Corporate Office", city: "Bangalore", state: "Karnataka", stateCode: "29", address: "Manyata Tech Park, Block D", pinCode: "560045", isPrimary: true, gstRegistered: true, gstin: "29AABCA3333C1ZT", gstLegalName: "ABC Technologies Pvt Ltd", gstStatus: "Verified", gstLedgerMapping: "Output GST 18%", phone: "080-40100000", email: "info@abctech.in", latitude: "13.0440", longitude: "77.6200", geoVerified: true })],
    contacts: [mkContact({ id: 5, name: "Deepa Krishnan", designation: "CTO", department: "IT", mobile: "9840033331", email: "deepa.k@abctech.in", linkedSiteId: 5, decisionRole: "Decision Maker", isPrimary: true })],
    assets: [{ id: 3, product: "Dell PowerEdge R750 Server x2", serialNo: "PER750-BLR-0501", warrantyEnd: "2028-06-30", amcStart: "2026-07-01", amcEnd: "2027-06-30", sla: "24x7 4-hour", siteId: 5 }],
    documents: [{ id: 4, docType: "NDA", fileName: "ABCTech_NDA.pdf", fileType: "pdf", uploadedBy: "Arun Menon", uploadedAt: "2026-03-05", size: "120 KB" }],
    commercial: { paymentTerms: "Net 30", creditLimit: 3_000_000, rating: "A", currency: "INR", taxCategory: "SEZ" },
    profitability: { revenue: 6_200_000, productCost: 4_300_000, serviceCost: 410_000, engineerTravel: 88_000, customerExpenses: 62_000 },
    hasActiveAMC: true, createdBy: "Arun Menon", createdAt: "2026-03-05",
    auditHistory: [{ action: "Created", by: "Arun Menon", at: "2026-03-05" }],
  },

  // ── Standalone enterprises ──
  {
    id: 4, customerCode: "CUST-0004", legalName: "Tata Projects Limited", tradeName: "Tata Projects",
    customerType: "Enterprise", industry: "Construction & Infrastructure", website: "tataprojects.com",
    status: "Active", accountOwner: "Vijesh Vijayan", pan: "AAACT4444D",
    parentId: null, relationshipType: "",
    sites: [
      mkSite({ id: 6, siteName: "Corporate Office Mumbai", siteType: "Corporate Office", city: "Mumbai", state: "Maharashtra", stateCode: "27", address: "One Boulevard, Lake Boulevard Road", pinCode: "400076", isPrimary: true, gstRegistered: true, gstin: "27AAACT4444D1ZG", gstLegalName: "Tata Projects Limited", gstStatus: "Verified", gstLedgerMapping: "Output GST 18%", phone: "022-67000000", email: "contact@tataprojects.com", latitude: "19.1136", longitude: "72.8697", geoVerified: true }),
      mkSite({ id: 7, siteName: "Project Site Chennai", siteType: "Branch Office", city: "Chennai", state: "Tamil Nadu", stateCode: "33", address: "OMR, Perungudi", pinCode: "600096", isPrimary: false, gstRegistered: true, gstin: "33AAACT4444D1ZB", gstLegalName: "Tata Projects Limited", gstStatus: "Verified", gstLedgerMapping: "Output GST 18%", phone: "044-49000000", email: "chennai@tataprojects.com", latitude: "12.9650", longitude: "80.2430", geoVerified: false }),
    ],
    contacts: [
      mkContact({ id: 6, name: "Anand Subramanian", designation: "VP - Digital", department: "IT", mobile: "9820044441", email: "anand.s@tataprojects.com", linkedSiteId: 6, decisionRole: "Decision Maker", isPrimary: true }),
      mkContact({ id: 7, name: "Meera Joshi", designation: "Procurement Lead", department: "Purchase", mobile: "9820044442", email: "meera.joshi@tataprojects.com", linkedSiteId: 6, decisionRole: "Commercial" }),
    ],
    assets: [{ id: 4, product: "Palo Alto PA-3220 Firewall", serialNo: "PA3220-MUM-0034", warrantyEnd: "2027-09-30", amcStart: "2026-10-01", amcEnd: "2027-09-30", sla: "24x7 4-hour", siteId: 6 }],
    documents: [{ id: 5, docType: "Purchase Agreement", fileName: "TataProjects_PA.pdf", fileType: "pdf", uploadedBy: "Vijesh Vijayan", uploadedAt: "2026-02-20", size: "510 KB" }],
    commercial: { paymentTerms: "Net 60", creditLimit: 15_000_000, rating: "A+", currency: "INR", taxCategory: "Regular" },
    profitability: { revenue: 12_400_000, productCost: 8_900_000, serviceCost: 740_000, engineerTravel: 210_000, customerExpenses: 130_000 },
    hasActiveAMC: true, createdBy: "Vijesh Vijayan", createdAt: "2026-02-20",
    auditHistory: [{ action: "Created", by: "Vijesh Vijayan", at: "2026-02-20" }],
  },
  {
    id: 5, customerCode: "CUST-0005", legalName: "Biocon Limited", tradeName: "Biocon",
    customerType: "Healthcare", industry: "Healthcare & Pharma", website: "biocon.com",
    status: "Active", accountOwner: "Arun Menon", pan: "AAACB5555E",
    parentId: null, relationshipType: "",
    sites: [mkSite({ id: 8, siteName: "Biocon Park Bangalore", siteType: "Corporate Office", city: "Bangalore", state: "Karnataka", stateCode: "29", address: "Biocon SEZ, Bommasandra", pinCode: "560099", isPrimary: true, gstRegistered: true, gstin: "29AAACB5555E1ZK", gstLegalName: "Biocon Limited", gstStatus: "Verified", gstLedgerMapping: "Output GST 18%", phone: "080-28080000", email: "info@biocon.com", latitude: "12.8050", longitude: "77.6890", geoVerified: true })],
    contacts: [mkContact({ id: 8, name: "Dr. Sanjay Rao", designation: "Head IT Infrastructure", department: "IT", mobile: "9880055551", email: "sanjay.rao@biocon.com", linkedSiteId: 8, decisionRole: "Decision Maker", isPrimary: true })],
    assets: [],
    documents: [],
    commercial: { paymentTerms: "Net 45", creditLimit: 4_000_000, rating: "A", currency: "INR", taxCategory: "SEZ" },
    profitability: { revenue: 3_200_000, productCost: 2_350_000, serviceCost: 180_000, engineerTravel: 52_000, customerExpenses: 28_000 },
    hasActiveAMC: false, createdBy: "Arun Menon", createdAt: "2026-03-12",
    auditHistory: [{ action: "Created", by: "Arun Menon", at: "2026-03-12" }],
  },
  {
    id: 6, customerCode: "CUST-0006", legalName: "Directorate of Technical Education, TN", tradeName: "DOTE Tamil Nadu",
    customerType: "Government", industry: "Government & PSU", website: "tndte.gov.in",
    status: "Active", accountOwner: "Vijesh Vijayan", pan: "AAAGD6666F",
    parentId: null, relationshipType: "",
    sites: [mkSite({ id: 9, siteName: "DOTE Head Office", siteType: "Registered Office", city: "Chennai", state: "Tamil Nadu", stateCode: "33", address: "Guindy, Anna University Campus", pinCode: "600025", isPrimary: true, gstRegistered: false, phone: "044-22300000", email: "dote@tn.gov.in", latitude: "13.0102", longitude: "80.2350", geoVerified: true })],
    contacts: [mkContact({ id: 9, name: "Murugan P", designation: "Joint Director", department: "Management", mobile: "9445066661", email: "murugan.p@tn.gov.in", linkedSiteId: 9, decisionRole: "Decision Maker", isPrimary: true })],
    assets: [],
    documents: [],
    commercial: { paymentTerms: "Net 90", creditLimit: 2_000_000, rating: "B", currency: "INR", taxCategory: "Exempt" },
    profitability: { revenue: 1_800_000, productCost: 1_450_000, serviceCost: 120_000, engineerTravel: 64_000, customerExpenses: 18_000 },
    hasActiveAMC: false, createdBy: "Vijesh Vijayan", createdAt: "2026-04-02",
    auditHistory: [{ action: "Created", by: "Vijesh Vijayan", at: "2026-04-02" }],
  },
  {
    id: 7, customerCode: "CUST-0007", legalName: "Sunrise Infotech Solutions", tradeName: "Sunrise Infotech",
    customerType: "Reseller", industry: "Information Technology", website: "sunriseinfotech.in",
    status: "Active", accountOwner: "Arun Menon", pan: "AAFCS7777G",
    parentId: null, relationshipType: "",
    sites: [mkSite({ id: 10, siteName: "Office Coimbatore", siteType: "Branch Office", city: "Coimbatore", state: "Tamil Nadu", stateCode: "33", address: "Avinashi Road, Peelamedu", pinCode: "641004", isPrimary: true, gstRegistered: true, gstin: "33AAFCS7777G1ZH", gstLegalName: "Sunrise Infotech Solutions", gstStatus: "Not Verified", gstLedgerMapping: "", phone: "0422-4500000", email: "sales@sunriseinfotech.in", latitude: "11.0290", longitude: "77.0270", geoVerified: false })],
    contacts: [mkContact({ id: 10, name: "Vignesh M", designation: "Director", department: "Management", mobile: "9942077771", email: "vignesh@sunriseinfotech.in", linkedSiteId: 10, decisionRole: "Decision Maker", isPrimary: true })],
    assets: [],
    documents: [],
    commercial: { paymentTerms: "Net 15", creditLimit: 800_000, rating: "B", currency: "INR", taxCategory: "Regular" },
    profitability: { revenue: 950_000, productCost: 760_000, serviceCost: 60_000, engineerTravel: 22_000, customerExpenses: 12_000 },
    hasActiveAMC: false, createdBy: "Arun Menon", createdAt: "2026-04-18",
    auditHistory: [{ action: "Created", by: "Arun Menon", at: "2026-04-18" }],
  },
  {
    id: 8, customerCode: "CUST-0008", legalName: "Vellore Institute of Technology", tradeName: "VIT University",
    customerType: "Education", industry: "Education", website: "vit.ac.in",
    status: "Prospect", accountOwner: "Vijesh Vijayan", pan: "AAATV8888H",
    parentId: null, relationshipType: "",
    sites: [mkSite({ id: 11, siteName: "VIT Vellore Campus", siteType: "Corporate Office", city: "Vellore", state: "Tamil Nadu", stateCode: "33", address: "Tiruvalam Road, Katpadi", pinCode: "632014", isPrimary: true, gstRegistered: true, gstin: "33AAATV8888H1ZD", gstLegalName: "Vellore Institute of Technology", gstStatus: "Not Verified", gstLedgerMapping: "", phone: "0416-2200000", email: "info@vit.ac.in", latitude: "12.9692", longitude: "79.1559", geoVerified: false })],
    contacts: [mkContact({ id: 11, name: "Prof. Ravi Shankar", designation: "Director - IT Services", department: "IT", mobile: "9842088881", email: "ravi.shankar@vit.ac.in", linkedSiteId: 11, decisionRole: "Influencer", isPrimary: true })],
    assets: [],
    documents: [],
    commercial: { paymentTerms: "Net 30", creditLimit: 0, rating: "C", currency: "INR", taxCategory: "Exempt" },
    profitability: { revenue: 0, productCost: 0, serviceCost: 0, engineerTravel: 0, customerExpenses: 0 },
    hasActiveAMC: false, createdBy: "Vijesh Vijayan", createdAt: "2026-05-20",
    auditHistory: [{ action: "Created", by: "Vijesh Vijayan", at: "2026-05-20" }, { action: "Marked Prospect", by: "Vijesh Vijayan", at: "2026-05-20" }],
  },
];
