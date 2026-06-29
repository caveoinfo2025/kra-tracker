/**
 * Phase W3 — display-only label/variant maps for Daily Activity UI.
 * Pure presentation helpers; no schema or lib changes. Employee-visible band labels
 * follow the wording given in docs/webapp/DAILY_ACTIVITY_WEBAPP_REQUIREMENTS.md
 * ("No activity recorded", "Low activity", "Active", "Productive", "Highly productive").
 */
import type { BadgeProps } from "@/components/Badge";

export const BAND_LABELS: Record<string, string> = {
  NO_ACTIVITY: "No activity recorded",
  LOW_ACTIVITY: "Low activity",
  ACTIVE: "Active",
  PRODUCTIVE: "Productive",
  HIGHLY_PRODUCTIVE: "Highly productive",
};

export const BAND_VARIANT: Record<string, BadgeProps["variant"]> = {
  NO_ACTIVITY: "neutral",
  LOW_ACTIVITY: "warning",
  ACTIVE: "info",
  PRODUCTIVE: "success",
  HIGHLY_PRODUCTIVE: "success",
};

export const SUMMARY_STATUS_LABELS: Record<string, string> = {
  NO_ACTIVITY: "No activity recorded",
  SUMMARY_PENDING: "Summary pending",
  LATE_SUBMITTED: "Submitted late",
  PENDING_CORRECTION: "Correction pending",
  REOPENED: "Reopened",
  INCOMPLETE: "Incomplete",
  CLOSED: "Closed",
};

export const SUMMARY_STATUS_VARIANT: Record<string, BadgeProps["variant"]> = {
  NO_ACTIVITY: "neutral",
  SUMMARY_PENDING: "warning",
  LATE_SUBMITTED: "warning",
  PENDING_CORRECTION: "danger",
  REOPENED: "info",
  INCOMPLETE: "danger",
  CLOSED: "success",
};

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  QUALIFIED_LEAD_CREATED: "Qualified lead created",
  LEAD_UPDATED: "Lead updated",
  FOLLOW_UP_ADDED: "Follow-up added",
  TASK_UPDATED: "Task updated",
  TASK_COMPLETED: "Task completed",
  MEETING_SCHEDULED: "Meeting scheduled",
  MEETING_COMPLETED: "Meeting completed",
  PROPOSAL_SENT: "Proposal sent",
  OPPORTUNITY_UPDATED: "Opportunity updated",
  CALL_NOTE_ADDED: "Call note added",
  EMAIL_NOTE_ADDED: "Email note added",
  WHATSAPP_NOTE_ADDED: "WhatsApp note added",
  END_OF_DAY_SUMMARY_SUBMITTED: "End-of-day summary submitted",
};

export function activityTypeLabel(t: string): string {
  return ACTIVITY_TYPE_LABELS[t] ?? t;
}

export function bandLabel(b: string): string {
  return BAND_LABELS[b] ?? b;
}

export function summaryStatusLabel(s: string): string {
  return SUMMARY_STATUS_LABELS[s] ?? s;
}

export function formatTime(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export function formatDateTime(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
