/**
 * Application settings service.
 *
 * Settings are stored in the AppSetting table as JSON strings.
 * getSetting() always falls back to the built-in default if the row
 * doesn't exist yet, so new settings work immediately after a deploy
 * without a migration that seeds data.
 *
 * Usage:
 *   import { getSetting } from "@/lib/settings";
 *   const stages = await getSetting("pipeline.lead_stages");  // string[]
 */
import prisma from "./prisma";

// ── Default values ─────────────────────────────────────────────────────────
export const SETTING_DEFAULTS: Record<string, unknown> = {
  // Pipeline
  "pipeline.lead_stages": [
    "NEW_LEAD","CONTACTED","QUALIFIED","REQUIREMENT_GATHERED",
    "SOLUTION_PROPOSED","POC_DEMO","PROPOSAL_SENT",
  ],
  "pipeline.lead_stage_labels": {
    NEW_LEAD: "New Lead", CONTACTED: "Contacted", QUALIFIED: "Qualified",
    REQUIREMENT_GATHERED: "Requirement Gathered", SOLUTION_PROPOSED: "Solution Proposed",
    POC_DEMO: "PoC / Demo", PROPOSAL_SENT: "Proposal Sent",
  },
  "pipeline.opp_stages": [
    "PROPOSAL_SENT","FOLLOW_UP","NEGOTIATION","WON","LOST","ON_HOLD",
  ],
  "pipeline.opp_stage_labels": {
    PROPOSAL_SENT: "Proposal Sent", FOLLOW_UP: "Follow-up", NEGOTIATION: "Negotiation",
    WON: "Won", LOST: "Lost", ON_HOLD: "On Hold",
  },
  "pipeline.lead_sources": [
    "Direct","Referral","LinkedIn","Email Campaign","Cold Call",
    "Website","Partner","Event","Other",
  ],
  "pipeline.auto_task_delay_hours": 1,
  "pipeline.default_opp_probability": 60,

  // Sales funnel
  "sales_funnel.stages": ["Lead","Qualified","Proposal","Negotiation","Closed Won","Closed Lost"],
  "sales_funnel.closed_won_stage": "Closed Won",
  "sales_funnel.default_status": "Active",

  // Collections
  "collections.statuses": ["Pending","Partial","Fully Received","Overdue","Written Off"],
  "collections.default_status": "Pending",

  // Lead generation
  "lead_gen.statuses": ["New","In Progress","Qualified","Disqualified","Converted"],
  "lead_gen.activity_types": [
    "Cold Call","Email","LinkedIn","Visit","Demo","Follow-up","Other",
  ],

  // Daily updates
  "daily_updates.statuses": ["On Track","At Risk","Blocked","Completed"],

  // Tasks
  "tasks.statuses": ["pending","in_progress","completed","cancelled"],
  "tasks.priorities": ["low","medium","high"],
  "tasks.default_priority": "medium",

  // CRM master data
  "crm.categories": [
    "Network & Security","Server & Storage","MSSP Services",
    "Cloud Security & Services","Endpoint Security","IAM & PAM","Other",
  ],
  "crm.oems": [
    "Cisco","Fortinet","Palo Alto Networks","CrowdStrike","Microsoft",
    "Dell","HPE","Nutanix","VMware","SentinelOne","Check Point","Trend Micro",
  ],

  // KRA scoring bands (progress% → score)
  "kra.scoring_bands": [
    { min: 100, score: 10 },
    { min: 90,  score: 9  },
    { min: 75,  score: 8  },
    { min: 60,  score: 7  },
    { min: 50,  score: 6  },
    { min: 40,  score: 5  },
    { min: 30,  score: 4  },
    { min: 20,  score: 3  },
    { min: 1,   score: 2  },
    { min: 0,   score: 1  },
  ],

  // KRA sub-weights (must sum to 1.0 per KRA type)
  "kra.weights.sales_revenue": {
    booking: 0.375, billing: 0.375, gross_profit: 0.125, collections: 0.125,
  },
  "kra.weights.pipeline_building": {
    qualified_leads: 0.52, appointments: 0.48,
  },
  "kra.weights.funnel_creation": {
    pipeline_value: 0.75, opportunity_count: 0.25,
  },
  "kra.weights.team_revenue": {
    booking: 0.375, billing: 0.325, gross_profit: 0.20, collections: 0.10,
  },
  "kra.weights.market_growth": {
    new_logos: 0.48, new_projects: 0.32, focus_area_mix: 0.20,
  },
  "kra.weights.pipeline_health": {
    pipeline_coverage: 0.53, forecast_accuracy: 0.33, deal_win_rate: 0.14,
  },

  // KRA default targets (per employee, ₹L or counts)
  "kra.targets.sales_revenue_booking_lakhs": 70,
  "kra.targets.gross_profit_margin_pct": 10,
  "kra.targets.collections_rate_pct": 90,
  "kra.targets.lead_gen_calls": 180,
  "kra.targets.lead_gen_connects": 50,
  "kra.targets.pipeline_qualified_leads": 25,
  "kra.targets.pipeline_appointments": 25,
  "kra.targets.funnel_pipeline_value_lakhs": 75,
  "kra.targets.funnel_opportunity_count": 10,
  "kra.targets.sales_mgmt_poc": 4,
  "kra.targets.team_booking_lakhs": 500,
  "kra.targets.team_billing_lakhs": 450,
  "kra.targets.team_gp_margin_pct": 12,
  "kra.targets.team_new_logos": 10,
  "kra.targets.team_new_projects": 15,
  "kra.targets.team_focus_area_mix_pct": 85,
  "kra.targets.team_pipeline_value_lakhs": 1500,
  "kra.targets.team_forecast_accuracy_pct": 90,
  "kra.targets.team_win_rate_pct": 30,

  // Finance Operations
  "finance.conveyance_rate_per_km": 4.5,
  "finance.advance_max_months_salary": 2,
  "finance.expense_max_days_backdated": 90,
  "finance.voucher_prefix": "CI",
  "finance.fiscal_year_label": "2026-27",
  "finance.auto_approve_expense_below": 500,
  "finance.expense_receipt_required_above": 200,

  // Approvals
  "approvals.reminder_after_days": 2,
  "approvals.escalate_after_days": 5,
  "approvals.max_approval_levels": 3,
  "approvals.notify_on_status_change": "true",
  "approvals.auto_approve_below_amount": 0,

  // Masters
  "masters.gstin_validation_enabled": "true",
  "masters.duplicate_name_threshold_pct": 85,
  "masters.require_pan_for_vendor": "false",
  "masters.customer_credit_limit_default": 5,

  // System
  "system.pagination_default": 50,
  "system.pagination_max": 100,
  "system.session_timeout_hours": 8,
  "system.fiscal_year_start_month": 4,   // April = 4
  "system.app_name": "Caveo CRM",
  "system.company_name": "Caveo Infosystems",
  "system.fiscal_label": "Q1 2026–27",
};

// ── Metadata (label + description for the admin UI) ────────────────────────
export const SETTING_META: Record<string, { label: string; description: string; category: string }> = {
  "pipeline.lead_stages":            { category: "pipeline",    label: "Lead Stages",              description: "Ordered list of stage keys used in the pipeline board." },
  "pipeline.lead_stage_labels":      { category: "pipeline",    label: "Lead Stage Labels",         description: "Display names for each lead stage key." },
  "pipeline.opp_stages":             { category: "pipeline",    label: "Opportunity Stages",        description: "Ordered stages for the opportunity funnel." },
  "pipeline.opp_stage_labels":       { category: "pipeline",    label: "Opportunity Stage Labels",  description: "Display names for each opportunity stage key." },
  "pipeline.lead_sources":           { category: "pipeline",    label: "Lead Sources",              description: "Dropdown options for how a lead was acquired." },
  "pipeline.auto_task_delay_hours":  { category: "pipeline",    label: "Auto Follow-up Delay (h)",  description: "Hours after lead creation before the auto follow-up task is due." },
  "pipeline.default_opp_probability":{ category: "pipeline",    label: "Default Opp Probability %", description: "Default win probability when an opportunity is first created." },

  "sales_funnel.stages":             { category: "sales_funnel",label: "Sales Funnel Stages",       description: "Ordered stage list for the sales funnel / opportunity tracker." },
  "sales_funnel.closed_won_stage":   { category: "sales_funnel",label: "Closed-Won Stage Name",     description: "The stage name that triggers automatic closed-date recording." },
  "sales_funnel.default_status":     { category: "sales_funnel",label: "Default Funnel Status",     description: "Status applied to new sales funnel entries." },

  "collections.statuses":            { category: "collections", label: "Collection Statuses",       description: "Allowed statuses for invoice collection records." },
  "collections.default_status":      { category: "collections", label: "Default Status",            description: "Status applied when a new collection record is created." },

  "lead_gen.statuses":               { category: "lead_gen",    label: "Lead Gen Statuses",         description: "Status options for lead generation activity records." },
  "lead_gen.activity_types":         { category: "lead_gen",    label: "Activity Types",            description: "Types of outreach activities available in lead generation." },

  "daily_updates.statuses":          { category: "daily_updates",label:"Daily Update Statuses",     description: "Status options for a daily update entry." },

  "tasks.statuses":                  { category: "tasks",       label: "Task Statuses",             description: "Allowed statuses for pipeline tasks." },
  "tasks.priorities":                { category: "tasks",       label: "Task Priorities",           description: "Priority levels for pipeline tasks." },
  "tasks.default_priority":          { category: "tasks",       label: "Default Task Priority",     description: "Priority assigned to auto-created tasks." },

  "crm.categories":                  { category: "crm",         label: "Solution Categories",       description: "Product/solution categories shown in lead and pipeline forms." },
  "crm.oems":                        { category: "crm",         label: "OEM / Vendors",             description: "Vendor / OEM names available in the pipeline lead form." },

  "kra.scoring_bands":               { category: "kra",         label: "KRA Scoring Bands",         description: "Maps progress percentage ranges to a 1–10 score." },
  "kra.weights.sales_revenue":       { category: "kra",         label: "Sales Revenue Sub-weights", description: "Weights (sum=1) for Booking, Billing, GP, Collections." },
  "kra.weights.pipeline_building":   { category: "kra",         label: "Pipeline Building Sub-weights",description:"Weights for Qualified Leads vs Appointments." },
  "kra.weights.funnel_creation":     { category: "kra",         label: "Funnel Creation Sub-weights",  description:"Weights for Pipeline Value vs Opportunity Count." },
  "kra.weights.team_revenue":        { category: "kra",         label: "Team Revenue Sub-weights",  description: "Weights for team-level revenue KRA components." },
  "kra.weights.market_growth":       { category: "kra",         label: "Market Growth Sub-weights", description: "Weights for New Logos, New Projects, Focus Area Mix." },
  "kra.weights.pipeline_health":     { category: "kra",         label: "Pipeline Health Sub-weights",description:"Weights for Coverage, Forecast Accuracy, Win Rate." },

  "kra.targets.sales_revenue_booking_lakhs":   { category: "kra_targets", label: "Sales Booking Target (₹L)",        description: "Default individual monthly booking target in ₹ Lakhs." },
  "kra.targets.gross_profit_margin_pct":       { category: "kra_targets", label: "Gross Profit Margin % Target",     description: "Target GP margin % for sales revenue KRA." },
  "kra.targets.collections_rate_pct":          { category: "kra_targets", label: "Collections Rate % Target",        description: "Target collection rate as % of billed amount." },
  "kra.targets.lead_gen_calls":                { category: "kra_targets", label: "Lead Gen: Outbound Calls Target",  description: "Monthly outbound call count target." },
  "kra.targets.lead_gen_connects":             { category: "kra_targets", label: "Lead Gen: Meaningful Connects",    description: "Monthly meaningful connects / qualified conversations target." },
  "kra.targets.pipeline_qualified_leads":      { category: "kra_targets", label: "Pipeline: Qualified Leads Target", description: "Monthly qualified leads target for pipeline building KRA." },
  "kra.targets.pipeline_appointments":         { category: "kra_targets", label: "Pipeline: Appointments Target",    description: "Monthly appointments target." },
  "kra.targets.funnel_pipeline_value_lakhs":   { category: "kra_targets", label: "Funnel Pipeline Value (₹L)",       description: "Target active pipeline value in ₹ Lakhs." },
  "kra.targets.funnel_opportunity_count":      { category: "kra_targets", label: "Funnel Opportunity Count",         description: "Target number of active opportunities." },
  "kra.targets.sales_mgmt_poc_count":          { category: "kra_targets", label: "Sales Mgmt: PoC Target",           description: "Monthly PoC / demo target count." },
  "kra.targets.team_booking_lakhs":            { category: "kra_targets", label: "Team Booking Target (₹L)",         description: "Monthly team-wide booking target in ₹ Lakhs." },
  "kra.targets.team_billing_lakhs":            { category: "kra_targets", label: "Team Billing Target (₹L)",         description: "Monthly team-wide billing target in ₹ Lakhs." },
  "kra.targets.team_gp_margin_pct":            { category: "kra_targets", label: "Team GP Margin % Target",          description: "Team-level gross profit margin target." },
  "kra.targets.team_new_logos":                { category: "kra_targets", label: "Team: New Logos Target",           description: "Monthly new customer logo acquisition target." },
  "kra.targets.team_new_projects":             { category: "kra_targets", label: "Team: New Projects Target",        description: "Monthly new project wins target." },
  "kra.targets.team_focus_area_mix_pct":       { category: "kra_targets", label: "Team: Focus Area Mix % Target",    description: "% of revenue from focus solution categories." },
  "kra.targets.team_pipeline_value_lakhs":     { category: "kra_targets", label: "Team Pipeline Value (₹L)",         description: "Team-level active pipeline value target." },
  "kra.targets.team_forecast_accuracy_pct":    { category: "kra_targets", label: "Team Forecast Accuracy %",         description: "Target forecast-to-actual accuracy percentage." },
  "kra.targets.team_win_rate_pct":             { category: "kra_targets", label: "Team Win Rate %",                  description: "Target deal win rate as a percentage." },

  // Finance Operations
  "finance.conveyance_rate_per_km":         { category: "finance", label: "Conveyance Rate (₹/km)",          description: "Reimbursement rate per kilometre for conveyance claims." },
  "finance.advance_max_months_salary":      { category: "finance", label: "Max Advance (× monthly salary)",  description: "Maximum salary advance as a multiple of monthly salary." },
  "finance.expense_max_days_backdated":     { category: "finance", label: "Max Backdated Expense Days",      description: "How many days in the past an expense entry can be dated." },
  "finance.voucher_prefix":                 { category: "finance", label: "Voucher Prefix",                  description: "Company prefix used in voucher numbers (e.g. CI → CI/26-27/00001)." },
  "finance.fiscal_year_label":              { category: "finance", label: "Finance Fiscal Year Label",       description: "Label used in voucher numbers and reports (e.g. 2026-27)." },
  "finance.auto_approve_expense_below":     { category: "finance", label: "Auto-Approve Expenses Below (₹)", description: "Expenses below this amount are auto-approved without a workflow step." },
  "finance.expense_receipt_required_above": { category: "finance", label: "Receipt Required Above (₹)",      description: "Receipts must be uploaded for expenses above this amount." },

  // Approvals
  "approvals.reminder_after_days":      { category: "approvals", label: "Reminder After (days)",          description: "Send a reminder to the approver after this many idle days." },
  "approvals.escalate_after_days":      { category: "approvals", label: "Escalate After (days)",          description: "Escalate to the next level after this many days with no action." },
  "approvals.max_approval_levels":      { category: "approvals", label: "Max Approval Levels",            description: "Maximum number of levels in any approval chain." },
  "approvals.notify_on_status_change":  { category: "approvals", label: "Notify on Status Change",        description: "Notify the requester when their request is approved or rejected." },
  "approvals.auto_approve_below_amount":{ category: "approvals", label: "Auto-Approve Below Amount (₹)",  description: "Requests below this amount skip the approval workflow entirely (0 = disabled)." },

  // Masters
  "masters.gstin_validation_enabled":      { category: "masters", label: "GSTIN Validation",              description: "Validate GSTIN format and state code when adding vendors/customers." },
  "masters.duplicate_name_threshold_pct":  { category: "masters", label: "Duplicate Name Threshold (%)",  description: "Fuzzy-match similarity % above which a potential duplicate is flagged." },
  "masters.require_pan_for_vendor":        { category: "masters", label: "Require PAN for Vendor",        description: "Block vendor creation without a valid PAN number." },
  "masters.customer_credit_limit_default": { category: "masters", label: "Default Credit Limit (₹L)",     description: "Default credit limit assigned to new customer master records." },

  "system.pagination_default":       { category: "system",      label: "Default Page Size",         description: "Default number of records per page in list views." },
  "system.pagination_max":           { category: "system",      label: "Max Page Size",             description: "Maximum records per page allowed in API requests." },
  "system.session_timeout_hours":    { category: "system",      label: "Session Timeout (hours)",   description: "Hours before an authenticated JWT session expires." },
  "system.fiscal_year_start_month":  { category: "system",      label: "Fiscal Year Start Month",   description: "Month number (1=Jan, 4=Apr) when the fiscal year begins." },
  "system.app_name":                 { category: "system",      label: "App Name",                  description: "Display name shown in page titles." },
  "system.company_name":             { category: "system",      label: "Company Name",              description: "Company name shown in the login screen and reports." },
  "system.fiscal_label":             { category: "system",      label: "Fiscal Period Label",       description: "Short label shown on the login page (e.g. Q1 2026–27)." },
};

// ── Public API ──────────────────────────────────────────────────────────────

/** Read a single setting, falling back to the built-in default. */
export async function getSetting<T = unknown>(key: string): Promise<T> {
  try {
    const row = await prisma.appSetting.findUnique({ where: { key } });
    if (row) return JSON.parse(row.value) as T;
  } catch {
    // DB not yet migrated or key not found — fall through to default
  }
  return (SETTING_DEFAULTS[key] ?? null) as T;
}

/** Write a single setting. */
export async function setSetting(key: string, value: unknown, updatedById?: number) {
  const meta = SETTING_META[key];
  await prisma.appSetting.upsert({
    where: { key },
    create: {
      key,
      category: meta?.category ?? "misc",
      label: meta?.label ?? key,
      description: meta?.description ?? "",
      value: JSON.stringify(value),
      updatedById,
    },
    update: {
      value: JSON.stringify(value),
      updatedById,
    },
  });
}

/** Read ALL settings as a flat map, merging DB rows over defaults. */
export async function getAllSettings(): Promise<Record<string, unknown>> {
  const rows = await prisma.appSetting.findMany();
  const map: Record<string, unknown> = { ...SETTING_DEFAULTS };
  for (const row of rows) {
    try { map[row.key] = JSON.parse(row.value); } catch { /* skip bad rows */ }
  }
  return map;
}

// ── Phase 5 — Configuration lifecycle (Draft → Review → Published) ──────────
// These functions are ADDITIVE — existing getSetting / setSetting are unchanged.

/**
 * Read the latest *published* ConfigurationVersion for a key.
 * Falls back to getSetting() when no published version exists yet,
 * so all callers continue to work before the migration is applied.
 */
export async function getPublishedSetting<T = unknown>(key: string): Promise<T> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = await (prisma as any).configurationVersion.findFirst({
      where:   { settingKey: key, status: "published" },
      orderBy: { version: "desc" },
      select:  { value: true },
    });
    if (row) return JSON.parse(row.value) as T;
  } catch {
    // Table doesn't exist yet (pre-migration) — fall through
  }
  return getSetting<T>(key);
}

/**
 * Create a DRAFT ConfigurationVersion for a setting change.
 * Does NOT immediately apply the value — a reviewer must publish it.
 * Falls back to setSetting() when the ConfigurationVersion table doesn't exist yet.
 */
export async function draftSetting(
  key: string,
  value: unknown,
  changedById: number,
  note?: string,
): Promise<void> {
  const meta = SETTING_META[key];
  const module = meta?.category ?? "misc";

  try {
    // Find the current max version for this key
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const latest = await (prisma as any).configurationVersion.findFirst({
      where:   { settingKey: key },
      orderBy: { version: "desc" },
      select:  { version: true },
    });
    const nextVersion = (latest?.version ?? 0) + 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).configurationVersion.create({
      data: {
        settingKey:  key,
        value:       JSON.stringify(value),
        version:     nextVersion,
        module,
        status:      "draft",
        changedById,
        note:        note ?? null,
      },
    });
  } catch {
    // Pre-migration fallback: write directly (bypass lifecycle)
    await setSetting(key, value, changedById);
  }
}

/**
 * Publish a draft ConfigurationVersion, making it the live value.
 * Marks previous published versions as rolled_back.
 */
export async function publishSettingVersion(
  versionId: number,
  reviewedById: number,
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cv = await (prisma as any).configurationVersion.findUnique({
      where: { id: versionId },
    });
    if (!cv) throw new Error(`ConfigurationVersion ${versionId} not found`);
    if (cv.status !== "draft" && cv.status !== "in_review") {
      throw new Error(`Cannot publish version with status: ${cv.status}`);
    }

    // Roll back any existing published version for this key
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).configurationVersion.updateMany({
      where: { settingKey: cv.settingKey, status: "published" },
      data:  { status: "rolled_back" },
    });

    // Publish this version
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).configurationVersion.update({
      where: { id: versionId },
      data:  { status: "published", reviewedById, publishedAt: new Date() },
    });

    // Apply the value to the live AppSetting table so getSetting() stays fast
    await setSetting(cv.settingKey, JSON.parse(cv.value), reviewedById);
  } catch (e) {
    if (e instanceof Error && e.message.includes("not found")) throw e;
    if (e instanceof Error && e.message.includes("Cannot publish")) throw e;
    // Pre-migration: silently ignore
  }
}
