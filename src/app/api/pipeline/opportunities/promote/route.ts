/**
 * POST /api/pipeline/opportunities/promote
 * Body: { salesFunnelId: number }
 *
 * Promotes a legacy SalesFunnel deal into a real CrmLead + CrmOpportunity so it
 * gains the full opportunity detail page (edit, close-won/lost flow, etc.).
 *
 * Idempotent: if the SalesFunnel row already has a crmOpportunityId, that id is
 * returned without creating duplicates.
 */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";

// Legacy SalesFunnel stage label → CRM opportunity stage key
const LEGACY_STAGE_MAP: Record<string, string> = {
  "Lead":          "PROPOSAL_SENT",
  "Qualified":     "PROPOSAL_SENT",
  "Solutioning":   "PROPOSAL_SENT",
  "Proposal Sent": "PROPOSAL_SENT",
  "Negotiation":   "NEGOTIATION",
  "Closed Won":    "WON",
  "Closed Lost":   "LOST",
};

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { salesFunnelId } = await req.json() as { salesFunnelId: number };
  if (!salesFunnelId) return NextResponse.json({ error: "salesFunnelId required" }, { status: 400 });

  const sf = await prisma.salesFunnel.findUnique({ where: { id: Number(salesFunnelId) } });
  if (!sf) return NextResponse.json({ error: "Legacy deal not found" }, { status: 404 });

  // RBAC: managers, or the owning employee
  if (!session.user.isManager && sf.employeeId !== session.user.employeeId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Idempotent — already promoted
  if (sf.crmOpportunityId) {
    return NextResponse.json({ opportunityId: sf.crmOpportunityId, alreadyPromoted: true });
  }

  const oppStage  = LEGACY_STAGE_MAP[sf.stage] ?? "PROPOSAL_SENT";
  const isWon      = oppStage === "WON";
  const isLost     = oppStage === "LOST";

  // Create lead + opportunity in a transaction, then flag the legacy row.
  const result = await prisma.$transaction(async (tx) => {
    const lead = await tx.crmLead.create({
      data: {
        title:         sf.opportunityName || sf.solutionCategory || "Imported opportunity",
        companyName:   sf.customerName || "—",
        contactPerson: "—",
        source:        "Import",
        categoryName:  sf.solutionCategory ?? "",
        // Leads that already have an opportunity sit at PROPOSAL_SENT
        stage:         "PROPOSAL_SENT",
        expectedValue: sf.dealValueLakhs,
        remarks:       sf.remarks ?? "",
        assignedToId:  sf.employeeId,
        createdById:   sf.employeeId,
      },
    });

    const opp = await tx.crmOpportunity.create({
      data: {
        leadId:              lead.id,
        stage:               oppStage,
        value:               sf.dealValueLakhs,
        probability:         Math.round(sf.probabilityPct),
        expectedClosureDate: sf.expectedCloseDate,
        // Carry over closing data when the legacy deal was already Won/Lost
        dealValueExTax:      isWon ? (sf.billingValueLakhs || sf.dealValueLakhs) : 0,
        poDate:              isWon ? sf.poDate : null,
        poNumber:            isWon ? (sf.opportunityId || "") : "",
        lostReason:          isLost ? "Imported as lost" : "",
        status:              "active",
      },
    });

    await tx.salesFunnel.update({
      where: { id: sf.id },
      data:  { crmOpportunityId: opp.id },
    });

    await tx.crmActivity.create({
      data: {
        entityType:    "opportunity",
        entityId:      opp.id,
        action:        "created",
        description:   `Promoted from imported deal "${sf.opportunityName || sf.customerName}"`,
        performedById: session.user.employeeId!,
        leadId:        lead.id,
        opportunityId: opp.id,
      },
    });

    return opp;
  });

  return NextResponse.json({ opportunityId: result.id });
}
