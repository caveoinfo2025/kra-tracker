"use client";
import Link from "next/link";
import { OpportunitySerialized } from "@/types/pipeline";
import { OppStageBadge } from "./StageBadge";
import { formatINRAsLakhs } from "@/lib/money";

export function OpportunityCard({ opp }: { opp: OpportunitySerialized & { lead?: { title: string; companyName: string; assignedTo: { name: string } } } }) {
  const days = opp.expectedClosureDate
    ? Math.ceil((new Date(opp.expectedClosureDate).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <Link href={`/pipeline/opportunities/${opp.id}`}>
      <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:shadow-md hover:border-[#CC2229]/30 transition-all">
        <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-1 mb-0.5">
          {opp.lead?.companyName ?? "—"}
        </p>
        <p className="text-xs text-gray-500 mb-2 line-clamp-1">{opp.lead?.title}</p>

        <div className="flex items-center justify-between mb-2">
          <OppStageBadge stage={opp.stage} />
          <span className="text-sm font-bold text-[#CC2229]">{formatINRAsLakhs(opp.value)}</span>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{opp.probability}% prob.</span>
          {days !== null && (
            <span className={days < 0 ? "text-red-600 font-semibold" : days <= 7 ? "text-amber-600" : ""}>
              {days < 0 ? `${Math.abs(days)}d overdue` : `Close in ${days}d`}
            </span>
          )}
        </div>

        {opp.lead?.assignedTo && (
          <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100 truncate">
            {opp.lead.assignedTo.name}
          </p>
        )}
      </div>
    </Link>
  );
}
