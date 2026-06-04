/**
 * Global Approval Engine — data layer (types, mock data, RBAC, helpers).
 * Module-agnostic: Finance / Sales / HR / Procurement / Projects / Admin.
 * No API routes, no schema changes — shapes define the backend contract.
 */

// ─── Enums / Constants ────────────────────────────────────────────────────────

export const MODULES = [
  "Finance", "Sales", "HR", "Procurement", "Projects", "Admin",
] as const;
export type Module = (typeof MODULES)[number];

export const MODULE_TRANSACTION_TYPES: Record<Module, string[]> = {
  Finance:     ["Expense", "Employee Advance", "Local Conveyance", "Purchase Order", "Vendor Payment"],
  Sales:       ["Discount Approval", "Quote Approval", "Contract Approval", "Credit Limit"],
  HR:          ["Leave Approval", "Asset Request", "Recruitment", "Salary Revision"],
  Procurement: ["Purchase Request", "Vendor Onboarding", "RFQ Approval"],
  Projects:    ["Project Budget", "Resource Allocation", "Change Request"],
  Admin:       ["User Access", "Policy Change", "System Config"],
};

export const TRIGGER_EVENTS = [
  "On Create", "On Submit", "On Amount Limit", "On Field Change", "On Status Change",
] as const;
export type TriggerEvent = (typeof TRIGGER_EVENTS)[number];

export const APPROVER_TYPES = [
  "User", "Role", "Reporting Manager", "Department Head", "Branch Head",
] as const;
export type ApproverType = (typeof APPROVER_TYPES)[number];

export const APPROVAL_MODES = [
  "Any One Approver", "All Approvers Required",
] as const;
export type ApprovalMode = (typeof APPROVAL_MODES)[number];

export const CONDITION_FIELDS = [
  "Amount", "Department", "Employee Grade", "Role", "Branch",
  "Customer", "Vendor", "Expense Category", "Project", "Transaction Type",
] as const;
export type ConditionField = (typeof CONDITION_FIELDS)[number];

export const OPERATORS = [
  "=", ">", "<", ">=", "<=", "Between", "Contains", "In",
] as const;
export type Operator = (typeof OPERATORS)[number];

export const NOTIFICATION_CHANNELS = [
  "CRM Notification", "Mobile Push", "Email", "WhatsApp",
] as const;
export type NotifChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_EVENTS = [
  "Approval Requested", "Approved", "Rejected",
  "SLA Breached", "Escalated", "Changes Requested",
] as const;
export type NotifEvent = (typeof NOTIFICATION_EVENTS)[number];

export const WORKFLOW_STATUSES = ["Active", "Inactive", "Draft"] as const;
export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

export const REQUEST_STATUSES = [
  "Pending", "Approved", "Rejected", "Escalated", "Cancelled", "Changes Requested",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const DEPARTMENTS = [
  "Sales", "Support", "Accounts", "Projects", "HR", "Procurement", "Admin",
] as const;

export const MOCK_ROLES = [
  "Engineer", "Senior Engineer", "Manager", "Senior Manager",
  "Accounts", "Operations Head", "Director",
];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApprovalCondition {
  id: number;
  field: ConditionField;
  operator: Operator;
  value: string;
  value2?: string;
  conjunction: "AND" | "OR";
}

export interface ApprovalLevel {
  id: number;
  level: number;
  label: string;
  approverType: ApproverType;
  approverValue: string;
  approvalMode: ApprovalMode;
  requireRemarks: boolean;
  attachmentAllowed: boolean;
  allowDelegate: boolean;
  allowReject: boolean;
  allowRequestChanges: boolean;
  slaHours: number;
}

export interface EscalationRule {
  id: number;
  afterHours: number;
  escalateTo: "Manager" | "Next Level" | "Specific User";
  specificUser?: string;
  repeatEvery?: number;
  maxEscalations?: number;
}

export interface NotificationConfig {
  event: NotifEvent;
  channels: NotifChannel[];
  enabled: boolean;
}

export interface Workflow {
  id: number;
  name: string;
  module: Module;
  transactionType: string;
  description: string;
  status: WorkflowStatus;
  triggerEvent: TriggerEvent;
  conditions: ApprovalCondition[];
  levels: ApprovalLevel[];
  escalation?: EscalationRule;
  notifications: NotificationConfig[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  pendingCount: number;
  avgApprovalHours: number;
}

export interface ApprovalHistoryEntry {
  level: number;
  approver: string;
  action: "Approved" | "Rejected" | "Changes Requested" | "Delegated" | "Escalated" | "Submitted";
  date: string;
  remarks?: string;
}

export interface ApprovalRequest {
  id: number;
  requestNo: string;
  workflowId: number;
  workflowName: string;
  module: Module;
  transactionType: string;
  requestedBy: string;
  requestedByDept: string;
  amount?: number;
  amountUnit?: string;
  details: string;
  submittedAt: string;
  currentLevel: number;
  totalLevels: number;
  currentApprover: string;
  status: RequestStatus;
  priority: Priority;
  slaHours: number;
  slaDeadline: string;
  breachedSLA: boolean;
  history: ApprovalHistoryEntry[];
  attachments: string[];
  remarks?: string;
  referenceId?: string;
}

export interface DelegationRule {
  id: number;
  fromEmployee: string;
  toEmployee: string;
  fromDate: string;
  toDate: string;
  modules: string[];
  reason: string;
  status: "Active" | "Expired" | "Pending";
  createdAt: string;
}

export interface ApprovalCaps {
  roleLabel: string;
  canConfigureWorkflows: boolean;
  canViewAllRequests: boolean;
  canApprove: boolean;
  canDelegate: boolean;
  canManageDelegations: boolean;
  canViewAnalytics: boolean;
  currentUser: string;
}

// ─── RBAC ─────────────────────────────────────────────────────────────────────

export function deriveCaps(f: {
  isManager: boolean;
  isOpsHead: boolean;
  userName: string;
}): ApprovalCaps {
  // Operations Head — full workflow configuration + all approvals
  if (f.isOpsHead) return {
    roleLabel: "Operations Head",
    canConfigureWorkflows: true, canViewAllRequests: true, canApprove: true,
    canDelegate: true, canManageDelegations: true, canViewAnalytics: true,
    currentUser: f.userName,
  };
  // Manager — can approve requests assigned to them, view analytics, delegate
  if (f.isManager) return {
    roleLabel: "Manager",
    canConfigureWorkflows: false, canViewAllRequests: false, canApprove: true,
    canDelegate: true, canManageDelegations: false, canViewAnalytics: true,
    currentUser: f.userName,
  };
  // Employee — approve only if they are the named approver on a request
  return {
    roleLabel: "Employee",
    canConfigureWorkflows: false, canViewAllRequests: false, canApprove: true,
    canDelegate: false, canManageDelegations: false, canViewAnalytics: false,
    currentUser: f.userName,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function fmtINR(n: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export function fmtDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtDateTime(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) + " " +
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export function timeSince(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function workflowStatusBadge(s: WorkflowStatus): string {
  if (s === "Active")   return "badge-success";
  if (s === "Inactive") return "badge-neutral";
  return "badge-warning";
}

export function requestStatusBadge(s: RequestStatus): string {
  if (s === "Approved")          return "badge-success";
  if (s === "Rejected")          return "badge-danger";
  if (s === "Pending")           return "badge-warning";
  if (s === "Escalated")         return "badge-danger";
  if (s === "Changes Requested") return "badge-info";
  return "badge-neutral";
}

export function priorityBadge(p: Priority): string {
  if (p === "Urgent") return "badge-danger";
  if (p === "High")   return "badge-warning";
  if (p === "Medium") return "badge-info";
  return "badge-neutral";
}

export function moduleBadge(m: Module): string {
  const MAP: Record<Module, string> = {
    Finance:     "badge-success",
    Sales:       "badge-accent",
    HR:          "badge-info",
    Procurement: "badge-warning",
    Projects:    "badge-neutral",
    Admin:       "badge-danger",
  };
  return MAP[m] ?? "badge-neutral";
}

export function makeBlankWorkflow(): Workflow {
  return {
    id: 0, name: "", module: "Finance", transactionType: "",
    description: "", status: "Draft", triggerEvent: "On Submit",
    conditions: [], levels: [], notifications: DEFAULT_NOTIFICATIONS,
    createdBy: "", createdAt: "", updatedAt: "", version: 1,
    pendingCount: 0, avgApprovalHours: 0,
  };
}

const DEFAULT_NOTIFICATIONS: NotificationConfig[] = NOTIFICATION_EVENTS.map((event) => ({
  event,
  channels: ["CRM Notification"] as NotifChannel[],
  enabled: true,
}));

// ─── Mock Data ─────────────────────────────────────────────────────────────────

export const MOCK_WORKFLOWS: Workflow[] = [
  {
    id: 1, name: "High Value Expense Approval", module: "Finance",
    transactionType: "Expense", version: 3,
    description: "3-level approval for expenses above ₹10,000. Manager → Accounts → Director.",
    status: "Active", triggerEvent: "On Submit",
    conditions: [{ id: 1, field: "Amount", operator: ">", value: "10000", conjunction: "AND" }],
    levels: [
      { id: 1, level: 1, label: "Manager Approval", approverType: "Reporting Manager", approverValue: "", approvalMode: "Any One Approver", requireRemarks: false, attachmentAllowed: true, allowDelegate: true, allowReject: true, allowRequestChanges: true, slaHours: 24 },
      { id: 2, level: 2, label: "Accounts Head", approverType: "Role", approverValue: "Accounts", approvalMode: "Any One Approver", requireRemarks: true, attachmentAllowed: true, allowDelegate: false, allowReject: true, allowRequestChanges: true, slaHours: 24 },
      { id: 3, level: 3, label: "Director Approval", approverType: "Role", approverValue: "Operations Head", approvalMode: "Any One Approver", requireRemarks: true, attachmentAllowed: false, allowDelegate: false, allowReject: true, allowRequestChanges: false, slaHours: 48 },
    ],
    escalation: { id: 1, afterHours: 24, escalateTo: "Next Level", repeatEvery: 12, maxEscalations: 3 },
    notifications: [
      { event: "Approval Requested", channels: ["CRM Notification", "Email"], enabled: true },
      { event: "Approved",           channels: ["CRM Notification", "Email"], enabled: true },
      { event: "Rejected",           channels: ["CRM Notification", "Email", "Mobile Push"], enabled: true },
      { event: "SLA Breached",       channels: ["CRM Notification", "Email", "Mobile Push"], enabled: true },
      { event: "Escalated",          channels: ["CRM Notification", "Mobile Push"], enabled: true },
      { event: "Changes Requested",  channels: ["CRM Notification"], enabled: true },
    ],
    createdBy: "Vijesh V", createdAt: "2026-05-01", updatedAt: "2026-05-15",
    pendingCount: 4, avgApprovalHours: 18.5,
  },
  {
    id: 2, name: "Employee Advance Request", module: "Finance",
    transactionType: "Employee Advance", version: 2,
    description: "Approval for salary/medical advance requests. Manager approves, Accounts disburses.",
    status: "Active", triggerEvent: "On Submit",
    conditions: [],
    levels: [
      { id: 1, level: 1, label: "Reporting Manager", approverType: "Reporting Manager", approverValue: "", approvalMode: "Any One Approver", requireRemarks: true, attachmentAllowed: false, allowDelegate: false, allowReject: true, allowRequestChanges: true, slaHours: 48 },
      { id: 2, level: 2, label: "Accounts Disbursement", approverType: "Role", approverValue: "Accounts", approvalMode: "Any One Approver", requireRemarks: true, attachmentAllowed: false, allowDelegate: false, allowReject: true, allowRequestChanges: false, slaHours: 24 },
    ],
    escalation: { id: 1, afterHours: 48, escalateTo: "Manager" },
    notifications: [
      { event: "Approval Requested", channels: ["CRM Notification", "Mobile Push"], enabled: true },
      { event: "Approved",           channels: ["CRM Notification", "Mobile Push", "Email"], enabled: true },
      { event: "Rejected",           channels: ["CRM Notification", "Email"], enabled: true },
      { event: "SLA Breached",       channels: ["CRM Notification", "Email"], enabled: true },
      { event: "Escalated",          channels: ["CRM Notification"], enabled: true },
      { event: "Changes Requested",  channels: ["CRM Notification"], enabled: true },
    ],
    createdBy: "Vijesh V", createdAt: "2026-05-01", updatedAt: "2026-05-20",
    pendingCount: 2, avgApprovalHours: 32,
  },
  {
    id: 3, name: "Local Conveyance Approval", module: "Finance",
    transactionType: "Local Conveyance", version: 1,
    description: "Single-level manager approval for daily travel reimbursement claims.",
    status: "Active", triggerEvent: "On Submit",
    conditions: [],
    levels: [
      { id: 1, level: 1, label: "Manager Approval", approverType: "Reporting Manager", approverValue: "", approvalMode: "Any One Approver", requireRemarks: false, attachmentAllowed: true, allowDelegate: true, allowReject: true, allowRequestChanges: true, slaHours: 72 },
    ],
    notifications: [
      { event: "Approval Requested", channels: ["CRM Notification"], enabled: true },
      { event: "Approved",           channels: ["CRM Notification", "Mobile Push"], enabled: true },
      { event: "Rejected",           channels: ["CRM Notification"], enabled: true },
      { event: "SLA Breached",       channels: ["CRM Notification"], enabled: false },
      { event: "Escalated",          channels: ["CRM Notification"], enabled: false },
      { event: "Changes Requested",  channels: ["CRM Notification"], enabled: true },
    ],
    createdBy: "Vijesh V", createdAt: "2026-05-10", updatedAt: "2026-05-10",
    pendingCount: 7, avgApprovalHours: 12,
  },
  {
    id: 4, name: "Vendor Onboarding Approval", module: "Procurement",
    transactionType: "Vendor Onboarding", version: 1,
    description: "New vendor creation requires Accounts + Operations Head approval before activation.",
    status: "Active", triggerEvent: "On Create",
    conditions: [],
    levels: [
      { id: 1, level: 1, label: "Accounts Verification", approverType: "Role", approverValue: "Accounts", approvalMode: "Any One Approver", requireRemarks: false, attachmentAllowed: true, allowDelegate: false, allowReject: true, allowRequestChanges: true, slaHours: 48 },
      { id: 2, level: 2, label: "Operations Head", approverType: "Role", approverValue: "Operations Head", approvalMode: "Any One Approver", requireRemarks: true, attachmentAllowed: false, allowDelegate: false, allowReject: true, allowRequestChanges: false, slaHours: 24 },
    ],
    notifications: [
      { event: "Approval Requested", channels: ["CRM Notification", "Email"], enabled: true },
      { event: "Approved",           channels: ["CRM Notification", "Email"], enabled: true },
      { event: "Rejected",           channels: ["CRM Notification", "Email"], enabled: true },
      { event: "SLA Breached",       channels: ["CRM Notification", "Email"], enabled: true },
      { event: "Escalated",          channels: ["CRM Notification"], enabled: false },
      { event: "Changes Requested",  channels: ["CRM Notification"], enabled: true },
    ],
    createdBy: "Vijesh V", createdAt: "2026-05-15", updatedAt: "2026-05-15",
    pendingCount: 1, avgApprovalHours: 28,
  },
  {
    id: 5, name: "Sales Discount Approval", module: "Sales",
    transactionType: "Discount Approval", version: 2,
    description: "Discounts above 5% require manager approval; above 15% require director.",
    status: "Active", triggerEvent: "On Amount Limit",
    conditions: [{ id: 1, field: "Amount", operator: ">", value: "5", conjunction: "AND" }],
    levels: [
      { id: 1, level: 1, label: "Sales Manager", approverType: "Reporting Manager", approverValue: "", approvalMode: "Any One Approver", requireRemarks: true, attachmentAllowed: false, allowDelegate: false, allowReject: true, allowRequestChanges: false, slaHours: 4 },
    ],
    notifications: [
      { event: "Approval Requested", channels: ["CRM Notification", "Mobile Push"], enabled: true },
      { event: "Approved",           channels: ["CRM Notification"], enabled: true },
      { event: "Rejected",           channels: ["CRM Notification"], enabled: true },
      { event: "SLA Breached",       channels: ["CRM Notification", "Mobile Push", "Email"], enabled: true },
      { event: "Escalated",          channels: ["CRM Notification", "Mobile Push"], enabled: true },
      { event: "Changes Requested",  channels: ["CRM Notification"], enabled: true },
    ],
    createdBy: "Vijesh V", createdAt: "2026-05-20", updatedAt: "2026-06-01",
    pendingCount: 3, avgApprovalHours: 2.5,
  },
  {
    id: 6, name: "Leave Approval", module: "HR",
    transactionType: "Leave Approval", version: 1,
    description: "Employee leave requests approved by the Reporting Manager.",
    status: "Active", triggerEvent: "On Submit",
    conditions: [],
    levels: [
      { id: 1, level: 1, label: "Reporting Manager", approverType: "Reporting Manager", approverValue: "", approvalMode: "Any One Approver", requireRemarks: false, attachmentAllowed: false, allowDelegate: true, allowReject: true, allowRequestChanges: false, slaHours: 24 },
    ],
    notifications: [
      { event: "Approval Requested", channels: ["CRM Notification", "Mobile Push"], enabled: true },
      { event: "Approved",           channels: ["CRM Notification", "Mobile Push"], enabled: true },
      { event: "Rejected",           channels: ["CRM Notification", "Mobile Push"], enabled: true },
      { event: "SLA Breached",       channels: ["CRM Notification"], enabled: false },
      { event: "Escalated",          channels: ["CRM Notification"], enabled: false },
      { event: "Changes Requested",  channels: ["CRM Notification"], enabled: true },
    ],
    createdBy: "Vijesh V", createdAt: "2026-05-01", updatedAt: "2026-05-01",
    pendingCount: 5, avgApprovalHours: 8,
  },
  {
    id: 7, name: "Asset Request Approval", module: "HR",
    transactionType: "Asset Request", version: 1,
    description: "Employee asset requests (laptop, phone, accessories) — manager + IT head approval.",
    status: "Draft", triggerEvent: "On Submit",
    conditions: [],
    levels: [
      { id: 1, level: 1, label: "Manager Approval", approverType: "Reporting Manager", approverValue: "", approvalMode: "Any One Approver", requireRemarks: true, attachmentAllowed: true, allowDelegate: false, allowReject: true, allowRequestChanges: true, slaHours: 48 },
    ],
    notifications: [
      { event: "Approval Requested", channels: ["CRM Notification"], enabled: true },
      { event: "Approved",           channels: ["CRM Notification", "Mobile Push"], enabled: true },
      { event: "Rejected",           channels: ["CRM Notification"], enabled: true },
      { event: "SLA Breached",       channels: ["CRM Notification"], enabled: false },
      { event: "Escalated",          channels: ["CRM Notification"], enabled: false },
      { event: "Changes Requested",  channels: ["CRM Notification"], enabled: true },
    ],
    createdBy: "Vijesh V", createdAt: "2026-06-01", updatedAt: "2026-06-01",
    pendingCount: 0, avgApprovalHours: 0,
  },
];

export const MOCK_REQUESTS: ApprovalRequest[] = [
  {
    id: 1, requestNo: "APR/26-27/0001", workflowId: 1,
    workflowName: "High Value Expense Approval",
    module: "Finance", transactionType: "Expense",
    requestedBy: "Rahul Sharma", requestedByDept: "Sales",
    amount: 18500, amountUnit: "₹",
    details: "Client entertainment + travel for TCS demo at Bangalore office",
    submittedAt: "2026-06-01T10:30:00", currentLevel: 2, totalLevels: 3,
    currentApprover: "Priyadharshini R", status: "Pending", priority: "High",
    slaHours: 24, slaDeadline: "2026-06-02T10:30:00", breachedSLA: true,
    history: [
      { level: 0, approver: "Rahul Sharma",  action: "Submitted", date: "2026-06-01T10:30:00" },
      { level: 1, approver: "Vijesh V",       action: "Approved",  date: "2026-06-01T14:20:00", remarks: "Approved. Attach all receipts." },
    ],
    attachments: ["receipt_tcs_dinner.pdf", "travel_bills.pdf"],
    referenceId: "EXP/26-27/0042",
  },
  {
    id: 2, requestNo: "APR/26-27/0002", workflowId: 2,
    workflowName: "Employee Advance Request",
    module: "Finance", transactionType: "Employee Advance",
    requestedBy: "Sneha Patil", requestedByDept: "Support",
    amount: 25000, amountUnit: "₹",
    details: "Medical emergency advance — requested for hospitalization expenses",
    submittedAt: "2026-06-02T09:00:00", currentLevel: 1, totalLevels: 2,
    currentApprover: "Vijesh V", status: "Pending", priority: "Urgent",
    slaHours: 48, slaDeadline: "2026-06-04T09:00:00", breachedSLA: false,
    history: [
      { level: 0, approver: "Sneha Patil", action: "Submitted", date: "2026-06-02T09:00:00" },
    ],
    attachments: [], referenceId: "ADV/26-27/0008",
  },
  {
    id: 3, requestNo: "APR/26-27/0003", workflowId: 5,
    workflowName: "Sales Discount Approval",
    module: "Sales", transactionType: "Discount Approval",
    requestedBy: "Deepak Kumar", requestedByDept: "Sales",
    amount: 12, amountUnit: "%",
    details: "12% discount requested for Infosys FY renewal — competitive situation",
    submittedAt: "2026-06-03T11:15:00", currentLevel: 1, totalLevels: 1,
    currentApprover: "Vijesh V", status: "Pending", priority: "High",
    slaHours: 4, slaDeadline: "2026-06-03T15:15:00", breachedSLA: true,
    history: [
      { level: 0, approver: "Deepak Kumar", action: "Submitted", date: "2026-06-03T11:15:00" },
    ],
    attachments: ["infosys_negotiation_note.docx"], referenceId: "QUOT/26-27/0155",
  },
  {
    id: 4, requestNo: "APR/26-27/0004", workflowId: 3,
    workflowName: "Local Conveyance Approval",
    module: "Finance", transactionType: "Local Conveyance",
    requestedBy: "Arun Nair", requestedByDept: "Support",
    amount: 2800, amountUnit: "₹",
    details: "June week 1 conveyance — 5 customer visits",
    submittedAt: "2026-06-03T17:00:00", currentLevel: 1, totalLevels: 1,
    currentApprover: "Vijesh V", status: "Pending", priority: "Medium",
    slaHours: 72, slaDeadline: "2026-06-06T17:00:00", breachedSLA: false,
    history: [
      { level: 0, approver: "Arun Nair", action: "Submitted", date: "2026-06-03T17:00:00" },
    ],
    attachments: [], referenceId: "CONV/26-27/0023",
  },
  {
    id: 5, requestNo: "APR/26-27/0005", workflowId: 6,
    workflowName: "Leave Approval",
    module: "HR", transactionType: "Leave Approval",
    requestedBy: "Meera Krishnan", requestedByDept: "Sales",
    details: "Annual leave — June 10–13 (4 days). Family function.",
    submittedAt: "2026-06-02T10:00:00", currentLevel: 1, totalLevels: 1,
    currentApprover: "Vijesh V", status: "Pending", priority: "Low",
    slaHours: 24, slaDeadline: "2026-06-03T10:00:00", breachedSLA: true,
    history: [
      { level: 0, approver: "Meera Krishnan", action: "Submitted", date: "2026-06-02T10:00:00" },
    ],
    attachments: [], referenceId: "LEAVE/26-27/0041",
  },
  {
    id: 6, requestNo: "APR/26-27/0006", workflowId: 4,
    workflowName: "Vendor Onboarding Approval",
    module: "Procurement", transactionType: "Vendor Onboarding",
    requestedBy: "Priyadharshini R", requestedByDept: "Accounts",
    details: "New vendor: Microchip Systems Pvt Ltd — IT hardware supplier. GSTIN verified.",
    submittedAt: "2026-06-03T14:30:00", currentLevel: 1, totalLevels: 2,
    currentApprover: "Priyadharshini R", status: "Pending", priority: "Medium",
    slaHours: 48, slaDeadline: "2026-06-05T14:30:00", breachedSLA: false,
    history: [
      { level: 0, approver: "Priyadharshini R", action: "Submitted", date: "2026-06-03T14:30:00" },
    ],
    attachments: ["microchip_kyc.pdf", "gstin_cert.pdf"], referenceId: "VND/26-27/0019",
  },
  {
    id: 7, requestNo: "APR/26-27/0007", workflowId: 1,
    workflowName: "High Value Expense Approval",
    module: "Finance", transactionType: "Expense",
    requestedBy: "Karan Mehta", requestedByDept: "Sales",
    amount: 45000, amountUnit: "₹",
    details: "Annual partner summit registration + travel (Delhi) — CrowdStrike event",
    submittedAt: "2026-06-01T08:00:00", currentLevel: 3, totalLevels: 3,
    currentApprover: "Vijesh V", status: "Approved", priority: "High",
    slaHours: 24, slaDeadline: "2026-06-02T08:00:00", breachedSLA: false,
    history: [
      { level: 0, approver: "Karan Mehta",      action: "Submitted", date: "2026-06-01T08:00:00" },
      { level: 1, approver: "Vijesh V",           action: "Approved",  date: "2026-06-01T10:00:00", remarks: "Approved for partner summit." },
      { level: 2, approver: "Priyadharshini R",   action: "Approved",  date: "2026-06-01T14:00:00", remarks: "Invoice verified." },
      { level: 3, approver: "Vijesh V",           action: "Approved",  date: "2026-06-01T16:00:00", remarks: "Final approval. Process payment." },
    ],
    attachments: ["crowdstrike_invoice.pdf"], referenceId: "EXP/26-27/0038",
  },
  {
    id: 8, requestNo: "APR/26-27/0008", workflowId: 6,
    workflowName: "Leave Approval",
    module: "HR", transactionType: "Leave Approval",
    requestedBy: "Rahul Sharma", requestedByDept: "Sales",
    details: "Sick leave — June 2 (1 day).",
    submittedAt: "2026-06-02T07:00:00", currentLevel: 1, totalLevels: 1,
    currentApprover: "Vijesh V", status: "Rejected", priority: "Low",
    slaHours: 24, slaDeadline: "2026-06-03T07:00:00", breachedSLA: false,
    history: [
      { level: 0, approver: "Rahul Sharma", action: "Submitted", date: "2026-06-02T07:00:00" },
      { level: 1, approver: "Vijesh V",      action: "Rejected",  date: "2026-06-02T09:30:00", remarks: "Critical client visit on June 2. Please reschedule." },
    ],
    attachments: [], referenceId: "LEAVE/26-27/0039",
  },
  {
    id: 9, requestNo: "APR/26-27/0009", workflowId: 5,
    workflowName: "Sales Discount Approval",
    module: "Sales", transactionType: "Discount Approval",
    requestedBy: "Vijesh V", requestedByDept: "Sales",
    amount: 8, amountUnit: "%",
    details: "8% discount for Wipro annual renewal — 3-year deal",
    submittedAt: "2026-06-04T09:00:00", currentLevel: 1, totalLevels: 1,
    currentApprover: "Vijesh V", status: "Pending", priority: "Medium",
    slaHours: 4, slaDeadline: "2026-06-04T13:00:00", breachedSLA: false,
    history: [
      { level: 0, approver: "Vijesh V", action: "Submitted", date: "2026-06-04T09:00:00" },
    ],
    attachments: [], referenceId: "QUOT/26-27/0162",
  },
];

export const MOCK_DELEGATIONS: DelegationRule[] = [
  {
    id: 1, fromEmployee: "Vijesh V", toEmployee: "Priyadharshini R",
    fromDate: "2026-06-10", toDate: "2026-06-15",
    modules: ["Finance", "HR"], reason: "Annual leave — family event",
    status: "Pending", createdAt: "2026-06-04",
  },
  {
    id: 2, fromEmployee: "Deepak Kumar", toEmployee: "Rahul Sharma",
    fromDate: "2026-05-20", toDate: "2026-05-25",
    modules: ["Sales"], reason: "Medical leave",
    status: "Expired", createdAt: "2026-05-18",
  },
  {
    id: 3, fromEmployee: "Sneha Patil", toEmployee: "Arun Nair",
    fromDate: "2026-06-08", toDate: "2026-06-09",
    modules: ["Finance"], reason: "Weekend trip",
    status: "Pending", createdAt: "2026-06-04",
  },
];
