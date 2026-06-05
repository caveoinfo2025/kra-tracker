import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";
import { executeAutomation } from "@/lib/crm-engine";

const LEAD_INCLUDE = {
  assignedTo: { select: { id: true, name: true } },
  createdBy:  { select: { id: true, name: true } },
  opportunity: true,
  _count: { select: { tasks: true, meetings: true, notes: true } },
} as const;

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const stageFilter   = searchParams.get("stage") ?? "";
  const sourceFilter  = searchParams.get("source") ?? "";
  const empFilter     = searchParams.get("assignedTo") ?? "";
  const oemFilter     = searchParams.get("oemId") ?? "";
  const catFilter     = searchParams.get("categoryId") ?? "";
  const search        = searchParams.get("q") ?? "";
  const page          = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit         = Math.min(100, Number(searchParams.get("limit") ?? "50"));
  const sort          = searchParams.get("sort") ?? "updatedAt";
  const order         = searchParams.get("order") === "asc" ? "asc" : "desc";

  const isManager = session.user.isManager;
  const empId     = session.user.employeeId;

  const where = {
    ...(isManager ? {} : { assignedToId: empId }),
    // PROPOSAL_SENT leads are converted to Opportunities — exclude from Leads view by default
    stage: stageFilter ? stageFilter : { not: "PROPOSAL_SENT" },
    ...(sourceFilter ? { source: sourceFilter }    : {}),
    ...(empFilter    ? { assignedToId: Number(empFilter) } : {}),
    ...(oemFilter    ? { oemId: oemFilter }         : {}),
    ...(catFilter    ? { categoryId: catFilter }   : {}),
    ...(search       ? {
      OR: [
        { title:         { contains: search } },
        { companyName:   { contains: search } },
        { contactPerson: { contains: search } },
        { email:         { contains: search } },
      ],
    } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.crmLead.count({ where }),
    prisma.crmLead.findMany({
      where,
      include: LEAD_INCLUDE,
      orderBy: { [sort]: order } as Record<string, "asc" | "desc">,
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return NextResponse.json({ rows, total, page, limit });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const empId = session.user.employeeId!;

  const lead = await prisma.crmLead.create({
    data: {
      title:         body.title,
      companyName:   body.companyName,
      contactPerson: body.contactPerson,
      email:         body.email         ?? "",
      phone:         body.phone         ?? "",
      source:        body.source        ?? "Direct",
      categoryId:    body.categoryId    ?? null,
      categoryName:  body.categoryName  ?? "",
      oemId:         body.oemId         ?? null,
      oemName:       body.oemName       ?? "",
      productId:     body.productId     ?? null,
      productName:   body.productName   ?? "",
      customerId:    body.customerId    ?? null,
      customerName:  body.customerName  ?? "",
      stage:         "NEW_LEAD",
      expectedValue: Number(body.expectedValue ?? 0),
      remarks:       body.remarks       ?? "",
      assignedToId:  empId,   // auto-assign to creator
      createdById:   empId,
    },
    include: LEAD_INCLUDE,
  });

  // Auto-create first-call follow-up task due in 1 hour
  await prisma.crmTask.create({
    data: {
      title:        `First call with ${body.companyName}`,
      description:  "Initial qualification call — auto-created on lead creation.",
      dueDate:      new Date(Date.now() + 60 * 60 * 1000),
      assignedToId: empId,
      status:       "pending",
      priority:     "high",
      leadId:       lead.id,
    },
  });

  // Log activity
  await prisma.crmActivity.create({
    data: {
      entityType:    "lead",
      entityId:      lead.id,
      action:        "created",
      description:   `Lead created: ${lead.title}`,
      performedById: empId,
      leadId:        lead.id,
    },
  });

  // Fire-and-forget: trigger automation rules for lead.created event
  executeAutomation("lead.created", {
    leadId:      lead.id,
    assignedToId: empId,
    stage:       lead.stage,
    companyName: lead.companyName,
  }).catch(() => {/* never block response */});

  return NextResponse.json(lead, { status: 201 });
}
