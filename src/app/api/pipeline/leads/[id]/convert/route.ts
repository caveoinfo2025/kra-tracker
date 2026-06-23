/**
 * POST /api/pipeline/leads/[id]/convert
 *
 * SFDC-style lead conversion:
 *  1. Links/creates a Customer master record
 *  2. Creates CrmOpportunity (if not already created)
 *  3. Sets lead stage → PROPOSAL_SENT
 *
 * Body:
 *   { existingCustomerId: number }           — link an existing Customer master
 *   { name, address?, district?, state?,
 *     pincode?, gstNo? }                     — create a new Customer master, then link
 *
 * Idempotent: repeated calls with the same customerId are safe.
 */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { moneyToNumberForDisplay } from "@/lib/money";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const leadId = Number(id);
  const lead = await prisma.crmLead.findUnique({
    where: { id: leadId },
    include: { opportunity: true },
  });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  if (!session.user.isManager && lead.assignedToId !== session.user.employeeId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const empId = session.user.employeeId!;

  // ── 1. Resolve or create the Customer master record ──────────────────────────
  let customerRefId: number = lead.customerRefId ?? 0;
  let customerName  = lead.companyName;

  if (body.existingCustomerId) {
    const existing = await prisma.customer.findFirst({
      where: { id: Number(body.existingCustomerId), deletedAt: null },
    });
    if (!existing) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    customerRefId = existing.id;
    customerName  = existing.name;
  } else if (body.name?.trim()) {
    // Create new Customer master via the canonical model (same as POST /api/customers/master)
    const newCustomer = await prisma.customer.create({
      data: {
        name:       body.name.trim(),
        address:    body.address?.trim()    ?? "",
        district:   body.district?.trim()   ?? "",
        state:      body.state?.trim()      ?? "",
        pincode:    body.pincode?.trim()    ?? "",
        gstNo:      body.gstNo?.trim()      ?? "",
        officeType: "HO",
        crmSource:  "lead_conversion",
      },
    });
    customerRefId = newCustomer.id;
    customerName  = newCustomer.name;
  } else if (!lead.customerRefId) {
    return NextResponse.json({ error: "Provide existingCustomerId or new customer details (name required)" }, { status: 400 });
  }

  // ── 2. Update lead: link customer + set stage ─────────────────────────────────
  const updatedLead = await prisma.crmLead.update({
    where: { id: leadId },
    data: {
      customerRefId,
      companyName: customerName, // keep companyName in sync
      stage: "PROPOSAL_SENT",
    },
    include: {
      assignedTo:  { select: { id: true, name: true } },
      createdBy:   { select: { id: true, name: true } },
      customerRef: { select: { id: true, name: true } },
      opportunity: true,
    },
  });

  // ── 3. Create Opportunity if not already created ──────────────────────────────
  let opportunity = updatedLead.opportunity;
  if (!opportunity) {
    opportunity = await prisma.crmOpportunity.create({
      data: {
        leadId,
        stage:       "PROPOSAL_SENT",
        value:       lead.expectedValue,
        probability: 60,
        status:      "active",
      },
    });

    await prisma.crmActivity.create({
      data: {
        entityType:    "opportunity",
        entityId:      opportunity.id,
        action:        "created",
        description:   `Opportunity created from lead conversion — Customer: ${customerName}`,
        performedById: empId,
        leadId,
        opportunityId: opportunity.id,
      },
    });
  }

  // ── 4. Log conversion activity ────────────────────────────────────────────────
  await prisma.crmActivity.create({
    data: {
      entityType:    "lead",
      entityId:      leadId,
      action:        "converted",
      description:   `Lead converted — Customer master linked: ${customerName} (id: ${customerRefId})`,
      performedById: empId,
      leadId,
    },
  });

  return NextResponse.json({
    ...updatedLead,
    expectedValue: moneyToNumberForDisplay(updatedLead.expectedValue),
    opportunity: {
      ...opportunity,
      value: moneyToNumberForDisplay(opportunity.value),
      dealValueExTax: moneyToNumberForDisplay(opportunity.dealValueExTax),
      netProfitLakhs: moneyToNumberForDisplay(opportunity.netProfitLakhs),
    },
  });
}
