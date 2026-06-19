"use client";
import { LEAD_STAGE_LABELS, OPP_STAGE_LABELS, LeadStage, OppStage } from "@/types/pipeline";

const LEAD_COLORS: Record<LeadStage, string> = {
  NEW_LEAD:             "bg-slate-100 text-slate-700",
  CONTACTED:            "bg-blue-100 text-blue-700",
  QUALIFIED:            "bg-indigo-100 text-indigo-700",
  REQUIREMENT_GATHERED: "bg-violet-100 text-violet-700",
  SOLUTION_PROPOSED:    "bg-purple-100 text-purple-700",
  POC_DEMO:             "bg-orange-100 text-orange-700",
  PROPOSAL_SENT:        "bg-amber-100 text-amber-800",
};

const OPP_COLORS: Record<OppStage, string> = {
  PROPOSAL_SENT: "bg-amber-100 text-amber-800",
  FOLLOW_UP:     "bg-cyan-100 text-cyan-700",
  NEGOTIATION:   "bg-yellow-100 text-yellow-800",
  WON:           "bg-green-100 text-green-800",
  LOST:          "bg-red-100 text-red-700",
  ON_HOLD:       "bg-gray-100 text-gray-600",
};

export function LeadStageBadge({ stage }: { stage: string }) {
  const s = stage as LeadStage;
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${LEAD_COLORS[s] ?? "bg-gray-100 text-gray-600"}`}>
      {LEAD_STAGE_LABELS[s] ?? stage}
    </span>
  );
}

export function OppStageBadge({ stage }: { stage: string }) {
  const s = stage as OppStage;
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${OPP_COLORS[s] ?? "bg-gray-100 text-gray-600"}`}>
      {OPP_STAGE_LABELS[s] ?? stage}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    high:   "bg-red-100 text-red-700",
    medium: "bg-yellow-100 text-yellow-700",
    low:    "bg-green-100 text-green-700",
  };
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${styles[priority] ?? "bg-gray-100 text-gray-600"}`}>
      {priority}
    </span>
  );
}
