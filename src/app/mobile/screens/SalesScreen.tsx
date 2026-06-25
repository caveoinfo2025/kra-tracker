"use client";
import MobileHeader from "@/components/mobile/MobileHeader";
import MobileAppShell from "@/components/mobile/MobileAppShell";
import MobileKpiCard from "@/components/mobile/MobileKpiCard";
import MobileSectionHeader from "@/components/mobile/MobileSectionHeader";
import MobileListCard from "@/components/mobile/MobileListCard";
import MobileStatusPill from "@/components/mobile/MobileStatusPill";
import { mockSalesKpis, mockDeals } from "../mock-data";

interface SalesScreenProps {
  onDealClick: (dealId: number) => void;
  onAddDeal?: () => void;
}

const STAGE_LABEL: Record<string, { status: "pending" | "info" | "approved" | "danger"; label: string }> = {
  negotiation: { status: "pending", label: "Negotiation" },
  discovery: { status: "info", label: "Discovery" },
  proposal: { status: "info", label: "Proposal sent" },
  won: { status: "approved", label: "Won" },
};

export default function SalesScreen({ onDealClick, onAddDeal }: SalesScreenProps) {
  return (
    <div className="m-screen">
      <MobileHeader variant="shell" roleBadge="SALES" />
      <MobileAppShell hasBottomNav hasHeader>
        <div className="m-header">
          <h1 className="m-title" style={{ fontSize: 22 }}>Sales pipeline</h1>
        </div>

        <div className="m-section">
          <div className="m-kpi-row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
            {mockSalesKpis.map((kpi) => (
              <MobileKpiCard key={kpi.label} label={kpi.label} value={kpi.value} unit={kpi.unit} />
            ))}
          </div>
        </div>

        <div className="m-section">
          <MobileSectionHeader label="Active opportunities" actionLabel="Add deal" onAction={onAddDeal} />
          {mockDeals.map((deal) => (
            <MobileListCard
              key={deal.id}
              title={deal.company}
              subtitle={deal.nextAction}
              trailing={<MobileStatusPill {...STAGE_LABEL[deal.stage]} />}
              meta={
                <>
                  <span>{deal.value}</span>
                  <span>Owner: {deal.owner}</span>
                </>
              }
              onClick={() => onDealClick(deal.id)}
            />
          ))}
        </div>
      </MobileAppShell>
    </div>
  );
}
