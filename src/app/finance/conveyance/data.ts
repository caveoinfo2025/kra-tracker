/**
 * Local Conveyance — types, mock data, RBAC caps, helpers (UI-only, no backend).
 * Follows the Finance Phase 2 data.ts pattern: mock in browser, shapes define the
 * backend contract.  Money in ₹ (rupees), consistent with other finance modules.
 */

export { fmtINR, fmtDate, fmtDateTime, todayISO } from "../bank-book/data";

// ── Enumerations ──────────────────────────────────────────────────────────────

export const TRIP_STATUSES = [
  "Draft", "Submitted", "Approved", "Rejected", "Verified", "Paid",
] as const;
export type TripStatus = (typeof TRIP_STATUSES)[number];

export const VEHICLE_TYPES = ["Bike", "Car", "Public Transport"] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const VISIT_PURPOSES = [
  "Sales Visit", "Installation", "Support", "Collection", "Meeting", "Project Work", "Others",
] as const;
export type VisitPurpose = (typeof VISIT_PURPOSES)[number];

export const TRANSPORT_TYPES = ["Bus", "Train", "Metro", "Auto", "Taxi"] as const;
export type TransportType = (typeof TRANSPORT_TYPES)[number];

export const MONTHLY_STATUSES = [
  "Open", "Pending Approval", "Approved", "Payment Pending", "Paid",
] as const;
export type MonthlyStatus = (typeof MONTHLY_STATUSES)[number];

export const DIST_METHODS = ["Standard (Office → Customer)", "GPS Actual"] as const;
export type DistMethod = (typeof DIST_METHODS)[number];

// ── Models ────────────────────────────────────────────────────────────────────

export interface GeoPoint {
  address: string;
  lat: number;
  lng: number;
  time: string; // HH:MM
}

export interface ApprovalEvent {
  stage: string;
  by: string;
  date: string;
  note?: string;
  state: "done" | "rejected" | "pending";
}

export interface TravelTrip {
  id: number;
  tripNo: string;          // CONV/26-27/0001
  date: string;
  employeeId: number;
  employee: string;
  department: string;
  grade: string;           // "Engineer" | "Manager" | "Executive"
  vehicle: VehicleType;
  purpose: VisitPurpose;
  customer: string;
  customerSite: string;
  project: string;
  remarks: string;
  // For Bike / Car
  startLocation?: GeoPoint;
  endLocation?: GeoPoint;
  distMethod: DistMethod;
  standardKm: number;      // Office→Customer→Office (policy baseline)
  actualKm: number;        // GPS measured
  payableKm: number;       // whichever the policy dictates
  ratePerKm: number;
  // For Public Transport
  transportType?: TransportType;
  fromLocation?: string;
  toLocation?: string;
  ticketAmount?: number;
  hasTicketAttachment: boolean;
  // Computed
  claimAmount: number;     // payableKm × ratePerKm, or ticketAmount
  billToCustomer: boolean;
  // Approval
  status: TripStatus;
  managerNote?: string;
  accountsNote?: string;
  approvalHistory: ApprovalEvent[];
  // Meta
  month: string;           // "June 2026"
  createdBy: string;
  attachments: { name: string; kind: "image" | "pdf" }[];
}

export interface MonthlyStatement {
  id: number;
  employeeId: number;
  employee: string;
  department: string;
  grade: string;
  month: string;           // "June 2026"
  trips: number;
  totalKm: number;
  claimAmount: number;
  approvedAmount: number;
  paidAmount: number;
  status: MonthlyStatus;
}

export interface PolicyRule {
  id: number;
  grade: string;
  vehicle: VehicleType;
  ratePerKm: number;
  dailyLimitKm: number;
  monthlyLimitKm: number;
  approvalRequired: boolean;
  documentRule: "mandatory" | "optional" | "none";
}

// ── RBAC ──────────────────────────────────────────────────────────────────────

export interface ConveyanceCaps {
  roleLabel: string;
  scope: "own" | "team" | "all";
  canAdd: boolean;
  canApprove: boolean;
  canVerify: boolean;
  canProcessPayment: boolean;
  canConfigurePolicy: boolean;
  canExport: boolean;
}

export function deriveCaps(f: {
  isManager: boolean;
  isAccounts: boolean;
  isOpsHead: boolean;
}): ConveyanceCaps {
  if (f.isOpsHead)
    return { roleLabel: "Accounts Admin", scope: "all", canAdd: false, canApprove: true, canVerify: true, canProcessPayment: true, canConfigurePolicy: true, canExport: true };
  if (f.isAccounts)
    return { roleLabel: "Accounts", scope: "all", canAdd: false, canApprove: false, canVerify: true, canProcessPayment: true, canConfigurePolicy: false, canExport: true };
  if (f.isManager)
    return { roleLabel: "Manager", scope: "team", canAdd: true, canApprove: true, canVerify: false, canProcessPayment: false, canConfigurePolicy: false, canExport: true };
  return { roleLabel: "Employee", scope: "own", canAdd: true, canApprove: false, canVerify: false, canProcessPayment: false, canConfigurePolicy: false, canExport: false };
}

// ── Badge helpers ─────────────────────────────────────────────────────────────

export function tripBadge(s: TripStatus): string {
  switch (s) {
    case "Approved":  return "badge-success";
    case "Paid":      return "badge-accent";
    case "Submitted": return "badge-warning";
    case "Verified":  return "badge-info";
    case "Rejected":  return "badge-danger";
    default:          return "badge-neutral";
  }
}

export function monthlyBadge(s: MonthlyStatus): string {
  switch (s) {
    case "Approved":        return "badge-success";
    case "Paid":            return "badge-accent";
    case "Pending Approval":return "badge-warning";
    case "Payment Pending": return "badge-info";
    default:                return "badge-neutral";
  }
}

export function fmtKM(km: number): string {
  return `${km.toFixed(1)} KM`;
}

// ── Mock helpers ──────────────────────────────────────────────────────────────

const FY = "26-27";
let tripCounter = 0;
function nextTripNo(): string {
  tripCounter++;
  return `CONV/${FY}/${String(tripCounter).padStart(4, "0")}`;
}

function mkHistory(status: TripStatus, employee: string): ApprovalEvent[] {
  const created: ApprovalEvent = { stage: "Submitted", by: employee, date: "2026-06-01", state: "done" };
  if (status === "Draft") return [];
  if (status === "Submitted") return [created, { stage: "Manager Approval", by: "Vijesh V", date: "", state: "pending" }];
  if (status === "Rejected") return [created, { stage: "Manager Approval", by: "Vijesh V", date: "2026-06-02", state: "rejected", note: "Incorrect distance" }];
  const mgr: ApprovalEvent = { stage: "Manager Approval", by: "Vijesh V", date: "2026-06-02", state: "done" };
  if (status === "Approved") return [created, mgr, { stage: "Accounts Verification", by: "Priyadharshini R", date: "", state: "pending" }];
  const acc: ApprovalEvent = { stage: "Accounts Verification", by: "Priyadharshini R", date: "2026-06-03", state: "done" };
  if (status === "Verified") return [created, mgr, acc];
  return [created, mgr, acc, { stage: "Payment Processed", by: "Priyadharshini R", date: "2026-06-04", state: "done" }];
}

function mkTrip(t: Partial<TravelTrip> & {
  employee: string; employeeId: number; date: string; vehicle: VehicleType;
  purpose: VisitPurpose; customer: string; payableKm: number; ratePerKm: number;
  status: TripStatus;
}): TravelTrip {
  const claim = t.vehicle === "Public Transport"
    ? (t.ticketAmount ?? 0)
    : (t.payableKm * t.ratePerKm);
  return {
    id: ++_tripId,
    tripNo: nextTripNo(),
    grade: t.grade ?? "Engineer",
    department: t.department ?? "Sales",
    customerSite: t.customerSite ?? "Main Office",
    project: t.project ?? "",
    remarks: t.remarks ?? "",
    distMethod: t.distMethod ?? "Standard (Office → Customer)",
    standardKm: t.standardKm ?? t.payableKm,
    actualKm: t.actualKm ?? t.payableKm + 2.3,
    transportType: t.transportType,
    fromLocation: t.fromLocation ?? "",
    toLocation: t.toLocation ?? "",
    ticketAmount: t.ticketAmount ?? 0,
    hasTicketAttachment: t.hasTicketAttachment ?? false,
    ...t,
    billToCustomer: t.billToCustomer ?? false,
    managerNote: t.managerNote,
    accountsNote: t.accountsNote,
    month: "June 2026",
    createdBy: t.employee,
    attachments: t.attachments ?? [],
    approvalHistory: mkHistory(t.status, t.employee),
    claimAmount: claim,
  } as TravelTrip;
}

let _tripId = 0;

// ── Mock policy rules ─────────────────────────────────────────────────────────

export const POLICY_RULES: PolicyRule[] = [
  { id: 1, grade: "Engineer",  vehicle: "Bike",             ratePerKm: 5,  dailyLimitKm: 80,  monthlyLimitKm: 1000, approvalRequired: false, documentRule: "optional" },
  { id: 2, grade: "Engineer",  vehicle: "Car",              ratePerKm: 10, dailyLimitKm: 150, monthlyLimitKm: 2000, approvalRequired: true,  documentRule: "mandatory" },
  { id: 3, grade: "Engineer",  vehicle: "Public Transport", ratePerKm: 0,  dailyLimitKm: 0,   monthlyLimitKm: 0,    approvalRequired: false, documentRule: "mandatory" },
  { id: 4, grade: "Manager",   vehicle: "Bike",             ratePerKm: 6,  dailyLimitKm: 100, monthlyLimitKm: 1200, approvalRequired: false, documentRule: "optional" },
  { id: 5, grade: "Manager",   vehicle: "Car",              ratePerKm: 12, dailyLimitKm: 200, monthlyLimitKm: 2500, approvalRequired: true,  documentRule: "mandatory" },
  { id: 6, grade: "Manager",   vehicle: "Public Transport", ratePerKm: 0,  dailyLimitKm: 0,   monthlyLimitKm: 0,    approvalRequired: false, documentRule: "optional" },
  { id: 7, grade: "Executive", vehicle: "Bike",             ratePerKm: 5,  dailyLimitKm: 80,  monthlyLimitKm: 1000, approvalRequired: false, documentRule: "optional" },
  { id: 8, grade: "Executive", vehicle: "Car",              ratePerKm: 8,  dailyLimitKm: 120, monthlyLimitKm: 1500, approvalRequired: true,  documentRule: "mandatory" },
  { id: 9, grade: "Executive", vehicle: "Public Transport", ratePerKm: 0,  dailyLimitKm: 0,   monthlyLimitKm: 0,    approvalRequired: false, documentRule: "optional" },
];

export function getPolicyRate(grade: string, vehicle: VehicleType): number {
  return POLICY_RULES.find((r) => r.grade === grade && r.vehicle === vehicle)?.ratePerKm ?? 5;
}

// ── Mock travel trips ─────────────────────────────────────────────────────────

export const TRAVEL_TRIPS: TravelTrip[] = [
  mkTrip({ employee: "Vijesh V", employeeId: 2, grade: "Manager", date: "2026-06-02", vehicle: "Bike", purpose: "Sales Visit",    customer: "Tata Projects Ltd", customerSite: "Whitefield Office",  payableKm: 28, ratePerKm: 6, status: "Paid",      billToCustomer: true,  project: "Falcon" }),
  mkTrip({ employee: "Vijesh V", employeeId: 2, grade: "Manager", date: "2026-06-04", vehicle: "Car",  purpose: "Meeting",        customer: "Wipro Ltd",          customerSite: "Sarjapur Road HQ",   payableKm: 18, ratePerKm: 12, status: "Verified",  billToCustomer: false }),
  mkTrip({ employee: "Vijesh V", employeeId: 2, grade: "Manager", date: "2026-06-06", vehicle: "Bike", purpose: "Collection",     customer: "Biocon Ltd",         customerSite: "Hebbagodi Site",     payableKm: 32, ratePerKm: 6, status: "Approved",  billToCustomer: true,  project: "Helix" }),

  mkTrip({ employee: "Rahul M",  employeeId: 5, grade: "Engineer", date: "2026-06-01", vehicle: "Bike", purpose: "Installation",   customer: "L&T Construction",   customerSite: "Bangalore Site",     payableKm: 35, ratePerKm: 5, status: "Paid",      billToCustomer: true,  attachments: [{ name: "receipt.jpg", kind: "image" }] }),
  mkTrip({ employee: "Rahul M",  employeeId: 5, grade: "Engineer", date: "2026-06-03", vehicle: "Bike", purpose: "Support",        customer: "Infosys BPM",        customerSite: "Electronic City",    payableKm: 42, ratePerKm: 5, status: "Submitted", billToCustomer: true }),
  mkTrip({ employee: "Rahul M",  employeeId: 5, grade: "Engineer", date: "2026-06-05", vehicle: "Public Transport", purpose: "Meeting", customer: "Embassy GolfLinks", customerSite: "Domlur", payableKm: 0, ratePerKm: 0, status: "Submitted", transportType: "Metro", fromLocation: "Indiranagar Station", toLocation: "Domlur Station", ticketAmount: 40, hasTicketAttachment: true }),
  mkTrip({ employee: "Rahul M",  employeeId: 5, grade: "Engineer", date: "2026-06-07", vehicle: "Bike", purpose: "Sales Visit",    customer: "Tata Projects Ltd",  customerSite: "Whitefield Office",  payableKm: 30, ratePerKm: 5, status: "Draft" }),

  mkTrip({ employee: "Sneha K",  employeeId: 6, grade: "Engineer", date: "2026-06-02", vehicle: "Bike", purpose: "Sales Visit",    customer: "Biocon Ltd",         customerSite: "Hebbagodi Site",     payableKm: 26, ratePerKm: 5, status: "Approved",  billToCustomer: true }),
  mkTrip({ employee: "Sneha K",  employeeId: 6, grade: "Engineer", date: "2026-06-04", vehicle: "Public Transport", purpose: "Collection", customer: "Manyata Tech Park", customerSite: "Main Gate", payableKm: 0, ratePerKm: 0, status: "Submitted", transportType: "Bus", fromLocation: "Indiranagar", toLocation: "Manyata Tech Park", ticketAmount: 30, hasTicketAttachment: false }),
  mkTrip({ employee: "Sneha K",  employeeId: 6, grade: "Engineer", date: "2026-06-06", vehicle: "Bike", purpose: "Support",        customer: "Wipro Ltd",          customerSite: "Sarjapur Road HQ",   payableKm: 22, ratePerKm: 5, status: "Rejected",  managerNote: "Please attach proof" }),

  mkTrip({ employee: "Deepak N", employeeId: 3, grade: "Executive", date: "2026-06-03", vehicle: "Car", purpose: "Sales Visit",   customer: "L&T Construction",   customerSite: "Bangalore Site",     payableKm: 38, ratePerKm: 8, status: "Paid",      billToCustomer: true,  project: "Horizon" }),
  mkTrip({ employee: "Deepak N", employeeId: 3, grade: "Executive", date: "2026-06-05", vehicle: "Car", purpose: "Meeting",       customer: "Tata Projects Ltd",  customerSite: "Whitefield Office",  payableKm: 28, ratePerKm: 8, status: "Verified",  billToCustomer: false }),

  mkTrip({ employee: "Arun P",   employeeId: 7, grade: "Engineer", date: "2026-06-02", vehicle: "Bike", purpose: "Installation",  customer: "Infosys BPM",        customerSite: "Electronic City",    payableKm: 40, ratePerKm: 5, status: "Submitted" }),
  mkTrip({ employee: "Arun P",   employeeId: 7, grade: "Engineer", date: "2026-06-04", vehicle: "Bike", purpose: "Support",       customer: "Biocon Ltd",         customerSite: "Hebbagodi Site",     payableKm: 26, ratePerKm: 5, status: "Submitted" }),
  mkTrip({ employee: "Arun P",   employeeId: 7, grade: "Engineer", date: "2026-06-06", vehicle: "Bike", purpose: "Project Work",  customer: "Manyata Tech Park",  customerSite: "Main Gate",          payableKm: 24, ratePerKm: 5, status: "Draft" }),
];

// ── Monthly statements ────────────────────────────────────────────────────────

export const MONTHLY_STATEMENTS: MonthlyStatement[] = [
  { id: 1, employeeId: 2, employee: "Vijesh V",  department: "Sales",      grade: "Manager",   month: "June 2026", trips: 3,  totalKm: 78,  claimAmount: 684,  approvedAmount: 684,  paidAmount: 390,  status: "Payment Pending" },
  { id: 2, employeeId: 5, employee: "Rahul M",   department: "Sales",      grade: "Engineer",  month: "June 2026", trips: 4,  totalKm: 107, claimAmount: 535,  approvedAmount: 175,  paidAmount: 175,  status: "Pending Approval" },
  { id: 3, employeeId: 6, employee: "Sneha K",   department: "Sales",      grade: "Engineer",  month: "June 2026", trips: 3,  totalKm: 48,  claimAmount: 270,  approvedAmount: 130,  paidAmount: 0,    status: "Pending Approval" },
  { id: 4, employeeId: 3, employee: "Deepak N",  department: "Operations", grade: "Executive", month: "June 2026", trips: 2,  totalKm: 66,  claimAmount: 528,  approvedAmount: 528,  paidAmount: 528,  status: "Paid" },
  { id: 5, employeeId: 7, employee: "Arun P",    department: "Presales",   grade: "Engineer",  month: "June 2026", trips: 3,  totalKm: 90,  claimAmount: 450,  approvedAmount: 0,    paidAmount: 0,    status: "Open" },
  { id: 6, employeeId: 2, employee: "Vijesh V",  department: "Sales",      grade: "Manager",   month: "May 2026",  trips: 5,  totalKm: 140, claimAmount: 840,  approvedAmount: 840,  paidAmount: 840,  status: "Paid" },
];

// ── Customer mock list ────────────────────────────────────────────────────────

export const MOCK_CUSTOMERS = [
  { name: "Tata Projects Ltd",  sites: ["Whitefield Office", "Bangalore HQ", "Electronic City"] },
  { name: "Biocon Ltd",         sites: ["Hebbagodi Site", "Bangalore Office"] },
  { name: "Wipro Ltd",          sites: ["Sarjapur Road HQ", "Domlur Office"] },
  { name: "Infosys BPM",        sites: ["Electronic City", "Mysore Road Campus"] },
  { name: "L&T Construction",   sites: ["Bangalore Site", "KIADB Industrial Area"] },
  { name: "Manyata Tech Park",  sites: ["Main Gate", "Tower 3", "Tower 7"] },
  { name: "Embassy GolfLinks",  sites: ["Domlur", "Phase 2"] },
];

// Mock GPS locations used in the desktop capture UI
export const MOCK_GEO: Record<string, GeoPoint> = {
  office:       { address: "Caveo Infosystems, Indiranagar, Bengaluru", lat: 12.97194, lng: 77.63968, time: "09:05" },
  whitefield:   { address: "Whitefield ITPL, Bengaluru 560066",         lat: 12.98480, lng: 77.73862, time: "10:30" },
  hebbagodi:    { address: "Hebbagodi Industrial Area, Bengaluru 560099", lat: 12.84190, lng: 77.67210, time: "11:15" },
  electroniccity: { address: "Electronic City Phase 1, Bengaluru 560100", lat: 12.84456, lng: 77.66012, time: "10:00" },
  manyata:      { address: "Manyata Tech Park, Nagawara, Bengaluru 560045", lat: 13.04700, lng: 77.61660, time: "09:45" },
};
