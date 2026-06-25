/**
 * Static mock data for the Stitch-based Caveo Employee App UI.
 * UI-only — no API/DB calls. Replace with real data sources when wiring the backend.
 */

export const mockUser = {
  name: "Vijesh Vijayan",
  role: "Operations Manager",
  employeeId: "CV-99281",
  department: "Sales & Operations",
  email: "vijesh@caveoinfosystems.com",
  reportingManager: "Vikram Singh",
  phone: "+91 98765 43210",
};

export const mockHomeKpis = [
  { label: "Pending Tasks", value: "14" },
  { label: "Open Approvals", value: "03", accent: true },
  { label: "Meetings", value: "05" },
  { label: "KRA Score", value: "88", unit: "%" },
];

export const mockHomeActivity = [
  { time: "10:42 AM", title: "System Alert", body: "Anomaly detected in EU-West sector routing tables. Auto-mitigation initiated.", state: "current" as const },
  { time: "09:15 AM", title: "User Action", body: "Authorized deployment of version 4.2 patches to staging environments.", state: "past" as const },
  { time: "08:00 AM", title: "Automated Routine", body: "Daily perimeter security scan completed. All access logs nominal.", state: "past" as const },
];

export const mockAttendance = {
  status: "checked-in" as const,
  checkInTime: "09:08 AM",
  projectedCheckout: "06:08 PM",
  daysPresent: 21,
  infractions: 1,
  leaveBalance: 6,
  location: "Caveo HQ, Bengaluru",
  logs: [
    { date: "Today", checkIn: "09:08 AM", checkOut: "—", status: "approved" as const, note: "On time" },
    { date: "Yesterday", checkIn: "09:42 AM", checkOut: "06:15 PM", status: "pending" as const, note: "Late entry — auto-flagged" },
    { date: "Mon, 22 Jun", checkIn: "08:55 AM", checkOut: "06:02 PM", status: "approved" as const, note: "On time" },
    { date: "Fri, 19 Jun", checkIn: "—", checkOut: "—", status: "info" as const, note: "On approved leave" },
  ],
};

// Daily Updates now reads real data via GET /api/daily-updates — see DailyUpdatesScreen.tsx
// and docs/Mobile/EMPLOYEE_MOBILE_APP_REAL_DATA_INTEGRATION_PLAN.md. Mock fixture removed.

export const mockTasks = [
  { id: "TSK-2291", title: "Q3 Infrastructure Audit", assignee: "You", priority: "high" as const, status: "in-progress" as const, due: "Today, 5:00 PM", dept: "Security", estimate: "4h" },
  { id: "TSK-2287", title: "Renew TLS certificates — EU-West cluster", assignee: "You", priority: "high" as const, status: "overdue" as const, due: "Yesterday", dept: "Infrastructure", estimate: "2h" },
  { id: "TSK-2299", title: "Onboard new vendor — Apex Manufacturing", assignee: "You", priority: "medium" as const, status: "pending" as const, due: "Tomorrow", dept: "Sales", estimate: "1h" },
  { id: "TSK-2302", title: "Weekly KRA rollup submission", assignee: "You", priority: "low" as const, status: "completed" as const, due: "Mon, 22 Jun", dept: "Operations", estimate: "30m" },
];

export const mockTaskDetail = {
  id: "TSK-2291",
  title: "Q3 Infrastructure Audit — Mission Critical Enterprise",
  priority: "high" as const,
  status: "in-progress" as const,
  assignedBy: "Vikram Singh",
  dueDate: "26 Jun 2026",
  department: "Security",
  timeEstimate: "4h",
  description:
    "Conduct a full review of perimeter security controls and access logs for the EU-West data cluster ahead of the Q3 compliance audit. Document gaps against the SOC 2 control matrix.",
  subtasks: [
    { label: "Pull access logs for the last 90 days", done: true },
    { label: "Cross-check firewall rule changes against change tickets", done: false },
    { label: "Draft gap report for compliance review", done: false },
  ],
};

export const mockSalesKpis = [
  { label: "Total Pipeline", value: "₹4.8", unit: "Cr" },
  { label: "Deals Won", value: "12" },
  { label: "Win Rate", value: "38", unit: "%" },
];

export const mockDeals = [
  { id: 1, company: "TechVision Corp", stage: "negotiation" as const, value: "₹62 L", owner: "You", nextAction: "Finalize MSA terms" },
  { id: 2, company: "Apex Manufacturing", stage: "discovery" as const, value: "₹38 L", owner: "You", nextAction: "Schedule OT security demo" },
  { id: 3, company: "Northbridge Logistics", stage: "proposal" as const, value: "₹1.2 Cr", owner: "You", nextAction: "Send revised proposal" },
  { id: 4, company: "Solis Energy", stage: "won" as const, value: "₹85 L", owner: "You", nextAction: "Kick-off scheduling" },
];

export const mockLeadDetail = {
  company: "TechVision Corp",
  location: "Pune, Maharashtra",
  dealValue: "₹62 L",
  stage: "Negotiation",
  contact: { name: "Rahul Mehta", title: "VP Infrastructure", phone: "+91 90000 11122", email: "rahul.mehta@techvision.example" },
  interactions: [
    { type: "call" as const, title: "Discovery call", meta: "18 Jun · 32 min", body: "Discussed managed SOC scope and current MDR vendor pain points." },
    { type: "mail" as const, title: "Proposal sent", meta: "20 Jun", body: "Sent the converged IT/OT SOC proposal with pricing tiers." },
    { type: "note" as const, title: "Internal note", meta: "21 Jun", body: "Legal flagged a liability cap clause — routed to contracts team." },
  ],
  timeline: [
    { time: "12 Jun", title: "Lead created", state: "past" as const },
    { time: "18 Jun", title: "Discovery", state: "past" as const },
    { time: "20 Jun", title: "Proposal sent", state: "past" as const },
    { time: "Now", title: "Negotiation", state: "current" as const },
    { time: "Pending", title: "Closed won", state: "future" as const },
  ],
};

export const mockFinance = {
  pendingReimbursement: "₹18,400",
  claims: [
    { id: "EXP-3381", title: "Client visit — TechVision Corp", amount: "₹6,200", status: "processing" as const, date: "21 Jun" },
    { id: "EXP-3375", title: "Conveyance — Apex Manufacturing site visit", amount: "₹1,850", status: "action-required" as const, date: "19 Jun" },
  ],
  statusTimeline: [
    { time: "19 Jun", title: "Submitted", state: "past" as const },
    { time: "19 Jun", title: "Manager approved", state: "past" as const },
    { time: "Now", title: "Finance review", state: "current" as const },
    { time: "Pending", title: "Paid", state: "future" as const },
  ],
};

export const mockApprovals = [
  { id: "APR-551", person: "Rahul Sharma", type: "Expense Report", amount: "₹6,200", priority: "high" as const, date: "Today" },
  { id: "APR-549", person: "Anjali Rao", type: "Leave Request", amount: "2 days", priority: "medium" as const, date: "Today" },
  { id: "APR-544", person: "Karthik Iyer", type: "Infra Modification", amount: "Firewall rule change", priority: "low" as const, date: "Yesterday" },
];

export const mockApprovalDetail = {
  id: "APR-551",
  requester: "Rahul Sharma",
  totalAmount: "₹6,200",
  status: "action-required" as const,
  items: [
    { icon: "briefcase", label: "Flight — BLR to PNQ", amount: "₹3,400" },
    { icon: "building", label: "Hotel — 1 night", amount: "₹2,100" },
    { icon: "credit-card", label: "Client dinner", amount: "₹700" },
  ],
  receipts: ["flight_ticket.pdf", "hotel_invoice.pdf", "dinner_receipt.jpg"],
  workflow: [
    { time: "19 Jun, 10:02 AM", title: "Submitted by Rahul Sharma", state: "past" as const },
    { time: "19 Jun, 02:40 PM", title: "Manager review", body: "Looks fine, forwarding to finance.", state: "past" as const },
    { time: "Now", title: "Awaiting your decision", state: "current" as const },
  ],
};

export const mockKra = {
  overallScore: 88,
  metrics: [
    { label: "Sales Target", target: "₹1.2 Cr", achieved: "₹98 L", percent: 82 },
    { label: "Billing Achievement", target: "₹85 L", achieved: "₹79 L", percent: 93 },
    { label: "Pipeline Coverage", target: "3.0x", achieved: "3.4x", percent: 100 },
  ],
};

export const mockNotifications = {
  actionRequired: {
    title: "Expense report needs your approval",
    description: "Rahul Sharma submitted a ₹6,200 expense report — pending since yesterday.",
  },
  recent: [
    { icon: "doc", category: "Task", title: "TLS certificate renewal is overdue", time: "2h ago", tone: "danger" as const },
    { icon: "wallet", category: "Finance", title: "Conveyance claim EXP-3375 needs a receipt", time: "5h ago", tone: "warn" as const },
    { icon: "shield", category: "System", title: "Daily perimeter scan completed — all clear", time: "Yesterday", tone: "info" as const },
  ],
};

export const mockProfile = {
  ...mockUser,
  preferences: [
    { icon: "bell", label: "Notification settings" },
    { icon: "shield", label: "Security & privacy" },
    { icon: "settings", label: "App preferences" },
    { icon: "log-out", label: "Sign out" },
  ],
};
