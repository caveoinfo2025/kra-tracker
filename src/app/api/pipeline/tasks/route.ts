import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/dev-session";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status") ?? "";
  const leadId       = searchParams.get("leadId");
  const oppId        = searchParams.get("opportunityId");
  const empId        = session.user.employeeId;
  const isManager    = session.user.isManager;

  const where = {
    ...(isManager ? {} : { assignedToId: empId }),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(leadId       ? { leadId: Number(leadId) } : {}),
    ...(oppId        ? { opportunityId: Number(oppId) } : {}),
  };

  const tasks = await prisma.crmTask.findMany({
    where,
    include: {
      assignedTo:  { select: { id: true, name: true } },
      lead:        { select: { id: true, title: true, companyName: true } },
      opportunity: { select: { id: true, stage: true } },
    },
    orderBy: { dueDate: "asc" },
    take: 200,
  });

  return NextResponse.json(tasks);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body  = await req.json();
  const empId = session.user.employeeId!;

  const task = await prisma.crmTask.create({
    data: {
      title:         body.title,
      description:   body.description   ?? "",
      dueDate:       new Date(body.dueDate),
      assignedToId:  body.assignedToId  ? Number(body.assignedToId) : empId,
      status:        "pending",
      priority:      body.priority      ?? "medium",
      leadId:        body.leadId        ? Number(body.leadId)        : null,
      opportunityId: body.opportunityId ? Number(body.opportunityId) : null,
    },
    include: {
      assignedTo:  { select: { id: true, name: true } },
      lead:        { select: { id: true, title: true, companyName: true } },
      opportunity: { select: { id: true, stage: true } },
    },
  });

  if (body.leadId) {
    await prisma.crmActivity.create({
      data: {
        entityType:    "task",
        entityId:      task.id,
        action:        "task_created",
        description:   `Task created: ${task.title} (${task.assignedTo.name})`,
        performedById: empId,
        leadId:        Number(body.leadId),
      },
    });
  }

  // Notify the assignee when a task is assigned to someone else
  if (task.assignedToId !== empId) {
    await prisma.notification.create({
      data: {
        recipientId: task.assignedToId,
        type: "system",
        title: `Task assigned: ${task.title}`,
        body: `Due ${new Date(task.dueDate).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`,
        link: body.leadId ? `/pipeline/leads/${body.leadId}` : "/pipeline/tasks",
      },
    });
  }

  return NextResponse.json(task, { status: 201 });
}
