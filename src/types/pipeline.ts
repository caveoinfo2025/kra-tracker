// ── Stage constants ────────────────────────────────────────────────────────────

export const LEAD_STAGES = [
  "NEW_LEAD",
  "CONTACTED",
  "QUALIFIED",
  "REQUIREMENT_GATHERED",
  "SOLUTION_PROPOSED",
  "POC_DEMO",
  "PROPOSAL_SENT",
] as const;

export const OPP_STAGES = [
  "PROPOSAL_SENT",
  "FOLLOW_UP",
  "NEGOTIATION",
  "WON",
  "LOST",
  "ON_HOLD",
] as const;

export type LeadStage = (typeof LEAD_STAGES)[number];
export type OppStage  = (typeof OPP_STAGES)[number];

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  NEW_LEAD:             "New Lead",
  CONTACTED:            "Contacted",
  QUALIFIED:            "Qualified",
  REQUIREMENT_GATHERED: "Req. Gathered",
  SOLUTION_PROPOSED:    "Solution Proposed",
  POC_DEMO:             "POC / Demo",
  PROPOSAL_SENT:        "Proposal Sent",
};

export const OPP_STAGE_LABELS: Record<OppStage, string> = {
  PROPOSAL_SENT: "Proposal Sent",
  FOLLOW_UP:     "Follow-up",
  NEGOTIATION:   "Negotiation",
  WON:           "Won",
  LOST:          "Lost",
  ON_HOLD:       "On Hold",
};

export const LEAD_SOURCES = [
  "Direct",
  "Referral",
  "LinkedIn",
  "Email Campaign",
  "Cold Call",
  "Website",
  "Partner",
  "Event",
  "Other",
] as const;

export const TASK_STATUSES  = ["pending", "in_progress", "completed", "cancelled"] as const;
export const TASK_PRIORITIES = ["low", "medium", "high"] as const;

// ── Serialized types (safe for JSON pass to client components) ─────────────────

export type LeadSerialized = {
  id: number;
  title: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  source: string;
  categoryId: string | null;
  categoryName: string;
  oemId: string | null;
  oemName: string;
  productId: string | null;
  productName: string;
  customerId: string | null;
  customerName: string;
  stage: string;
  expectedValue: number;
  remarks: string;
  assignedToId: number;
  assignedTo: { id: number; name: string };
  createdById: number;
  createdBy: { id: number; name: string };
  createdAt: string;
  updatedAt: string;
  opportunity: OpportunitySerialized | null;
  _count?: { tasks: number; meetings: number; notes: number };
};

export type OpportunitySerialized = {
  id: number;
  leadId: number;
  stage: string;
  value: number;
  discountPct: number;
  expectedClosureDate: string | null;
  probability: number;
  lostReason: string;
  // Closed Won fields
  dealValueExTax: number;
  netProfitLakhs: number;
  poNumber: string;
  poDate: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  lead?: Partial<LeadSerialized>;
};

export type TaskSerialized = {
  id: number;
  title: string;
  description: string;
  dueDate: string;
  assignedToId: number;
  assignedTo: { id: number; name: string };
  status: string;
  priority: string;
  leadId: number | null;
  lead?: { id: number; title: string; companyName: string } | null;
  opportunityId: number | null;
  opportunity?: { id: number; stage: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type ActivitySerialized = {
  id: number;
  entityType: string;
  entityId: number;
  action: string;
  description: string;
  meta: string;
  performedById: number;
  performedBy: { id: number; name: string };
  timestamp: string;
  leadId: number | null;
  opportunityId: number | null;
};

export type NoteSerialized = {
  id: number;
  content: string;
  leadId: number;
  authorId: number;
  author: { id: number; name: string };
  createdAt: string;
};
