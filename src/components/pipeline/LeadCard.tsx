"use client";
import Link from "next/link";
import { LeadSerialized } from "@/types/pipeline";
import { LeadStageBadge } from "./StageBadge";

// SLA thresholds (hours) — kept in sync with seed-crm-defaults.ts SLA rules
const SLA_FIRST_CONTACT_H  = 4;   // NEW_LEAD: must be contacted within 4h
const SLA_FOLLOW_UP_H      = 24;  // all open leads: follow-up within 24h
const SLA_WARN_MULTIPLIER  = 0.75; // show warning when 75% of SLA is consumed

function slaBadge(createdAt: string, stage: string) {
  const elapsedH = (Date.now() - new Date(createdAt).getTime()) / 3_600_000;
  const days     = Math.floor(elapsedH / 24);

  // For terminal stages don't show SLA
  if (["PROPOSAL_SENT"].includes(stage)) {
    if (days > 30) return <span className="text-xs text-red-600 font-semibold">{days}d old</span>;
    if (days > 14) return <span className="text-xs text-amber-600 font-semibold">{days}d old</span>;
    return <span className="text-xs text-gray-400">{days}d</span>;
  }

  // NEW_LEAD: first-contact SLA (4h)
  if (stage === "NEW_LEAD") {
    if (elapsedH >= SLA_FIRST_CONTACT_H)
      return (
        <span className="text-xs bg-red-100 text-red-700 font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1">
          ⏱ SLA breach
        </span>
      );
    if (elapsedH >= SLA_FIRST_CONTACT_H * SLA_WARN_MULTIPLIER)
      return (
        <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1">
          ⚠ {Math.round(SLA_FIRST_CONTACT_H - elapsedH)}h left
        </span>
      );
    return <span className="text-xs text-gray-400">{days}d</span>;
  }

  // Open stages: follow-up SLA (24h)
  if (elapsedH >= SLA_FOLLOW_UP_H * 3) // 3x overdue → red
    return <span className="text-xs text-red-600 font-semibold">{days}d old</span>;
  if (elapsedH >= SLA_FOLLOW_UP_H)
    return <span className="text-xs text-amber-600 font-semibold">{days}d old</span>;
  return <span className="text-xs text-gray-400">{days}d</span>;
}

export function LeadCard({ lead }: { lead: LeadSerialized }) {
  // PROPOSAL_SENT leads with an opportunity go directly to the opportunity detail
  const href = lead.stage === "PROPOSAL_SENT" && lead.opportunity?.id
    ? `/pipeline/opportunities/${lead.opportunity.id}`
    : `/pipeline/leads/${lead.id}`;

  const isConverted = lead.stage === "PROPOSAL_SENT" && !!lead.opportunity?.id;

  return (
    <Link href={href}>
      <div className={`bg-white rounded-lg p-3 shadow-sm border transition-all ${
        isConverted
          ? "border-amber-200 hover:shadow-md hover:border-amber-400/60"
          : "border-gray-200 hover:shadow-md hover:border-[#CC2229]/30"
      }`}>
        <div className="flex items-start justify-between gap-1 mb-1.5">
          <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-1">{lead.title}</p>
          <div className="flex items-center gap-1 shrink-0">
            {isConverted && (
              <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                Opp
              </span>
            )}
            {slaBadge(lead.createdAt, lead.stage)}
          </div>
        </div>

        <p className="text-xs text-gray-600 font-medium mb-0.5">{lead.companyName}</p>
        <p className="text-xs text-gray-400 mb-2">{lead.contactPerson}</p>

        <div className="flex items-center justify-between gap-2">
          <LeadStageBadge stage={lead.stage} />
          {lead.expectedValue > 0 && (
            <span className="text-xs font-semibold text-[#CC2229]">
              ₹{lead.expectedValue.toFixed(1)}L
            </span>
          )}
        </div>

        {lead.oemName && (
          <p className="text-xs text-gray-400 mt-1.5 truncate">{lead.oemName}</p>
        )}

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-500 truncate">{lead.assignedTo.name}</span>
          {lead._count && (
            <div className="flex gap-2 text-gray-400 text-xs">
              {lead._count.tasks > 0 && <span>✓{lead._count.tasks}</span>}
              {lead._count.notes > 0 && <span>📝{lead._count.notes}</span>}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
