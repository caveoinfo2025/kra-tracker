"use client";
import Link from "next/link";
import { LeadSerialized } from "@/types/pipeline";
import { LeadStageBadge } from "./StageBadge";

function agingBadge(createdAt: string) {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
  if (days > 30) return <span className="text-xs text-red-600 font-semibold">{days}d old</span>;
  if (days > 14) return <span className="text-xs text-amber-600 font-semibold">{days}d old</span>;
  return <span className="text-xs text-gray-400">{days}d old</span>;
}

export function LeadCard({ lead }: { lead: LeadSerialized }) {
  return (
    <Link href={`/pipeline/leads/${lead.id}`}>
      <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:shadow-md hover:border-[#CC2229]/30 transition-all">
        <div className="flex items-start justify-between gap-1 mb-1.5">
          <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-1">{lead.title}</p>
          {agingBadge(lead.createdAt)}
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
